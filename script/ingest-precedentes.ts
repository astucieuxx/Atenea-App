/**
 * Script de Ingesta de Precedentes
 *
 * Uso:
 *   tsx script/ingest-precedentes.ts                          # Ingerir todos
 *   tsx script/ingest-precedentes.ts --file data/precedentes.jsonl  # Archivo específico
 *   tsx script/ingest-precedentes.ts --batch-size 5           # Batch más pequeño
 *   tsx script/ingest-precedentes.ts --resume                 # Continuar desde donde se quedó
 *   tsx script/ingest-precedentes.ts --limit 100              # Solo los primeros N
 *
 * Variables de entorno requeridas:
 *   DATABASE_URL        Connection string de Postgres
 *   OPENAI_API_KEY      API key para embeddings (o EMBEDDING_API_KEY)
 */

import "dotenv/config";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import type { Precedente } from "../shared/schema";
import {
  ingestPrecedenteBatch,
  checkPrecedenteIngestionStatus,
} from "../server/rag/ingestion-precedentes";
import { getProcessedPrecedenteIds } from "../server/rag/database-precedentes";

// ============================================================================
// CARGAR PRECEDENTES DESDE ARCHIVO
// ============================================================================

function loadPrecedentes(filePath?: string): Precedente[] {
  // Buscar archivo de precedentes
  const candidates = filePath
    ? [filePath]
    : [
        "data/precedentes.jsonl",
        "data/precedentes.json",
      ];

  let resolvedPath: string | null = null;
  for (const candidate of candidates) {
    const full = resolve(candidate);
    if (existsSync(full)) {
      resolvedPath = full;
      break;
    }
  }

  if (!resolvedPath) {
    throw new Error(
      `No se encontró archivo de precedentes. Buscados:\n${candidates.map(c => `  - ${resolve(c)}`).join("\n")}\n\nEjecuta primero: npm run scrape:precedentes`
    );
  }

  console.log(`📂 Cargando precedentes desde: ${resolvedPath}`);

  const content = readFileSync(resolvedPath, "utf-8");

  if (resolvedPath.endsWith(".jsonl")) {
    const lines = content.split("\n").filter(l => l.trim());
    const precedentes: Precedente[] = [];

    for (const line of lines) {
      try {
        const raw = JSON.parse(line);
        precedentes.push(mapToPrecedente(raw));
      } catch {
        // Skip malformed lines
      }
    }

    return precedentes;
  }

  // JSON array
  const raw = JSON.parse(content);
  const arr = Array.isArray(raw) ? raw : [raw];
  return arr.map(mapToPrecedente);
}

function mapToPrecedente(raw: any): Precedente {
  return {
    id: String(raw.id || ""),
    ius: raw.ius || 0,
    rubro: raw.rubro || "",
    texto_publicacion: raw.texto_publicacion || "",
    localizacion: raw.localizacion || "",
    sala: raw.sala || "",
    tipo_asunto: raw.tipo_asunto || "",
    tipo_asunto_expediente: raw.tipo_asunto_expediente || "",
    promovente: raw.promovente || "",
    fecha_publicacion: raw.fecha_publicacion || "",
    temas: typeof raw.temas === "string" ? raw.temas : JSON.stringify(raw.temas || []),
    votos: typeof raw.votos === "string" ? raw.votos : JSON.stringify(raw.votos || []),
    votacion: raw.votacion ?? false,
    semanal: raw.semanal ?? false,
    url_origen: raw.url_origen || "",
    raw_fields: typeof raw.raw_fields === "string" ? raw.raw_fields : JSON.stringify(raw.raw_fields || {}),
    scraped_at: raw.scraped_at || "",
  };
}

