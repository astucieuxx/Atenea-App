/**
 * ATENEA RAG - Chunking para Precedentes
 *
 * Adapta el chunking para la estructura de precedentes judiciales:
 * - rubro → chunk tipo "rubro" (equivalente a title)
 * - texto_publicacion → chunks tipo "texto_publicacion" (equivalente a body)
 * - metadata combinada → chunk tipo "metadata"
 */

import type { Precedente } from "@shared/schema";
import type { TextChunk, ChunkingConfig } from "./chunking";

export const DEFAULT_PRECEDENTE_CHUNKING: ChunkingConfig = {
  chunkSize: 600,
  chunkOverlap: 75,
  respectParagraphs: true,
  minChunkSize: 100,
};

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function splitIntoParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(p => p.length > 0);
}

function chunkLongText(
  text: string,
  config: ChunkingConfig,
): TextChunk[] {
  if (!text || text.trim().length === 0) return [];

  const chunks: TextChunk[] = [];
  const paragraphs = config.respectParagraphs
    ? splitIntoParagraphs(text)
    : [text];

  let currentChunk = "";
  let currentCharStart = 0;
  let chunkIndex = 0;

  for (const paragraph of paragraphs) {
    const paragraphTokens = estimateTokens(paragraph);

    if (estimateTokens(currentChunk + paragraph) <= config.chunkSize) {
      currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
    } else {
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

        const overlapText = currentChunk.slice(-config.chunkOverlap * 4);
        currentChunk = overlapText + "\n\n" + paragraph;
        currentCharStart = currentCharStart + currentChunk.length - overlapText.length - paragraph.length - 2;
      } else {
        currentChunk = paragraph;
        currentCharStart = text.indexOf(paragraph);
      }

      if (paragraphTokens > config.chunkSize) {
        const sentences = paragraph.split(/[.!?]\s+/).filter(s => s.trim());
        for (const sentence of sentences) {
          if (estimateTokens(currentChunk + sentence) <= config.chunkSize) {
            currentChunk += (currentChunk ? " " : "") + sentence;
          } else {
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
            const overlapText = currentChunk.slice(-config.chunkOverlap * 4);
            currentChunk = overlapText + " " + sentence;
            currentCharStart = currentCharStart + currentChunk.length - overlapText.length - sentence.length - 1;
          }
        }
      }
    }
  }

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

/**
 * Divide un precedente en chunks estructurados
 */
export function chunkPrecedente(
  p: Precedente,
  config: ChunkingConfig = DEFAULT_PRECEDENTE_CHUNKING,
): TextChunk[] {
  const chunks: TextChunk[] = [];

  // Chunk 1: Rubro (título del precedente)
  if (p.rubro && p.rubro.trim().length > 10) {
    chunks.push({
      text: p.rubro,
      chunkIndex: 0,
      chunkType: "title",
      charStart: 0,
      charEnd: p.rubro.length,
      tokenCount: estimateTokens(p.rubro),
    });
  }

  // Chunks 2+: Texto de publicación (cuerpo principal)
  if (p.texto_publicacion && p.texto_publicacion.trim().length > 0) {
    const bodyChunks = chunkLongText(p.texto_publicacion, config);
    bodyChunks.forEach(chunk => {
      chunks.push({
        ...chunk,
        chunkType: "body",
        chunkIndex: chunks.length,
      });
    });
  }

  // Chunk adicional: Metadata combinada (solo si hay datos significativos)
  const metaParts: string[] = [];
  if (p.sala) metaParts.push(`Sala: ${p.sala}`);
  if (p.tipo_asunto) metaParts.push(`Tipo de asunto: ${p.tipo_asunto}`);
  if (p.tipo_asunto_expediente) metaParts.push(`Expediente: ${p.tipo_asunto_expediente}`);
  if (p.promovente) metaParts.push(`Promovente: ${p.promovente}`);
  if (p.localizacion) metaParts.push(`Localización: ${p.localizacion}`);
  if (p.fecha_publicacion) metaParts.push(`Fecha: ${p.fecha_publicacion}`);

  const metaText = metaParts.join(". ");
  if (metaText.length > 50) {
    chunks.push({
      text: metaText,
      chunkIndex: chunks.length,
      chunkType: "abstract", // Reusing "abstract" type for metadata
      charStart: 0,
      charEnd: metaText.length,
      tokenCount: estimateTokens(metaText),
    });
  }

  // Renumerar
  return chunks.map((chunk, idx) => ({
    ...chunk,
    chunkIndex: idx,
  }));
}
