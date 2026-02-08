/**
 * Query Logger - Registra consultas RAG en CSV
 * 
 * Guarda todas las consultas con su tiempo de respuesta en un archivo CSV
 * para análisis posterior.
 */

import * as fs from "fs";
import * as path from "path";

const CSV_FILE_PATH = path.join(process.cwd(), "rag_queries_log.csv");
const CSV_HEADER = "fecha,tiempo_utc,pregunta,tiempo_respuesta_segundos,tiempo_respuesta_ms,tesis_encontradas,confianza,con_evidencia,tokens_prompt,tokens_completion,tokens_total\n";

/**
 * Inicializa el archivo CSV si no existe o actualiza el header si es necesario
 */
function ensureCSVFile() {
  if (!fs.existsSync(CSV_FILE_PATH)) {
    // Crear archivo nuevo con el header completo
    fs.writeFileSync(CSV_FILE_PATH, CSV_HEADER, "utf-8");
  } else {
    // Verificar si el header tiene las columnas de tokens
    const content = fs.readFileSync(CSV_FILE_PATH, "utf-8");
    const firstLine = content.split('\n')[0];
    
    // Si el header no incluye tokens_total, necesitamos actualizarlo
    if (!firstLine.includes("tokens_total")) {
      console.log("[Query Logger] Actualizando header del CSV para incluir información de tokens");
      
      // Leer todas las líneas existentes
      const lines = content.split('\n').filter(line => line.trim().length > 0);
      
      // Si hay datos, necesitamos agregar columnas vacías a las filas existentes
      if (lines.length > 1) {
        const updatedLines = lines.map((line, index) => {
          if (index === 0) {
            // Actualizar el header
            return CSV_HEADER.trim();
          } else {
            // Agregar columnas vacías (0) para tokens en filas existentes
            return line + ",0,0,0";
          }
        });
        
        fs.writeFileSync(CSV_FILE_PATH, updatedLines.join('\n') + '\n', "utf-8");
      } else {
        // Solo hay header, actualizarlo
        fs.writeFileSync(CSV_FILE_PATH, CSV_HEADER, "utf-8");
      }
    }
  }
}

/**
 * Escapa valores para CSV (maneja comillas y saltos de línea)
 */
function escapeCSVValue(value: string): string {
  // Si contiene comillas, saltos de línea o comas, envolver en comillas y escapar comillas internas
  if (value.includes('"') || value.includes('\n') || value.includes('\r') || value.includes(',')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Registra una consulta en el CSV
 */
export function logQuery(params: {
  question: string;
  responseTimeMs: number;
  tesisFound: number;
  confidence: "high" | "medium" | "low";
  hasEvidence: boolean;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}): void {
  try {
    console.log(`[Query Logger] Intentando registrar consulta en: ${CSV_FILE_PATH}`);
    console.log(`[Query Logger] process.cwd(): ${process.cwd()}`);
    
    ensureCSVFile();
    console.log(`[Query Logger] Archivo CSV verificado/creado`);

    const now = new Date();
    const fecha = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const tiempoUtc = now.toISOString(); // ISO 8601 completo
    const tiempoSegundos = (params.responseTimeMs / 1000).toFixed(3);
    const tiempoMs = params.responseTimeMs.toFixed(0);
    
    // Escapar la pregunta para CSV
    const preguntaEscapada = escapeCSVValue(params.question);
    
    // Obtener información de tokens (si está disponible)
    const tokensPrompt = params.tokenUsage?.promptTokens?.toString() || "0";
    const tokensCompletion = params.tokenUsage?.completionTokens?.toString() || "0";
    const tokensTotal = params.tokenUsage?.totalTokens?.toString() || "0";
    
    // Construir la línea CSV
    const csvLine = [
      fecha,
      tiempoUtc,
      preguntaEscapada,
      tiempoSegundos,
      tiempoMs,
      params.tesisFound.toString(),
      params.confidence,
      params.hasEvidence ? "true" : "false",
      tokensPrompt,
      tokensCompletion,
      tokensTotal
    ].join(",") + "\n";

    // Agregar al final del archivo (append)
    fs.appendFileSync(CSV_FILE_PATH, csvLine, "utf-8");
    console.log(`[Query Logger] Consulta registrada exitosamente`);
  } catch (error) {
    // No fallar si hay error al escribir el log
    console.error("[Query Logger] Error escribiendo log de consulta:", error);
    if (error instanceof Error) {
      console.error("[Query Logger] Mensaje:", error.message);
      console.error("[Query Logger] Stack:", error.stack);
    }
  }
}

/**
 * Obtiene la ruta del archivo CSV
 */
export function getCSVFilePath(): string {
  return CSV_FILE_PATH;
}
