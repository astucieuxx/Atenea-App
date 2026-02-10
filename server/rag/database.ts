/**
 * ATENEA RAG - Módulo de Base de Datos
 * 
 * Maneja todas las operaciones de base de datos para el RAG:
 * - Inserción de tesis y chunks
 * - Búsqueda vectorial con pgvector
 * - Búsqueda full-text con Postgres
 * - Gestión de conexiones
 */

import pg from "pg";
import type { Tesis } from "@shared/schema";
import type { TextChunk } from "./chunking";

const { Pool } = pg;

// ============================================================================
// CONFIGURACIÓN Y POOL DE CONEXIONES
// ============================================================================

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL environment variable is required");
    }

    pool = new Pool({
      connectionString,
      max: 3,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 30000,
      ssl: connectionString.includes('supabase') ? { rejectUnauthorized: false } : undefined,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
    });

    pool.on("error", (err) => {
      console.error("Pool error:", err instanceof Error ? err.message : String(err));
    });
  }

  return pool;
}

// Función para resetear el pool si es necesario
export function resetPool(): void {
  if (pool) {
    pool.end().catch(() => {
      // Ignorar errores al cerrar
    });
    pool = null;
  }
}

// ============================================================================
// INSERCIÓN DE TESIS
// ============================================================================

export async function insertTesis(tesis: Tesis): Promise<void> {
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    let client;
    try {
      client = await getPool().connect();
      
      await client.query(
      `INSERT INTO tesis (
        id, url, title, abstract, body, body_full, extra_sections,
        instancia, epoca, materias, tesis_numero, tipo, fuente,
        localizacion_libro, localizacion_tomo, localizacion_mes,
        localizacion_anio, localizacion_pagina,
        organo_jurisdiccional, clave, notas, formas_integracion,
        fecha_publicacion, extracted_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
        $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24
      )
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        abstract = EXCLUDED.abstract,
        body = EXCLUDED.body,
        body_full = EXCLUDED.body_full,
        updated_at = NOW()`,
      [
        tesis.id,
        tesis.url || null,
        tesis.title,
        tesis.abstract || null,
        tesis.body || null,
        tesis.body_full || null,
        tesis.extra_sections || null,
        tesis.instancia || null,
        tesis.epoca || null,
        tesis.materias || null,
        tesis.tesis_numero || null,
        tesis.tipo || null,
        tesis.fuente || null,
        tesis.localizacion_libro || null,
        tesis.localizacion_tomo || null,
        tesis.localizacion_mes || null,
        tesis.localizacion_anio || null,
        tesis.localizacion_pagina || null,
        tesis.organo_jurisdiccional || null,
        tesis.clave || null,
        tesis.notas || null,
        tesis.formas_integracion || null,
        tesis.fecha_publicacion || null,
        tesis.extracted_at || null,
      ]
    );
      
      client.release();
      return; // Éxito, salir
    } catch (error) {
      if (client) {
        try {
          client.release();
        } catch {
          // Ignorar errores al liberar
        }
      }
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      lastError = error as Error;
      
      // Si es error de conexión, resetear pool y reintentar
      if ((errorMessage.includes("DbHandler exited") || 
           errorMessage.includes("connection") ||
           errorMessage.includes("XX000") ||
           errorMessage.includes("timeout")) && 
          attempt < maxRetries) {
        console.warn(`⚠️  Error de conexión en insertTesis (intento ${attempt}/${maxRetries}), reintentando...`);
        resetPool(); // Resetear pool para forzar nueva conexión
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000)); // Exponential backoff
        continue;
      }
      
      // Si no es error de conexión o ya agotamos reintentos, lanzar error
      throw error;
    }
  }
  
  // Si llegamos aquí, todos los reintentos fallaron
  throw lastError || new Error("Error desconocido en insertTesis");
}

// ============================================================================
// INSERCIÓN DE CHUNKS CON EMBEDDINGS
// ============================================================================

