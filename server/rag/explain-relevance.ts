/**
 * ATENEA RAG - Explicación de Relevancia
 * 
 * Genera una explicación de por qué una tesis o precedente específico
 * es relevante para una consulta del usuario.
 */

import { generateEmbedding } from "./embeddings";
import { hybridSearch, getTesisById, type HybridSearchResult } from "./database";
import { hybridSearchPrecedentes, getPrecedenteById, type PrecedenteHybridResult } from "./database-precedentes";
import { formatTesisCitation, formatPrecedenteCitation } from "./retrieval";

// ============================================================================
// INTERFAZ DE RESPUESTA
// ============================================================================

export interface ExplainRelevanceResponse {
  explanation: string;
  relevanceScore: number;
  chunkText: string;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// ============================================================================
// GENERACIÓN DE EXPLICACIÓN CON LLM
// ============================================================================

async function generateRelevanceExplanation(
  question: string,
  documentTitle: string,
  chunkText: string,
  relevanceScore: number,
  citation: string,
  source: "tesis" | "precedente",
  documentId: string,
  documentIndex: number
): Promise<{ explanation: string; tokenUsage: { promptTokens: number; completionTokens: number; totalTokens: number } }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is required");
  }

  const systemPrompt = `Eres Atenea, asistente especializada en jurisprudencia mexicana. Tu tarea es explicar de manera clara y concisa por qué un criterio jurídico específico es relevante para la consulta del usuario.

## REGLAS OBLIGATORIAS (DEBES SEGUIRLAS):

1. **PRIMERA LÍNEA OBLIGATORIA**: Tu respuesta DEBE empezar EXACTAMENTE con esta estructura:
   "Este criterio (ID: [ID_DEL_CRITERIO], [NÚMERO]) es relevante porque..."
   
   Donde:
   - [ID_DEL_CRITERIO] = El ID exacto que se te proporciona
   - [NÚMERO] = El número del criterio en el listado (formato: [X] donde X es el número)

2. **INCLUIR REFERENCIA [X]**: DEBES incluir la referencia [X] en la primera oración, donde X es el número del criterio.

3. Explica la conexión entre la consulta y el criterio
4. Identifica los conceptos jurídicos clave que hacen relevante el criterio
5. Sé específico y directo
6. Usa lenguaje profesional pero accesible
7. Menciona el fragmento relevante del criterio cuando sea útil
8. Mantén la explicación entre 3-5 párrafos

## Formato:
- **OBLIGATORIO**: Primera línea: "Este criterio (ID: [ID], [X]) es relevante porque..."
- Usa **negritas** para conceptos jurídicos clave
- Termina con una síntesis breve de la relevancia

## EJEMPLO DE RESPUESTA CORRECTA:
"Este criterio (ID: abc123, [1]) es relevante porque aborda directamente el concepto de **amparo directo** mencionado en la consulta. El fragmento relevante establece que..."

**NO omitas el ID ni la referencia [X]. Son obligatorios.**`;

  const userPrompt = `Consulta del usuario: "${question}"

Criterio jurídico relevante:
**${documentTitle}**

ID del criterio: ${documentId}
Número en el listado: ${documentIndex + 1}

Fragmento relevante del criterio:
"${chunkText}"

Cita: ${citation}
Relevancia: ${(relevanceScore * 100).toFixed(1)}%

Tipo: ${source === "tesis" ? "Tesis" : "Precedente judicial"}

---
INSTRUCCIONES OBLIGATORIAS:

Tu respuesta DEBE empezar EXACTAMENTE así (copia este formato):

"Este criterio (ID: ${documentId}, [${documentIndex + 1}]) es relevante porque..."

Luego continúa explicando por qué es relevante.

**NO CAMBIES EL FORMATO DE LA PRIMERA LÍNEA. DEBE SER EXACTAMENTE COMO SE INDICA ARRIBA.**
**DEBES incluir el ID: ${documentId} y la referencia [${documentIndex + 1}] en la primera oración.**`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    let explanation = data.choices[0]?.message?.content || "No se pudo generar la explicación.";

    // Limpiar frases casuales al inicio
    const casualPhrases = [
      /^Claro,\s*/i,
      /^Bien,\s*/i,
      /^Entonces,\s*/i,
      /^Pues,\s*/i,
      /^Por supuesto,\s*/i,
      /^Sin duda,\s*/i,
    ];

    for (const phrase of casualPhrases) {
      explanation = explanation.replace(phrase, '');
    }

    explanation = explanation.trim();
    
    // Post-procesamiento GARANTIZADO: SIEMPRE agregar ID y referencia al inicio SIN "ver"
    // Estrategia: Forzar el formato sin importar lo que responda el LLM
    const referenceNumber = documentIndex + 1;
    const requiredPrefix = `Este criterio (ID: ${documentId}, [${referenceNumber}])`;
    
    console.log(`[explain-relevance] Post-procesando explicación. documentId: ${documentId}, referenceNumber: ${referenceNumber}`);
    console.log(`[explain-relevance] Explicación original (primeros 100 chars): ${explanation.substring(0, 100)}`);
    
    // PRIMERO: Eliminar "ver" si está presente en cualquier formato
    explanation = explanation.replace(
      /\(ID:\s*([^,)]+),\s*ver\s*\[(\d+)\]\)/gi,
      `(ID: $1, [$2])`
    );
    
    // Verificar si ya tiene el formato exacto al inicio (sin "ver")
    const hasExactFormat = explanation.match(/^Este criterio\s*\(ID:\s*([^,)]+),\s*\[(\d+)\]\)/i);
    const hasCorrectId = hasExactFormat && hasExactFormat[1] === documentId;
    const hasCorrectRef = hasExactFormat && parseInt(hasExactFormat[2]) === referenceNumber;
    
    if (!hasExactFormat || !hasCorrectId || !hasCorrectRef) {
      console.log(`[explain-relevance] No tiene formato correcto. Agregando prefijo forzado.`);
      // No tiene el formato correcto o tiene valores incorrectos
      // Remover cualquier intento previo de formato similar
      explanation = explanation
        .replace(/^Este criterio\s*\([^)]*\)\s*/i, '') // Remover "Este criterio (cualquier cosa)"
        .replace(/^[^.]*\.\s*/i, '') // Remover primera oración si termina en punto
        .trim();
      
      // Asegurar que la primera letra esté en minúscula para que fluya con "porque"
      if (explanation.length > 0) {
        explanation = explanation.charAt(0).toLowerCase() + explanation.slice(1);
      }
      
      // FORZAR agregar el prefijo obligatorio (sin "ver")
      explanation = `${requiredPrefix} es relevante porque ${explanation}`;
      console.log(`[explain-relevance] Explicación después de post-procesamiento (primeros 150 chars): ${explanation.substring(0, 150)}`);
    } else {
      // Ya tiene formato correcto, verificar que no tenga "ver" (por si acaso)
      explanation = explanation.replace(
        /^Este criterio\s*\(ID:\s*([^,)]+),\s*ver\s*\[(\d+)\]\)/i,
        `Este criterio (ID: ${documentId}, [${referenceNumber}])`
      );
      console.log(`[explain-relevance] Ya tiene formato correcto, verificado (sin "ver").`);
    }

    const tokenUsage = data.usage ? {
      promptTokens: data.usage.prompt_tokens || 0,
      completionTokens: data.usage.completion_tokens || 0,
      totalTokens: data.usage.total_tokens || 0,
    } : {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    };

    return { explanation, tokenUsage };
  } catch (error) {
    console.error("[generateRelevanceExplanation] Error:", error);
    throw error;
  }
}