// ============================================================================
// PARSEO DE ARGUMENTOS
// ============================================================================

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    file: undefined as string | undefined,
    batchSize: 10,
    resume: false,
    limit: 0,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--file":
        opts.file = args[++i];
        break;
      case "--batch-size":
        opts.batchSize = parseInt(args[++i]) || 10;
        break;
      case "--resume":
        opts.resume = true;
        break;
      case "--limit":
        opts.limit = parseInt(args[++i]) || 0;
        break;
    }
  }

  return opts;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log("=".repeat(60));
  console.log("🚀 ATENEA RAG - Ingesta de Precedentes");
  console.log("=".repeat(60));

  // Verificar variables de entorno
  if (!process.env.DATABASE_URL) {
    console.error("❌ Error: DATABASE_URL no está definida");
    process.exit(1);
  }

  if (!process.env.EMBEDDING_API_KEY && !process.env.OPENAI_API_KEY) {
    console.error("❌ Error: EMBEDDING_API_KEY o OPENAI_API_KEY no está definida");
    process.exit(1);
  }

  const opts = parseArgs();

  // Verificar estado actual
  console.log("\n📊 Verificando estado actual de la base de datos...");
  try {
    const status = await checkPrecedenteIngestionStatus();
    console.log(`   Precedentes en BD: ${status.totalPrecedentes}`);
    console.log(`   Precedentes con chunks: ${status.precedentesWithChunks}`);
    console.log(`   Chunks totales: ${status.totalChunks}`);
    console.log(`   Chunks con embeddings: ${status.chunksWithEmbeddings}`);
  } catch (error) {
    console.error("❌ Error al verificar estado:", error);
    console.error("   Asegúrate de que:");
    console.error("   1. La base de datos esté accesible");
    console.error("   2. El esquema esté creado (ejecuta migrations/002_precedentes_schema.sql)");
    process.exit(1);
  }

  // Cargar precedentes
  let precedentes = loadPrecedentes(opts.file);
  console.log(`✅ Cargados ${precedentes.length} precedentes`);

  if (precedentes.length === 0) {
    console.error("❌ No se encontraron precedentes para ingerir");
    process.exit(1);
  }

  // Filtrar ya procesados si --resume
  if (opts.resume) {
    console.log("\n🔍 Verificando precedentes ya procesados...");
    const processedIds = await getProcessedPrecedenteIds();
    const before = precedentes.length;
    precedentes = precedentes.filter(p => !processedIds.has(p.id));
    console.log(`   Ya procesados: ${processedIds.size}`);
    console.log(`   Pendientes: ${precedentes.length} (de ${before})`);
  }

  // Aplicar --limit
  if (opts.limit > 0 && precedentes.length > opts.limit) {
    precedentes = precedentes.slice(0, opts.limit);
    console.log(`   Limitado a primeros ${opts.limit} precedentes`);
  }

  if (precedentes.length === 0) {
    console.log("\n✅ Todos los precedentes ya están procesados.");
    process.exit(0);
  }

  console.log("\n⚙️  Configuración:");
  console.log(`   Batch size: ${opts.batchSize}`);
  console.log(`   Precedentes a procesar: ${precedentes.length}`);
  console.log(`   Provider: ${process.env.EMBEDDING_PROVIDER || "openai"}`);

  console.log("\n⚠️  Iniciando ingesta en 3 segundos... (Ctrl+C para cancelar)");
  await new Promise(r => setTimeout(r, 3000));

  // Iniciar ingesta
  console.log("\n🔄 Iniciando ingesta...\n");

  try {
    const stats = await ingestPrecedenteBatch(precedentes, {
      batchSize: opts.batchSize,
      embeddingBatchSize: 50,
      continueOnError: true,
      logProgress: true,
    });

    console.log("\n" + "=".repeat(60));
    console.log("✅ INGESTA DE PRECEDENTES COMPLETADA");
    console.log("=".repeat(60));
    console.log(`   Precedentes procesados: ${stats.processedPrecedentes}/${stats.totalPrecedentes}`);
    console.log(`   Precedentes fallidos: ${stats.failedPrecedentes}`);
    console.log(`   Chunks creados: ${stats.processedChunks}`);
    if (stats.durationMs) {
      const minutes = Math.floor(stats.durationMs / 60000);
      const seconds = Math.floor((stats.durationMs % 60000) / 1000);
      console.log(`   Duración: ${minutes}m ${seconds}s`);
    }
  } catch (error) {
    console.error("\n❌ Error durante la ingesta:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Error fatal:", error);
  process.exit(1);
});
