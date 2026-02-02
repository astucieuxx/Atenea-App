/**
 * ATENEA RAG - Pipeline de Ingesta
 * 
 * Pipeline completo: JSON → Chunking → Embeddings → Postgres
 * 
 * Características:
 * - Procesamiento en batch para eficiencia
 * - Manejo de errores y reintentos
 * - Logging de progreso
 * - Resumible (puede continuar desde donde se quedó)
 */

import type { Tesis } from "@shared/schema";
import { chunkTesis, type TextChunk } from "./chunking";
import { generateEmbeddingsBatch, getEmbeddingDimension } from "./embeddings";
import { insertTesis, insertChunk } from "./database";
import { getPool } from "./database";

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

export interface IngestionConfig {
  batchSize: number; // Tesis a procesar por batch
  embeddingBatchSize: number; // Chunks a embedear por batch
  continueOnError: boolean; // Continuar si una tesis falla
  logProgress: boolean; // Mostrar progreso en consola
}

export const DEFAULT_INGESTION_CONFIG: IngestionConfig = {
  batchSize: 10, // Procesar 10 tesis a la vez
  embeddingBatchSize: 50, // Embedear 50 chunks a la vez
  continueOnError: true,
  logProgress: true,
};

// ============================================================================
// ESTADÍSTICAS DE INGESTA
// ============================================================================

export interface IngestionStats {
  totalTesis: number;
  processedTesis: number;
  failedTesis: number;
  totalChunks: number;
  processedChunks: number;
  failedChunks: number;
  startTime: Date;
  endTime?: Date;
  durationMs?: number;
}

// ============================================================================
// INGESTA DE UNA TESIS
// ============================================================================

async function ingestSingleTesis(
  tesis: Tesis,
  config: IngestionConfig
): Promise<{ success: boolean; chunksCreated: number; error?: string }> {
  const maxRetries = 3;
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Paso 1: Insertar tesis en BD (upsert)
      await insertTesis(tesis);

    // Paso 2: Chunkear la tesis
    const chunks = chunkTesis(tesis);
    
    if (chunks.length === 0) {
      return { success: true, chunksCreated: 0 };
    }

    // Paso 3: Generar embeddings en batch
    const chunkTexts = chunks.map(c => c.text);
    const embeddings = await generateEmbeddingsBatch(chunkTexts);

    if (embeddings.length !== chunks.length) {
      throw new Error(`Mismatch: ${chunks.length} chunks but ${embeddings.length} embeddings`);
    }

    // Paso 4: Insertar chunks con embeddings
    let insertedCount = 0;
    for (let i = 0; i < chunks.length; i++) {
      try {
        await insertChunk(tesis.id, chunks[i], embeddings[i]);
        insertedCount++;
      } catch (error) {
        if (!config.continueOnError) {
          throw error;
        }
        console.error(`Error inserting chunk ${i} for tesis ${tesis.id}:`, error);
      }
    }

      return { success: true, chunksCreated: insertedCount };
    } catch (error) {
      lastError = error as Error;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Si es error de conexión, esperar antes de reintentar
      if (errorMessage.includes("timeout") || errorMessage.includes("connection") || errorMessage.includes("authentication")) {
        if (attempt < maxRetries) {
          const waitTime = Math.pow(2, attempt) * 2000; // Exponential backoff: 2s, 4s, 8s
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue; // Reintentar
        }
      }
      
      // Si no es error de conexión o ya agotamos reintentos, fallar
      return { success: false, chunksCreated: 0, error: errorMessage };
    }
  }
  
  // Si llegamos aquí, todos los reintentos fallaron
  const errorMessage = lastError instanceof Error ? lastError.message : String(lastError);
  return { success: false, chunksCreated: 0, error: errorMessage };
}

// ============================================================================
// INGESTA EN BATCH
// ============================================================================

