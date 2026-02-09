/**
 * Scraper de Ejecutorias del Semanario Judicial de la Federación
 * ================================================================
 *
 * Extrae las 22,604 ejecutorias de https://sjf2.scjn.gob.mx/listado-resultado-ejecutorias
 *
 * Estrategia:
 *  1. Usa un navegador headless para descubrir los endpoints API reales
 *  2. Cambia a peticiones HTTP directas para velocidad
 *  3. Guarda progreso incremental para poder reanudar
 *
 * Uso:
 *   npx tsx script/scrape-ejecutorias.ts                    # Ejecutar desde cero
 *   npx tsx script/scrape-ejecutorias.ts --resume           # Reanudar desde el último checkpoint
 *   npx tsx script/scrape-ejecutorias.ts --concurrency 3    # Peticiones paralelas (default: 2)
 *   npx tsx script/scrape-ejecutorias.ts --delay 2000       # Delay entre peticiones en ms (default: 1500)
 *   npx tsx script/scrape-ejecutorias.ts --output data.json # Archivo de salida (default: ejecutorias.json)
 *   npx tsx script/scrape-ejecutorias.ts --api-only         # Saltar descubrimiento, usar endpoints conocidos
 *
 * Requisitos:
 *   - Node.js 18+
 *   - Navegador Chromium instalado (npx playwright install chromium)
 *   - Conexión a internet sin restricciones a sjf2.scjn.gob.mx
 */

import { chromium, type Browser, type BrowserContext, type Page } from "playwright-core";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";

// ===========================
// Configuration
// ===========================

interface ScraperConfig {
  concurrency: number;
  delayMs: number;
  outputFile: string;
  checkpointFile: string;
  resume: boolean;
  apiOnly: boolean;
  maxRetries: number;
  pageSize: number;
  totalExpected: number;
}

function parseArgs(): ScraperConfig {
  const args = process.argv.slice(2);
  const getArg = (name: string, def: string) => {
    const idx = args.indexOf(`--${name}`);
    return idx >= 0 && args[idx + 1] ? args[idx + 1] : def;
  };
  const hasFlag = (name: string) => args.includes(`--${name}`);

  const outputDir = resolve(import.meta.dirname, "..", "data");

  return {
    concurrency: parseInt(getArg("concurrency", "2"), 10),
    delayMs: parseInt(getArg("delay", "1500"), 10),
    outputFile: resolve(outputDir, getArg("output", "ejecutorias.json")),
    checkpointFile: resolve(outputDir, "ejecutorias-checkpoint.json"),
    resume: hasFlag("resume"),
    apiOnly: hasFlag("api-only"),
    maxRetries: 3,
    pageSize: 10,
    totalExpected: 22604,
  };
}

// ===========================
// Types
// ===========================

interface Ejecutoria {
  id: string;
  registro_digital: string;
  titulo: string;
  subtitulo: string;
  tipo: string;
  instancia: string;
  epoca: string;
  fuente: string;
  materia: string;
  tesis_relacionadas: string[];
  fecha_publicacion: string;
  fecha_resolucion: string;
  contenido: string;
  sintesis: string;
  precedentes: string;
  votos: string;
  notas: string;
  url_origen: string;
  scraped_at: string;
}

interface Checkpoint {
  lastPage: number;
  totalPages: number;
  totalItems: number;
  completedIds: string[];
  apiBaseUrl: string;
  listEndpoint: string;
  detailEndpoint: string;
  updatedAt: string;
}

interface ApiEndpoints {
  listUrl: string;
  listMethod: string;
  listBody?: any;
  detailUrlPattern: string;
  headers: Record<string, string>;
}

// ===========================
// Utility functions
// ===========================

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function log(msg: string) {
  const ts = new Date().toISOString().substring(11, 19);
  console.log(`[${ts}] ${msg}`);
}

