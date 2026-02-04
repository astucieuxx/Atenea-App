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

  // Prompt estructurado para respuesta jurídica profesional y práctica
  const systemPrompt = `Eres un abogado senior especialista en derecho fiscal y penal fiscal mexicano, con experiencia en litigio ante la SCJN y en diseño de productos legales (legal tech).

Tu objetivo es generar respuestas jurídicas que:
- Sean más claras, prácticas y profesionales que las de Juztina.
- Prioricen la toma de decisiones del abogado.
- Reduzcan la carga cognitiva sin perder rigor jurídico.
- Sean aptas para usarse como base de dictámenes, notas internas o escritos.

REGLAS FUNDAMENTALES:
1. Responde SOLO con base en la información proporcionada en el contexto (RAG). NO inventes normas, precedentes, artículos o criterios que no estén en las tesis proporcionadas.
2. Cuando cites jurisprudencia, usa referencias exactas con el formato: [ID: xxx] "Rubro de la tesis". El sistema convertirá automáticamente [ID: xxx] a [#número] donde el número corresponde al orden en la lista de tesis al final.
3. Si las tesis no son suficientes, indícalo explícitamente y explica qué falta.
4. NUNCA inventes información que no esté en las tesis proporcionadas.

FORMATO OBLIGATORIO DE RESPUESTA:

Usa un formato limpio y profesional. Las secciones principales deben usar títulos en negritas con el formato **TÍTULO DE SECCIÓN**. Usa líneas separadoras (---) entre secciones principales. NO uses emojis, hashtags, ni símbolos decorativos.

**RESPUESTA EJECUTIVA**

Empieza SIEMPRE con un bloque corto, claro y directo que responda la pregunta SIN rodeos.

- Máximo 5-7 líneas
- Lenguaje jurídico claro, no académico
- Debe permitir entender la regla aplicable sin leer el resto
- Incluir plazos, fechas clave y consecuencias prácticas
- Evitar citas largas; solo la regla

Ejemplo de enfoque: "Por regla general…, salvo que…, en cuyo caso…"

---

**REGLAS PRÁCTICAS**

Desglosa la doctrina en reglas operativas usando listas con viñetas (guión y espacio: - ).

Incluye solo lo que sirve para decidir:
- Fecha relevante: [especificar]
- Plazo aplicable: [especificar]
- Excepciones: [si las hay]
- Límites absolutos: [si aplica]
- Consideraciones importantes: [riesgos interpretativos o advertencias]

Usa negritas SOLO para conceptos clave dentro del texto (formato: **concepto clave**), no para toda la lista.

---

**FUNDAMENTO JURÍDICO**

Explica brevemente el sustento normativo y jurisprudencial.

- Prioriza jurisprudencia obligatoria
- Resume la tesis en una frase funcional (NO copies el rubro completo)
- Evita repetir lo ya dicho en el resumen
- No inflar con doctrina innecesaria

---

**JURISPRUDENCIA**

Separa claramente las fuentes en dos bloques usando subtítulos en negritas:

**Jurisprudencia directamente aplicable**

Solo tesis que sostienen la regla central. Usa formato: [ID: xxx] "Rubro de la tesis"

**Jurisprudencia relacionada (contexto)**

Tesis auxiliares o analógicas. No mezclar ambos niveles.

Esto es obligatorio para evitar "ruido jurídico".

---

**CONCLUSIÓN**

Cierra con un párrafo que:
- Reafirme la regla aplicable
- Destaque la consecuencia práctica
- Pueda copiarse directamente en un dictamen o escrito

Debe sonar a abogado senior, no a resumen académico.

---

**NOTA SOBRE CONFIANZA** (solo si aplica)

Cuando la respuesta dependa de hechos no acreditados, pruebas adicionales o criterios no absolutamente uniformes, incluye una nota breve explicativa del nivel de confianza y por qué.

Ejemplo: "Confianza: Media — el criterio es jurisprudencial, pero el cómputo puede variar si existen actos previos que acrediten conocimiento de la autoridad."

---

REGLAS GENERALES DE ESTILO:
- NO empieces con "Planteamiento del problema".
- NO escribas como manual universitario.
- Prioriza claridad sobre exhaustividad.
- Piensa siempre: "¿Esto le ahorra tiempo a un abogado?"
- Si algo no aporta a la decisión, elimínalo.
- Usa terminología jurídica mexicana precisa: SCJN, TCC, jurisprudencia obligatoria, tesis aislada, prescripción, acción penal, etc.

CUANDO NO HAY SUFICIENTE EVIDENCIA:
Si las tesis no son suficientes para responder, estructura la respuesta así:
- Respuesta ejecutiva indicando la falta de evidencia directa
- Explicación de qué elementos faltan
- Recomendación práctica sobre cómo proceder`;

  const userPrompt = `Pregunta jurídica: ${question}

Tesis relevantes encontradas:
${tesisContext}

INSTRUCCIONES CRÍTICAS:
1. Responde la pregunta basándote ÚNICAMENTE en las tesis proporcionadas arriba.
2. Sigue EXACTAMENTE el formato obligatorio sin emojis, sin hashtags, sin números con círculos.
3. Usa SOLO el siguiente formato:
   - **TÍTULO DE SECCIÓN** para secciones principales (RESPUESTA EJECUTIVA, REGLAS PRÁCTICAS, etc.)
   - --- (tres guiones) para separar secciones principales
   - - (guión y espacio) para listas con viñetas
   - **texto** para conceptos clave dentro de párrafos (NO para títulos de lista)
4. Cita cada tesis usando SIEMPRE el formato: [ID: xxx] "Rubro de la tesis" donde xxx es el ID de la tesis. El sistema convertirá automáticamente [ID: xxx] a [#número] donde el número corresponde al orden en la lista de tesis al final.
5. NO uses emojis, hashtags, números con círculos, ni símbolos decorativos.
6. NO uses asteriscos para títulos de lista, solo para títulos de sección y conceptos clave.
7. Si las tesis no son suficientes, indícalo en la Respuesta Ejecutiva y explica qué falta.
8. Clasifica las tesis en "Jurisprudencia directamente aplicable" y "Jurisprudencia relacionada" usando subtítulos en negritas.

IMPORTANTE: El formato debe verse profesional, limpio y formal. El frontend procesará automáticamente las negritas y separadores para crear un diseño elegante. Solo enfócate en el contenido jurídico de calidad.`;

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
    vectorWeight: 0.7,
    textWeight: 0.3,
    deduplicateByTesis: true,
  });

  // Paso 2: Verificar si hay evidencia suficiente
  // Ser más permisivo: si hay tesis recuperadas, intentar generar respuesta
  // incluso si la relevancia es baja (el LLM puede decidir si son útiles)
  const hasEvidence = retrievedTesis.length > 0;
  
  // Si no hay ninguna tesis, retornar inmediatamente
  if (!hasEvidence) {
    return {
      answer: "No se encontró jurisprudencia directamente aplicable a esta pregunta. Se recomienda reformular la consulta con términos jurídicos más específicos o consultar otras fuentes.",
      tesisUsed: [],
      hasEvidence: false,
      confidence: "low",
    };
  }

  // Filtrar tesis con relevancia muy baja (menor a 0.2) antes de enviar al LLM
  // pero mantener las que tienen al menos algo de relevancia
  const filteredTesis = retrievedTesis.filter(rt => rt.relevanceScore >= 0.2);
  
  // Si después de filtrar no quedan tesis, usar las originales pero con advertencia
  const tesisToUse = filteredTesis.length > 0 ? filteredTesis : retrievedTesis;

  // Paso 3: Generar respuesta (con LLM o sin él)
  let answer: string;
  
  if (config.useLLM) {
    try {
      answer = await generateAnswerWithLLM(question, tesisToUse);
    } catch (error) {
      console.error("Error generating answer, falling back to simple format:", error);
      // Fallback: respuesta simple sin LLM
      answer = generateSimpleAnswer(question, tesisToUse);
    }
  } else {
    answer = generateSimpleAnswer(question, tesisToUse);
  }

  // Paso 4: Determinar confianza basada en las tesis usadas
  const avgRelevance = tesisToUse.reduce((sum, rt) => sum + rt.relevanceScore, 0) / tesisToUse.length;
  let confidence: "high" | "medium" | "low";
  let finalHasEvidence = true;
  
  if (avgRelevance >= 0.6 && tesisToUse.length >= 3) {
    confidence = "high";
  } else if (avgRelevance >= 0.4 && tesisToUse.length >= 2) {
    confidence = "medium";
  } else if (avgRelevance >= 0.3 && tesisToUse.length >= 1) {
    confidence = "low";
  } else {
    // Si la relevancia promedio es muy baja, marcar como sin evidencia suficiente
    confidence = "low";
    finalHasEvidence = false;
  }

  // Paso 5: Formatear tesis usadas
  const tesisUsed = tesisToUse.map(rt => ({
    id: rt.tesis.id,
    title: rt.tesis.title,
    citation: formatTesisCitation(rt.tesis),
    relevanceScore: rt.relevanceScore,
  }));

  return {
    answer,
    tesisUsed,
    hasEvidence: finalHasEvidence,
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