// ============================================================================
// FUNCIÓN PRINCIPAL
// ============================================================================

export async function explainRelevance(
  question: string,
  documentId: string,
  source: "tesis" | "precedente",
  documentIndex: number = 0
): Promise<ExplainRelevanceResponse> {
  if (!question || question.trim().length < 10) {
    throw new Error("La pregunta debe tener al menos 10 caracteres");
  }

  // Paso 1: Obtener el documento completo
  let document;
  let documentTitle: string;
  let citation: string;

  if (source === "tesis") {
    document = await getTesisById(documentId);
    if (!document) {
      throw new Error(`Tesis con ID ${documentId} no encontrada`);
    }
    documentTitle = document.title;
    citation = formatTesisCitation(document);
  } else {
    document = await getPrecedenteById(documentId);
    if (!document) {
      throw new Error(`Precedente con ID ${documentId} no encontrado`);
    }
    documentTitle = document.rubro;
    citation = formatPrecedenteCitation(document);
  }

  // Paso 2: Buscar el chunk más relevante para esta pregunta específica
  // Hacemos una búsqueda directa en los chunks de este documento específico
  const queryEmbedding = await generateEmbedding(question);
  let bestChunk: { chunkText: string; relevanceScore: number } | null = null;

  const { getPool } = await import("./database");
  const client = await getPool().connect();

  try {
    const embeddingJson = JSON.stringify(queryEmbedding);
    
    if (source === "tesis") {
      // Búsqueda vectorial directa en chunks de esta tesis
      // Optimización: usar índice y limitar resultados temprano
      await client.query("SET LOCAL statement_timeout = '30000'");
      const result = await client.query(
        `SELECT 
          c.id AS chunk_id,
          c.chunk_text,
          c.chunk_index,
          c.chunk_type,
          1 - (c.embedding <=> $1::vector) AS similarity
        FROM tesis_chunks c
        WHERE c.tesis_id = $2
        ORDER BY c.embedding <=> $1::vector
        LIMIT 3`,
        [embeddingJson, documentId]
      );

      if (result.rows.length > 0) {
        const bestRow = result.rows[0];
        bestChunk = {
          chunkText: bestRow.chunk_text,
          relevanceScore: parseFloat(bestRow.similarity || 0),
        };
      }
    } else {
      // Búsqueda vectorial directa en chunks de este precedente
      // Optimización: usar índice y limitar resultados temprano
      await client.query("SET LOCAL statement_timeout = '30000'");
      const result = await client.query(
        `SELECT 
          c.id AS chunk_id,
          c.chunk_text,
          c.chunk_index,
          c.chunk_type,
          1 - (c.embedding <=> $1::vector) AS similarity
        FROM precedentes_chunks c
        WHERE c.precedente_id = $2
        ORDER BY c.embedding <=> $1::vector
        LIMIT 3`,
        [embeddingJson, documentId]
      );

      if (result.rows.length > 0) {
        const bestRow = result.rows[0];
        bestChunk = {
          chunkText: bestRow.chunk_text,
          relevanceScore: parseFloat(bestRow.similarity || 0),
        };
      }
    }
  } finally {
    client.release();
  }

  if (!bestChunk) {
    // Fallback: usar el título y una explicación genérica
    return {
      explanation: `Este criterio es relevante porque aborda conceptos relacionados con tu consulta. El rubro "${documentTitle}" trata temas que se conectan con la pregunta formulada.`,
      relevanceScore: 0.5,
      chunkText: documentTitle,
    };
  }

  // Paso 3: Generar explicación con LLM
  try {
    const { explanation, tokenUsage } = await generateRelevanceExplanation(
      question,
      documentTitle,
      bestChunk.chunkText,
      bestChunk.relevanceScore,
      citation,
      source,
      documentId,
      documentIndex
    );

    return {
      explanation,
      relevanceScore: bestChunk.relevanceScore,
      chunkText: bestChunk.chunkText,
      tokenUsage,
    };
  } catch (error) {
    console.error("[explainRelevance] Error generando explicación, usando fallback:", error);
    // Fallback: explicación simple
    return {
      explanation: `Este criterio es relevante para tu consulta porque el fragmento "${bestChunk.chunkText.substring(0, 200)}..." aborda conceptos directamente relacionados con la pregunta. La relevancia calculada es del ${(bestChunk.relevanceScore * 100).toFixed(1)}%.`,
      relevanceScore: bestChunk.relevanceScore,
      chunkText: bestChunk.chunkText,
    };
  }
}