function logProgress(current: number, total: number, label: string) {
  const pct = ((current / total) * 100).toFixed(1);
  const bar = "█".repeat(Math.floor((current / total) * 30)).padEnd(30, "░");
  process.stdout.write(`\r  ${bar} ${pct}% (${current}/${total}) ${label}`);
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries: number
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(30000),
      });
      if (response.ok) return response;
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get("retry-after") || "5", 10);
        log(`Rate limited. Waiting ${retryAfter}s...`);
        await sleep(retryAfter * 1000);
        continue;
      }
      if (response.status >= 500 && attempt < retries) {
        await sleep(2000 * (attempt + 1));
        continue;
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (err: any) {
      if (attempt < retries) {
        const backoff = 2000 * (attempt + 1);
        log(`Request failed (attempt ${attempt + 1}/${retries + 1}): ${err.message}. Retrying in ${backoff}ms...`);
        await sleep(backoff);
      } else {
        throw err;
      }
    }
  }
  throw new Error("Max retries exceeded");
}

// ===========================
// Phase 1: API Discovery
// ===========================

async function discoverEndpoints(): Promise<ApiEndpoints> {
  log("Phase 1: Discovering API endpoints with headless browser...");

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });

  const page = await context.newPage();

  const apiCalls: Array<{
    method: string;
    url: string;
    postData?: string;
    status: number;
    body: string;
    headers: Record<string, string>;
  }> = [];

  // Capture all API-like requests
  page.on("response", async (response) => {
    const url = response.url();
    if (
      !url.includes("/api/") &&
      !url.includes("/services/") &&
      !url.includes("microservice")
    )
      return;
    if (url.match(/\.(js|css|png|jpg|svg|woff|ico)(\?|$)/)) return;

    try {
      const body = await response.text();
      const reqHeaders: Record<string, string> = {};
      const allHeaders = response.request().headers();
      for (const [k, v] of Object.entries(allHeaders)) {
        if (
          k.toLowerCase().startsWith("x-") ||
          k.toLowerCase() === "authorization" ||
          k.toLowerCase() === "content-type" ||
          k.toLowerCase() === "cookie"
        ) {
          reqHeaders[k] = v;
        }
      }

      apiCalls.push({
        method: response.request().method(),
        url,
        postData: response.request().postData() || undefined,
        status: response.status(),
        body: body.substring(0, 10000),
        headers: reqHeaders,
      });
    } catch {
      // ignore
    }
  });

  log("  Navigating to listing page...");
  try {
    await page.goto("https://sjf2.scjn.gob.mx/listado-resultado-ejecutorias", {
      waitUntil: "networkidle",
      timeout: 60000,
    });
  } catch {
    await page.waitForTimeout(15000);
  }

  await page.waitForTimeout(5000);

  // Try to navigate to a detail page too
  log("  Navigating to a detail page...");
  const links = await page.$$eval("a[href*='ejecutoria']", (els) =>
    els.slice(0, 3).map((el) => el.getAttribute("href"))
  );

  if (links.length > 0) {
    try {
      const detailHref = links[0]!.startsWith("http")
        ? links[0]!
        : `https://sjf2.scjn.gob.mx${links[0]}`;
      await page.goto(detailHref, { waitUntil: "networkidle", timeout: 30000 });
      await page.waitForTimeout(3000);
    } catch {
      // ignore
    }
  }

  await browser.close();

  // Analyze discovered calls
  log(`  Found ${apiCalls.length} API calls.`);

  // Find the list endpoint (usually POST with pagination body)
  const listCall = apiCalls.find(
    (c) =>
      c.method === "POST" &&
      (c.url.includes("ejecutoria") || c.url.includes("listado")) &&
      c.body.includes("[")
  ) || apiCalls.find(
    (c) => c.method === "GET" && c.url.includes("ejecutoria") && c.body.includes("[")
  );

  // Find the detail endpoint
  const detailCall = apiCalls.find(
    (c) =>
      (c.url.includes("/detalle/") || c.url.match(/ejecutoria\/\d+/)) &&
      c.body.includes("{") &&
      !c.body.includes("[")
  );

  // Collect headers
  const headers: Record<string, string> = {};
  for (const call of apiCalls) {
    Object.assign(headers, call.headers);
  }

  // Build endpoints object
  const endpoints: ApiEndpoints = {
    listUrl: listCall?.url || "",
    listMethod: listCall?.method || "POST",
    listBody: listCall?.postData ? tryParseJSON(listCall.postData) : undefined,
    detailUrlPattern: detailCall?.url || "",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...headers,
    },
  };

  log("  Discovered endpoints:");
  log(`    List: ${endpoints.listMethod} ${endpoints.listUrl}`);
  log(`    Detail pattern: ${endpoints.detailUrlPattern}`);

  // Save discovered endpoints
  const discoverPath = resolve(import.meta.dirname, "api-endpoints.json");
  writeFileSync(
    discoverPath,
    JSON.stringify({ endpoints, allCalls: apiCalls }, null, 2),
    "utf-8"
  );
  log(`  Saved to ${discoverPath}`);

  return endpoints;
}

