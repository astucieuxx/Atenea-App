/**
 * ATENEA RAG - Base de Datos para Precedentes
 *
 * Operaciones de BD para precedentes judiciales:
 * - Inserción de precedentes y chunks
 * - Búsqueda vectorial y full-text en precedentes_chunks
 * - Búsqueda híbrida con RRF
 */

import type { Precedente } from "@shared/schema";
import type { TextChunk } from "./chunking";
import { getPool, resetPool } from "./database";

// ============================================================================
// INSERCIÓN DE PRECEDENTES
// ============================================================================

export async function insertPrecedente(p: Precedente): Promise<void> {
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    let client;
    try {
      client = await getPool().connect();

      await client.query(
        `INSERT INTO precedentes (
          id, ius, rubro, texto_publicacion, localizacion, sala,
          tipo_asunto, tipo_asunto_expediente, promovente,
          fecha_publicacion, temas, votos, votacion, semanal,
          url_origen, raw_fields, scraped_at
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17
        )
        ON CONFLICT (id) DO UPDATE SET
          rubro = EXCLUDED.rubro,
          texto_publicacion = EXCLUDED.texto_publicacion,
          updated_at = NOW()`,
        [
          p.id,
          p.ius || null,
          p.rubro,
          p.texto_publicacion || null,
          p.localizacion || null,
          p.sala || null,
          p.tipo_asunto || null,
          p.tipo_asunto_expediente || null,
          p.promovente || null,
          p.fecha_publicacion || null,
          p.temas || null,
          p.votos || null,
          p.votacion ?? false,
          p.semanal ?? false,
          p.url_origen || null,
          p.raw_fields || null,
          p.scraped_at || null,
        ]
      );

      client.release();
      return;
    } catch (error) {
      if (client) {
        try { client.release(); } catch {}
      }

      const msg = error instanceof Error ? error.message : String(error);
      lastError = error as Error;

      if ((msg.includes("DbHandler exited") ||
           msg.includes("connection") ||
           msg.includes("XX000") ||
           msg.includes("timeout")) &&
          attempt < maxRetries) {
        console.warn(`⚠️  Error de conexión en insertPrecedente (intento ${attempt}/${maxRetries}), reintentando...`);
        resetPool();
        await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
        continue;
      }

      throw error;
    }
  }

  throw lastError || new Error("Error desconocido en insertPrecedente");
}

// ============================================================================
// INSERCIÓN DE CHUNKS
// ============================================================================

export async function insertPrecedenteChunk(
  precedenteId: string,
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
        `INSERT INTO precedentes_chunks (
          precedente_id, chunk_text, chunk_index, chunk_type,
          embedding, token_count, char_start, char_end
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        RETURNING id`,
        [
          precedenteId,
          chunk.text,
          chunk.chunkIndex,
          chunk.chunkType,
          JSON.stringify(embedding),
          chunk.tokenCount,
          chunk.charStart,
          chunk.charEnd,
        ]
      );

      client.release();
      return result.rows[0].id;
    } catch (error) {
      if (client) {
        try { client.release(); } catch {}
      }

      const msg = error instanceof Error ? error.message : String(error);
      lastError = error as Error;

      if ((msg.includes("DbHandler exited") ||
           msg.includes("connection") ||
           msg.includes("XX000") ||
           msg.includes("timeout")) &&
          attempt < maxRetries) {
        console.warn(`⚠️  Error de conexión en insertPrecedenteChunk (intento ${attempt}/${maxRetries}), reintentando...`);
        resetPool();
        await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
        continue;
      }

      throw error;
    }
  }

  throw lastError || new Error("Error desconocido en insertPrecedenteChunk");
}

// ============================================================================
// BÚSQUEDA VECTORIAL EN PRECEDENTES
// ============================================================================

