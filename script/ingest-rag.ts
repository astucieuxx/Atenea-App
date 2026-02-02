/**
 * Script de Ingesta RAG
 * 
 * Uso:
 *   tsx script/ingest-rag.ts [opciones]
 * 
 * Opciones:
 *   --file <path>     Archivo JSON/JSONL específico a ingerir
 *   --batch-size <n>  Tamaño de batch (default: 10)
 *   --resume          Continuar desde donde se quedó (no implementado aún)
 *   --dry-run         Solo validar, no insertar en BD
 * 
 * Variables de entorno requeridas:
 *   DATABASE_URL      Connection string de Postgres
 *   EMBEDDING_API_KEY API key para embeddings (OpenAI o Cohere)
 *   EMBEDDING_PROVIDER Provider: "openai" o "cohere" (default: "openai")
 */

import "dotenv/config";
import { loadTesisFromJSON } from "../server/json-loader";
import { ingestTesisBatch, checkIngestionStatus } from "../server/rag/ingestion";
import type { Tesis } from "../shared/schema";

async function main() {
  console.log("=".repeat(60));
  console.log("🚀 ATENEA RAG - Script de Ingesta");
  console.log("=".repeat(60));

  // Verificar variables de entorno
  if (!process.env.DATABASE_URL) {
    console.error("❌ Error: DATABASE_URL no está definida");
    console.error("   Define DATABASE_URL en tu archivo .env o variables de entorno");
    process.exit(1);
  }

  if (!process.env.EMBEDDING_API_KEY && !process.env.OPENAI_API_KEY) {
    console.error("❌ Error: EMBEDDING_API_KEY o OPENAI_API_KEY no está definida");
    console.error("   Define una de estas variables para generar embeddings");
    process.exit(1);
  }

  // Verificar estado actual
  console.log("\n📊 Verificando estado actual de la base de datos...");
  try {
    const status = await checkIngestionStatus();
    console.log(`   Tesis en BD: ${status.totalTesis}`);
    console.log(`   Tesis con chunks: ${status.tesisWithChunks}`);
    console.log(`   Chunks totales: ${status.totalChunks}`);
    console.log(`   Chunks con embeddings: ${status.chunksWithEmbeddings}`);
  } catch (error) {
    console.error("❌ Error al verificar estado:", error);
    console.error("   Asegúrate de que:");
    console.error("   1. La base de datos esté accesible");
    console.error("   2. El esquema esté creado (ejecuta migrations/001_rag_schema.sql)");
    process.exit(1);
  }

  // Cargar tesis
  console.log("\n📂 Cargando tesis desde archivos JSON/JSONL...");
  let tesisList: Tesis[];
  
  try {
    tesisList = await loadTesisFromJSON();
    console.log(`✅ Cargadas ${tesisList.length} tesis`);
  } catch (error) {
    console.error("❌ Error al cargar tesis:", error);
    process.exit(1);
  }

  if (tesisList.length === 0) {
    console.error("❌ No se encontraron tesis para ingerir");
    console.error("   Verifica que los archivos estén en attached_assets/");
    process.exit(1);
  }

  // Configuración de ingesta
  const batchSize = parseInt(process.env.INGESTION_BATCH_SIZE || "10");
  const embeddingBatchSize = parseInt(process.env.EMBEDDING_BATCH_SIZE || "50");

  console.log("\n⚙️  Configuración:");
  console.log(`   Batch size (tesis): ${batchSize}`);
  console.log(`   Embedding batch size: ${embeddingBatchSize}`);
  console.log(`   Provider: ${process.env.EMBEDDING_PROVIDER || "openai"}`);

  // Confirmar antes de continuar
  console.log("\n⚠️  ADVERTENCIA: Este proceso puede tardar varias horas para 300k tesis.");
  console.log("   Se recomienda ejecutar en background o usar un proceso de batch.");
  console.log("\n¿Continuar? (Ctrl+C para cancelar)");
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Iniciar ingesta
  console.log("\n🔄 Iniciando ingesta...\n");
  
  try {
    const stats = await ingestTesisBatch(tesisList, {
      batchSize,
      embeddingBatchSize,
      continueOnError: true,
      logProgress: true,
    });

    console.log("\n" + "=".repeat(60));
    console.log("✅ INGESTA COMPLETADA");
    console.log("=".repeat(60));
    console.log(`   Tesis procesadas: ${stats.processedTesis}/${stats.totalTesis}`);
    console.log(`   Tesis fallidas: ${stats.failedTesis}`);
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

// Ejecutar
main().catch((error) => {
  console.error("Error fatal:", error);
  process.exit(1);
});