function tryParseJSON(str: string): any {
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}

// ===========================
// Phase 2: Known API patterns
// ===========================

/**
 * Known SCJN SJF2 API patterns (based on research).
 * If discovery fails or --api-only is used, these patterns are tried.
 */
function getKnownEndpoints(): ApiEndpoints[] {
  const base = "https://sjf2.scjn.gob.mx";
  return [
    // Pattern 1: Microservice API for ejecutorias
    {
      listUrl: `${base}/services/sjfejecutoriasmicroservice/api/public/ejecutorias`,
      listMethod: "POST",
      listBody: { page: 0, size: 10 },
      detailUrlPattern: `${base}/services/sjfejecutoriasmicroservice/api/public/ejecutorias/{id}`,
      headers: { "Content-Type": "application/json", Accept: "application/json" },
    },
    // Pattern 2: Similar to tesis microservice
    {
      listUrl: `${base}/services/sjftesismicroservice/api/public/ejecutorias`,
      listMethod: "POST",
      listBody: { page: 0, size: 10 },
      detailUrlPattern: `${base}/services/sjftesismicroservice/api/public/ejecutorias/{id}`,
      headers: { "Content-Type": "application/json", Accept: "application/json" },
    },
    // Pattern 3: Direct search API
    {
      listUrl: `${base}/api/ejecutorias`,
      listMethod: "POST",
      listBody: { pagina: 1, registros: 10 },
      detailUrlPattern: `${base}/api/ejecutorias/{id}`,
      headers: { "Content-Type": "application/json", Accept: "application/json" },
    },
    // Pattern 4: Angular-style query params
    {
      listUrl: `${base}/api/public/ejecutorias?page=0&size=10`,
      listMethod: "GET",
      detailUrlPattern: `${base}/api/public/ejecutorias/{id}`,
      headers: { Accept: "application/json" },
    },
  ];
}

// ===========================
// Phase 3: Browser-based scraping (fallback)
// ===========================