export async function insertChunk(
  tesisId: string,
  chunk: TextChunk,
  embedding: number[]
): Promise<string> {
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    let client;
    try {
      client = await getPool().connect();
      
      const result = await client.query(
        `INSERT INTO tesis_chunks (
          tesis_id, chunk_text, chunk_index, chunk_type,
          embedding, token_count, char_start, char_end
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id`,
        [
          tesisId,
          chunk.text,
          chunk.chunkIndex,
          chunk.chunkType,
          JSON.stringify(embedding), // pgvector espera el formato correcto
          chunk.tokenCount,
          chunk.charStart,
          chunk.charEnd,
        ]
      );

      client.release();
      return result.rows[0].id;
    } catch (error) {
      if (client) {
        try {
          client.release();
        } catch {
          // Ignorar errores al liberar
        }
      }
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      lastError = error as Error;
      
      // Si es error de conexión, resetear pool y reintentar
      if ((errorMessage.includes("DbHandler exited") || 
           errorMessage.includes("connection") ||
           errorMessage.includes("XX000") ||
           errorMessage.includes("timeout")) && 
          attempt < maxRetries) {
        console.warn(`⚠️  Error de conexión en insertChunk (intento ${attempt}/${maxRetries}), reintentando...`);
        resetPool(); // Resetear pool para forzar nueva conexión
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000)); // Exponential backoff
        continue;
      }
      
      // Si no es error de conexión o ya agotamos reintentos, lanzar error
      throw error;
    }
  }
  
  // Si llegamos aquí, todos los reintentos fallaron
  throw lastError || new Error("Error desconocido en insertChunk");
}

// ============================================================================
// BÚSQUEDA VECTORIAL
// ============================================================================

export interface VectorSearchResult {
  chunkId: string;
  tesisId: string;
  chunkText: string;
  chunkIndex: number;
  chunkType: string;
  similarity: number;
  title: string;
  tipo: string;
  organo_jurisdiccional: string;
}

/**
 * Búsqueda por similitud coseno usando pgvector (optimizada)
 * 
 * Optimizaciones aplicadas:
 * - Usa ef_search para controlar precisión/velocidad de búsqueda HNSW
 * - Query optimizada para mejor uso del índice
 * - Filtro de similitud aplicado después de ordenamiento para mejor rendimiento
 */
export async function vectorSearch(
  queryEmbedding: number[],
  limit: number = 10,
  minSimilarity: number = 0.5,
  efSearch: number = 64 // Parámetro HNSW: más alto = más preciso pero más lento
): Promise<VectorSearchResult[]> {
  const maxRetries = 2;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    let client;
    try {
      client = await getPool().connect();
    } catch (connErr) {
      console.error(`[vectorSearch] Error de conexión (intento ${attempt}/${maxRetries}):`, connErr instanceof Error ? connErr.message : connErr);
      lastError = connErr as Error;
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }
      throw lastError;
    }

    try {
      const fetchLimit = Math.min(limit * 3, 100);
      
      if (!Array.isArray(queryEmbedding) || queryEmbedding.length === 0) {
        throw new Error("queryEmbedding debe ser un array no vacío");
      }
      
      const embeddingJson = JSON.stringify(queryEmbedding);
      console.log(`[vectorSearch] Ejecutando búsqueda vectorial (intento ${attempt})...`);
      
      await client.query("BEGIN");
      await client.query("SET LOCAL statement_timeout = '60000'");
      await client.query("SET LOCAL ivfflat.probes = 10");
      
      const result = await client.query(
        `SELECT 
          c.id AS chunk_id,
          c.tesis_id,
          c.chunk_text,
          c.chunk_index,
          c.chunk_type,
          1 - (c.embedding <=> $1::vector) AS similarity,
          t.title,
          t.tipo,
          t.organo_jurisdiccional
        FROM tesis_chunks c
        INNER JOIN tesis t ON c.tesis_id = t.id
        ORDER BY c.embedding <=> $1::vector
        LIMIT $2`,
        [embeddingJson, fetchLimit]
      );
      
      await client.query("COMMIT");
      
      // Filtrar por similitud mínima después de obtener resultados
      // Esto es más eficiente que filtrar en la query cuando hay muchos vectores
      const filteredResults = result.rows
        .filter((row: any) => {
          const similarity = parseFloat(row.similarity || 0);
          return similarity >= minSimilarity;
        })
        .slice(0, limit)
        .map((row: any) => ({
          chunkId: row.chunk_id,
          tesisId: row.tesis_id,
          chunkText: row.chunk_text,
          chunkIndex: row.chunk_index,
          chunkType: row.chunk_type,
          similarity: parseFloat(row.similarity || 0),
          title: row.title,
          tipo: row.tipo,
          organo_jurisdiccional: row.organo_jurisdiccional,
        }));

      client.release();
      return filteredResults;
    } catch (error) {
      try { await client.query("ROLLBACK"); } catch {}
      try { client.release(); } catch {}
      
      lastError = error as Error;
      console.error(`[vectorSearch] Error (intento ${attempt}/${maxRetries}):`, error instanceof Error ? error.message : error);
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      }
      
      throw error;
    }
  }

  throw lastError || new Error("Error desconocido en vectorSearch");
}

