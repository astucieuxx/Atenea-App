/**
 * Scraper de Ejecutorias del Semanario Judicial de la Federación
 * ================================================================
 *
 * Extrae las 22,604 ejecutorias de https://sjf2.scjn.gob.mx
 * usando la API REST descubierta:
 *   POST /services/sjfejecutoriamicroservice/api/public/ejecutorias?size={n}
 *
 * Uso:
 *   npx tsx script/scrape-ejecutorias.ts                    # Ejecutar desde cero
 *   npx tsx script/scrape-ejecutorias.ts --resume           # Reanudar desde checkpoint
 *   npx tsx script/scrape-ejecutorias.ts --size 50          # Items por página (default: 20)
 *   npx tsx script/scrape-ejecutorias.ts --delay 2000       # Delay entre requests en ms (default: 1500)
 *   npx tsx script/scrape-ejecutorias.ts --with-detail      # También obtener detalle individual
 *   npx tsx script/scrape-ejecutorias.ts --concurrency 3    # Peticiones paralelas para detalles (default: 2)
 *
 * Requisitos:
 *   - Node.js 18+
 *   - Conexión a internet a sjf2.scjn.gob.mx
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, appendFileSync } from "fs";
import { resolve } from "path";

// ===========================
// API Configuration (discovered)
// ===========================

const BASE_URL = "https://sjf2.scjn.gob.mx";
const LIST_ENDPOINT = `${BASE_URL}/services/sjfejecutoriamicroservice/api/public/ejecutorias`;
const DETAIL_ENDPOINT = `${BASE_URL}/services/sjfejecutoriamicroservice/api/public/ejecutorias`;
const LIST_BODY = {
  filterExpression: "",
  classifiers: [],
  searchTerms: [],
  bFacet: true,
  ius: [],
  idApp: "SJFAPP2020",
  lbSearch: [],
};

const HEADERS = {
  "Content-Type": "application/json",
  Accept: "application/json",
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Origin: BASE_URL,
  Referer: `${BASE_URL}/listado-resultado-ejecutorias`,
};

// ===========================
// Types
// ===========================

interface ScraperConfig {
  pageSize: number;
  delayMs: number;
  resume: boolean;
  withDetail: boolean;
  concurrency: number;
  maxRetries: number;
  outputDir: string;
}

/** Raw document from the list API */
interface RawDocument {
  id: string;
  ius: number;
  rubro: string;
  [key: string]: any;
}

/** Cleaned ejecutoria output */
interface Ejecutoria {
  id: string;
  ius: number;
  rubro: string;
  localizacion: string;
  sala: string;
  tipo_asunto: string;
  tipo_asunto_expediente: string;
  promovente: string;
  texto_publicacion: string;
  fecha_publicacion: string;
  temas: string[];
  votos: any[];
  votacion: boolean;
  semanal: boolean;
  url_origen: string;
  raw_fields: Record<string, any>;
  scraped_at: string;
}

interface Checkpoint {
  lastPage: number;
  totalDocuments: number;
  scrapedCount: number;
  updatedAt: string;
}

// ===========================
// Utilities
// ===========================

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function log(msg: string) {
  const ts = new Date().toISOString().substring(11, 19);
  console.log(`[${ts}] ${msg}`);
}

function logProgress(current: number, total: number, label: string) {
  const pct = total > 0 ? ((current / total) * 100).toFixed(1) : "0.0";
  const filled = total > 0 ? Math.floor((current / total) * 30) : 0;
  const bar = "█".repeat(filled).padEnd(30, "░");
  process.stdout.write(`\r  ${bar} ${pct}% (${current}/${total}) ${label}  `);
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
        const wait = parseInt(response.headers.get("retry-after") || "10", 10);
        log(`Rate limited (429). Esperando ${wait}s...`);
        await sleep(wait * 1000);
        continue;
      }
      if (response.status >= 500 && attempt < retries) {
        const backoff = 3000 * (attempt + 1);
        log(`Server error (${response.status}). Retry in ${backoff}ms...`);
        await sleep(backoff);
        continue;
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (err: any) {
      if (err.name === "TimeoutError" || err.message?.includes("timeout")) {
        if (attempt < retries) {
          log(`Timeout. Retry ${attempt + 1}/${retries}...`);
          await sleep(3000 * (attempt + 1));
          continue;
        }
      }
      if (attempt < retries) {
        const backoff = 3000 * (attempt + 1);
        log(`Error: ${err.message}. Retry in ${backoff}ms...`);
        await sleep(backoff);
      } else {
        throw err;
      }
    }
  }
  throw new Error("Max retries exceeded");
}

