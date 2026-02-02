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
      max: 5, // Reducido para evitar saturar Supabase
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 60000, // Aumentado a 60 segundos
      // Parámetros adicionales para Supabase
      ssl: process.env.DATABASE_URL?.includes('supabase') ? { rejectUnauthorized: false } : undefined,
      // Configuración adicional para Supabase pooler
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
    });

    // Manejo de errores del pool
    pool.on("error", (err) => {
      console.error("Unexpected error on idle client", err);
    });
  }

  return pool;
}

// ============================================================================
// INSERCIÓN DE TESIS
// ============================================================================

export async function insertTesis(tesis: Tesis): Promise<void> {
  const client = await getPool().connect();

  try {
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
  } finally {
    client.release();
  }
}

// ============================================================================
// INSERCIÓN DE CHUNKS CON EMBEDDINGS
// ============================================================================

export async function insertChunk(
  tesisId: string,
  chunk: TextChunk,
  embedding: number[]
): Promise<string> {
  const client = await getPool().connect();

  try {
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

    return result.rows[0].id;
  } finally {
    client.release();
  }
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
 * Búsqueda por similitud coseno usando pgvector
 */
export async function vectorSearch(
  queryEmbedding: number[],
  limit: number = 10,
  minSimilarity: number = 0.5
): Promise<VectorSearchResult[]> {
  const client = await getPool().connect();

  try {
    // pgvector usa el operador <=> para distancia coseno
    // 1 - distancia = similitud
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
      WHERE c.embedding IS NOT NULL
        AND (1 - (c.embedding <=> $1::vector)) >= $2
      ORDER BY c.embedding <=> $1::vector
      LIMIT $3`,
      [JSON.stringify(queryEmbedding), minSimilarity, limit]
    );

    return result.rows.map(row => ({
      chunkId: row.chunk_id,
      tesisId: row.tesis_id,
      chunkText: row.chunk_text,
      chunkIndex: row.chunk_index,
      chunkType: row.chunk_type,
      similarity: parseFloat(row.similarity),
      title: row.title,
      tipo: row.tipo,
      organo_jurisdiccional: row.organo_jurisdiccional,
    }));
  } finally {
    client.release();
  }
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
 */
export async function fullTextSearch(
  query: string,
  limit: number = 10
): Promise<FullTextSearchResult[]> {
  const client = await getPool().connect();

  try {
    // Usar to_tsquery para búsqueda en español
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

    return result.rows.map(row => ({
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
  } finally {
    client.release();
  }
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
  vectorResults.forEach((result, index) => {
    const rrfScore = 1 / (60 + index + 1); // RRF: 1/(k + rank)
    vectorScores.set(result.chunkId, result.similarity * vectorWeight + rrfScore * (1 - vectorWeight));
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
  textResults.forEach((result, index) => {
    const rrfScore = 1 / (60 + index + 1);
    const normalizedRank = result.rank / Math.max(...textResults.map(r => r.rank), 1);
    textScores.set(result.chunkId, normalizedRank * textWeight + rrfScore * (1 - textWeight));
    
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

  // Combinar scores y ordenar
  const combined: HybridSearchResult[] = Array.from(chunkData.entries()).map(([chunkId, data]) => {
    const vScore = vectorScores.get(chunkId) || 0;
    const tScore = textScores.get(chunkId) || 0;
    const combinedScore = vScore + tScore;

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
  const client = await getPool().connect();

  try {
    const result = await client.query(
      `SELECT DISTINCT tesis_id FROM tesis_chunks WHERE embedding IS NOT NULL`
    );

    return new Set(result.rows.map(row => row.tesis_id));
  } finally {
    client.release();
  }
}

// ============================================================================
// UTILIDADES: Obtener tesis por ID
// ============================================================================

export async function getTesisById(tesisId: string): Promise<Tesis | null> {
  const client = await getPool().connect();

  try {
    const result = await client.query(
      `SELECT * FROM tesis WHERE id = $1`,
      [tesisId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
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
  } finally {
    client.release();
  }
}