// ============================================================================
// BÚSQUEDA FULL-TEXT
// ============================================================================

export interface FullTextSearchResult {
  chunkId: string;
  tesisId: string;
  chunkText: string;
  chunkIndex: number;
  chunkType: string;
  rank: number;
  title: string;
  tipo: string;
  organo_jurisdiccional: string;
}

/**
 * Búsqueda full-text usando Postgres tsvector
 * Con reintentos para manejar errores de conexión
 */
export async function fullTextSearch(
  query: string,
  limit: number = 10
): Promise<FullTextSearchResult[]> {
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const client = await getPool().connect();

    try {
      await client.query("BEGIN");
      await client.query("SET LOCAL statement_timeout = '120000'");
      
      const result = await client.query(
        `SELECT 
          c.id AS chunk_id,
          c.tesis_id,
          c.chunk_text,
          c.chunk_index,
          c.chunk_type,
          ts_rank(to_tsvector('spanish', c.chunk_text), plainto_tsquery('spanish', $1)) AS rank,
          t.title,
          t.tipo,
          t.organo_jurisdiccional
        FROM tesis_chunks c
        INNER JOIN tesis t ON c.tesis_id = t.id
        WHERE to_tsvector('spanish', c.chunk_text) @@ plainto_tsquery('spanish', $1)
        ORDER BY rank DESC
        LIMIT $2`,
        [query, limit]
      );
      
      await client.query("COMMIT");

      const results = result.rows.map(row => ({
        chunkId: row.chunk_id,
        tesisId: row.tesis_id,
        chunkText: row.chunk_text,
        chunkIndex: row.chunk_index,
        chunkType: row.chunk_type,
        rank: parseFloat(row.rank),
        title: row.title,
        tipo: row.tipo,
        organo_jurisdiccional: row.organo_jurisdiccional,
      }));

      client.release();
      return results;
    } catch (error) {
      try { await client.query("ROLLBACK"); } catch {}
      if (client) {
        try {
          client.release();
        } catch {}
      }
      
      lastError = error as Error;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Si es error de conexión/autenticación, resetear pool y reintentar
      if ((errorMessage.includes("DbHandler exited") || 
           errorMessage.includes("connection") ||
           errorMessage.includes("XX000") ||
           errorMessage.includes("authentication") ||
           errorMessage.includes("timeout") ||
           errorMessage.includes("not available") ||
           errorMessage.includes("08006")) && 
          attempt < maxRetries) {
        const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff: 1s, 2s, 4s
        console.warn(`⚠️ Error de conexión en fullTextSearch (intento ${attempt}/${maxRetries}), reintentando en ${waitTime}ms...`);
        resetPool(); // Resetear pool para forzar nueva conexión
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      // Si no es error de conexión o ya agotamos reintentos, lanzar error
      throw error;
    }
  }

  // Si llegamos aquí, todos los reintentos fallaron
  throw lastError || new Error("Error desconocido en fullTextSearch");
}

// ============================================================================
// BÚSQUEDA HÍBRIDA (Vectorial + Full-Text)
// ============================================================================

export interface HybridSearchResult {
  chunkId: string;
  tesisId: string;
  chunkText: string;
  chunkIndex: number;
  chunkType: string;
  vectorScore: number;
  textScore: number;
  combinedScore: number;
  title: string;
  tipo: string;
  organo_jurisdiccional: string;
}

/**
 * Búsqueda híbrida: combina resultados vectoriales y full-text
 * Usa Reciprocal Rank Fusion (RRF) para combinar rankings
 */
