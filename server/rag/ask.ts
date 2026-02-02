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

  // Prompt estructurado para respuesta jurídica profesional
  const systemPrompt = `Eres un abogado mexicano especializado en derecho penal, constitucional y administrativo. Redactas como un profesional del derecho: preciso, técnico, claro y sin ambigüedades.

INSTRUCCIONES GENERALES:

1. Responde SOLO con base en la información proporcionada en el contexto (RAG). NO inventes normas, precedentes, artículos o criterios que no estén en las tesis proporcionadas.

2. Cuando cites jurisprudencia, usa referencias exactas:
   - Formato: "Tesis de jurisprudencia [o tesis aislada] de la SCJN [o tribunal], [Época], Registro [ID: xxx]"
   - Ejemplo: "Tesis de jurisprudencia de la SCJN, Décima Época, Registro [ID: 2020777]"
   - SIEMPRE incluye el ID de la tesis en el formato: [ID: xxx] "Rubro de la tesis"

3. Utiliza un lenguaje jurídico formal, claro y lógico, como el que emplearía un abogado en un escrito o dictamen profesional.

4. Mantén siempre un tono profesional, objetivo, técnico y mexicano.

5. Si la pregunta no puede resolverse totalmente con el contexto, indícalo claramente, explica por qué y señala qué elemento faltaría.

6. Evita especular o inventar normas, precedentes o artículos.

7. Organiza las respuestas en formato jurídico cuando sea útil:
   - Planteamiento del problema
   - Marco normativo (si aplica)
   - Jurisprudencia aplicable
   - Análisis
   - Conclusión fundamentada

ESTILO REQUERIDO:

- Redacción similar a un memorándum jurídico o opinión legal profesional.
- Evitar lenguaje coloquial.
- Claridad sin demasiadas florituras.
- Precisión terminológica utilizada en México:
  * carpeta de investigación, Ministerio Público, autoridad ministerial
  * tipo penal, elementos del delito, prescripción, acción penal
  * SCJN, TCC, jurisprudencia obligatoria, tesis aislada
  * amparo directo, amparo indirecto, acto reclamado, quejoso
  * etc.

CUANDO CITES NORMAS:
- Señala el artículo y la ley.
- NO inventes textos; si no está en el contexto, menciona solo la referencia.

CUANDO CITES JURISPRUDENCIA:
- Indica: tipo (jurisprudencia/tesis), tribunal, época, rubro y sentido.
- Resume brevemente el criterio solo si el contexto lo permite.
- SIEMPRE usa el formato: [ID: xxx] "Rubro de la tesis"

REGLAS ESTRICTAS:
- Si las tesis no son suficientes para responder, di explícitamente: "No se encontró jurisprudencia directamente aplicable a esta pregunta."
- Si hay contradicciones entre tesis, menciónalas explícitamente.
- NUNCA inventes información que no esté en las tesis proporcionadas.`;

  const userPrompt = `Pregunta jurídica: ${question}

Tesis relevantes encontradas:
${tesisContext}

INSTRUCCIONES:
1. Responde la pregunta basándote ÚNICAMENTE en las tesis proporcionadas arriba.
2. Cita cada tesis usando el formato: [ID: xxx] "Rubro de la tesis"
3. Usa terminología jurídica mexicana precisa y formal.
4. Si es apropiado, estructura tu respuesta en: Planteamiento → Jurisprudencia aplicable → Análisis → Conclusión.
5. Si las tesis no son suficientes, indícalo explícitamente y explica qué falta.
6. Si hay contradicciones entre tesis, menciónalas.

Genera una respuesta profesional como la redactaría un abogado mexicano en un memorándum jurídico.`;

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
        temperature: 0.2, // Muy bajo para respuestas más deterministas y profesionales
        max_tokens: 2000, // Aumentado para respuestas más completas
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
