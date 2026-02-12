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
import {
  getTesisHierarchy,
  getPrecedenteHierarchy,
  compareByHierarchyAndRelevance,
  type LegalHierarchyInfo,
} from "./legal-hierarchy";

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

export interface RetrievalConfig {
  maxResults: number; // Máximo de chunks a recuperar inicialmente
  finalLimit: number; // Máximo de tesis únicas a retornar (legacy, se usa maxJurisprudence/maxTesis en modo flexible)
  minSimilarity: number; // Similitud mínima para considerar relevante
  vectorWeight: number; // Peso de búsqueda vectorial (0-1)
  textWeight: number; // Peso de búsqueda full-text (0-1)
  deduplicateByTesis: boolean; // Si true, solo retorna el mejor chunk por tesis
  includePrecedentes?: boolean; // Si true, también busca en precedentes
  // Configuración flexible basada en calidad y jerarquía legal
  useFlexibleLimits?: boolean; // Si true, usa límites flexibles basados en calidad
  maxJurisprudence?: number; // Máximo de precedentes (default: 8)
  maxTesis?: number; // Máximo de tesis (default: 8)
  maxTotalResults?: number; // Máximo total combinado (default: 10)
  qualityThreshold?: number; // Umbral de calidad mínimo para resultados finales (default: 0.60)
  // Paginación
  offset?: number; // Número de resultados a saltar (para paginación)
  limit?: number; // Número de resultados a retornar (para paginación, sobrescribe finalLimit si se especifica)
}

