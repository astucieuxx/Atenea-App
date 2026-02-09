/**
 * ATENEA RAG - Módulo de Retrieval
 *
 * Coordina la recuperación de tesis Y precedentes relevantes para una pregunta.
 *
 * Estrategia:
 * - Búsqueda híbrida (vectorial + full-text) en ambas tablas
 * - Deduplicación por documento (un chunk por tesis/precedente)
 * - Filtrado por relevancia mínima
 * - Ordenamiento por score combinado
 */

import { generateEmbedding } from "./embeddings";
import { hybridSearch, getTesisById, type HybridSearchResult } from "./database";
import {
  hybridSearchPrecedentes,
  getPrecedenteById,
  type PrecedenteHybridResult,
} from "./database-precedentes";
import type { Tesis, Precedente } from "@shared/schema";

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

export interface RetrievalConfig {
  maxResults: number; // Máximo de chunks a recuperar inicialmente
  finalLimit: number; // Máximo de tesis únicas a retornar
  minSimilarity: number; // Similitud mínima para considerar relevante
  vectorWeight: number; // Peso de búsqueda vectorial (0-1)
  textWeight: number; // Peso de búsqueda full-text (0-1)
  deduplicateByTesis: boolean; // Si true, solo retorna el mejor chunk por tesis
  includePrecedentes?: boolean; // Si true, también busca en precedentes
}

export const DEFAULT_RETRIEVAL_CONFIG: RetrievalConfig = {
  maxResults: 30, // Aumentado de 20 a 30 para buscar más resultados
  finalLimit: 10, // Aumentado de 5 a 10 para tener más opciones
  minSimilarity: 0.3, // Reducido de 0.5 a 0.3 para ser más permisivo
  vectorWeight: 0.7,
  textWeight: 0.3,
  deduplicateByTesis: true,
  includePrecedentes: true,
};

// ============================================================================
// RESULTADO DE RETRIEVAL
// ============================================================================

export interface RetrievedTesis {
  tesis: Tesis;
  chunkText: string;
  chunkIndex: number;
  chunkType: string;
  relevanceScore: number;
  vectorScore: number;
  textScore: number;
}

export interface RetrievedPrecedente {
  precedente: Precedente;
  chunkText: string;
  chunkIndex: number;
  chunkType: string;
  relevanceScore: number;
  vectorScore: number;
  textScore: number;
}

export interface RetrievalResult {
  tesis: RetrievedTesis[];
  precedentes: RetrievedPrecedente[];
}

// ============================================================================
// RETRIEVAL PRINCIPAL (tesis only - backwards compatible)
// ============================================================================

export async function retrieveRelevantTesis(
  query: string,
  config: RetrievalConfig = DEFAULT_RETRIEVAL_CONFIG
): Promise<RetrievedTesis[]> {
  console.log(`[retrieval] Paso 1: Generando embedding para query...`);
  const queryEmbedding = await generateEmbedding(query);
  console.log(`[retrieval] Embedding generado (${queryEmbedding.length} dimensiones)`);

  console.log(`[retrieval] Paso 2: Ejecutando búsqueda híbrida...`);
  const searchResults = await hybridSearch(
    queryEmbedding,
    query,
    config.maxResults,
    config.vectorWeight,
    config.textWeight
  );

  // Paso 3: Filtrar por similitud mínima
  const filteredResults = searchResults.filter(
    result => result.combinedScore >= config.minSimilarity
  );

  if (filteredResults.length === 0) {
    return [];
  }

  // Paso 4: Deduplicar por tesis_id (si está habilitado)
  let processedResults: HybridSearchResult[];
  if (config.deduplicateByTesis) {
    const tesisMap = new Map<string, HybridSearchResult>();

    for (const result of filteredResults) {
      const existing = tesisMap.get(result.tesisId);
      if (!existing || result.combinedScore > existing.combinedScore) {
        tesisMap.set(result.tesisId, result);
      }
    }

    processedResults = Array.from(tesisMap.values())
      .sort((a, b) => b.combinedScore - a.combinedScore)
      .slice(0, config.finalLimit);
  } else {
    processedResults = filteredResults.slice(0, config.finalLimit);
  }

  // Paso 5: Obtener tesis completas
  const retrievedTesis: RetrievedTesis[] = [];

  for (const result of processedResults) {
    const tesis = await getTesisById(result.tesisId);
    if (tesis) {
      retrievedTesis.push({
        tesis,
        chunkText: result.chunkText,
        chunkIndex: result.chunkIndex,
        chunkType: result.chunkType,
        relevanceScore: result.combinedScore,
        vectorScore: result.vectorScore,
        textScore: result.textScore,
      });
    }
  }

  return retrievedTesis;
}

// ============================================================================
// RETRIEVAL COMBINADO (tesis + precedentes)
// ============================================================================