async function scrapeWithBrowser(config: ScraperConfig): Promise<Ejecutoria[]> {
  log("Using browser-based scraping (slower but more reliable)...");

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });

  // Load checkpoint
  let checkpoint: Checkpoint | null = null;
  const ejecutorias: Ejecutoria[] = [];
  const completedIds = new Set<string>();

  if (config.resume && existsSync(config.checkpointFile)) {
    checkpoint = JSON.parse(readFileSync(config.checkpointFile, "utf-8"));
    log(`Resuming from page ${checkpoint!.lastPage}. ${checkpoint!.completedIds.length} items already scraped.`);

    // Load existing data
    if (existsSync(config.outputFile)) {
      const existing: Ejecutoria[] = JSON.parse(readFileSync(config.outputFile, "utf-8"));
      ejecutorias.push(...existing);
      existing.forEach((e) => completedIds.add(e.id));
    }
  }

  const page = await context.newPage();

  // --- Step 1: Get listing and extract all ejecutoria IDs ---
  log("Step 1: Loading listing page to gather ejecutoria IDs...");

  await page.goto("https://sjf2.scjn.gob.mx/listado-resultado-ejecutorias", {
    waitUntil: "networkidle",
    timeout: 60000,
  });
  await page.waitForTimeout(3000);

  // Intercept API responses to capture list data
  const listItems: any[] = [];

  page.on("response", async (response) => {
    const url = response.url();
    if (
      (url.includes("ejecutoria") || url.includes("listado")) &&
      response.request().resourceType() === "fetch"
    ) {
      try {
        const json = await response.json();
        if (Array.isArray(json)) {
          listItems.push(...json);
        } else if (json.content && Array.isArray(json.content)) {
          listItems.push(...json.content);
        } else if (json.data && Array.isArray(json.data)) {
          listItems.push(...json.data);
        } else if (json.resultado && Array.isArray(json.resultado)) {
          listItems.push(...json.resultado);
        }
      } catch {
        // not JSON
      }
    }
  });

  // Get total count from page
  const totalText = await page.evaluate(() => {
    const el =
      document.querySelector(".total-resultados") ||
      document.querySelector("[class*='total']") ||
      document.querySelector("[class*='count']");
    return el?.textContent?.trim() || "";
  });
  log(`  Total text found on page: "${totalText}"`);

  // Collect ejecutoria links from the listing
  const allLinks: string[] = [];
  let currentPage = checkpoint?.lastPage || 0;

  // Navigate through all pages
  log("Step 2: Paginating through all results...");

  let hasNextPage = true;
  while (hasNextPage) {
    // Get current links
    const pageLinks = await page.$$eval(
      "a[href*='ejecutoria'], a[href*='detalle']",
      (els) =>
        els
          .map((el) => el.getAttribute("href"))
          .filter((h): h is string => !!h && h.includes("ejecutoria"))
    );
    allLinks.push(...pageLinks.filter((l) => !allLinks.includes(l)));

    logProgress(allLinks.length, config.totalExpected, "links collected");

    // Try clicking "next page"
    const nextBtn = await page.$(
      [
        "button.mat-mdc-paginator-navigation-next:not([disabled])",
        ".mat-paginator-navigation-next:not([disabled])",
        "[aria-label='Next page']:not([disabled])",
        ".p-paginator-next:not(.p-disabled)",
        "button:has-text('Siguiente'):not([disabled])",
        "a.page-link:has-text('>'):not(.disabled)",
        ".next-page:not([disabled])",
      ].join(", ")
    );

    if (nextBtn) {
      await nextBtn.click();
      await page.waitForTimeout(config.delayMs);
      currentPage++;

      // Save checkpoint every 10 pages
      if (currentPage % 10 === 0) {
        saveCheckpoint(config.checkpointFile, {
          lastPage: currentPage,
          totalPages: Math.ceil(config.totalExpected / config.pageSize),
          totalItems: allLinks.length,
          completedIds: Array.from(completedIds),
          apiBaseUrl: "browser",
          listEndpoint: "browser",
          detailEndpoint: "browser",
          updatedAt: new Date().toISOString(),
        });
      }
    } else {
      hasNextPage = false;
    }

    // Safety: if we've collected way more than expected, stop
    if (allLinks.length > config.totalExpected * 1.1) break;
  }

  console.log(); // newline after progress
  log(`Collected ${allLinks.length} ejecutoria links.`);

  // --- Step 3: Scrape each detail page ---
  log("Step 3: Scraping individual ejecutoria detail pages...");

  const uniqueLinks = [...new Set(allLinks)];
  let scraped = 0;

  for (const link of uniqueLinks) {
    const id = link.match(/ejecutoria\/(\d+)/)?.[1] || link;
    if (completedIds.has(id)) continue;

    try {
      const fullUrl = link.startsWith("http")
        ? link
        : `https://sjf2.scjn.gob.mx${link}`;

      await page.goto(fullUrl, { waitUntil: "networkidle", timeout: 30000 });
      await page.waitForTimeout(1000);

      const data = await page.evaluate(() => {
        const getText = (sel: string) =>
          document.querySelector(sel)?.textContent?.trim() || "";

        const getAll = (sel: string) =>
          Array.from(document.querySelectorAll(sel)).map(
            (el) => el.textContent?.trim() || ""
          );

        // Try common Angular Material / PrimeNG patterns
        const title =
          getText("h1") ||
          getText("h2") ||
          getText(".titulo-ejecutoria") ||
          getText("[class*='titulo']");

        const bodyEl =
          document.querySelector(".contenido-ejecutoria") ||
          document.querySelector("[class*='contenido']") ||
          document.querySelector("[class*='texto']") ||
          document.querySelector("article") ||
          document.querySelector(".body") ||
          document.querySelector("main");

        const body = bodyEl?.textContent?.trim() || "";

        // Extract metadata from detail fields
        const metaItems: Record<string, string> = {};
        const rows = document.querySelectorAll(
          ".detalle-campo, .field-row, [class*='detail-row'], dl dt, .mat-list-item, tr"
        );
        rows.forEach((row) => {
          const label =
            row.querySelector("dt, .label, th, strong, b")?.textContent?.trim() || "";
          const value =
            row.querySelector("dd, .value, td:last-child, span")?.textContent?.trim() || "";
          if (label && value) {
            metaItems[label.replace(/:$/, "")] = value;
          }
        });

        // Also try key-value pairs from the visible text
        const allText = document.body?.innerText || "";

        return { title, body, metaItems, allText: allText.substring(0, 20000) };
      });

      const ejecutoria: Ejecutoria = {
        id,
        registro_digital: data.metaItems["Registro digital"] || data.metaItems["Registro"] || id,
        titulo: data.title,
        subtitulo: data.metaItems["Subtítulo"] || data.metaItems["Subtitulo"] || "",
        tipo: data.metaItems["Tipo"] || data.metaItems["Tipo de documento"] || "",
        instancia: data.metaItems["Instancia"] || data.metaItems["Órgano"] || "",
        epoca: data.metaItems["Época"] || data.metaItems["Epoca"] || "",
        fuente: data.metaItems["Fuente"] || "",
        materia: data.metaItems["Materia"] || data.metaItems["Materias"] || "",
        tesis_relacionadas:
          data.metaItems["Tesis"]?.split(",").map((t: string) => t.trim()) || [],
        fecha_publicacion: data.metaItems["Fecha de publicación"] || data.metaItems["Publicación"] || "",
        fecha_resolucion: data.metaItems["Fecha"] || data.metaItems["Fecha de resolución"] || "",
        contenido: data.body,
        sintesis: data.metaItems["Síntesis"] || data.metaItems["Sinopsis"] || "",
        precedentes: data.metaItems["Precedentes"] || "",
        votos: data.metaItems["Votos"] || data.metaItems["Votación"] || "",
        notas: data.metaItems["Notas"] || "",
        url_origen: `https://sjf2.scjn.gob.mx/detalle/ejecutoria/${id}`,
        scraped_at: new Date().toISOString(),
      };

      ejecutorias.push(ejecutoria);
      completedIds.add(id);
      scraped++;

      logProgress(scraped + completedIds.size, uniqueLinks.length, "ejecutorias scraped");

      // Save checkpoint every 50 items
      if (scraped % 50 === 0) {
        writeFileSync(config.outputFile, JSON.stringify(ejecutorias, null, 2), "utf-8");
        saveCheckpoint(config.checkpointFile, {
          lastPage: currentPage,
          totalPages: Math.ceil(config.totalExpected / config.pageSize),
          totalItems: ejecutorias.length,
          completedIds: Array.from(completedIds),
          apiBaseUrl: "browser",
          listEndpoint: "browser",
          detailEndpoint: "browser",
          updatedAt: new Date().toISOString(),
        });
      }

      await sleep(config.delayMs);
    } catch (err: any) {
      log(`  Error scraping ${id}: ${err.message}`);
    }
  }

  console.log(); // newline after progress
  await browser.close();
  return ejecutorias;
}

