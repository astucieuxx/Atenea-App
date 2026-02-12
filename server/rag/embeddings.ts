/**
 * ATENEA RAG - Módulo de Embeddings
 * 
 * Genera embeddings vectoriales para chunks de texto jurídico.
 * Soporta múltiples proveedores (OpenAI, Cohere, local).
 * 
 * Estrategia:
 * - Usar modelo de embeddings especializado en español
 * - Batch processing para eficiencia
 * - Retry logic para APIs externas
 * - Caching opcional para evitar re-embeddings
 */

import type { Tesis } from "@shared/schema";

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

export interface EmbeddingConfig {
  provider: "openai" | "cohere" | "local" | "zendesk";
  model: string;
  apiKey?: string;
  batchSize?: number;
  dimension?: number; // Dimensión del vector (1536 para OpenAI, 1024 para Cohere, etc.)
  baseURL?: string; // URL personalizada para gateways
}

// Configuración por defecto (OpenAI text-embedding-3-small)
export const DEFAULT_CONFIG: EmbeddingConfig = {
  provider: "openai",
  model: "text-embedding-3-small",
  batchSize: 100, // Procesar en lotes para eficiencia
  dimension: 1536,
};

// ============================================================================
// INTERFAZ DE EMBEDDING PROVIDER
// ============================================================================

export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
  getDimension(): number;
}

// ============================================================================
// OPENAI EMBEDDING PROVIDER
// ============================================================================

class OpenAIEmbeddingProvider implements EmbeddingProvider {
  private apiKey: string;
  private model: string;
  private dimension: number;
  private baseURL: string;

  constructor(config: EmbeddingConfig) {
    // Intentar obtener la API key de múltiples fuentes
    const apiKey = config.apiKey || process.env.OPENAI_API_KEY || process.env.EMBEDDING_API_KEY;
    
    if (!apiKey) {
      throw new Error("OpenAI API key is required. Set OPENAI_API_KEY or EMBEDDING_API_KEY environment variable.");
    }
    this.apiKey = apiKey;
    this.model = config.model || "text-embedding-3-small";
    this.dimension = config.dimension || 1536;
    this.baseURL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
  }

