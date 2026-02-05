/**
 * Script para contar cuántas tesis tienen embeddings
 */

import { config } from "dotenv";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

// Cargar .env desde la raíz del proyecto
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, "../.env") });

import { getPool } from "../server/rag/database";

async function main() {
  try {
    const pool = getPool();
    const client = await pool.connect();

    // Contar tesis que tienen al menos un chunk con embedding
    const result = await client.query(`
      SELECT COUNT(DISTINCT tesis_id) as tesis_with_embeddings
      FROM tesis_chunks
      WHERE embedding IS NOT NULL
    `);

    const tesisWithEmbeddings = parseInt(result.rows[0].tesis_with_embeddings);

    // También obtener el total de tesis para contexto
    const totalResult = await client.query(`
      SELECT COUNT(*) as total_tesis
      FROM tesis
    `);

    const totalTesis = parseInt(totalResult.rows[0].total_tesis);

    client.release();

    console.log("=".repeat(60));
    console.log("📊 Tesis con Embeddings");
    console.log("=".repeat(60));
    console.log(`\n✅ Tesis con embeddings: ${tesisWithEmbeddings.toLocaleString()}`);
    console.log(`📚 Total de tesis en BD: ${totalTesis.toLocaleString()}`);
    
    if (totalTesis > 0) {
      const percentage = ((tesisWithEmbeddings / totalTesis) * 100).toFixed(1);
      console.log(`📈 Porcentaje: ${percentage}%`);
    }

    console.log("\n" + "=".repeat(60));

  } catch (error) {
    console.error("\n❌ Error:", error);
    if (error instanceof Error) {
      console.error(`   Mensaje: ${error.message}`);
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Error fatal:", error);
  process.exit(1);
});