export const DEFAULT_RETRIEVAL_CONFIG: RetrievalConfig = {
  maxResults: 100, // Aumentado de 50 a 100 para capturar más candidatos antes de deduplicación
  finalLimit: 10, // Aumentado de 5 a 10 para tener más opciones (legacy)
  minSimilarity: 0.2, // Umbral inicial para búsqueda (bajo para capturar candidatos)
  vectorWeight: 0.8, // Aumentado de 0.7 a 0.8 para dar más peso a búsqueda vectorial
  textWeight: 0.2, // Reducido de 0.3 a 0.2 para compensar
  deduplicateByTesis: true,
  includePrecedentes: true,
  // Configuración flexible
  useFlexibleLimits: true,
  maxJurisprudence: 8,
  maxTesis: 8,
  maxTotalResults: 10,
  qualityThreshold: 0.60, // 60% mínimo para resultados finales
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
  console.log(`[retrieval] Config: maxResults=${config.maxResults}, vectorWeight=${config.vectorWeight}, textWeight=${config.textWeight}, minSimilarity=${config.minSimilarity}`);

  let tesisResults: HybridSearchResult[] = [];
  let precResults: PrecedenteHybridResult[] = [];
  
  try {
    const searchPromises: [
      Promise<HybridSearchResult[]>,
      Promise<PrecedenteHybridResult[]>,
    ] = [
      hybridSearch(queryEmbedding, query, config.maxResults, config.vectorWeight, config.textWeight),
      config.includePrecedentes
        ? hybridSearchPrecedentes(queryEmbedding, query, config.maxResults, config.vectorWeight, config.textWeight)
        : Promise.resolve([]),
    ];

    [tesisResults, precResults] = await Promise.all(searchPromises);
    
    console.log(`[retrieval] ✅ Búsqueda híbrida completada: ${tesisResults.length} tesis, ${precResults.length} precedentes`);
    if (tesisResults.length > 0) {
      console.log(`[retrieval] Top 5 tesis scores:`, tesisResults.slice(0, 5).map(r => `${(r.combinedScore * 100).toFixed(2)}%`).join(', '));
    }
    if (precResults.length > 0) {
      console.log(`[retrieval] Top 5 precedentes scores:`, precResults.slice(0, 5).map(r => `${(r.combinedScore * 100).toFixed(2)}%`).join(', '));
    }
  } catch (error) {
    console.error(`[retrieval] ❌ ERROR en búsqueda híbrida:`, error);
    throw error;
  }

  // --- Procesar resultados de tesis ---
  // Usar minSimilarity con valor por defecto de 0.1 si no está definido
  const minSimilarity = config.minSimilarity ?? 0.1;
  console.log(`[retrieval] Usando minSimilarity: ${minSimilarity} (config.minSimilarity=${config.minSimilarity})`);
  const filteredTesis = tesisResults.filter(r => r.combinedScore >= minSimilarity);
  console.log(`[retrieval] Después de filtrar por minSimilarity (${minSimilarity}): ${filteredTesis.length} tesis`);
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
      .sort((a, b) => b.combinedScore - a.combinedScore); // Asegurar orden por relevancia
  } else {
    processedTesis = filteredTesis.sort((a, b) => b.combinedScore - a.combinedScore);
  }

  // --- Procesar resultados de precedentes ---
  const filteredPrec = precResults.filter(r => r.combinedScore >= minSimilarity);
  console.log(`[retrieval] Después de filtrar por minSimilarity (${minSimilarity}): ${filteredPrec.length} precedentes`);
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
      .sort((a, b) => b.combinedScore - a.combinedScore); // Asegurar orden por relevancia
  } else {
    processedPrec = filteredPrec.sort((a, b) => b.combinedScore - a.combinedScore);
  }
  
  // Obtener tesis y precedentes completos con sus jerarquías (sin paginación aún)
  const retrievedTesis: RetrievedTesis[] = [];
  console.log(`[retrieval] Procesando ${processedTesis.length} tesis después de deduplicación`);
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
      console.log(`[retrieval] Tesis ${tesis.id} agregada con score: ${(r.combinedScore * 100).toFixed(2)}%`);
    }
  }

  const retrievedPrecedentes: RetrievedPrecedente[] = [];
  console.log(`[retrieval] Procesando ${processedPrec.length} precedentes después de deduplicación`);
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
      console.log(`[retrieval] Precedente ${precedente.id} agregado con score: ${(r.combinedScore * 100).toFixed(2)}%`);
    }
  }
  
  console.log(`[retrieval] Total antes del sistema flexible: ${retrievedTesis.length} tesis, ${retrievedPrecedentes.length} precedentes`);
  
  // Si no hay resultados, retornar vacío inmediatamente
  if (retrievedTesis.length === 0 && retrievedPrecedentes.length === 0) {
    console.log(`[retrieval] ⚠️  No hay resultados para procesar. Retornando vacío.`);
    return {
      tesis: [],
      precedentes: [],
    };
  }

  // --- Sistema flexible basado en calidad y jerarquía ---
  if (config.useFlexibleLimits) {
    // Usar el qualityThreshold pasado explícitamente, o el default de 0.60
    // IMPORTANTE: No usar || porque 0 es un valor válido, usar ?? (nullish coalescing)
    const qualityThreshold = config.qualityThreshold ?? 0.60;
    console.log(`[retrieval] 🔍 Sistema flexible: qualityThreshold=${qualityThreshold}, config.qualityThreshold=${config.qualityThreshold}`);
    const maxJurisprudence = config.maxJurisprudence ?? 8;
    const maxTesis = config.maxTesis ?? 8;
    const maxTotalResults = config.maxTotalResults ?? 10;
    
    console.log(`[retrieval] Sistema flexible activado: qualityThreshold=${qualityThreshold}, maxTesis=${maxTesis}, maxJuris=${maxJurisprudence}, maxTotal=${maxTotalResults}`);

    // Crear lista combinada con información de jerarquía
    interface CombinedResult {
      type: "tesis" | "precedente";
      tesis?: RetrievedTesis;
      precedente?: RetrievedPrecedente;
      relevanceScore: number;
      hierarchy: LegalHierarchyInfo;
    }

    const combinedResults: CombinedResult[] = [];

    console.log(`[retrieval] Filtrando resultados: ${retrievedTesis.length} tesis, ${retrievedPrecedentes.length} precedentes con qualityThreshold >= ${qualityThreshold}`);

    // Agregar tesis con jerarquía
    for (const rt of retrievedTesis) {
      if (rt.relevanceScore >= qualityThreshold) {
        combinedResults.push({
          type: "tesis",
          tesis: rt,
          relevanceScore: rt.relevanceScore,
          hierarchy: getTesisHierarchy(rt.tesis),
        });
      } else {
        console.log(`[retrieval] Tesis ${rt.tesis.id} filtrada: score ${(rt.relevanceScore * 100).toFixed(2)}% < ${(qualityThreshold * 100).toFixed(2)}%`);
      }
    }

    // Agregar precedentes con jerarquía
    for (const rp of retrievedPrecedentes) {
      if (rp.relevanceScore >= qualityThreshold) {
        combinedResults.push({
          type: "precedente",
          precedente: rp,
          relevanceScore: rp.relevanceScore,
          hierarchy: getPrecedenteHierarchy(rp.precedente),
        });
      } else {
        console.log(`[retrieval] Precedente ${rp.precedente.id} filtrado: score ${(rp.relevanceScore * 100).toFixed(2)}% < ${(qualityThreshold * 100).toFixed(2)}%`);
      }
    }
    
    console.log(`[retrieval] Después de filtrar por qualityThreshold: ${combinedResults.length} resultados (${combinedResults.filter(r => r.type === 'tesis').length} tesis, ${combinedResults.filter(r => r.type === 'precedente').length} precedentes)`);

    // Ordenar por jerarquía y relevancia
    combinedResults.sort((a, b) =>
      compareByHierarchyAndRelevance(
        { hierarchy: a.hierarchy, relevanceScore: a.relevanceScore },
        { hierarchy: b.hierarchy, relevanceScore: b.relevanceScore }
      )
    );

    // Aplicar límites flexibles
    const finalTesis: RetrievedTesis[] = [];
    const finalPrecedentes: RetrievedPrecedente[] = [];
    let tesisCount = 0;
    let precedentesCount = 0;
    let totalCount = 0;

    for (const result of combinedResults) {
      // Verificar límites
      if (totalCount >= maxTotalResults) break;
      if (result.type === "tesis" && tesisCount >= maxTesis) continue;
      if (result.type === "precedente" && precedentesCount >= maxJurisprudence) continue;

      if (result.type === "tesis" && result.tesis) {
        finalTesis.push(result.tesis);
        tesisCount++;
        totalCount++;
      } else if (result.type === "precedente" && result.precedente) {
        finalPrecedentes.push(result.precedente);
        precedentesCount++;
        totalCount++;
      }
    }

    console.log(
      `[retrieval] Sistema flexible: ${finalTesis.length} tesis, ${finalPrecedentes.length} precedentes ` +
      `(filtrados por calidad >= ${qualityThreshold}, límites: maxTesis=${maxTesis}, maxJuris=${maxJurisprudence}, maxTotal=${maxTotalResults})`
    );

    // Aplicar paginación si se especifica
    const offset = config.offset || 0;
    const limit = config.limit;
    
    if (limit !== undefined && (offset > 0 || limit < finalTesis.length + finalPrecedentes.length)) {
      // Combinar todos los resultados y ordenar por relevancia
      const allResults = [
        ...finalTesis.map(rt => ({ type: 'tesis' as const, data: rt, score: rt.relevanceScore })),
        ...finalPrecedentes.map(rp => ({ type: 'precedente' as const, data: rp, score: rp.relevanceScore })),
      ];
      
      allResults.sort((a, b) => b.score - a.score);
      
      // Aplicar paginación
      const paginatedResults = allResults.slice(offset, offset + limit);
      
      // Separar de nuevo
      const paginatedTesis: RetrievedTesis[] = [];
      const paginatedPrecedentes: RetrievedPrecedente[] = [];
      
      for (const result of paginatedResults) {
        if (result.type === 'tesis') {
          paginatedTesis.push(result.data);
        } else {
          paginatedPrecedentes.push(result.data);
        }
      }
      
      console.log(`[retrieval] Paginación aplicada (flexible): offset=${offset}, limit=${limit}, resultados: ${paginatedTesis.length} tesis, ${paginatedPrecedentes.length} precedentes`);
      
      return {
        tesis: paginatedTesis,
        precedentes: paginatedPrecedentes,
      };
    }
    
    return {
      tesis: finalTesis,
      precedentes: finalPrecedentes,
    };
  }

  // --- Sistema legacy (límites fijos) ---
  const finalTesis = retrievedTesis
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, config.finalLimit);
  
  const finalPrecedentes = retrievedPrecedentes
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, config.finalLimit);

  console.log(`[retrieval] Encontrados: ${finalTesis.length} tesis, ${finalPrecedentes.length} precedentes`);

  // Aplicar paginación si se especifica (sistema legacy)
  const offset = config.offset || 0;
  const limit = config.limit;
  
  if (limit !== undefined && (offset > 0 || limit < finalTesis.length + finalPrecedentes.length)) {
    // Combinar todos los resultados y ordenar por relevancia
    const allResults = [
      ...finalTesis.map(rt => ({ type: 'tesis' as const, data: rt, score: rt.relevanceScore })),
      ...finalPrecedentes.map(rp => ({ type: 'precedente' as const, data: rp, score: rp.relevanceScore })),
    ];
    
    allResults.sort((a, b) => b.score - a.score);
    
    // Aplicar paginación
    const paginatedResults = allResults.slice(offset, offset + limit);
    
    // Separar de nuevo
    const paginatedTesis: RetrievedTesis[] = [];
    const paginatedPrecedentes: RetrievedPrecedente[] = [];
    
    for (const result of paginatedResults) {
      if (result.type === 'tesis') {
        paginatedTesis.push(result.data);
      } else {
        paginatedPrecedentes.push(result.data);
      }
    }
    
    console.log(`[retrieval] Paginación aplicada (legacy): offset=${offset}, limit=${limit}, resultados: ${paginatedTesis.length} tesis, ${paginatedPrecedentes.length} precedentes`);
    
    return {
      tesis: paginatedTesis,
      precedentes: paginatedPrecedentes,
    };
  }

  return {
    tesis: finalTesis,
    precedentes: finalPrecedentes,
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

// ============================================================================
// CITAS FORMALES COMPLETAS (listas para copiar-pegar en escritos)
// ============================================================================

/**
 * Genera cita formal completa de una tesis para uso en escritos jurídicos.
 *
 * Formato:
 * RUBRO. Tipo. Instancia. Época. Fuente. Libro X, Tomo Y, mes año,
 * página Z. Tesis: número. Materia(s): materias.
 */
export function formatTesisFormalCitation(tesis: Tesis): string {
  const lines: string[] = [];

  // Rubro en mayúsculas
  if (tesis.title) {
    lines.push(tesis.title.toUpperCase());
  }

  const meta: string[] = [];

  if (tesis.tipo) meta.push(tesis.tipo);
  if (tesis.instancia) meta.push(tesis.instancia);
  if (tesis.organo_jurisdiccional) meta.push(tesis.organo_jurisdiccional);
  if (tesis.epoca) meta.push(tesis.epoca);
  if (tesis.fuente) meta.push(tesis.fuente);

  // Localización detallada
  const loc: string[] = [];
  if (tesis.localizacion_libro) loc.push(`Libro ${tesis.localizacion_libro}`);
  if (tesis.localizacion_tomo) loc.push(`Tomo ${tesis.localizacion_tomo}`);
  if (tesis.localizacion_mes && tesis.localizacion_anio) {
    loc.push(`${tesis.localizacion_mes} de ${tesis.localizacion_anio}`);
  } else if (tesis.localizacion_anio) {
    loc.push(tesis.localizacion_anio);
  }
  if (tesis.localizacion_pagina) loc.push(`página ${tesis.localizacion_pagina}`);

  if (loc.length > 0) meta.push(loc.join(", "));

  if (tesis.tesis_numero) meta.push(`Tesis: ${tesis.tesis_numero}`);
  if (tesis.materias) meta.push(`Materia(s): ${tesis.materias}`);

  if (meta.length > 0) {
    lines.push(meta.join(". ") + ".");
  }

  return lines.join("\n");
}

/**
 * Genera cita formal completa de un precedente para uso en escritos jurídicos.
 *
 * Formato:
 * RUBRO. Sala. Tipo de asunto: Expediente. Localización.
 * Fecha de publicación. Registro IUS: número.
 */
export function formatPrecedenteFormalCitation(p: Precedente): string {
  const lines: string[] = [];

  // Rubro en mayúsculas
  if (p.rubro) {
    lines.push(p.rubro.toUpperCase());
  }

  const meta: string[] = [];

  if (p.sala) meta.push(p.sala);

  if (p.tipo_asunto && p.tipo_asunto_expediente) {
    meta.push(`${p.tipo_asunto}: ${p.tipo_asunto_expediente}`);
  } else if (p.tipo_asunto) {
    meta.push(p.tipo_asunto);
  }

  if (p.promovente) meta.push(`Promovente: ${p.promovente}`);
  if (p.localizacion) meta.push(p.localizacion);
  if (p.fecha_publicacion) meta.push(`Fecha de publicación: ${p.fecha_publicacion}`);
  if (p.ius) meta.push(`Registro IUS: ${p.ius}`);

  if (meta.length > 0) {
    lines.push(meta.join(". ") + ".");
  }

  return lines.join("\n");
}
