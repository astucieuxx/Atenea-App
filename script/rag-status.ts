/**
 * Script de Verificación de Estado RAG
 * 
 * Muestra el estado actual de la ingesta y configuración del RAG.
 */

import { config } from "dotenv";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

// Cargar .env desde la raíz del proyecto
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, "../.env") });

import { checkIngestionStatus } from "../server/rag/ingestion";
import { getPool } from "../server/rag/database";

async function main() {
  console.log("=".repeat(60));
  console.log("📊 ATENEA RAG - Estado del Sistema");
  console.log("=".repeat(60));

  // Verificar variables de entorno
  console.log("\n🔧 Variables de Entorno:");
  console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? "✅ Configurada" : "❌ No configurada"}`);
  console.log(`   OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? "✅ Configurada" : "❌ No configurada"}`);
  console.log(`   EMBEDDING_PROVIDER: ${process.env.EMBEDDING_PROVIDER || "openai (default)"}`);
  console.log(`   EMBEDDING_MODEL: ${process.env.EMBEDDING_MODEL || "text-embedding-3-small (default)"}`);

  // Verificar conexión a BD
  console.log("\n🗄️  Base de Datos:");
  try {
    const pool = getPool();
    const client = await pool.connect();
    
    // Configurar timeout ilimitado para queries largas
    await client.query("SET statement_timeout = 0");
    await client.query("SET lock_timeout = 0");
    
    // Verificar extensión pgvector
    const vectorCheck = await client.query(
      "SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'vector') as has_vector"
    );
    const hasVector = vectorCheck.rows[0].has_vector;
    console.log(`   pgvector: ${hasVector ? "✅ Instalada" : "❌ No instalada"}`);

    // Verificar tablas
    const tablesCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('tesis', 'tesis_chunks', 'ingestion_log')
    `);
    const tableNames = tablesCheck.rows.map(r => r.table_name);
    console.log(`   Tabla 'tesis': ${tableNames.includes('tesis') ? "✅" : "❌"}`);
    console.log(`   Tabla 'tesis_chunks': ${tableNames.includes('tesis_chunks') ? "✅" : "❌"}`);
    console.log(`   Tabla 'ingestion_log': ${tableNames.includes('ingestion_log') ? "✅" : "❌"}`);

    // Verificar índices
    const indexCheck = await client.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'tesis_chunks' 
      AND indexname = 'idx_chunks_embedding_hnsw'
    `);
    console.log(`   Índice HNSW: ${indexCheck.rows.length > 0 ? "✅" : "❌"}`);

    client.release();

    // Estado de ingesta
    console.log("\n📦 Estado de Ingesta:");
    const status = await checkIngestionStatus();
    console.log(`   Tesis en BD: ${status.totalTesis}`);
    console.log(`   Tesis con chunks: ${status.tesisWithChunks}`);
    console.log(`   Chunks totales: ${status.totalChunks}`);
    console.log(`   Chunks con embeddings: ${status.chunksWithEmbeddings}`);
    
    if (status.totalChunks > 0) {
      const completionRate = (status.chunksWithEmbeddings / status.totalChunks * 100).toFixed(1);
      console.log(`   Tasa de completitud: ${completionRate}%`);
    }

    // Estadísticas adicionales
    if (status.totalTesis > 0) {
      console.log("\n📈 Estadísticas:");
      const avgChunksPerTesis = (status.totalChunks / status.totalTesis).toFixed(1);
      console.log(`   Promedio de chunks por tesis: ${avgChunksPerTesis}`);
    }

  } catch (error) {
    console.error("\n❌ Error al verificar BD:", error);
    if (error instanceof Error) {
      console.error(`   Mensaje: ${error.message}`);
    }
    process.exit(1);
  }

  console.log("\n" + "=".repeat(60));
  console.log("✅ Verificación completada");
  console.log("=".repeat(60));
}

main().catch((error) => {
  console.error("Error fatal:", error);
  process.exit(1);
});