export async function retrieveRelevantDocuments(
  query: string,
  config: RetrievalConfig = DEFAULT_RETRIEVAL_CONFIG,
): Promise<RetrievalResult> {
  console.log(`[retrieval] Generando embedding para query...`);
  const queryEmbedding = await generateEmbedding(query);
  console.log(`[retrieval] Embedding generado (${queryEmbedding.length} dimensiones)`);

  // Buscar en paralelo en tesis y precedentes
  console.log(`[retrieval] Ejecutando búsqueda híbrida en tesis y precedentes...`);

  const searchPromises: [
    Promise<HybridSearchResult[]>,
    Promise<PrecedenteHybridResult[]>,
  ] = [
    hybridSearch(queryEmbedding, query, config.maxResults, config.vectorWeight, config.textWeight),
    config.includePrecedentes
      ? hybridSearchPrecedentes(queryEmbedding, query, config.maxResults, config.vectorWeight, config.textWeight)
      : Promise.resolve([]),
  ];

  const [tesisResults, precResults] = await Promise.all(searchPromises);

  // --- Procesar resultados de tesis ---
  const filteredTesis = tesisResults.filter(r => r.combinedScore >= config.minSimilarity);
  let processedTesis: HybridSearchResult[];

  if (config.deduplicateByTesis) {
    const tesisMap = new Map<string, HybridSearchResult>();
    for (const r of filteredTesis) {
      const existing = tesisMap.get(r.tesisId);
      if (!existing || r.combinedScore > existing.combinedScore) {
        tesisMap.set(r.tesisId, r);
      }
    }
    processedTesis = Array.from(tesisMap.values())
      .sort((a, b) => b.combinedScore - a.combinedScore)
      .slice(0, config.finalLimit);
  } else {
    processedTesis = filteredTesis.slice(0, config.finalLimit);
  }

  const retrievedTesis: RetrievedTesis[] = [];
  for (const r of processedTesis) {
    const tesis = await getTesisById(r.tesisId);
    if (tesis) {
      retrievedTesis.push({
        tesis,
        chunkText: r.chunkText,
        chunkIndex: r.chunkIndex,
        chunkType: r.chunkType,
        relevanceScore: r.combinedScore,
        vectorScore: r.vectorScore,
        textScore: r.textScore,
      });
    }
  }

  // --- Procesar resultados de precedentes ---
  const filteredPrec = precResults.filter(r => r.combinedScore >= config.minSimilarity);
  let processedPrec: PrecedenteHybridResult[];

  if (config.deduplicateByTesis) {
    const precMap = new Map<string, PrecedenteHybridResult>();
    for (const r of filteredPrec) {
      const existing = precMap.get(r.precedenteId);
      if (!existing || r.combinedScore > existing.combinedScore) {
        precMap.set(r.precedenteId, r);
      }
    }
    processedPrec = Array.from(precMap.values())
      .sort((a, b) => b.combinedScore - a.combinedScore)
      .slice(0, config.finalLimit);
  } else {
    processedPrec = filteredPrec.slice(0, config.finalLimit);
  }

  const retrievedPrecedentes: RetrievedPrecedente[] = [];
  for (const r of processedPrec) {
    const precedente = await getPrecedenteById(r.precedenteId);
    if (precedente) {
      retrievedPrecedentes.push({
        precedente,
        chunkText: r.chunkText,
        chunkIndex: r.chunkIndex,
        chunkType: r.chunkType,
        relevanceScore: r.combinedScore,
        vectorScore: r.vectorScore,
        textScore: r.textScore,
      });
    }
  }

  console.log(`[retrieval] Encontrados: ${retrievedTesis.length} tesis, ${retrievedPrecedentes.length} precedentes`);

  return {
    tesis: retrievedTesis,
    precedentes: retrievedPrecedentes,
  };
}

// ============================================================================
// FORMATO DE CITAS
// ============================================================================

export function formatTesisCitation(tesis: Tesis): string {
  const parts: string[] = [];

  if (tesis.title) {
    parts.push(`"${tesis.title}"`);
  }

  if (tesis.tipo) {
    parts.push(tesis.tipo);
  }

  if (tesis.organo_jurisdiccional) {
    parts.push(tesis.organo_jurisdiccional);
  }

  if (tesis.epoca) {
    parts.push(tesis.epoca);
  }

  if (tesis.fuente) {
    parts.push(tesis.fuente);
  }

  if (tesis.localizacion_tomo && tesis.localizacion_pagina) {
    parts.push(`Tomo ${tesis.localizacion_tomo}, página ${tesis.localizacion_pagina}`);
  }

  return parts.join(". ");
}

export function formatPrecedenteCitation(p: Precedente): string {
  const parts: string[] = [];

  if (p.rubro) {
    parts.push(`"${p.rubro}"`);
  }

  if (p.sala) {
    parts.push(p.sala);
  }

  if (p.tipo_asunto) {
    parts.push(p.tipo_asunto);
  }

  if (p.tipo_asunto_expediente) {
    parts.push(p.tipo_asunto_expediente);
  }

  if (p.localizacion) {
    parts.push(p.localizacion);
  }

  return parts.join(". ");
}
