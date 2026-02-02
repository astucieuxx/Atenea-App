/**
 * ATENEA RAG - Módulo de Chunking
 * 
 * Divide textos jurídicos en chunks optimizados para embeddings.
 * 
 * Estrategia de chunking para textos jurídicos:
 * - Tamaño: ~500-800 tokens por chunk (balance entre contexto y precisión)
 * - Overlap: 50-100 tokens entre chunks (preserva contexto)
 * - Respetar límites de párrafos cuando sea posible
 * - Separar títulos, abstracts y cuerpo
 */

import type { Tesis } from "@shared/schema";

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

export interface ChunkingConfig {
  chunkSize: number; // Tamaño objetivo en tokens (~500-800)
  chunkOverlap: number; // Overlap en tokens (~50-100)
  respectParagraphs: boolean; // Intentar no cortar párrafos
  minChunkSize: number; // Tamaño mínimo para no descartar chunks pequeños
}

export const DEFAULT_CHUNKING_CONFIG: ChunkingConfig = {
  chunkSize: 600, // ~600 tokens = ~2400 caracteres (estimación conservadora)
  chunkOverlap: 75, // ~75 tokens de overlap
  respectParagraphs: true,
  minChunkSize: 100, // Chunks menores a 100 tokens se descartan o se fusionan
};

// ============================================================================
// TIPOS
// ============================================================================

export interface TextChunk {
  text: string;
  chunkIndex: number;
  chunkType: "title" | "abstract" | "body" | "body_full";
  charStart: number;
  charEnd: number;
  tokenCount: number; // Estimación
}

// ============================================================================
// UTILIDADES: Estimación de tokens
// ============================================================================

/**
 * Estimación conservadora de tokens en español.
 * Regla general: ~1 token = 4 caracteres en español
 */
function estimateTokens(text: string): number {
  // Aproximación: tokens ≈ caracteres / 4
  // Para español, esta es una estimación razonable
  return Math.ceil(text.length / 4);
}

/**
 * Divide texto en párrafos respetando saltos de línea
 */
function splitIntoParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/) // Doble salto de línea = nuevo párrafo
    .map(p => p.trim())
    .filter(p => p.length > 0);
}

// ============================================================================
// CHUNKING PRINCIPAL
// ============================================================================

/**
 * Divide un texto en chunks con overlap
 */
function chunkText(
  text: string,
  config: ChunkingConfig = DEFAULT_CHUNKING_CONFIG
): TextChunk[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const chunks: TextChunk[] = [];
  const paragraphs = config.respectParagraphs 
    ? splitIntoParagraphs(text) 
    : [text];

  let currentChunk = "";
  let currentCharStart = 0;
  let chunkIndex = 0;

  for (const paragraph of paragraphs) {
    const paragraphTokens = estimateTokens(paragraph);

    // Si el párrafo completo cabe en el chunk actual
    if (estimateTokens(currentChunk + paragraph) <= config.chunkSize) {
      currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
    } else {
      // El párrafo no cabe, guardar chunk actual y empezar nuevo
      if (currentChunk.length > 0) {
        const tokenCount = estimateTokens(currentChunk);
        if (tokenCount >= config.minChunkSize) {
          chunks.push({
            text: currentChunk,
            chunkIndex: chunkIndex++,
            chunkType: "body",
            charStart: currentCharStart,
            charEnd: currentCharStart + currentChunk.length,
            tokenCount,
          });
        }

        // Overlap: tomar últimos N tokens del chunk anterior
        const overlapText = currentChunk.slice(-config.chunkOverlap * 4);
        currentChunk = overlapText + "\n\n" + paragraph;
        currentCharStart = currentCharStart + currentChunk.length - overlapText.length - paragraph.length - 2;
      } else {
        // Chunk vacío, empezar con el párrafo
        currentChunk = paragraph;
        currentCharStart = text.indexOf(paragraph);
      }

      // Si el párrafo es muy grande, dividirlo
      if (paragraphTokens > config.chunkSize) {
        const sentences = paragraph.split(/[.!?]\s+/).filter(s => s.trim());
        for (const sentence of sentences) {
          if (estimateTokens(currentChunk + sentence) <= config.chunkSize) {
            currentChunk += (currentChunk ? " " : "") + sentence;
          } else {
            // Guardar chunk actual
            const tokenCount = estimateTokens(currentChunk);
            if (tokenCount >= config.minChunkSize) {
              chunks.push({
                text: currentChunk,
                chunkIndex: chunkIndex++,
                chunkType: "body",
                charStart: currentCharStart,
                charEnd: currentCharStart + currentChunk.length,
                tokenCount,
              });
            }

            // Overlap
            const overlapText = currentChunk.slice(-config.chunkOverlap * 4);
            currentChunk = overlapText + " " + sentence;
            currentCharStart = currentCharStart + currentChunk.length - overlapText.length - sentence.length - 1;
          }
        }
      }
    }
  }

  // Guardar último chunk
  if (currentChunk.length > 0) {
    const tokenCount = estimateTokens(currentChunk);
    if (tokenCount >= config.minChunkSize) {
      chunks.push({
        text: currentChunk,
        chunkIndex: chunkIndex++,
        chunkType: "body",
        charStart: currentCharStart,
        charEnd: currentCharStart + currentChunk.length,
        tokenCount,
      });
    }
  }

  return chunks;
}

// ============================================================================
// CHUNKING DE TESIS COMPLETA
// ============================================================================

/**
 * Divide una tesis completa en chunks estructurados
 */
export function chunkTesis(
  tesis: Tesis,
  config: ChunkingConfig = DEFAULT_CHUNKING_CONFIG
): TextChunk[] {
  const chunks: TextChunk[] = [];

  // Chunk 1: Título (si existe y es significativo)
  if (tesis.title && tesis.title.trim().length > 10) {
    chunks.push({
      text: tesis.title,
      chunkIndex: 0,
      chunkType: "title",
      charStart: 0,
      charEnd: tesis.title.length,
      tokenCount: estimateTokens(tesis.title),
    });
  }

  // Chunk 2: Abstract (si existe)
  if (tesis.abstract && tesis.abstract.trim().length > 50) {
    const abstractChunks = chunkText(tesis.abstract, {
      ...config,
      chunkSize: Math.min(config.chunkSize, 300), // Abstracts más pequeños
    });
    abstractChunks.forEach(chunk => {
      chunks.push({
        ...chunk,
        chunkType: "abstract",
        chunkIndex: chunks.length,
      });
    });
  }

  // Chunks 3+: Cuerpo principal
  // Priorizar body_full si existe, sino body
  const bodyText = tesis.body_full || tesis.body || "";
  if (bodyText.trim().length > 0) {
    const bodyChunks = chunkText(bodyText, config);
    bodyChunks.forEach(chunk => {
      chunks.push({
        ...chunk,
        chunkType: tesis.body_full ? "body_full" : "body",
        chunkIndex: chunks.length,
      });
    });
  }

  // Renumerar índices si es necesario
  return chunks.map((chunk, idx) => ({
    ...chunk,
    chunkIndex: idx,
  }));
}

// ============================================================================
// FUNCIÓN PÚBLICA: Chunkear múltiples tesis
// ============================================================================

export function chunkTesisBatch(
  tesisList: Tesis[],
  config: ChunkingConfig = DEFAULT_CHUNKING_CONFIG
): Map<string, TextChunk[]> {
  const result = new Map<string, TextChunk[]>();

  for (const tesis of tesisList) {
    const chunks = chunkTesis(tesis, config);
    if (chunks.length > 0) {
      result.set(tesis.id, chunks);
    }
  }

  return result;
}