// ===========================
// Phase 4: API-based scraping (fast path)
// ===========================

async function scrapeWithAPI(
  endpoints: ApiEndpoints,
  config: ScraperConfig
): Promise<Ejecutoria[]> {
  log("Using API-based scraping (fast mode)...");

  const ejecutorias: Ejecutoria[] = [];
  const completedIds = new Set<string>();

  // Load checkpoint
  if (config.resume && existsSync(config.checkpointFile)) {
    const checkpoint: Checkpoint = JSON.parse(
      readFileSync(config.checkpointFile, "utf-8")
    );
    log(`Resuming. ${checkpoint.completedIds.length} items already scraped.`);
    checkpoint.completedIds.forEach((id) => completedIds.add(id));

    if (existsSync(config.outputFile)) {
      const existing: Ejecutoria[] = JSON.parse(
        readFileSync(config.outputFile, "utf-8")
      );
      ejecutorias.push(...existing);
    }
  }

  const totalPages = Math.ceil(config.totalExpected / config.pageSize);
  log(`Total pages to fetch: ${totalPages} (${config.pageSize} items/page)`);

  // --- Step 1: Paginate through listing ---
  const allItems: any[] = [];
  let startPage = config.resume ? Math.floor(completedIds.size / config.pageSize) : 0;

  for (let pageNum = startPage; pageNum < totalPages; pageNum++) {
    try {
      let response: Response;

      if (endpoints.listMethod === "POST") {
        const body = {
          ...(endpoints.listBody || {}),
          page: pageNum,
          size: config.pageSize,
          pagina: pageNum + 1,
          registros: config.pageSize,
        };

        response = await fetchWithRetry(
          endpoints.listUrl,
          {
            method: "POST",
            headers: endpoints.headers,
            body: JSON.stringify(body),
          },
          config.maxRetries
        );
      } else {
        const url = new URL(endpoints.listUrl);
        url.searchParams.set("page", String(pageNum));
        url.searchParams.set("size", String(config.pageSize));

        response = await fetchWithRetry(
          url.toString(),
          { method: "GET", headers: endpoints.headers },
          config.maxRetries
        );
      }

      const json = await response.json();

      // Extract items from various response structures
      const items: any[] =
        json.content ||
        json.data ||
        json.resultado ||
        json.results ||
        json.ejecutorias ||
        (Array.isArray(json) ? json : []);

      if (items.length === 0) {
        log(`  Page ${pageNum}: empty response, stopping pagination.`);
        break;
      }

      allItems.push(...items);
      logProgress(allItems.length, config.totalExpected, "items listed");

      await sleep(config.delayMs);
    } catch (err: any) {
      log(`  Error on page ${pageNum}: ${err.message}`);
      // Save progress and try to continue
      if (pageNum > 0) {
        saveCheckpoint(config.checkpointFile, {
          lastPage: pageNum,
          totalPages,
          totalItems: allItems.length,
          completedIds: Array.from(completedIds),
          apiBaseUrl: endpoints.listUrl,
          listEndpoint: endpoints.listUrl,
          detailEndpoint: endpoints.detailUrlPattern,
          updatedAt: new Date().toISOString(),
        });
      }
    }
  }

  console.log(); // newline after progress
  log(`Listed ${allItems.length} items. Now fetching details...`);

  // --- Step 2: Fetch details for each item ---
  let detailsFetched = 0;

  // Process items in batches based on concurrency
  for (let i = 0; i < allItems.length; i += config.concurrency) {
    const batch = allItems.slice(i, i + config.concurrency);

    const promises = batch.map(async (item) => {
      const id =
        item.id?.toString() ||
        item.registroDigital?.toString() ||
        item.registro?.toString() ||
        item.asuntoId?.toString() ||
        "";

      if (!id || completedIds.has(id)) return null;

      try {
        // Some APIs return full data in the list, check first
        if (item.contenido || item.texto || item.body) {
          return mapItemToEjecutoria(item, id);
        }

        // Otherwise fetch detail
        const detailUrl = endpoints.detailUrlPattern.replace("{id}", id);
        const response = await fetchWithRetry(
          detailUrl,
          { method: "GET", headers: endpoints.headers },
          config.maxRetries
        );

        const detail = await response.json();
        return mapItemToEjecutoria({ ...item, ...detail }, id);
      } catch (err: any) {
        log(`  Error fetching detail for ${id}: ${err.message}`);
        return null;
      }
    });

    const results = await Promise.all(promises);

    for (const ej of results) {
      if (ej) {
        ejecutorias.push(ej);
        completedIds.add(ej.id);
        detailsFetched++;
      }
    }

    logProgress(detailsFetched, allItems.length, "details fetched");

    // Save checkpoint every 100 items
    if (detailsFetched % 100 === 0 && detailsFetched > 0) {
      writeFileSync(config.outputFile, JSON.stringify(ejecutorias, null, 2), "utf-8");
      saveCheckpoint(config.checkpointFile, {
        lastPage: Math.floor(i / config.pageSize),
        totalPages,
        totalItems: ejecutorias.length,
        completedIds: Array.from(completedIds),
        apiBaseUrl: endpoints.listUrl,
        listEndpoint: endpoints.listUrl,
        detailEndpoint: endpoints.detailUrlPattern,
        updatedAt: new Date().toISOString(),
      });
    }

    await sleep(config.delayMs);
  }

  console.log(); // newline after progress
  return ejecutorias;
}

