/**
 * ATENEA RAG - Endpoint /ask
 * 
 * Genera respuestas a preguntas jurídicas usando RAG.
 * 
 * Flujo:
 * 1. Recibe pregunta en español
 * 2. Recupera tesis relevantes (vectorial + full-text)
 * 3. Genera respuesta con LLM citando tesis
 * 4. Retorna respuesta + tesis usadas
 * 
 * Restricciones:
 * - NO inventar respuestas sin evidencia
 * - Citar obligatoriamente tesis usadas (ID + rubro)
 * - Indicar explícitamente si no hay tesis aplicables
 */

import { retrieveRelevantTesis, formatTesisCitation, type RetrievedTesis } from "./retrieval";

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

export interface AskConfig {
  maxTesis: number; // Máximo de tesis a usar en la respuesta
  minRelevance: number; // Relevancia mínima para usar una tesis
  useLLM: boolean; // Si false, solo retorna tesis sin generar respuesta
  llmProvider?: "openai" | "anthropic"; // Proveedor de LLM
  llmModel?: string; // Modelo específico
}

export const DEFAULT_ASK_CONFIG: AskConfig = {
  maxTesis: 5,
  minRelevance: 0.5,
  useLLM: true,
  llmProvider: "openai",
  llmModel: "gpt-4o-mini",
};

// ============================================================================
// RESPUESTA DEL ENDPOINT
// ============================================================================

export interface AskResponse {
  answer: string;
  tesisUsed: Array<{
    id: string;
    title: string;
    citation: string;
    relevanceScore: number;
  }>;
  hasEvidence: boolean;
  confidence: "high" | "medium" | "low";
}

// ============================================================================
// GENERACIÓN DE RESPUESTA CON LLM
// ============================================================================

async function generateAnswerWithLLM(
  question: string,
  retrievedTesis: RetrievedTesis[]
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is required");
  }

  // Construir contexto con tesis recuperadas
  const tesisContext = retrievedTesis
    .map((rt, idx) => {
      const citation = formatTesisCitation(rt.tesis);
      return `TESIS ${idx + 1} (ID: ${rt.tesis.id}):
Rubro: "${rt.tesis.title}"
Cita: ${citation}
Contenido relevante: ${rt.chunkText.slice(0, 500)}...`;
    })
    .join("\n\n");

  // Prompt estructurado para respuesta jurídica
  const systemPrompt = `Eres un asistente jurídico especializado en jurisprudencia mexicana.
Tu tarea es responder preguntas jurídicas basándote ÚNICAMENTE en las tesis proporcionadas.

REGLAS ESTRICTAS:
1. SOLO usa información de las tesis proporcionadas. NO inventes hechos ni criterios.
2. SIEMPRE cita las tesis usando su ID y rubro en el formato: [ID: xxx] "Rubro de la tesis"
3. Si las tesis no son suficientes para responder, di explícitamente: "No se encontró jurisprudencia directamente aplicable a esta pregunta."
4. Si hay contradicciones entre tesis, menciónalas.
5. Usa lenguaje jurídico preciso y formal.
6. Estructura tu respuesta en párrafos claros.`;

  const userPrompt = `Pregunta jurídica: ${question}

Tesis relevantes encontradas:
${tesisContext}

Responde la pregunta basándote ÚNICAMENTE en las tesis proporcionadas. Cita cada tesis usando su ID y rubro.`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3, // Bajo para respuestas más deterministas
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(`OpenAI API error: ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "No se pudo generar una respuesta.";
  } catch (error) {
    console.error("Error generating answer with LLM:", error);
    throw error;
  }
}

// ============================================================================
// FUNCIÓN PRINCIPAL: /ask
// ============================================================================

export async function askQuestion(
  question: string,
  config: AskConfig = DEFAULT_ASK_CONFIG
): Promise<AskResponse> {
  if (!question || question.trim().length < 10) {
    throw new Error("La pregunta debe tener al menos 10 caracteres");
  }

  // Paso 1: Recuperar tesis relevantes
  const retrievedTesis = await retrieveRelevantTesis(question, {
    maxResults: config.maxTesis * 2, // Recuperar más para filtrar
    finalLimit: config.maxTesis,
    minSimilarity: config.minRelevance,
    deduplicateByTesis: true,
  });

  // Paso 2: Verificar si hay evidencia suficiente
  const hasEvidence = retrievedTesis.length > 0 && 
    retrievedTesis.some(rt => rt.relevanceScore >= config.minRelevance);

  if (!hasEvidence) {
    return {
      answer: "No se encontró jurisprudencia directamente aplicable a esta pregunta. Se recomienda reformular la consulta con términos jurídicos más específicos o consultar otras fuentes.",
      tesisUsed: [],
      hasEvidence: false,
      confidence: "low",
    };
  }

  // Paso 3: Generar respuesta (con LLM o sin él)
  let answer: string;
  
  if (config.useLLM) {
    try {
      answer = await generateAnswerWithLLM(question, retrievedTesis);
    } catch (error) {
      console.error("Error generating answer, falling back to simple format:", error);
      // Fallback: respuesta simple sin LLM
      answer = generateSimpleAnswer(question, retrievedTesis);
    }
  } else {
    answer = generateSimpleAnswer(question, retrievedTesis);
  }

  // Paso 4: Determinar confianza
  const avgRelevance = retrievedTesis.reduce((sum, rt) => sum + rt.relevanceScore, 0) / retrievedTesis.length;
  let confidence: "high" | "medium" | "low";
  if (avgRelevance >= 0.7 && retrievedTesis.length >= 3) {
    confidence = "high";
  } else if (avgRelevance >= 0.5 && retrievedTesis.length >= 2) {
    confidence = "medium";
  } else {
    confidence = "low";
  }

  // Paso 5: Formatear tesis usadas
  const tesisUsed = retrievedTesis.map(rt => ({
    id: rt.tesis.id,
    title: rt.tesis.title,
    citation: formatTesisCitation(rt.tesis),
    relevanceScore: rt.relevanceScore,
  }));

  return {
    answer,
    tesisUsed,
    hasEvidence: true,
    confidence,
  };
}

// ============================================================================
// RESPUESTA SIMPLE (sin LLM)
// ============================================================================

function generateSimpleAnswer(
  question: string,
  retrievedTesis: RetrievedTesis[]
): string {
  if (retrievedTesis.length === 0) {
    return "No se encontró jurisprudencia directamente aplicable a esta pregunta.";
  }

  let answer = `Se encontraron ${retrievedTesis.length} tesis relevantes para esta consulta:\n\n`;

  retrievedTesis.forEach((rt, idx) => {
    answer += `${idx + 1}. [ID: ${rt.tesis.id}] "${rt.tesis.title}"\n`;
    answer += `   ${formatTesisCitation(rt.tesis)}\n`;
    answer += `   Relevancia: ${(rt.relevanceScore * 100).toFixed(1)}%\n\n`;
  });

  answer += "Se recomienda revisar el contenido completo de estas tesis para una respuesta precisa.";

  return answer;
}
