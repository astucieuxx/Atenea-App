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

import {
  retrieveRelevantDocuments,
  formatTesisCitation,
  formatPrecedenteCitation,
  formatTesisFormalCitation,
  formatPrecedenteFormalCitation,
  type RetrievedTesis,
  type RetrievedPrecedente,
} from "./retrieval";

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
  minRelevance: 0.3, // Reducido de 0.5 a 0.3 para ser más permisivo
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
    formalCitation: string;
    relevanceScore: number;
    source?: "tesis" | "precedente";
    url?: string;
  }>;
  hasEvidence: boolean;
  confidence: "high" | "medium" | "low";
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// ============================================================================
// GENERACIÓN DE RESPUESTA CON LLM
// ============================================================================

async function generateAnswerWithLLM(
  question: string,
  retrievedTesis: RetrievedTesis[],
  retrievedPrecedentes: RetrievedPrecedente[] = [],
): Promise<{ answer: string; tokenUsage: { promptTokens: number; completionTokens: number; totalTokens: number } }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("[generateAnswerWithLLM] ERROR: OPENAI_API_KEY no está configurada");
    throw new Error("OPENAI_API_KEY environment variable is required");
  }
  
  // Verificar que la API key tenga el formato correcto
  if (!apiKey.startsWith('sk-')) {
    console.warn("[generateAnswerWithLLM] WARNING: La API key no parece tener el formato correcto (debería empezar con 'sk-')");
  }
  
  console.log("[generateAnswerWithLLM] API Key configurada (primeros 10 caracteres):", apiKey.substring(0, 10) + "...");

  // Construir contexto con tesis recuperadas (incluye todos los datos para referencias)
  const tesisContext = retrievedTesis
    .map((rt, idx) => {
      const citation = formatTesisCitation(rt.tesis);
      return `TESIS ${idx + 1} (ID: ${rt.tesis.id}):
Rubro: "${rt.tesis.title}"
Número de tesis: ${rt.tesis.tesis_numero || "N/A"}
Registro digital: ${rt.tesis.id}
Época: ${rt.tesis.epoca || "N/A"}
Materia: ${rt.tesis.materias || "N/A"}
Instancia: ${rt.tesis.instancia || rt.tesis.organo_jurisdiccional || "N/A"}
Tipo: ${rt.tesis.tipo || "N/A"}
Cita: ${citation}
Contenido relevante: ${rt.chunkText.slice(0, 300)}...`;
    })
    .join("\n\n");

  // Construir contexto con precedentes recuperados
  const precedentesContext = retrievedPrecedentes
    .map((rp, idx) => {
      const citation = formatPrecedenteCitation(rp.precedente);
      return `PRECEDENTE ${idx + 1} (ID: ${rp.precedente.id}, IUS: ${rp.precedente.ius}):
Rubro: "${rp.precedente.rubro}"
Cita: ${citation}
Contenido relevante: ${rp.chunkText.slice(0, 300)}...`;
    })
    .join("\n\n");

  // Prompt estructurado para respuesta jurídica conversacional con referencias numeradas
  const systemPrompt = `Eres Atenea, asistente de jurisprudencia mexicana. Responde en tono conversacional, como platicando con un colega abogado — natural, claro, sin dumps de datos. Primero explica en lenguaje normal, luego muestra las referencias.

REGLAS FUNDAMENTALES:
1. Responde SOLO con base en la información proporcionada en el contexto (RAG). NO inventes normas, precedentes, artículos o criterios que no estén en las tesis proporcionadas.
2. Cuando cites jurisprudencia o precedentes en el texto, usa referencias numeradas: [1], [2], [3], etc. Estas referencias deben corresponder al orden de las tesis en el contexto (TESIS 1 = [1], TESIS 2 = [2], etc.).
3. Si las tesis no son suficientes, indícalo explícitamente y explica qué falta.
4. NUNCA inventes información que no esté en las tesis proporcionadas.
5. Prioriza jurisprudencia vigente sobre tesis aisladas.

FORMATO OBLIGATORIO DE RESPUESTA:

**Tono conversacional:**
- Habla como si platicaras con un colega abogado
- Natural, claro, sin dumps de datos
- Primero explica en lenguaje normal, luego muestra las referencias
- NO uses lenguaje académico o formal excesivo

**Citas inline:**
- Cada vez que menciones una tesis o jurisprudencia, usa una referencia numérica: [1], [2], [3], etc.
- Las referencias deben corresponder al orden de las tesis en el contexto proporcionado
- Ejemplo: "Según la jurisprudencia de la SCJN [1], el amparo directo procede cuando..."

**Al final de tu respuesta, DEBES incluir estas dos secciones:**

REFERENCIAS:
[N] | tipo: {tesis_aislada|jurisprudencia} | tesis: {número} | rubro: {título} | registro: {número de registro digital} | epoca: {época} | materia: {materia} | instancia: {instancia}

Usa este formato para cada tesis citada, reemplazando:
- [N] con el número de referencia [1], [2], etc.
- {tipo} con "tesis_aislada" o "jurisprudencia" según el tipo de la tesis
- {número} con el número de tesis (campo tesis_numero)
- {título} con el rubro completo de la tesis
- {número de registro digital} con el ID de la tesis
- {época} con la época de la tesis
- {materia} con la materia de la tesis
- {instancia} con la instancia u órgano jurisdiccional

Ejemplo:
REFERENCIAS:
[1] | tipo: jurisprudencia | tesis: 1/2023 | rubro: AMPARO DIRECTO. PROCEDENCIA | registro: 251809 | epoca: Séptima Época | materia: Amparo | instancia: Primera Sala

SUGERENCIAS:
{pregunta 1} | {pregunta 2} | {pregunta 3}

Incluye 3 preguntas de seguimiento que ayuden al usuario a profundizar o filtrar. Sepáralas con |

Ejemplo:
SUGERENCIAS:
¿Cuáles son los requisitos específicos para que proceda el amparo directo? | ¿Qué excepciones existen a esta regla? | ¿Cómo se aplica esto en casos de materia fiscal?

REGLAS GENERALES:
- NO inventes números de registro o tesis. Si no estás seguro, dilo.
- Prioriza jurisprudencia vigente sobre tesis aisladas.
- Usa terminología jurídica mexicana precisa: SCJN, TCC, jurisprudencia obligatoria, tesis aislada, etc.
- NO uses emojis, hashtags ni símbolos decorativos.`;

  const userPrompt = `Pregunta: ${question}

Tesis relevantes:
${tesisContext}
${precedentesContext ? `\nPrecedentes judiciales relevantes:\n${precedentesContext}` : ""}

INSTRUCCIONES:
1. Responde SOLO con las tesis y precedentes proporcionados.
2. Tono conversacional: habla como platicando con un colega abogado — natural, claro.
3. Citas inline: usa referencias numeradas [1], [2], [3], etc. que correspondan al orden de las tesis (TESIS 1 = [1], TESIS 2 = [2], etc.).
4. Al final, incluye OBLIGATORIAMENTE las secciones REFERENCIAS: y SUGERENCIAS: con el formato exacto especificado.
5. En REFERENCIAS:, usa los datos completos de cada tesis (número, registro, época, materia, instancia) del contexto proporcionado.
6. En SUGERENCIAS:, incluye 3 preguntas de seguimiento separadas por |.
7. NO inventes números de registro o tesis. Si no estás seguro de algún dato, dilo explícitamente.
8. Sin emojis, hashtags ni símbolos decorativos.`;

  try {
    // Limpiar la API key (eliminar espacios al inicio/final)
    const cleanApiKey = apiKey.trim();
    if (cleanApiKey !== apiKey) {
      console.warn("[generateAnswerWithLLM] La API key tenía espacios, se limpiaron automáticamente");
    }
    
    console.log("[generateAnswerWithLLM] Enviando petición a OpenAI API...");
    console.log("[generateAnswerWithLLM] URL: https://api.openai.com/v1/chat/completions");
    console.log("[generateAnswerWithLLM] Model: gpt-4o-mini");
    
    // Crear un AbortController para timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 segundos timeout
    
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${cleanApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.2, // Muy bajo para respuestas más deterministas y profesionales
          max_tokens: 1200, // Optimizado para respuestas más rápidas sin sacrificar calidad
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      console.log("[generateAnswerWithLLM] Respuesta recibida, status:", response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        
        console.error("[generateAnswerWithLLM] ERROR de API:");
        console.error("  Status:", response.status, response.statusText);
        console.error("  Error completo:", JSON.stringify(errorData, null, 2));
        console.error("  Headers de respuesta:", Object.fromEntries(response.headers.entries()));
        
        // Errores específicos de autenticación
        if (response.status === 401 || response.status === 403) {
          const errorMsg = errorData.error?.message || errorData.error?.code || errorData.error || 'API key inválida o expirada';
          console.error("[generateAnswerWithLLM] ERROR DE AUTENTICACIÓN:");
          console.error("  - Verifica que la API key sea válida y no esté expirada");
          console.error("  - Verifica que tengas créditos disponibles en tu cuenta de OpenAI");
          console.error("  - Verifica que la API key tenga los permisos necesarios");
          throw new Error(`Error de autenticación con OpenAI: ${errorMsg}`);
        }
        
        // Error de conexión
        if (response.status === 0 || errorText.includes("connection") || errorText.includes("network")) {
          console.error("[generateAnswerWithLLM] ERROR DE CONEXIÓN:");
          console.error("  - Verifica tu conexión a internet");
          console.error("  - Verifica que puedas acceder a api.openai.com");
          throw new Error(`Error de conexión con OpenAI: ${errorData.error?.message || errorData.error || 'No se pudo conectar con la API'}`);
        }
        
        throw new Error(`OpenAI API error (${response.status}): ${errorData.error?.message || JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      const answer = data.choices[0]?.message?.content || "No se pudo generar una respuesta.";
    
    // Log completo de la respuesta para debug
    console.log("[generateAnswerWithLLM] Full API response keys:", Object.keys(data));
    console.log("[generateAnswerWithLLM] Usage field exists:", !!data.usage);
    console.log("[generateAnswerWithLLM] Usage field value:", JSON.stringify(data.usage, null, 2));
    
    // Extraer información de tokens de la respuesta
    // La API de OpenAI siempre debería incluir 'usage', pero verificamos por si acaso
    let tokenUsage;
    if (data.usage) {
      tokenUsage = {
        promptTokens: data.usage.prompt_tokens || 0,
        completionTokens: data.usage.completion_tokens || 0,
        totalTokens: data.usage.total_tokens || 0,
      };
    } else {
      // Si no hay usage, intentar calcular aproximado o usar valores por defecto
      console.warn("[generateAnswerWithLLM] WARNING: API response does not include 'usage' field");
      tokenUsage = {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      };
    }
    
    // Log para debug
    console.log("[generateAnswerWithLLM] Extracted token usage:", tokenUsage);
    
      return { answer, tokenUsage };
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      // Manejar errores de abort (timeout)
      if (fetchError.name === 'AbortError') {
        console.error("[generateAnswerWithLLM] ERROR: Timeout al conectar con OpenAI (60 segundos)");
        throw new Error("Timeout al conectar con OpenAI. Verifica tu conexión a internet.");
      }
      
      // Manejar errores de conexión
      if (fetchError.message?.includes("fetch failed") || 
          fetchError.message?.includes("ECONNREFUSED") ||
          fetchError.message?.includes("ENOTFOUND") ||
          fetchError.message?.includes("connection")) {
        console.error("[generateAnswerWithLLM] ERROR DE CONEXIÓN:");
        console.error("  Mensaje:", fetchError.message);
        console.error("  Stack:", fetchError.stack);
        console.error("  Posibles causas:");
        console.error("    - Problema de conexión a internet");
        console.error("    - Firewall bloqueando api.openai.com");
        console.error("    - Proxy o VPN interfiriendo");
        throw new Error(`Error de conexión con OpenAI: ${fetchError.message || 'No se pudo establecer conexión'}`);
      }
      
      // Re-lanzar otros errores
      throw fetchError;
    }
  } catch (error) {
    console.error("[generateAnswerWithLLM] ERROR capturado:", error);
    if (error instanceof Error) {
      console.error("[generateAnswerWithLLM] Error message:", error.message);
      console.error("[generateAnswerWithLLM] Error stack:", error.stack);
      
      // Si es un error de autenticación, dar más información
      if (error.message.includes("autenticación") || error.message.includes("401") || error.message.includes("403")) {
        console.error("[generateAnswerWithLLM] PROBLEMA DE AUTENTICACIÓN DETECTADO:");
        console.error("  - Verifica que OPENAI_API_KEY esté configurada correctamente en el archivo .env");
        console.error("  - Verifica que la API key sea válida y no esté expirada");
        console.error("  - Verifica que tengas créditos disponibles en tu cuenta de OpenAI");
      }
    }
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

  // Paso 1: Recuperar tesis y precedentes relevantes
  const { tesis: retrievedTesis, precedentes: retrievedPrecedentes } = await retrieveRelevantDocuments(question, {
    maxResults: config.maxTesis * 2, // Recuperar más para filtrar
    finalLimit: config.maxTesis,
    minSimilarity: config.minRelevance,
    vectorWeight: 0.7,
    textWeight: 0.3,
    deduplicateByTesis: true,
    includePrecedentes: true,
  });

  // Paso 2: Verificar si hay evidencia suficiente
  const hasEvidence = retrievedTesis.length > 0 || retrievedPrecedentes.length > 0;

  if (!hasEvidence) {
    return {
      answer: "No se encontró jurisprudencia ni precedentes directamente aplicables a esta pregunta. Se recomienda reformular la consulta con términos jurídicos más específicos o consultar otras fuentes.",
      tesisUsed: [],
      hasEvidence: false,
      confidence: "low",
    };
  }

  // Filtrar tesis con relevancia muy baja (menor a 0.2) antes de enviar al LLM
  const filteredTesis = retrievedTesis.filter(rt => rt.relevanceScore >= 0.2);
  const tesisToUse = filteredTesis.length > 0 ? filteredTesis : retrievedTesis;

  // Filtrar precedentes igual
  const filteredPrecedentes = retrievedPrecedentes.filter(rp => rp.relevanceScore >= 0.2);
  const precedentesToUse = filteredPrecedentes.length > 0 ? filteredPrecedentes : retrievedPrecedentes;

  // Paso 3: Generar respuesta (con LLM o sin él)
  let answer: string;
  let tokenUsage: { promptTokens: number; completionTokens: number; totalTokens: number } | undefined;
  
  if (config.useLLM) {
    try {
      const llmResult = await generateAnswerWithLLM(question, tesisToUse, precedentesToUse);
      answer = llmResult.answer;
      tokenUsage = llmResult.tokenUsage;
      console.log("[askQuestion] Token usage received:", tokenUsage);
    } catch (error) {
      console.error("[askQuestion] Error generating answer with LLM, falling back to simple format");
      console.error("[askQuestion] Error details:", error instanceof Error ? error.message : String(error));
      // Fallback: respuesta simple sin LLM
      answer = generateSimpleAnswer(question, tesisToUse);
      // Agregar nota sobre el error al inicio de la respuesta
      answer = `⚠️ No se pudo generar una respuesta con IA debido a un error de conexión. Mostrando tesis encontradas:\n\n${answer}`;
      tokenUsage = {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      };
    }
  } else {
    answer = generateSimpleAnswer(question, tesisToUse);
    tokenUsage = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    };
  }

  // Paso 4: Determinar confianza basada en tesis + precedentes
  const allScores = [
    ...tesisToUse.map(rt => rt.relevanceScore),
    ...precedentesToUse.map(rp => rp.relevanceScore),
  ];
  const totalDocs = allScores.length;
  const avgRelevance = totalDocs > 0 ? allScores.reduce((sum, s) => sum + s, 0) / totalDocs : 0;
  let confidence: "high" | "medium" | "low";
  let finalHasEvidence = true;

  if (avgRelevance >= 0.6 && totalDocs >= 3) {
    confidence = "high";
  } else if (avgRelevance >= 0.4 && totalDocs >= 2) {
    confidence = "medium";
  } else if (avgRelevance >= 0.3 && totalDocs >= 1) {
    confidence = "low";
  } else {
    confidence = "low";
    finalHasEvidence = false;
  }

  // Paso 5: Formatear tesis y precedentes usados
  const tesisUsed = [
    ...tesisToUse.map(rt => ({
      id: rt.tesis.id,
      title: rt.tesis.title,
      citation: formatTesisCitation(rt.tesis),
      formalCitation: formatTesisFormalCitation(rt.tesis),
      relevanceScore: rt.relevanceScore,
      source: "tesis" as const,
      url: rt.tesis.url || undefined,
    })),
    ...precedentesToUse.map(rp => ({
      id: rp.precedente.id,
      title: rp.precedente.rubro,
      citation: formatPrecedenteCitation(rp.precedente),
      formalCitation: formatPrecedenteFormalCitation(rp.precedente),
      relevanceScore: rp.relevanceScore,
      source: "precedente" as const,
      url: rp.precedente.url_origen || undefined,
    })),
  ];

  // Asegurar que tokenUsage siempre esté presente (incluso si es undefined, lo convertimos a un objeto con 0s)
  const finalTokenUsage = tokenUsage || {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
  };
  
  const response = {
    answer,
    tesisUsed,
    hasEvidence: finalHasEvidence,
    confidence,
    tokenUsage: finalTokenUsage,
  };
  
  console.log("[askQuestion] Final response with tokenUsage:", JSON.stringify(response, null, 2));
  console.log("[askQuestion] TokenUsage type:", typeof tokenUsage, "value:", tokenUsage);
  
  return response;
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