function parseArgs(): ScraperConfig {
  const args = process.argv.slice(2);
  const getArg = (name: string, def: string) => {
    const idx = args.indexOf(`--${name}`);
    return idx >= 0 && args[idx + 1] ? args[idx + 1] : def;
  };
  const hasFlag = (name: string) => args.includes(`--${name}`);

  return {
    pageSize: parseInt(getArg("size", "20"), 10),
    delayMs: parseInt(getArg("delay", "1500"), 10),
    resume: hasFlag("resume"),
    withDetail: hasFlag("with-detail"),
    concurrency: parseInt(getArg("concurrency", "2"), 10),
    maxRetries: 3,
    outputDir: resolve(import.meta.dirname, "..", "data"),
  };
}

// ===========================
// Core: Fetch listing pages
// ===========================

async function fetchPage(
  page: number,
  size: number,
  retries: number
): Promise<{ documents: RawDocument[]; total: number }> {
  const url = `${LIST_ENDPOINT}?size=${size}&page=${page}`;

  const response = await fetchWithRetry(
    url,
    {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify(LIST_BODY),
    },
    retries
  );

  const json = await response.json();

  // The API returns { documents: [...], totalDocuments?: N, ... }
  const documents: RawDocument[] = json.documents || json.content || json.data || [];
  const total =
    json.totalDocuments ??
    json.totalElements ??
    json.total ??
    json.count ??
    0;

  return { documents, total };
}

// ===========================
// Core: Fetch detail for a single ejecutoria
// ===========================

async function fetchDetail(
  id: string,
  retries: number
): Promise<Record<string, any> | null> {
  try {
    // Try common detail URL patterns
    const urls = [
      `${DETAIL_ENDPOINT}/${id}`,
      `${DETAIL_ENDPOINT}/ius/${id}`,
    ];

    for (const url of urls) {
      try {
        const response = await fetchWithRetry(
          url,
          { method: "GET", headers: HEADERS },
          retries
        );
        return await response.json();
      } catch {
        continue;
      }
    }
    return null;
  } catch {
    return null;
  }
}

// ===========================
// Mapping: Raw document -> Clean Ejecutoria
// ===========================

function mapToEjecutoria(raw: RawDocument, detail?: Record<string, any> | null): Ejecutoria {
  const merged = detail ? { ...raw, ...detail } : raw;

  // Fields we explicitly map
  const knownKeys = new Set([
    "id", "ius", "rubro", "localizacion", "sala",
    "tipoAsunto", "tipoAsuntoE", "promovente",
    "textoPublicacion", "fechaPublicacion",
    "themes", "votos", "votacion", "semanal",
  ]);

  const rawFields: Record<string, any> = {};
  for (const [k, v] of Object.entries(merged)) {
    if (!knownKeys.has(k) && v !== null && v !== undefined && v !== "") {
      rawFields[k] = v;
    }
  }

  return {
    id: String(merged.id || merged.ius || ""),
    ius: merged.ius ?? (parseInt(merged.id, 10) || 0),
    rubro: (merged.rubro || "").trim(),
    localizacion: merged.localizacion || "",
    sala: merged.sala || "",
    tipo_asunto: merged.tipoAsunto || "",
    tipo_asunto_expediente: merged.tipoAsuntoE || "",
    promovente: merged.promovente || "",
    texto_publicacion: merged.textoPublicacion || "",
    fecha_publicacion: merged.fechaPublicacion || "",
    temas: Array.isArray(merged.themes) ? merged.themes : [],
    votos: Array.isArray(merged.votos) ? merged.votos : [],
    votacion: merged.votacion ?? false,
    semanal: merged.semanal === 1 || merged.semanal === true,
    url_origen: `${BASE_URL}/detalle/ejecutoria/${merged.ius || merged.id}`,
    raw_fields: rawFields,
    scraped_at: new Date().toISOString(),
  };
}