export interface PrecedenteVectorResult {
  chunkId: string;
  precedenteId: string;
  chunkText: string;
  chunkIndex: number;
  chunkType: string;
  similarity: number;
  rubro: string;
  sala: string;
  tipo_asunto: string;
}

export async function vectorSearchPrecedentes(
  queryEmbedding: number[],
  limit: number = 10,
  minSimilarity: number = 0.5,
): Promise<PrecedenteVectorResult[]> {
  const maxRetries = 2;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    let client;
    try {
      client = await getPool().connect();
    } catch (connErr) {
      lastError = connErr as Error;
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }
      throw lastError;
    }

    try {
      const fetchLimit = Math.min(limit * 3, 100);
      const embeddingJson = JSON.stringify(queryEmbedding);

      await client.query("BEGIN");
      await client.query("SET LOCAL statement_timeout = '60000'");

      const result = await client.query(
        `SELECT
          c.id AS chunk_id,
          c.precedente_id,
          c.chunk_text,
          c.chunk_index,
          c.chunk_type,
          1 - (c.embedding <=> $1::vector) AS similarity,
          p.rubro,
          p.sala,
          p.tipo_asunto
        FROM precedentes_chunks c
        INNER JOIN precedentes p ON c.precedente_id = p.id
        ORDER BY c.embedding <=> $1::vector
        LIMIT $2`,
        [embeddingJson, fetchLimit]
      );

      await client.query("COMMIT");

      const filtered = result.rows
        .filter((row: any) => parseFloat(row.similarity || 0) >= minSimilarity)
        .slice(0, limit)
        .map((row: any) => ({
          chunkId: row.chunk_id,
          precedenteId: row.precedente_id,
          chunkText: row.chunk_text,
          chunkIndex: row.chunk_index,
          chunkType: row.chunk_type,
          similarity: parseFloat(row.similarity || 0),
          rubro: row.rubro,
          sala: row.sala,
          tipo_asunto: row.tipo_asunto,
        }));

      client.release();
      return filtered;
    } catch (error) {
      try { await client.query("ROLLBACK"); } catch {}
      try { client.release(); } catch {}

      lastError = error as Error;
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }
      throw error;
    }
  }

  throw lastError || new Error("Error desconocido en vectorSearchPrecedentes");
}

// ============================================================================
// BÚSQUEDA FULL-TEXT EN PRECEDENTES
// ============================================================================

export interface PrecedenteFullTextResult {
  chunkId: string;
  precedenteId: string;
  chunkText: string;
  chunkIndex: number;
  chunkType: string;
  rank: number;
  rubro: string;
  sala: string;
  tipo_asunto: string;
}

