/**
 * Phase 1: API Discovery Script
 *
 * Uses a headless browser to navigate sjf2.scjn.gob.mx and intercept
 * network requests, discovering the exact API endpoints used for
 * listing and retrieving ejecutorias.
 *
 * Usage: npx tsx script/discover-api.ts
 *
 * Output: Writes discovered endpoints to script/api-endpoints.json
 */
import { chromium } from "playwright-core";
import { writeFileSync } from "fs";
import { resolve } from "path";

interface DiscoveredEndpoint {
  method: string;
  url: string;
  postData?: string;
  responseStatus: number;
  responseBody: string;
  contentType?: string;
}

async function discoverAPI() {
  console.log("Launching browser...");

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    viewport: { width: 1920, height: 1080 },
  });

  const page = await context.newPage();
  const endpoints: DiscoveredEndpoint[] = [];

  // Intercept all API/service requests
  page.on("response", async (response) => {
    const url = response.url();
    const isApiCall =
      url.includes("/api/") ||
      url.includes("/services/") ||
      url.includes("microservice") ||
      url.includes("ejecutoria");

    if (!isApiCall) return;
    // Skip static assets
    if (url.match(/\.(js|css|png|jpg|svg|woff|ico)(\?|$)/)) return;

    const entry: DiscoveredEndpoint = {
      method: response.request().method(),
      url,
      postData: response.request().postData() || undefined,
      responseStatus: response.status(),
      responseBody: "",
      contentType: response.headers()["content-type"],
    };

    try {
      const body = await response.text();
      entry.responseBody = body.substring(0, 5000);
    } catch {
      entry.responseBody = "[could not read body]";
    }

    endpoints.push(entry);
    console.log(`  [${entry.method}] ${entry.responseStatus} ${url.substring(0, 120)}`);
  });

  // --- Phase 1: Navigate to listing page ---
  console.log("\n=== Phase 1: Listing page ===");
  console.log("Navigating to https://sjf2.scjn.gob.mx/listado-resultado-ejecutorias ...");

  try {
    await page.goto("https://sjf2.scjn.gob.mx/listado-resultado-ejecutorias", {
      waitUntil: "networkidle",
      timeout: 60000,
    });
  } catch (err: any) {
    console.log(`Navigation issue: ${err.message}. Waiting for content...`);
    await page.waitForTimeout(10000);
  }

  await page.waitForTimeout(5000);

  // Capture page content
  const listingContent = await page.evaluate(() => ({
    title: document.title,
    bodyText: document.body?.innerText?.substring(0, 3000),
    links: Array.from(document.querySelectorAll("a[href*='ejecutoria']"))
      .slice(0, 5)
      .map((el) => ({
        href: el.getAttribute("href"),
        text: el.textContent?.trim().substring(0, 150),
      })),
  }));

  console.log("\nPage title:", listingContent.title);
  console.log("Ejecutoria links found:", listingContent.links.length);
  if (listingContent.links.length > 0) {
    console.log("Sample links:", JSON.stringify(listingContent.links, null, 2));
  }

  // --- Phase 2: Try to trigger pagination ---
  console.log("\n=== Phase 2: Pagination ===");
  const paginationSelectors = [
    "button.mat-mdc-paginator-navigation-next",
    ".mat-paginator-navigation-next",
    "[aria-label='Next page']",
    ".pagination .next",
    "button:has-text('Siguiente')",
    ".p-paginator-next",
    "a.page-link:has-text('>')",
  ];

  for (const sel of paginationSelectors) {
    try {
      const el = await page.$(sel);
      if (el) {
        console.log(`Found pagination element: ${sel}`);
        await el.click();
        await page.waitForTimeout(3000);
        break;
      }
    } catch {
      // continue
    }
  }

  // --- Phase 3: Navigate to a detail page ---
  console.log("\n=== Phase 3: Detail page ===");
  const detailUrl = listingContent.links[0]?.href
    ? `https://sjf2.scjn.gob.mx${listingContent.links[0].href}`
    : "https://sjf2.scjn.gob.mx/detalle/ejecutoria/33820";

  console.log(`Navigating to: ${detailUrl}`);

  try {
    await page.goto(detailUrl, {
      waitUntil: "networkidle",
      timeout: 60000,
    });
  } catch (err: any) {
    console.log(`Navigation issue: ${err.message}`);
    await page.waitForTimeout(10000);
  }

  await page.waitForTimeout(3000);

  const detailContent = await page.evaluate(() => ({
    title: document.title,
    bodyText: document.body?.innerText?.substring(0, 5000),
  }));

  console.log("\nDetail page title:", detailContent.title);
  console.log("Detail page text (first 500):", detailContent.bodyText?.substring(0, 500));

  await browser.close();

  // --- Save results ---
  const output = {
    discoveredAt: new Date().toISOString(),
    totalEndpoints: endpoints.length,
    endpoints,
    listingPage: listingContent,
    detailPage: detailContent,
  };

  const outPath = resolve(import.meta.dirname, "api-endpoints.json");
  writeFileSync(outPath, JSON.stringify(output, null, 2), "utf-8");
  console.log(`\n=== Results saved to ${outPath} ===`);
  console.log(`Total API endpoints discovered: ${endpoints.length}`);

  // Print summary
  console.log("\n=== ENDPOINT SUMMARY ===");
  for (const ep of endpoints) {
    console.log(`\n${ep.method} ${ep.url}`);
    if (ep.postData) console.log(`  Body: ${ep.postData.substring(0, 300)}`);
    console.log(`  Status: ${ep.responseStatus}`);
    console.log(`  Content-Type: ${ep.contentType}`);
    if (ep.responseBody && ep.responseBody !== "[could not read body]") {
      console.log(`  Response preview: ${ep.responseBody.substring(0, 300)}`);
    }
  }
}

discoverAPI().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