export async function hybridSearch(
  queryEmbedding: number[],
  queryText: string,
  limit: number = 10,
  vectorWeight: number = 0.7, // Peso de búsqueda vectorial (0-1)
  textWeight: number = 0.3 // Peso de búsqueda full-text (0-1)
): Promise<HybridSearchResult[]> {
  // Obtener resultados de ambas búsquedas
  const [vectorResults, textResults] = await Promise.all([
    vectorSearch(queryEmbedding, limit * 2, 0.3), // Más resultados para RRF
    fullTextSearch(queryText, limit * 2),
  ]);

  // Crear mapas de scores por chunk_id
  const vectorScores = new Map<string, number>();
  const textScores = new Map<string, number>();
  const chunkData = new Map<string, Omit<VectorSearchResult, "similarity">>();

  // Procesar resultados vectoriales
  // Usar similarity directamente como base, con pequeño boost RRF para top resultados
  vectorResults.forEach((result, index) => {
    // RRF boost solo para los top 10 resultados (más significativo)
    const rrfBoost = index < 10 ? 1 / (10 + index + 1) : 0;
    // Similarity es la base principal (0-1), con pequeño boost de RRF para top results
    // Si similarity es 0.8, queremos que el score final sea ~0.8 * vectorWeight
    const baseScore = result.similarity;
    // Boost máximo de 5% para top results
    const boostedScore = Math.min(1.0, baseScore + (rrfBoost * 0.05));
    vectorScores.set(result.chunkId, boostedScore * vectorWeight);
    chunkData.set(result.chunkId, {
      chunkId: result.chunkId,
      tesisId: result.tesisId,
      chunkText: result.chunkText,
      chunkIndex: result.chunkIndex,
      chunkType: result.chunkType,
      title: result.title,
      tipo: result.tipo,
      organo_jurisdiccional: result.organo_jurisdiccional,
    });
  });

  // Procesar resultados full-text
  // Mejorar normalización: rank más bajo (mejor) = score más alto
  const maxRank = Math.max(...textResults.map(r => r.rank), 1);
  const minRank = Math.min(...textResults.map(r => r.rank), 1);
  const rankRange = maxRank - minRank || 1;
  
  textResults.forEach((result, index) => {
    // Normalizar rank inversamente: rank más bajo (mejor) = score más alto
    // Si rank es el mínimo (mejor), normalizedRank = 1.0
    // Si rank es el máximo (peor), normalizedRank = 0.0
    const normalizedRank = rankRange > 0 ? 1 - ((result.rank - minRank) / rankRange) : 1;
    // RRF boost solo para top 10
    const rrfBoost = index < 10 ? 1 / (10 + index + 1) : 0;
    // Boost máximo de 5% para top results
    const boostedScore = Math.min(1.0, normalizedRank + (rrfBoost * 0.05));
    textScores.set(result.chunkId, boostedScore * textWeight);
    
    if (!chunkData.has(result.chunkId)) {
      chunkData.set(result.chunkId, {
        chunkId: result.chunkId,
        tesisId: result.tesisId,
        chunkText: result.chunkText,
        chunkIndex: result.chunkIndex,
        chunkType: result.chunkType,
        title: result.title,
        tipo: result.tipo,
        organo_jurisdiccional: result.organo_jurisdiccional,
      });
    }
  });

  // Combinar scores: usar promedio ponderado de los scores normalizados
  // Esto permite que scores altos de similarity se reflejen mejor
  const combined: HybridSearchResult[] = Array.from(chunkData.entries()).map(([chunkId, data]) => {
    const vScore = vectorScores.get(chunkId) || 0;
    const tScore = textScores.get(chunkId) || 0;
    
    // Obtener el score base normalizado (antes de multiplicar por weight)
    // vScore = baseVectorScore * vectorWeight, entonces baseVectorScore = vScore / vectorWeight
    const baseVectorScore = vScore > 0 ? vScore / vectorWeight : 0;
    const baseTextScore = tScore > 0 ? tScore / textWeight : 0;
    
    // Combinar usando promedio ponderado de los scores base normalizados
    let combinedScore: number;
    if (baseVectorScore > 0 && baseTextScore > 0) {
      // Ambos presentes: promedio ponderado (70% vectorial, 30% texto)
      combinedScore = baseVectorScore * 0.7 + baseTextScore * 0.3;
    } else if (baseVectorScore > 0) {
      // Solo vectorial: usar directamente
      combinedScore = baseVectorScore;
    } else if (baseTextScore > 0) {
      // Solo texto: usar directamente
      combinedScore = baseTextScore;
    } else {
      combinedScore = 0;
    }
    
    // Asegurar que esté en rango 0-1
    combinedScore = Math.max(0, Math.min(1.0, combinedScore));

    return {
      ...data,
      vectorScore: vScore,
      textScore: tScore,
      combinedScore,
    };
  });

  // Ordenar por combined score y limitar
  return combined
    .sort((a, b) => b.combinedScore - a.combinedScore)
    .slice(0, limit);
}

