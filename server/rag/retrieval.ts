/**
 * ATENEA RAG - Módulo de Retrieval
 * 
 * Coordina la recuperación de tesis relevantes para una pregunta.
 * 
 * Estrategia:
 * - Búsqueda híbrida (vectorial + full-text)
 * - Deduplicación por tesis_id (un chunk por tesis)
 * - Filtrado por relevancia mínima
 * - Ordenamiento por score combinado
 */

import { generateEmbedding } from "./embeddings";
import { hybridSearch, getTesisById, type HybridSearchResult } from "./database";
import type { Tesis } from "@shared/schema";

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
}

export const DEFAULT_RETRIEVAL_CONFIG: RetrievalConfig = {
  maxResults: 20,
  finalLimit: 5,
  minSimilarity: 0.5,
  vectorWeight: 0.7,
  textWeight: 0.3,
  deduplicateByTesis: true,
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

// ============================================================================
// RETRIEVAL PRINCIPAL
// ============================================================================

export async function retrieveRelevantTesis(
  query: string,
  config: RetrievalConfig = DEFAULT_RETRIEVAL_CONFIG
): Promise<RetrievedTesis[]> {
  // Paso 1: Generar embedding de la query
  const queryEmbedding = await generateEmbedding(query);

  // Paso 2: Búsqueda híbrida
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
