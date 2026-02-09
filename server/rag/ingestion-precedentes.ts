/**
 * ATENEA RAG - Pipeline de Ingesta para Precedentes
 *
 * Pipeline: JSONL → Chunking → Embeddings → Postgres (precedentes + precedentes_chunks)
 *
 * Paralelo al pipeline de tesis pero adaptado para la estructura de precedentes.
 */

import type { Precedente } from "@shared/schema";
import { chunkPrecedente } from "./chunking-precedentes";
import type { TextChunk } from "./chunking";
import { generateEmbeddingsBatch } from "./embeddings";
import { insertPrecedente, insertPrecedenteChunk } from "./database-precedentes";
import { getPool } from "./database";

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

export interface PrecedenteIngestionConfig {
  batchSize: number;
  embeddingBatchSize: number;
  continueOnError: boolean;
  logProgress: boolean;
}

export const DEFAULT_PRECEDENTE_INGESTION: PrecedenteIngestionConfig = {
  batchSize: 10,
  embeddingBatchSize: 50,
  continueOnError: true,
  logProgress: true,
};

// ============================================================================
// ESTADÍSTICAS
// ============================================================================

export interface PrecedenteIngestionStats {
  totalPrecedentes: number;
  processedPrecedentes: number;
  failedPrecedentes: number;
  totalChunks: number;
  processedChunks: number;
  failedChunks: number;
  startTime: Date;
  endTime?: Date;
  durationMs?: number;
}

// ============================================================================
// INGESTA DE UN PRECEDENTE
// ============================================================================

async function ingestSinglePrecedente(
  precedente: Precedente,
  config: PrecedenteIngestionConfig,
): Promise<{ success: boolean; chunksCreated: number; error?: string }> {
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // 1. Insertar precedente en BD (upsert)
      await insertPrecedente(precedente);

      // 2. Chunkear
      const chunks = chunkPrecedente(precedente);

      if (chunks.length === 0) {
        return { success: true, chunksCreated: 0 };
      }

      // 3. Generar embeddings
      const chunkTexts = chunks.map(c => c.text);
      const embeddings = await generateEmbeddingsBatch(chunkTexts);

      if (embeddings.length !== chunks.length) {
        throw new Error(`Mismatch: ${chunks.length} chunks but ${embeddings.length} embeddings`);
      }

      // 4. Insertar chunks con embeddings
      let insertedCount = 0;
      for (let i = 0; i < chunks.length; i++) {
        try {
          await insertPrecedenteChunk(precedente.id, chunks[i], embeddings[i]);
          insertedCount++;
        } catch (error) {
          if (!config.continueOnError) throw error;
          console.error(`Error inserting chunk ${i} for precedente ${precedente.id}:`, error);
        }
      }

      return { success: true, chunksCreated: insertedCount };
    } catch (error) {
      lastError = error as Error;
      const msg = error instanceof Error ? error.message : String(error);

      if (msg.includes("timeout") || msg.includes("connection") || msg.includes("authentication")) {
        if (attempt < maxRetries) {
          const waitTime = Math.pow(2, attempt) * 2000;
          await new Promise(r => setTimeout(r, waitTime));
          continue;
        }
      }

      return { success: false, chunksCreated: 0, error: msg };
    }
  }

  const msg = lastError instanceof Error ? lastError.message : String(lastError);
  return { success: false, chunksCreated: 0, error: msg };
}

// ============================================================================
// INGESTA EN BATCH
// ============================================================================

export async function ingestPrecedenteBatch(
  precedentes: Precedente[],
  config: PrecedenteIngestionConfig = DEFAULT_PRECEDENTE_INGESTION,
): Promise<PrecedenteIngestionStats> {
  const stats: PrecedenteIngestionStats = {
    totalPrecedentes: precedentes.length,
    processedPrecedentes: 0,
    failedPrecedentes: 0,
    totalChunks: 0,
    processedChunks: 0,
    failedChunks: 0,
    startTime: new Date(),
  };

  if (config.logProgress) {
    console.log(`🚀 Iniciando ingesta de ${precedentes.length} precedentes...`);
    console.log(`   Batch size: ${config.batchSize}`);
    console.log(`   Embedding batch size: ${config.embeddingBatchSize}`);
  }

  for (let i = 0; i < precedentes.length; i += config.batchSize) {
    const batch = precedentes.slice(i, i + config.batchSize);

    if (config.logProgress) {
      console.log(`\n📦 Procesando batch ${Math.floor(i / config.batchSize) + 1} (${i + 1}-${Math.min(i + config.batchSize, precedentes.length)}/${precedentes.length})`);
    }

    const batchResults = [];
    for (const p of batch) {
      const result = await ingestSinglePrecedente(p, config);
      batchResults.push(result);
      await new Promise(r => setTimeout(r, 100));
    }

    for (const result of batchResults) {
      if (result.success) {
        stats.processedPrecedentes++;
        stats.processedChunks += result.chunksCreated;
        stats.totalChunks += result.chunksCreated;
      } else {
        stats.failedPrecedentes++;
        if (config.logProgress) {
          console.error(`❌ Error en precedente: ${result.error}`);
        }
      }
    }

    if (config.logProgress) {
      const progress = ((i + batch.length) / precedentes.length * 100).toFixed(1);
      console.log(`   ✅ Progreso: ${progress}% (${stats.processedPrecedentes}/${stats.totalPrecedentes} precedentes, ${stats.processedChunks} chunks)`);
    }

    if (i + config.batchSize < precedentes.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  stats.endTime = new Date();
  stats.durationMs = stats.endTime.getTime() - stats.startTime.getTime();

  if (config.logProgress) {
    console.log(`\n✅ Ingesta completada:`);
    console.log(`   Precedentes procesados: ${stats.processedPrecedentes}/${stats.totalPrecedentes}`);
    console.log(`   Precedentes fallidos: ${stats.failedPrecedentes}`);
    console.log(`   Chunks creados: ${stats.processedChunks}`);
    if (stats.durationMs) {
      const minutes = Math.floor(stats.durationMs / 60000);
      const seconds = Math.floor((stats.durationMs % 60000) / 1000);
      console.log(`   Duración: ${minutes}m ${seconds}s`);
    }
  }

  return stats;
}

// ============================================================================
// VERIFICAR ESTADO
// ============================================================================

export async function checkPrecedenteIngestionStatus(): Promise<{
  totalPrecedentes: number;
  precedentesWithChunks: number;
  totalChunks: number;
  chunksWithEmbeddings: number;
}> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("SET statement_timeout = 0");

    const result = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM precedentes) AS total_precedentes,
        (SELECT COUNT(DISTINCT precedente_id) FROM precedentes_chunks) AS prec_with_chunks,
        (SELECT COUNT(*) FROM precedentes_chunks) AS total_chunks,
        (SELECT COUNT(*) FROM precedentes_chunks WHERE embedding IS NOT NULL) AS chunks_with_embeddings
    `);

    const row = result.rows[0];
    return {
      totalPrecedentes: parseInt(row.total_precedentes),
      precedentesWithChunks: parseInt(row.prec_with_chunks),
      totalChunks: parseInt(row.total_chunks),
      chunksWithEmbeddings: parseInt(row.chunks_with_embeddings),
    };
  } finally {
    client.release();
  }
}