export async function ingestTesisBatch(
  tesisList: Tesis[],
  config: IngestionConfig = DEFAULT_INGESTION_CONFIG
): Promise<IngestionStats> {
  const stats: IngestionStats = {
    totalTesis: tesisList.length,
    processedTesis: 0,
    failedTesis: 0,
    totalChunks: 0,
    processedChunks: 0,
    failedChunks: 0,
    startTime: new Date(),
  };

  if (config.logProgress) {
    console.log(`🚀 Iniciando ingesta de ${tesisList.length} tesis...`);
    console.log(`   Batch size: ${config.batchSize}`);
    console.log(`   Embedding batch size: ${config.embeddingBatchSize}`);
  }

  // Procesar en batches
  for (let i = 0; i < tesisList.length; i += config.batchSize) {
    const batch = tesisList.slice(i, i + config.batchSize);
    
    if (config.logProgress) {
      console.log(`\n📦 Procesando batch ${Math.floor(i / config.batchSize) + 1} (${i + 1}-${Math.min(i + config.batchSize, tesisList.length)}/${tesisList.length})`);
    }

    // Procesar batch secuencialmente para evitar saturar conexiones
    // (en lugar de Promise.all para reducir carga en Supabase)
    const batchResults = [];
    for (const tesis of batch) {
      const result = await ingestSingleTesis(tesis, config);
      batchResults.push(result);
      
      // Pequeña pausa entre tesis para no saturar
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Actualizar estadísticas
    for (const result of batchResults) {
      if (result.success) {
        stats.processedTesis++;
        stats.processedChunks += result.chunksCreated;
        stats.totalChunks += result.chunksCreated;
      } else {
        stats.failedTesis++;
        if (config.logProgress) {
          console.error(`❌ Error en tesis: ${result.error}`);
        }
      }
    }

    if (config.logProgress) {
      const progress = ((i + batch.length) / tesisList.length * 100).toFixed(1);
      console.log(`   ✅ Progreso: ${progress}% (${stats.processedTesis}/${stats.totalTesis} tesis, ${stats.processedChunks} chunks)`);
    }

    // Pequeña pausa entre batches para no saturar APIs
    if (i + config.batchSize < tesisList.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  stats.endTime = new Date();
  stats.durationMs = stats.endTime.getTime() - stats.startTime.getTime();

  if (config.logProgress) {
    console.log(`\n✅ Ingesta completada:`);
    console.log(`   Tesis procesadas: ${stats.processedTesis}/${stats.totalTesis}`);
    console.log(`   Tesis fallidas: ${stats.failedTesis}`);
    console.log(`   Chunks creados: ${stats.processedChunks}`);
    console.log(`   Duración: ${(stats.durationMs / 1000).toFixed(1)}s`);
  }

  return stats;
}

// ============================================================================
// VERIFICAR ESTADO DE INGESTA
// ============================================================================

export async function checkIngestionStatus(): Promise<{
  totalTesis: number;
  tesisWithChunks: number;
  totalChunks: number;
  chunksWithEmbeddings: number;
}> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    const result = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM tesis) AS total_tesis,
        (SELECT COUNT(DISTINCT tesis_id) FROM tesis_chunks) AS tesis_with_chunks,
        (SELECT COUNT(*) FROM tesis_chunks) AS total_chunks,
        (SELECT COUNT(*) FROM tesis_chunks WHERE embedding IS NOT NULL) AS chunks_with_embeddings
    `);

    const row = result.rows[0];
    return {
      totalTesis: parseInt(row.total_tesis),
      tesisWithChunks: parseInt(row.tesis_with_chunks),
      totalChunks: parseInt(row.total_chunks),
      chunksWithEmbeddings: parseInt(row.chunks_with_embeddings),
    };
  } finally {
    client.release();
  }
}

// ============================================================================
// LIMPIAR CHUNKS SIN EMBEDDINGS
// ============================================================================

export async function cleanupIncompleteChunks(): Promise<number> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    const result = await client.query(`
      DELETE FROM tesis_chunks WHERE embedding IS NULL
      RETURNING id
    `);

    return result.rowCount || 0;
  } finally {
    client.release();
  }
}