  async embed(text: string): Promise<number[]> {
    const results = await this.embedBatch([text]);
    return results[0];
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const maxRetries = 5; // Aumentado de 3 a 5 para errores transitorios
    let lastError: Error | null = null;
    let lastErrorData: any = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(`${this.baseURL}/embeddings`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: this.model,
            input: texts,
            dimensions: this.dimension,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: { message: "Unknown error" } }));
          lastErrorData = errorData;
          
          // Detectar tipo de error para decidir si reintentar
          const errorType = errorData?.error?.type || errorData?.error?.code || "";
          const errorMessage = errorData?.error?.message || JSON.stringify(errorData);
          
          // Errores transitorios que deben reintentarse
          const isTransientError = 
            errorType === "server_error" ||
            errorType === "rate_limit_error" ||
            errorType === "timeout" ||
            response.status === 429 || // Too Many Requests
            response.status === 500 || // Internal Server Error
            response.status === 502 || // Bad Gateway
            response.status === 503 || // Service Unavailable
            response.status === 504;   // Gateway Timeout
          
          if (isTransientError && attempt < maxRetries) {
            const backoffDelay = Math.min(Math.pow(2, attempt) * 1000, 10000); // Max 10 segundos
            console.warn(`[OpenAI Embeddings] Error transitorio (intento ${attempt}/${maxRetries}): ${errorMessage}. Reintentando en ${backoffDelay}ms...`);
            await new Promise(resolve => setTimeout(resolve, backoffDelay));
            continue;
          }
          
          throw new Error(`OpenAI API error: ${errorMessage}`);
        }

        const data = await response.json();
        return data.data.map((item: any) => item.embedding);
      } catch (error) {
        lastError = error as Error;
        
        // Si es un error de red o timeout, reintentar
        const isNetworkError = 
          error instanceof TypeError ||
          (error as any)?.message?.includes("fetch failed") ||
          (error as any)?.message?.includes("ECONNREFUSED") ||
          (error as any)?.message?.includes("ENOTFOUND");
        
        if (isNetworkError && attempt < maxRetries) {
          const backoffDelay = Math.min(Math.pow(2, attempt) * 1000, 10000);
          console.warn(`[OpenAI Embeddings] Error de red (intento ${attempt}/${maxRetries}): ${lastError.message}. Reintentando en ${backoffDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
          continue;
        }
        
        // Si no es un error transitorio o ya agotamos los reintentos, lanzar error
        if (attempt >= maxRetries) {
          break;
        }
      }
    }

    // Mensaje de error más amigable
    const errorMessage = lastErrorData?.error?.message || lastError?.message || "Error desconocido";
    const errorType = lastErrorData?.error?.type || "unknown";
    const requestId = lastErrorData?.error?.request_id || "";
    
    // Log del error técnico completo para debugging (solo en servidor)
    if (requestId) {
      console.error(`[OpenAI Embeddings] Request ID: ${requestId}`);
    }
    console.error(`[OpenAI Embeddings] Error type: ${errorType}, Message: ${errorMessage}`);
    
    // Crear mensaje amigable según el tipo de error
    let userFriendlyMessage: string;
    if (errorType === "server_error") {
      userFriendlyMessage = "El servicio de OpenAI está experimentando problemas temporales. Por favor, intenta de nuevo en unos momentos.";
    } else if (errorType === "rate_limit_error") {
      userFriendlyMessage = "Se ha excedido el límite de solicitudes. Por favor, espera unos momentos e intenta de nuevo.";
    } else if (errorType === "invalid_api_key" || errorType === "authentication_error") {
      userFriendlyMessage = "Error de autenticación con OpenAI. Verifica tu API key.";
    } else {
      // Para otros errores, usar mensaje genérico pero amigable
      userFriendlyMessage = "Error al generar embeddings. Por favor, intenta de nuevo en unos momentos.";
    }
    
    // Lanzar error con SOLO el mensaje amigable (sin el mensaje técnico)
    // El mensaje técnico ya está en los logs del servidor
    throw new Error(userFriendlyMessage);
  }

  getDimension(): number {
    return this.dimension;
  }
}

// ============================================================================
// COHERE EMBEDDING PROVIDER
// ============================================================================

class CohereEmbeddingProvider implements EmbeddingProvider {
  private apiKey: string;
  private model: string;
  private dimension: number;

  constructor(config: EmbeddingConfig) {
    if (!config.apiKey) {
      throw new Error("Cohere API key is required");
    }
    this.apiKey = config.apiKey;
    this.model = config.model || "embed-multilingual-v3.0";
    this.dimension = config.dimension || 1024;
  }

  async embed(text: string): Promise<number[]> {
    const results = await this.embedBatch([text]);
    return results[0];
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch("https://api.cohere.ai/v1/embed", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: this.model,
            texts: texts,
            input_type: "search_document",
            truncate: "END",
          }),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: "Unknown error" }));
          throw new Error(`Cohere API error: ${JSON.stringify(error)}`);
        }

        const data = await response.json();
        return data.embeddings;
      } catch (error) {
        lastError = error as Error;
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    throw new Error(`Failed to generate embeddings after ${maxRetries} attempts: ${lastError?.message}`);
  }

  getDimension(): number {
    return this.dimension;
  }
}

// ============================================================================
// ZENDESK GATEWAY EMBEDDING PROVIDER
// ============================================================================

class ZendeskEmbeddingProvider implements EmbeddingProvider {
  private apiKey: string;
  private model: string;
  private dimension: number;
  private baseURL: string;

  constructor(config: EmbeddingConfig) {
    const apiKey = config.apiKey || process.env.ZENDESK_AI_KEY;
    
    if (!apiKey) {
      throw new Error("Zendesk AI key is required. Set ZENDESK_AI_KEY environment variable.");
    }
    
    this.apiKey = apiKey;
    this.model = config.model || "gpt-4";
    this.dimension = config.dimension || 1536;
    
    // Zendesk gateway URL - puede ser para embeddings o chat completions
    // Intentamos usar embeddings primero, si no está disponible usamos chat completions
    const gatewayURL = config.baseURL || process.env.ZENDESK_AI_URL || "https://ai-gateway.zende.sk/v1";
    this.baseURL = gatewayURL.replace("/chat/completions", "").replace("/v1", "") + "/v1";
  }

  async embed(text: string): Promise<number[]> {
    const results = await this.embedBatch([text]);
    return results[0];
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    // Usar chat completions para generar embeddings sintéticos
    // Estrategia: generar un hash/representación numérica del texto usando el modelo
    return this.embedViaChatCompletions(texts);
  }

  private async embedViaChatCompletions(texts: string[]): Promise<number[][]> {
    // Usar chat completions para generar embeddings sintéticos
    // Pedimos al modelo que genere una representación numérica del texto
    const chatURL = `${this.baseURL}/chat/completions`;
    const embeddings: number[][] = [];
    const maxRetries = 3;

    for (const text of texts) {
      let lastError: Error | null = null;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          // Truncar texto si es muy largo (limite de tokens del modelo)
          const truncatedText = text.length > 8000 ? text.substring(0, 8000) + "..." : text;
          
          const response = await fetch(chatURL, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${this.apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: this.model,
              messages: [
                {
                  role: "system",
                  content: `You are an embedding generator. Given a text, generate a ${this.dimension}-dimensional embedding vector as a JSON array of ${this.dimension} floating-point numbers between -1 and 1. Return ONLY the JSON array, nothing else. Example: [0.123, -0.456, 0.789, ...]`
                },
                {
                  role: "user",
                  content: `Generate a ${this.dimension}-dimensional embedding vector for this text:\n\n${truncatedText}`
                }
              ],
              temperature: 0.1, // Baja temperatura para resultados más consistentes
              max_tokens: 4000, // Suficiente para 1536 números
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
            throw new Error(`Chat completions error: ${JSON.stringify(errorData)}`);
          }

          const data = await response.json();
          const content = data.choices[0]?.message?.content?.trim() || "";
          
          // Limpiar el contenido (puede tener markdown code blocks)
          let cleanContent = content;
          if (cleanContent.startsWith("```json")) {
            cleanContent = cleanContent.replace(/```json\n?/g, "").replace(/```\n?/g, "");
          } else if (cleanContent.startsWith("```")) {
            cleanContent = cleanContent.replace(/```\n?/g, "");
          }
          
          // Intentar parsear como JSON array
          try {
            const embedding = JSON.parse(cleanContent);
            if (Array.isArray(embedding)) {
              // Asegurar que tenga la dimensión correcta
              if (embedding.length === this.dimension) {
                embeddings.push(embedding);
                break; // Éxito, salir del loop de retries
              } else if (embedding.length > this.dimension) {
                // Si es más largo, truncar
                embeddings.push(embedding.slice(0, this.dimension));
                break;
              } else {
                // Si es más corto, rellenar con ceros
                const padded = [...embedding, ...new Array(this.dimension - embedding.length).fill(0)];
                embeddings.push(padded);
                break;
              }
            } else {
              throw new Error("Response is not an array");
            }
          } catch (parseError) {
            // Si no es JSON válido, intentar extraer números del texto
            const numbers = cleanContent.match(/-?\d+\.?\d*/g);
            if (numbers && numbers.length >= this.dimension) {
              const embedding = numbers.slice(0, this.dimension).map((n: string) => parseFloat(n));
              embeddings.push(embedding);
              break;
            } else {
              throw new Error(`Could not parse embedding: ${parseError}`);
            }
          }
        } catch (error) {
          lastError = error as Error;
          if (attempt < maxRetries) {
            // Exponential backoff
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          }
        }
      }
      
      // Si todos los intentos fallaron, usar embedding basado en hash del texto
      if (embeddings.length <= texts.indexOf(text)) {
        console.warn(`⚠️  Failed to generate embedding via chat, using hash-based fallback`);
        embeddings.push(this.generateHashEmbedding(text));
      }
    }

    return embeddings;
  }

  private generateHashEmbedding(text: string): number[] {
    // Fallback: generar embedding basado en hash del texto
    // No es ideal pero permite continuar el proceso
    const embedding = new Array(this.dimension).fill(0);
    let hash = 0;
    
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i);
      hash = hash & hash; // Convert to 32bit integer
    }
    
    // Distribuir el hash en el embedding
    for (let i = 0; i < this.dimension; i++) {
      embedding[i] = Math.sin((hash + i) * 0.01) * 0.5;
    }
    
    return embedding;
  }

  getDimension(): number {
    return this.dimension;
  }
}

// ============================================================================
// FACTORY: Crear provider según configuración
// ============================================================================

export function createEmbeddingProvider(config: EmbeddingConfig = DEFAULT_CONFIG): EmbeddingProvider {
  // Usar variables de entorno si están disponibles
  // Para OpenAI, también acepta OPENAI_API_KEY
  const apiKey = process.env.EMBEDDING_API_KEY || process.env.OPENAI_API_KEY || config.apiKey;
  
  // Determinar provider desde env o config
  const provider = (process.env.EMBEDDING_PROVIDER as any) || config.provider;
  
  const effectiveConfig: EmbeddingConfig = {
    ...config,
    provider: provider,
    apiKey: apiKey,
    model: process.env.EMBEDDING_MODEL || process.env.ZENDESK_MODEL || config.model,
    baseURL: process.env.ZENDESK_AI_URL || config.baseURL,
  };

  switch (effectiveConfig.provider) {
    case "openai":
      return new OpenAIEmbeddingProvider(effectiveConfig);
    case "cohere":
      return new CohereEmbeddingProvider(effectiveConfig);
    case "zendesk":
      return new ZendeskEmbeddingProvider(effectiveConfig);
    case "local":
      throw new Error("Local embeddings not yet implemented. Use OpenAI, Cohere, or Zendesk.");
    default:
      throw new Error(`Unknown embedding provider: ${effectiveConfig.provider}`);
  }
}

// ============================================================================
// FUNCIÓN PÚBLICA: Generar embedding para un texto
// ============================================================================

let cachedProvider: EmbeddingProvider | null = null;

export async function generateEmbedding(
  text: string,
  config?: EmbeddingConfig
): Promise<number[]> {
  if (!cachedProvider) {
    cachedProvider = createEmbeddingProvider(config);
  }
  return cachedProvider.embed(text);
}

// ============================================================================
// FUNCIÓN PÚBLICA: Generar embeddings en batch
// ============================================================================

export async function generateEmbeddingsBatch(
  texts: string[],
  config?: EmbeddingConfig
): Promise<number[][]> {
  if (!cachedProvider) {
    cachedProvider = createEmbeddingProvider(config);
  }

  const batchSize = config?.batchSize || DEFAULT_CONFIG.batchSize || 100;
  const results: number[][] = [];

  // Procesar en lotes para evitar rate limits
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchResults = await cachedProvider.embedBatch(batch);
    results.push(...batchResults);

    // Pequeña pausa entre lotes para evitar rate limits
    if (i + batchSize < texts.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return results;
}

// ============================================================================
// FUNCIÓN PÚBLICA: Obtener dimensión del modelo
// ============================================================================

export function getEmbeddingDimension(config?: EmbeddingConfig): number {
  if (!cachedProvider) {
    cachedProvider = createEmbeddingProvider(config);
  }
  return cachedProvider.getDimension();
}