export async function fullTextSearchPrecedentes(
  query: string,
  limit: number = 10,
): Promise<PrecedenteFullTextResult[]> {
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
          c.precedente_id,
          c.chunk_text,
          c.chunk_index,
          c.chunk_type,
          ts_rank(to_tsvector('spanish', c.chunk_text), plainto_tsquery('spanish', $1)) AS rank,
          p.rubro,
          p.sala,
          p.tipo_asunto
        FROM precedentes_chunks c
        INNER JOIN precedentes p ON c.precedente_id = p.id
        WHERE to_tsvector('spanish', c.chunk_text) @@ plainto_tsquery('spanish', $1)
        ORDER BY rank DESC
        LIMIT $2`,
        [query, limit]
      );

      await client.query("COMMIT");

      const results = result.rows.map((row: any) => ({
        chunkId: row.chunk_id,
        precedenteId: row.precedente_id,
        chunkText: row.chunk_text,
        chunkIndex: row.chunk_index,
        chunkType: row.chunk_type,
        rank: parseFloat(row.rank),
        rubro: row.rubro,
        sala: row.sala,
        tipo_asunto: row.tipo_asunto,
      }));

      client.release();
      return results;
    } catch (error) {
      try { await client.query("ROLLBACK"); } catch {}
      if (client) {
        try { client.release(); } catch {}
      }

      const msg = error instanceof Error ? error.message : String(error);
      lastError = error as Error;

      if ((msg.includes("DbHandler exited") ||
           msg.includes("connection") ||
           msg.includes("XX000") ||
           msg.includes("timeout")) &&
          attempt < maxRetries) {
        const waitTime = Math.pow(2, attempt) * 1000;
        console.warn(`⚠️ Error en fullTextSearchPrecedentes (intento ${attempt}/${maxRetries}), reintentando en ${waitTime}ms...`);
        resetPool();
        await new Promise(r => setTimeout(r, waitTime));
        continue;
      }

      throw error;
    }
  }

  throw lastError || new Error("Error desconocido en fullTextSearchPrecedentes");
}

// ============================================================================
// BÚSQUEDA HÍBRIDA EN PRECEDENTES
// ============================================================================

export interface PrecedenteHybridResult {
  chunkId: string;
  precedenteId: string;
  chunkText: string;
  chunkIndex: number;
  chunkType: string;
  vectorScore: number;
  textScore: number;
  combinedScore: number;
  rubro: string;
  sala: string;
  tipo_asunto: string;
}

export async function hybridSearchPrecedentes(
  queryEmbedding: number[],
  queryText: string,
  limit: number = 10,
  vectorWeight: number = 0.7,
  textWeight: number = 0.3,
): Promise<PrecedenteHybridResult[]> {
  const [vectorResults, textResults] = await Promise.all([
    vectorSearchPrecedentes(queryEmbedding, limit * 2, 0.3),
    fullTextSearchPrecedentes(queryText, limit * 2),
  ]);

  const vectorScores = new Map<string, number>();
  const textScores = new Map<string, number>();
  const chunkData = new Map<string, Omit<PrecedenteVectorResult, "similarity">>();

  // Procesar resultados vectoriales - mismo cálculo mejorado que en tesis
  vectorResults.forEach((result, index) => {
    const rrfBoost = index < 10 ? 1 / (10 + index + 1) : 0;
    const baseScore = result.similarity;
    const boostedScore = Math.min(1.0, baseScore + (rrfBoost * 0.05));
    vectorScores.set(result.chunkId, boostedScore * vectorWeight);
    chunkData.set(result.chunkId, {
      chunkId: result.chunkId,
      precedenteId: result.precedenteId,
      chunkText: result.chunkText,
      chunkIndex: result.chunkIndex,
      chunkType: result.chunkType,
      rubro: result.rubro,
      sala: result.sala,
      tipo_asunto: result.tipo_asunto,
    });
  });

  // Procesar resultados full-text - mismo cálculo mejorado que en tesis
  const maxRank = Math.max(...textResults.map(r => r.rank), 1);
  const minRank = Math.min(...textResults.map(r => r.rank), 1);
  const rankRange = maxRank - minRank || 1;
  
  textResults.forEach((result, index) => {
    const normalizedRank = rankRange > 0 ? 1 - ((result.rank - minRank) / rankRange) : 1;
    const rrfBoost = index < 10 ? 1 / (10 + index + 1) : 0;
    const boostedScore = Math.min(1.0, normalizedRank + (rrfBoost * 0.05));
    textScores.set(result.chunkId, boostedScore * textWeight);

    if (!chunkData.has(result.chunkId)) {
      chunkData.set(result.chunkId, {
        chunkId: result.chunkId,
        precedenteId: result.precedenteId,
        chunkText: result.chunkText,
        chunkIndex: result.chunkIndex,
        chunkType: result.chunkType,
        rubro: result.rubro,
        sala: result.sala,
        tipo_asunto: result.tipo_asunto,
      });
    }
  });

  // Combinar scores: usar promedio ponderado de los scores normalizados (mismo cálculo que en tesis)
  const combined: PrecedenteHybridResult[] = Array.from(chunkData.entries()).map(([chunkId, data]) => {
    const vScore = vectorScores.get(chunkId) || 0;
    const tScore = textScores.get(chunkId) || 0;
    
    // Obtener el score base normalizado (antes de multiplicar por weight)
    const baseVectorScore = vScore > 0 ? vScore / vectorWeight : 0;
    const baseTextScore = tScore > 0 ? tScore / textWeight : 0;
    
    // Combinar usando promedio ponderado de los scores base normalizados
    let combinedScore: number;
    if (baseVectorScore > 0 && baseTextScore > 0) {
      combinedScore = baseVectorScore * 0.7 + baseTextScore * 0.3;
    } else if (baseVectorScore > 0) {
      combinedScore = baseVectorScore;
    } else if (baseTextScore > 0) {
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

  return combined
    .sort((a, b) => b.combinedScore - a.combinedScore)
    .slice(0, limit);
}

// ============================================================================
// UTILIDADES
// ============================================================================

export async function precedenteHasChunks(precedenteId: string): Promise<boolean> {
  const client = await getPool().connect();
  try {
    const result = await client.query(
      `SELECT COUNT(*) as count FROM precedentes_chunks WHERE precedente_id = $1 AND embedding IS NOT NULL`,
      [precedenteId]
    );
    return parseInt(result.rows[0].count) > 0;
  } finally {
    client.release();
  }
}

export async function getProcessedPrecedenteIds(): Promise<Set<string>> {
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    let client;
    try {
      client = await getPool().connect();
      const result = await client.query(
        `SELECT DISTINCT precedente_id FROM precedentes_chunks WHERE embedding IS NOT NULL`
      );
      client.release();
      return new Set(result.rows.map(row => row.precedente_id));
    } catch (error) {
      if (client) {
        try { client.release(); } catch {}
      }

      const msg = error instanceof Error ? error.message : String(error);
      lastError = error as Error;

      if ((msg.includes("DbHandler exited") ||
           msg.includes("connection") ||
           msg.includes("XX000") ||
           msg.includes("timeout")) &&
          attempt < maxRetries) {
        resetPool();
        await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
        continue;
      }
      throw error;
    }
  }

  throw lastError || new Error("Error desconocido en getProcessedPrecedenteIds");
}

export async function getPrecedenteById(precedenteId: string): Promise<Precedente | null> {
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    let client;
    try {
      client = await getPool().connect();
      const result = await client.query(
        `SELECT * FROM precedentes WHERE id = $1`,
        [precedenteId]
      );

      if (result.rows.length === 0) {
        client.release();
        return null;
      }

      const row = result.rows[0];
      const precedente: Precedente = {
        id: row.id,
        ius: row.ius || 0,
        rubro: row.rubro || "",
        texto_publicacion: row.texto_publicacion || "",
        localizacion: row.localizacion || "",
        sala: row.sala || "",
        tipo_asunto: row.tipo_asunto || "",
        tipo_asunto_expediente: row.tipo_asunto_expediente || "",
        promovente: row.promovente || "",
        fecha_publicacion: row.fecha_publicacion || "",
        temas: row.temas || "[]",
        votos: row.votos || "[]",
        votacion: row.votacion || false,
        semanal: row.semanal || false,
        url_origen: row.url_origen || "",
        raw_fields: row.raw_fields || "{}",
        scraped_at: row.scraped_at || "",
      };

      client.release();
      return precedente;
    } catch (error) {
      if (client) {
        try { client.release(); } catch {}
      }

      const msg = error instanceof Error ? error.message : String(error);
      lastError = error as Error;

      if ((msg.includes("DbHandler exited") ||
           msg.includes("connection") ||
           msg.includes("XX000") ||
           msg.includes("timeout") ||
           msg.includes("Authentication")) &&
          attempt < maxRetries) {
        resetPool();
        await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
        continue;
      }
      throw error;
    }
  }

  throw lastError || new Error("Error desconocido en getPrecedenteById");
}