// ============================================================================
// UTILIDADES: Verificar si tesis ya tiene chunks
// ============================================================================

export async function tesisHasChunks(tesisId: string): Promise<boolean> {
  const client = await getPool().connect();

  try {
    const result = await client.query(
      `SELECT COUNT(*) as count FROM tesis_chunks WHERE tesis_id = $1 AND embedding IS NOT NULL`,
      [tesisId]
    );

    return parseInt(result.rows[0].count) > 0;
  } finally {
    client.release();
  }
}

// ============================================================================
// UTILIDADES: Obtener IDs de tesis ya procesadas
// ============================================================================

export async function getProcessedTesisIds(): Promise<Set<string>> {
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    let client;
    try {
      client = await getPool().connect();
      
      const result = await client.query(
        `SELECT DISTINCT tesis_id FROM tesis_chunks WHERE embedding IS NOT NULL`
      );

      client.release();
      return new Set(result.rows.map(row => row.tesis_id));
    } catch (error) {
      if (client) {
        try {
          client.release();
        } catch {
          // Ignorar errores al liberar
        }
      }
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      lastError = error as Error;
      
      // Si es error de conexión, resetear pool y reintentar
      if ((errorMessage.includes("DbHandler exited") || 
           errorMessage.includes("connection") ||
           errorMessage.includes("XX000") ||
           errorMessage.includes("timeout")) && 
          attempt < maxRetries) {
        console.warn(`⚠️  Error de conexión en getProcessedTesisIds (intento ${attempt}/${maxRetries}), reintentando...`);
        resetPool(); // Resetear pool para forzar nueva conexión
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000)); // Exponential backoff
        continue;
      }
      
      // Si no es error de conexión o ya agotamos reintentos, lanzar error
      throw error;
    }
  }
  
  // Si llegamos aquí, todos los reintentos fallaron
  throw lastError || new Error("Error desconocido en getProcessedTesisIds");
}

// ============================================================================
// UTILIDADES: Obtener tesis por ID
// ============================================================================

export async function getTesisById(tesisId: string): Promise<Tesis | null> {
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    let client;
    try {
      client = await getPool().connect();
      
      const result = await client.query(
        `SELECT * FROM tesis WHERE id = $1`,
        [tesisId]
      );

      if (result.rows.length === 0) {
        client.release();
        return null;
      }

      const row = result.rows[0];
      const tesis: Tesis = {
        id: row.id,
        url: row.url || "",
        title: row.title,
        abstract: row.abstract || "",
        body: row.body || "",
        body_full: row.body_full || "",
        extra_sections: row.extra_sections || "",
        instancia: row.instancia || "",
        epoca: row.epoca || "",
        materias: row.materias || "",
        tesis_numero: row.tesis_numero || "",
        tipo: row.tipo || "",
        fuente: row.fuente || "",
        localizacion_libro: row.localizacion_libro || "",
        localizacion_tomo: row.localizacion_tomo || "",
        localizacion_mes: row.localizacion_mes || "",
        localizacion_anio: row.localizacion_anio || "",
        localizacion_pagina: row.localizacion_pagina || "",
        organo_jurisdiccional: row.organo_jurisdiccional || "",
        clave: row.clave || "",
        notas: row.notas || "",
        formas_integracion: row.formas_integracion || "",
        fecha_publicacion: row.fecha_publicacion || "",
        extracted_at: row.extracted_at || "",
      };

      client.release();
      return tesis;
    } catch (error) {
      if (client) {
        try {
          client.release();
        } catch {
          // Ignorar errores al liberar
        }
      }
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      lastError = error as Error;
      
      // Si es error de conexión, resetear pool y reintentar
      if ((errorMessage.includes("DbHandler exited") || 
           errorMessage.includes("connection") ||
           errorMessage.includes("XX000") ||
           errorMessage.includes("timeout") ||
           errorMessage.includes("not available") ||
           errorMessage.includes("Authentication")) && 
          attempt < maxRetries) {
        console.warn(`⚠️  Error de conexión en getTesisById (intento ${attempt}/${maxRetries}), reintentando...`);
        resetPool(); // Resetear pool para forzar nueva conexión
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000)); // Exponential backoff
        continue;
      }
      
      // Si no es error de conexión o ya agotamos reintentos, lanzar error
      throw error;
    }
  }
  
  // Si llegamos aquí, todos los reintentos fallaron
  throw lastError || new Error("Error desconocido en getTesisById");
}
