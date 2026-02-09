/**
 * Script para completar embeddings faltantes
 *
 * Maneja DOS casos:
 * 1. Chunks que ya existen pero NO tienen embedding → genera embedding y actualiza
 * 2. Tesis sin chunks (contenido muy corto) → intenta con umbrales relajados
 */

import { config } from "dotenv";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, "../.env") });

import { getPool } from "../server/rag/database";
import { generateEmbeddingsBatch } from "../server/rag/embeddings";
import { chunkTesis } from "../server/rag/chunking";
import type { Tesis } from "../shared/schema";

async function main() {
  console.log("=".repeat(60));
  console.log("🔧 Fix: Completar Embeddings Faltantes");
  console.log("=".repeat(60));

  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL no está definida");
    process.exit(1);
  }
  if (!process.env.EMBEDDING_API_KEY && !process.env.OPENAI_API_KEY) {
    console.error("❌ EMBEDDING_API_KEY o OPENAI_API_KEY no está definida");
    process.exit(1);
  }

  const pool = getPool();
  const client = await pool.connect();
  await client.query("SET statement_timeout = 0");

  try {
    // =========================================================
    // DIAGNÓSTICO
    // =========================================================
    console.log("\n📊 Diagnóstico...");

    const diag = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM tesis) AS total_tesis,
        (SELECT COUNT(DISTINCT tesis_id) FROM tesis_chunks WHERE embedding IS NOT NULL) AS tesis_with_embeddings,
        (SELECT COUNT(*) FROM tesis_chunks WHERE embedding IS NULL) AS chunks_without_embedding,
        (SELECT COUNT(DISTINCT tesis_id) FROM tesis_chunks WHERE embedding IS NULL) AS tesis_with_null_chunks
    `);
    const d = diag.rows[0];

    const totalTesis = parseInt(d.total_tesis);
    const tesisWithEmbeddings = parseInt(d.tesis_with_embeddings);
    const chunksWithoutEmbedding = parseInt(d.chunks_without_embedding);
    const tesisWithNullChunks = parseInt(d.tesis_with_null_chunks);

    console.log(`   Total tesis: ${totalTesis.toLocaleString()}`);
    console.log(`   Tesis con embeddings: ${tesisWithEmbeddings.toLocaleString()}`);
    console.log(`   Chunks SIN embedding: ${chunksWithoutEmbedding.toLocaleString()}`);
    console.log(`   Tesis con chunks sin embedding: ${tesisWithNullChunks.toLocaleString()}`);

    // Contar tesis sin NINGÚN chunk
    const noChunks = await client.query(`
      SELECT COUNT(*) AS count
      FROM tesis t
      LEFT JOIN tesis_chunks c ON t.id = c.tesis_id
      WHERE c.id IS NULL
    `);
    const tesisWithoutAnyChunks = parseInt(noChunks.rows[0].count);
    console.log(`   Tesis sin ningún chunk: ${tesisWithoutAnyChunks.toLocaleString()}`);

    // =========================================================
    // CASO 1: Chunks existentes sin embedding
    // =========================================================
    if (chunksWithoutEmbedding > 0) {
      console.log(`\n🔄 CASO 1: Generando embeddings para ${chunksWithoutEmbedding} chunks existentes...`);

      const batchSize = 50;
      let processed = 0;
      let failed = 0;

      while (true) {
        // Obtener batch de chunks sin embedding
        const batch = await client.query(`
          SELECT id, chunk_text
          FROM tesis_chunks
          WHERE embedding IS NULL
          ORDER BY id
          LIMIT $1
        `, [batchSize]);

        if (batch.rows.length === 0) break;

        try {
          const texts = batch.rows.map((r: { chunk_text: string }) => r.chunk_text);
          const embeddings = await generateEmbeddingsBatch(texts);

          // Actualizar cada chunk con su embedding
          for (let i = 0; i < batch.rows.length; i++) {
            try {
              await client.query(
                `UPDATE tesis_chunks SET embedding = $1 WHERE id = $2`,
                [JSON.stringify(embeddings[i]), batch.rows[i].id]
              );
              processed++;
            } catch (err) {
              failed++;
              console.error(`   ❌ Error actualizando chunk ${batch.rows[i].id}:`, err instanceof Error ? err.message : err);
            }
          }

          console.log(`   ✅ Procesados: ${processed}/${chunksWithoutEmbedding} chunks (${failed} errores)`);
        } catch (err) {
          console.error(`   ❌ Error generando embeddings para batch:`, err instanceof Error ? err.message : err);
          failed += batch.rows.length;
          // Pausa antes de reintentar
          await new Promise(resolve => setTimeout(resolve, 5000));
        }

        // Pausa entre batches para no saturar la API
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      console.log(`   ✅ CASO 1 completado: ${processed} chunks actualizados, ${failed} errores`);
    } else {
      console.log("\n✅ CASO 1: No hay chunks sin embedding.");
    }

    // =========================================================
    // CASO 2: Tesis sin ningún chunk
    // =========================================================
    if (tesisWithoutAnyChunks > 0) {
      console.log(`\n🔄 CASO 2: Procesando ${tesisWithoutAnyChunks} tesis sin chunks...`);

      // Obtener esas tesis
      const missingTesis = await client.query(`
        SELECT t.*
        FROM tesis t
        LEFT JOIN tesis_chunks c ON t.id = c.tesis_id
        WHERE c.id IS NULL
        ORDER BY t.id
      `);

      let created = 0;
      let skipped = 0;
      let errorCount = 0;

      for (let i = 0; i < missingTesis.rows.length; i++) {
        const tesis = missingTesis.rows[i] as Tesis;

        // Intentar chunkear con config relajada
        let chunks = chunkTesis(tesis);

        // Si no genera chunks, el contenido es muy corto - intentar con el título como chunk mínimo
        if (chunks.length === 0) {
          const combinedText = [tesis.title, tesis.abstract, tesis.body_full || tesis.body]
            .filter(Boolean)
            .join(" ")
            .trim();

          if (combinedText.length < 20) {
            skipped++;
            continue;
          }

          // Crear un chunk manual con todo el contenido
          chunks = [{
            text: combinedText,
            chunkIndex: 0,
            chunkType: "body" as const,
            charStart: 0,
            charEnd: combinedText.length,
            tokenCount: Math.ceil(combinedText.length / 4),
          }];
        }

        try {
          const texts = chunks.map(c => c.text);
          const embeddings = await generateEmbeddingsBatch(texts);

          for (let j = 0; j < chunks.length; j++) {
            const chunk = chunks[j];
            await client.query(
              `INSERT INTO tesis_chunks (
                tesis_id, chunk_text, chunk_index, chunk_type,
                embedding, token_count, char_start, char_end
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
              [
                tesis.id,
                chunk.text,
                chunk.chunkIndex,
                chunk.chunkType,
                JSON.stringify(embeddings[j]),
                chunk.tokenCount,
                chunk.charStart,
                chunk.charEnd,
              ]
            );
            created++;
          }
        } catch (err) {
          errorCount++;
          console.error(`   ❌ Error en tesis ${tesis.id}:`, err instanceof Error ? err.message : err);
        }

        if ((i + 1) % 50 === 0 || i === missingTesis.rows.length - 1) {
          console.log(`   Progreso: ${i + 1}/${missingTesis.rows.length} tesis (${created} chunks creados, ${skipped} omitidas, ${errorCount} errores)`);
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log(`   ✅ CASO 2 completado: ${created} chunks creados, ${skipped} tesis omitidas (contenido vacío), ${errorCount} errores`);
    } else {
      console.log("\n✅ CASO 2: Todas las tesis ya tienen chunks.");
    }

    // =========================================================
    // RESULTADO FINAL
    // =========================================================
    console.log("\n📊 Resultado final...");
    const finalResult = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM tesis) AS total_tesis,
        (SELECT COUNT(DISTINCT tesis_id) FROM tesis_chunks WHERE embedding IS NOT NULL) AS tesis_with_embeddings,
        (SELECT COUNT(*) FROM tesis_chunks WHERE embedding IS NULL) AS chunks_without_embedding
    `);
    const f = finalResult.rows[0];
    const finalTotal = parseInt(f.total_tesis);
    const finalWithEmb = parseInt(f.tesis_with_embeddings);
    const finalMissing = parseInt(f.chunks_without_embedding);
    const pct = finalTotal > 0 ? ((finalWithEmb / finalTotal) * 100).toFixed(1) : "0";

    console.log("\n" + "=".repeat(60));
    console.log(`   ✅ Tesis con embeddings: ${finalWithEmb.toLocaleString()} / ${finalTotal.toLocaleString()} (${pct}%)`);
    console.log(`   Chunks sin embedding restantes: ${finalMissing.toLocaleString()}`);
    console.log("=".repeat(60));

  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  } finally {
    client.release();
  }
}

main().catch((error) => {
  console.error("Error fatal:", error);
  process.exit(1);
});