// ===========================
// Checkpoint management
// ===========================

function loadCheckpoint(path: string): Checkpoint | null {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return null;
  }
}

function saveCheckpoint(path: string, cp: Checkpoint) {
  writeFileSync(path, JSON.stringify(cp, null, 2), "utf-8");
}

// ===========================
// Main scraping logic
// ===========================

async function main() {
  const config = parseArgs();

  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  Scraper de Ejecutorias - Semanario Judicial de la Fed.      ║
║  API: sjfejecutoriamicroservice                              ║
║  Page size: ${String(config.pageSize).padEnd(48)}║
║  Delay: ${String(config.delayMs + "ms").padEnd(52)}║
╚═══════════════════════════════════════════════════════════════╝
`);

  // Ensure output directory
  if (!existsSync(config.outputDir)) {
    mkdirSync(config.outputDir, { recursive: true });
  }

  const outputJson = resolve(config.outputDir, "ejecutorias.json");
  const outputJsonl = resolve(config.outputDir, "ejecutorias.jsonl");
  const checkpointPath = resolve(config.outputDir, "ejecutorias-checkpoint.json");

  // --- Step 0: Probe the API ---
  log("Probando conexión a la API...");
  let probeResult: { documents: RawDocument[]; total: number };
  try {
    probeResult = await fetchPage(0, 1, config.maxRetries);
  } catch (err: any) {
    console.error(`\nNo se pudo conectar a la API: ${err.message}`);
    console.error("Verifica tu conexión a internet y que sjf2.scjn.gob.mx esté disponible.");
    process.exit(1);
  }

  const totalDocuments = probeResult.total;
  const sampleDoc = probeResult.documents[0];

  if (!sampleDoc) {
    console.error("\nLa API no devolvió documentos. Respuesta vacía.");
    process.exit(1);
  }

  log(`API respondió OK. Total de documentos: ${totalDocuments || "desconocido"}`);
  log(`Campos del primer documento: ${Object.keys(sampleDoc).join(", ")}`);
  log(`Primer rubro: "${(sampleDoc.rubro || "").substring(0, 100)}..."`);

  const total = totalDocuments || 22604;
  const totalPages = Math.ceil(total / config.pageSize);

  // --- Step 1: Load checkpoint if resuming ---
  let startPage = 0;
  let ejecutorias: Ejecutoria[] = [];

  if (config.resume) {
    const cp = loadCheckpoint(checkpointPath);
    if (cp) {
      startPage = cp.lastPage + 1;
      log(`Reanudando desde página ${startPage}. ${cp.scrapedCount} items previos.`);

      // Load existing JSONL
      if (existsSync(outputJsonl)) {
        const lines = readFileSync(outputJsonl, "utf-8").split("\n").filter(Boolean);
        ejecutorias = lines.map((line) => JSON.parse(line));
        log(`Cargados ${ejecutorias.length} items del archivo existente.`);
      }
    }
  } else {
    // Clear previous output
    if (existsSync(outputJsonl)) writeFileSync(outputJsonl, "", "utf-8");
  }

  // --- Step 2: Paginate through all listing pages ---
  log(`\nObteniendo listado: ${totalPages} páginas de ${config.pageSize} items...`);

  let newItems = 0;
  let consecutiveEmpty = 0;

  for (let page = startPage; page < totalPages; page++) {
    try {
      const { documents } = await fetchPage(page, config.pageSize, config.maxRetries);

      if (documents.length === 0) {
        consecutiveEmpty++;
        if (consecutiveEmpty >= 3) {
          log(`\n3 páginas vacías consecutivas. Fin del listado en página ${page}.`);
          break;
        }
        continue;
      }
      consecutiveEmpty = 0;

      // Map and append
      for (const doc of documents) {
        const ej = mapToEjecutoria(doc);
        ejecutorias.push(ej);
        appendFileSync(outputJsonl, JSON.stringify(ej) + "\n", "utf-8");
        newItems++;
      }

      logProgress(ejecutorias.length, total, "ejecutorias");

      // Save checkpoint every 10 pages
      if (page % 10 === 0) {
        saveCheckpoint(checkpointPath, {
          lastPage: page,
          totalDocuments: total,
          scrapedCount: ejecutorias.length,
          updatedAt: new Date().toISOString(),
        });
      }

      await sleep(config.delayMs);
    } catch (err: any) {
      log(`\nError en página ${page}: ${err.message}`);
      // Save checkpoint so we can resume
      saveCheckpoint(checkpointPath, {
        lastPage: Math.max(0, page - 1),
        totalDocuments: total,
        scrapedCount: ejecutorias.length,
        updatedAt: new Date().toISOString(),
      });
      log("Checkpoint guardado. Puedes reanudar con --resume");

      // Try to continue with next page
      await sleep(5000);
    }
  }

  console.log(); // newline after progress bar

  // --- Step 3: (Optional) Fetch full detail for each ejecutoria ---
  if (config.withDetail && ejecutorias.length > 0) {
    log(`\nObteniendo detalle individual de ${ejecutorias.length} ejecutorias...`);
    log(`(Concurrencia: ${config.concurrency}, esto puede tomar un rato)`);

    let detailCount = 0;
    const enriched: Ejecutoria[] = [];

    for (let i = 0; i < ejecutorias.length; i += config.concurrency) {
      const batch = ejecutorias.slice(i, i + config.concurrency);

      const promises = batch.map(async (ej) => {
        const detail = await fetchDetail(ej.id, config.maxRetries);
        if (detail) {
          return mapToEjecutoria(detail as any, null);
        }
        return ej;
      });

      const results = await Promise.all(promises);
      enriched.push(...results);
      detailCount += batch.length;

      logProgress(detailCount, ejecutorias.length, "detalles obtenidos");
      await sleep(config.delayMs);
    }

    console.log();
    ejecutorias = enriched;

    // Rewrite JSONL with enriched data
    const jsonlContent = ejecutorias.map((e) => JSON.stringify(e)).join("\n") + "\n";
    writeFileSync(outputJsonl, jsonlContent, "utf-8");
  }

  // --- Step 4: Save final JSON ---
  log(`Guardando ${ejecutorias.length} ejecutorias...`);
  writeFileSync(outputJson, JSON.stringify(ejecutorias, null, 2), "utf-8");

  // Final checkpoint
  saveCheckpoint(checkpointPath, {
    lastPage: totalPages - 1,
    totalDocuments: total,
    scrapedCount: ejecutorias.length,
    updatedAt: new Date().toISOString(),
  });

  // Stats
  const jsonSize = (Buffer.byteLength(JSON.stringify(ejecutorias)) / 1024 / 1024).toFixed(1);

  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  Scraping completado!                                        ║
║                                                              ║
║  Total extraído: ${String(ejecutorias.length).padEnd(42)}║
║  Nuevos en esta sesión: ${String(newItems).padEnd(36)}║
║  Tamaño JSON: ${String(jsonSize + " MB").padEnd(46)}║
║                                                              ║
║  Archivos:                                                   ║
║    data/ejecutorias.json   (formateado, fácil de leer)       ║
║    data/ejecutorias.jsonl  (una línea por item, para RAG)    ║
╚═══════════════════════════════════════════════════════════════╝
`);
}

main().catch((err) => {
  console.error("\nError fatal:", err);
  process.exit(1);
});