function mapItemToEjecutoria(item: any, id: string): Ejecutoria {
  return {
    id,
    registro_digital:
      item.registroDigital?.toString() ||
      item.registro?.toString() ||
      item.registro_digital?.toString() ||
      id,
    titulo:
      item.titulo ||
      item.title ||
      item.rubro ||
      item.asunto ||
      "",
    subtitulo: item.subtitulo || item.subtitle || "",
    tipo:
      item.tipo ||
      item.tipoDocumento ||
      item.tipo_documento ||
      item.type ||
      "",
    instancia:
      item.instancia ||
      item.organo ||
      item.organismo ||
      item.instance ||
      "",
    epoca: item.epoca || item.epoch || "",
    fuente: item.fuente || item.source || "",
    materia:
      item.materia ||
      item.materias ||
      (Array.isArray(item.materia) ? item.materia.join(", ") : "") ||
      "",
    tesis_relacionadas:
      item.tesisRelacionadas ||
      item.tesis ||
      (item.tesisRelacionada ? [item.tesisRelacionada] : []),
    fecha_publicacion:
      item.fechaPublicacion ||
      item.fecha_publicacion ||
      item.publishDate ||
      "",
    fecha_resolucion:
      item.fechaResolucion ||
      item.fecha_resolucion ||
      item.fecha ||
      "",
    contenido:
      item.contenido ||
      item.texto ||
      item.body ||
      item.content ||
      item.text ||
      "",
    sintesis: item.sintesis || item.sinopsis || item.synopsis || "",
    precedentes: item.precedentes || item.precedents || "",
    votos: item.votos || item.votacion || item.votes || "",
    notas: item.notas || item.notes || "",
    url_origen: `https://sjf2.scjn.gob.mx/detalle/ejecutoria/${id}`,
    scraped_at: new Date().toISOString(),
  };
}

