/**
 * Script para procesar tesis que no tienen embeddings
 * 
 * Identifica las tesis que no tienen chunks con embeddings y las procesa.
 */

import { config } from "dotenv";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

// Cargar .env desde la raíz del proyecto
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, "../.env") });

import { getPool, getTesisById } from "../server/rag/database";
import { ingestTesisBatch, checkIngestionStatus, DEFAULT_INGESTION_CONFIG } from "../server/rag/ingestion";
import type { Tesis } from "../shared/schema";

/**
 * Obtiene los IDs de las tesis que no tienen embeddings
 */
async function getTesisWithoutEmbeddings(): Promise<string[]> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    // Obtener IDs de tesis que NO tienen ningún chunk con embedding
    const result = await client.query(`
      SELECT DISTINCT t.id
      FROM tesis t
      LEFT JOIN tesis_chunks c ON t.id = c.tesis_id AND c.embedding IS NOT NULL
      WHERE c.id IS NULL
      ORDER BY t.id
    `);

    return result.rows.map(row => row.id);
  } finally {
    client.release();
  }
}

/**
 * Carga tesis completas desde la BD por sus IDs
 */
async function loadTesisByIds(tesisIds: string[]): Promise<Tesis[]> {
  const tesisList: Tesis[] = [];
  
  console.log(`📥 Cargando ${tesisIds.length} tesis desde la base de datos...`);
  
  for (let i = 0; i < tesisIds.length; i++) {
    const tesisId = tesisIds[i];
    const tesis = await getTesisById(tesisId);
    
    if (tesis) {
      tesisList.push(tesis);
    } else {
      console.warn(`⚠️  Tesis ${tesisId} no encontrada en la BD`);
    }
    
    // Mostrar progreso cada 10 tesis
    if ((i + 1) % 10 === 0 || i === tesisIds.length - 1) {
      console.log(`   Cargadas ${i + 1}/${tesisIds.length} tesis...`);
    }
  }
  
  return tesisList;
}

async function main() {
  console.log("=".repeat(60));
  console.log("🔄 Procesando Tesis sin Embeddings");
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

  try {
    // Verificar estado actual
    console.log("\n📊 Verificando estado actual...");
    const status = await checkIngestionStatus();
    console.log(`   Total de tesis: ${status.totalTesis.toLocaleString()}`);
    console.log(`   Tesis con embeddings: ${status.chunksWithEmbeddings > 0 ? "Sí" : "No"}`);
    
    // Obtener tesis sin embeddings
    console.log("\n🔍 Identificando tesis sin embeddings...");
    const tesisIdsWithoutEmbeddings = await getTesisWithoutEmbeddings();
    
    if (tesisIdsWithoutEmbeddings.length === 0) {
      console.log("✅ ¡Todas las tesis ya tienen embeddings!");
      return;
    }
    
    console.log(`📋 Encontradas ${tesisIdsWithoutEmbeddings.length} tesis sin embeddings`);
    
    // Cargar tesis completas
    const tesisToProcess = await loadTesisByIds(tesisIdsWithoutEmbeddings);
    
    if (tesisToProcess.length === 0) {
      console.error("❌ No se pudieron cargar las tesis");
      process.exit(1);
    }
    
    console.log(`✅ Cargadas ${tesisToProcess.length} tesis para procesar`);
    
    // Configuración
    const batchSize = parseInt(process.env.INGESTION_BATCH_SIZE || "10");
    const embeddingBatchSize = parseInt(process.env.EMBEDDING_BATCH_SIZE || "50");
    
    console.log("\n⚙️  Configuración:");
    console.log(`   Batch size (tesis): ${batchSize}`);
    console.log(`   Embedding batch size: ${embeddingBatchSize}`);
    console.log(`   Provider: ${process.env.EMBEDDING_PROVIDER || "openai"}`);
    
    // Confirmar
    console.log(`\n⚠️  Se procesarán ${tesisToProcess.length} tesis.`);
    console.log("   Presiona Ctrl+C para cancelar...");
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Procesar
    console.log("\n🔄 Iniciando procesamiento...\n");
    
    const stats = await ingestTesisBatch(tesisToProcess, {
      batchSize,
      embeddingBatchSize,
      continueOnError: true,
      logProgress: true,
    });
    
    // Resultados finales
    console.log("\n" + "=".repeat(60));
    console.log("✅ PROCESAMIENTO COMPLETADO");
    console.log("=".repeat(60));
    console.log(`   Tesis procesadas: ${stats.processedTesis}/${stats.totalTesis}`);
    console.log(`   Tesis fallidas: ${stats.failedTesis}`);
    console.log(`   Chunks creados: ${stats.processedChunks}`);
    if (stats.durationMs) {
      const minutes = Math.floor(stats.durationMs / 60000);
      const seconds = Math.floor((stats.durationMs % 60000) / 1000);
      console.log(`   Duración: ${minutes}m ${seconds}s`);
    }
    
    // Verificar estado final
    console.log("\n📊 Verificando estado final...");
    const finalStatus = await checkIngestionStatus();
    const finalTesisWithEmbeddings = await getTesisWithoutEmbeddings();
    console.log(`   Tesis sin embeddings restantes: ${finalTesisWithEmbeddings.length}`);
    
    if (finalTesisWithEmbeddings.length === 0) {
      console.log("\n🎉 ¡Todas las tesis ahora tienen embeddings!");
    }
    
  } catch (error) {
    console.error("\n❌ Error:", error);
    if (error instanceof Error) {
      console.error(`   Mensaje: ${error.message}`);
      console.error(`   Stack: ${error.stack}`);
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Error fatal:", error);
  process.exit(1);
});