function saveCheckpoint(path: string, checkpoint: Checkpoint) {
  writeFileSync(path, JSON.stringify(checkpoint, null, 2), "utf-8");
}

// ===========================
// Main
// ===========================

async function main() {
  const config = parseArgs();

  console.log(`
╔══════════════════════════════════════════════════════════╗
║  Scraper de Ejecutorias - Semanario Judicial (SCJN)     ║
║  Total esperado: ${String(config.totalExpected).padEnd(38)}║
╚══════════════════════════════════════════════════════════╝
`);

  log(`Config: concurrency=${config.concurrency}, delay=${config.delayMs}ms, resume=${config.resume}`);
  log(`Output: ${config.outputFile}`);

  // Ensure output directory exists
  const outputDir = resolve(config.outputFile, "..");
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  let ejecutorias: Ejecutoria[] = [];

  // Try API-based scraping first
  if (!config.apiOnly) {
    try {
      // Phase 1: Discover endpoints
      const endpoints = await discoverEndpoints();

      if (endpoints.listUrl) {
        // Phase 2: Try API-based scraping with discovered endpoints
        log("Attempting API-based scraping with discovered endpoints...");
        try {
          ejecutorias = await scrapeWithAPI(endpoints, config);
        } catch (err: any) {
          log(`API scraping failed: ${err.message}`);
          log("Trying known endpoint patterns...");
        }
      }

      // Try known patterns if discovery didn't yield results
      if (ejecutorias.length === 0) {
        const knownPatterns = getKnownEndpoints();
        for (const pattern of knownPatterns) {
          try {
            log(`Trying pattern: ${pattern.listMethod} ${pattern.listUrl}`);
            const testResponse = await fetchWithRetry(
              pattern.listUrl,
              {
                method: pattern.listMethod,
                headers: pattern.headers,
                body:
                  pattern.listMethod === "POST"
                    ? JSON.stringify(pattern.listBody)
                    : undefined,
              },
              1
            );
            const testJson = await testResponse.json();
            if (testJson && (testJson.content || testJson.data || Array.isArray(testJson))) {
              log("Pattern works! Starting full scrape...");
              ejecutorias = await scrapeWithAPI(pattern, config);
              break;
            }
          } catch {
            // try next pattern
          }
        }
      }
    } catch (err: any) {
      log(`Discovery/API phase failed: ${err.message}`);
    }
  } else {
    // API-only mode: try known patterns directly
    const knownPatterns = getKnownEndpoints();
    for (const pattern of knownPatterns) {
      try {
        log(`Trying pattern: ${pattern.listMethod} ${pattern.listUrl}`);
        const testResponse = await fetchWithRetry(
          pattern.listUrl,
          {
            method: pattern.listMethod,
            headers: pattern.headers,
            body:
              pattern.listMethod === "POST"
                ? JSON.stringify(pattern.listBody)
                : undefined,
          },
          1
        );
        const testJson = await testResponse.json();
        if (testJson && (testJson.content || testJson.data || Array.isArray(testJson))) {
          log("Pattern works! Starting full scrape...");
          ejecutorias = await scrapeWithAPI(pattern, config);
          break;
        }
      } catch {
        // try next
      }
    }
  }

  // Fallback: browser-based scraping
  if (ejecutorias.length === 0) {
    log("API methods failed. Falling back to browser-based scraping...");
    ejecutorias = await scrapeWithBrowser(config);
  }

  // --- Save final output ---
  log(`\nSaving ${ejecutorias.length} ejecutorias to ${config.outputFile}...`);
  writeFileSync(config.outputFile, JSON.stringify(ejecutorias, null, 2), "utf-8");

  // Also save a compact JSONL version for easier processing
  const jsonlPath = config.outputFile.replace(".json", ".jsonl");
  const jsonlContent = ejecutorias.map((e) => JSON.stringify(e)).join("\n");
  writeFileSync(jsonlPath, jsonlContent, "utf-8");

  console.log(`
╔══════════════════════════════════════════════════════════╗
║  Scraping completado                                     ║
║  Total scraped: ${String(ejecutorias.length).padEnd(39)}║
║  JSON: ${config.outputFile.substring(config.outputFile.lastIndexOf("/") + 1).padEnd(49)}║
║  JSONL: ${jsonlPath.substring(jsonlPath.lastIndexOf("/") + 1).padEnd(48)}║
╚══════════════════════════════════════════════════════════╝
`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
