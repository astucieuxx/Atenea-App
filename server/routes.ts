import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { analyzeRequestSchema, argumentRequestSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Verificar configuración al iniciar
  const apiKey = process.env.OPENAI_API_KEY;
  console.log("\n" + "=".repeat(60));
  console.log("🔍 DIAGNÓSTICO DE CONFIGURACIÓN OPENAI");
  console.log("=".repeat(60));
  console.log(`OPENAI_API_KEY: ${apiKey ? `✅ Configurada (${apiKey.length} caracteres, formato: ${apiKey.startsWith("sk-") ? "correcto" : "⚠️  posiblemente incorrecto"})` : "❌ NO CONFIGURADA"}`);
  console.log(`EMBEDDING_PROVIDER: ${process.env.EMBEDDING_PROVIDER || "openai (default)"}`);
  console.log(`EMBEDDING_MODEL: ${process.env.EMBEDDING_MODEL || "text-embedding-3-small (default)"}`);
  if (!apiKey) {
    console.log("\n⚠️  ADVERTENCIA: OPENAI_API_KEY no está configurada");
    console.log("   Esto causará errores al intentar generar respuestas con IA");
    console.log("   Solución: Agrega OPENAI_API_KEY=sk-tu-api-key en tu archivo .env");
  } else if (!apiKey.startsWith("sk-")) {
    console.log("\n⚠️  ADVERTENCIA: La API key no tiene el formato esperado");
    console.log("   Las API keys de OpenAI normalmente empiezan con 'sk-'");
  }
  console.log("=".repeat(60) + "\n");
  
  app.post("/api/analyze", async (req, res) => {
    try {
      const parsed = analyzeRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          error: "Descripción inválida. Proporcione al menos 10 caracteres." 
        });
      }

      const analysis = await storage.analyzeCase(parsed.data.descripcion, parsed.data.rol_procesal);
      return res.json(analysis);
    } catch (error) {
      console.error("Error analyzing case:", error);
      return res.status(500).json({ error: "Error al analizar el caso" });
    }
  });

  app.get("/api/analysis/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const analysis = storage.getAnalysisById(id);
      
      if (!analysis) {
        return res.status(404).json({ error: "Análisis no encontrado" });
      }

      return res.json(analysis);
    } catch (error) {
      console.error("Error fetching analysis:", error);
      return res.status(500).json({ error: "Error al obtener el análisis" });
    }
  });

  app.get("/api/tesis/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const analysisId = req.query.analysisId as string | undefined;
      
      // Primero intentar buscar en el storage en memoria (para análisis tradicionales)
      let tesis = storage.getScoredTesisById(id, analysisId);
      
      // Si no se encuentra, buscar en la base de datos (para tesis del RAG)
      if (!tesis) {
        try {
          const { getTesisById } = await import("./rag/database");
          const dbTesis = await getTesisById(id);
          
          if (dbTesis) {
            // Convertir Tesis de BD a ScoredTesis para compatibilidad
            tesis = {
              ...dbTesis,
              score: 1.0, // Valor por defecto para tesis de BD
              fuerza: "Alta" as const,
              razon_fuerza: "Tesis obtenida de la base de datos RAG",
              por_que_aplica: "Tesis relevante encontrada mediante búsqueda vectorial",
              pertinencia: "Alta" as const,
              autoridad: "Alta" as const,
              riesgos: [] as const,
            };
          }
        } catch (dbError) {
          // Si hay error con la BD, continuar y retornar 404 más abajo
          console.error("Error fetching tesis from database:", dbError);
        }
      }
      
      if (!tesis) {
        return res.status(404).json({ error: "Tesis no encontrada" });
      }

      return res.json(tesis);
    } catch (error) {
      console.error("Error fetching tesis:", error);
      return res.status(500).json({ error: "Error al obtener la tesis" });
    }
  });

  app.post("/api/arguments", async (req, res) => {
    try {
      const parsed = argumentRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Datos de argumento inválidos" });
      }

      const { tesis_id, tipo_escrito, rol_procesal, tono } = parsed.data;
      const argument = storage.createArgument(
        tesis_id,
        tipo_escrito,
        rol_procesal,
        tono
      );

      if (!argument) {
        return res.status(404).json({ error: "Tesis no encontrada" });
      }

      return res.json(argument);
    } catch (error) {
      console.error("Error generating argument:", error);
      return res.status(500).json({ error: "Error al generar el argumento" });
    }
  });

  app.get("/api/history", async (req, res) => {
    try {
      const history = storage.getAllHistory();
      return res.json(history);
    } catch (error) {
      console.error("Error fetching history:", error);
      return res.status(500).json({ error: "Error al obtener el historial" });
    }
  });

  app.get("/api/tesis", async (req, res) => {
    try {
      const search = req.query.q as string | undefined;
      const limit = parseInt(req.query.limit as string) || 20;
      
      let tesisList = storage.getAllTesis();
      
      if (search) {
        const searchLower = search.toLowerCase();
        tesisList = tesisList.filter((t) =>
          t.title.toLowerCase().includes(searchLower) ||
          t.abstract?.toLowerCase().includes(searchLower) ||
          t.materias?.toLowerCase().includes(searchLower)
        );
      }

      return res.json(tesisList.slice(0, limit));
    } catch (error) {
      console.error("Error fetching tesis list:", error);
      return res.status(500).json({ error: "Error al obtener las tesis" });
    }
  });

  // ============================================================================
  // DIAGNOSTIC ENDPOINT: /api/check-config
  // ============================================================================
  app.get("/api/check-config", async (req, res) => {
    const apiKey = process.env.OPENAI_API_KEY;
    const embeddingProvider = process.env.EMBEDDING_PROVIDER || "openai";
    const embeddingModel = process.env.EMBEDDING_MODEL || "text-embedding-3-small";
    
    const config = {
      openaiApiKey: {
        configured: !!apiKey,
        format: apiKey ? (apiKey.startsWith("sk-") ? "correcto" : "posiblemente incorrecto (debería empezar con 'sk-')") : "no configurada",
        length: apiKey ? apiKey.length : 0,
        preview: apiKey ? `${apiKey.substring(0, 7)}...${apiKey.substring(apiKey.length - 4)}` : "N/A"
      },
      embedding: {
        provider: embeddingProvider,
        model: embeddingModel
      },
      recommendations: [] as string[]
    };
    
    if (!apiKey) {
      config.recommendations.push("Agrega OPENAI_API_KEY=sk-tu-api-key-aqui en tu archivo .env");
    } else if (!apiKey.startsWith("sk-")) {
      config.recommendations.push("La API key no tiene el formato esperado. Verifica que sea una key válida de OpenAI");
    } else if (apiKey.length < 20) {
      config.recommendations.push("La API key parece muy corta. Verifica que sea completa");
    }
    
    return res.json(config);
  });

  // RAG ENDPOINT: /api/ask
  // ============================================================================
  app.post("/api/ask", async (req, res) => {
    const startTime = Date.now();
    let responseTimeMs = 0;
    let response: any = null;
    
    try {
      const { question } = req.body;
      
      if (!question || typeof question !== "string" || question.trim().length < 10) {
        return res.status(400).json({ 
          error: "La pregunta debe ser una cadena de texto con al menos 10 caracteres." 
        });
      }

      // Importar dinámicamente para evitar errores si el módulo no está disponible
      const { askQuestion } = await import("./rag/ask");
      response = await askQuestion(question.trim());
      
      // Calcular tiempo de respuesta
      responseTimeMs = Date.now() - startTime;
      
      // Registrar en CSV
      try {
        console.log(`[API /ask] Intentando registrar consulta. Tiempo: ${responseTimeMs}ms`);
        const { logQuery } = await import("./rag/query-logger");
        logQuery({
          question: question.trim(),
          responseTimeMs,
          tesisFound: response.tesisUsed?.length || 0,
          confidence: response.confidence || "low",
          hasEvidence: response.hasEvidence || false,
          tokenUsage: response.tokenUsage,
        });
        console.log(`[API /ask] Registro de consulta completado`);
      } catch (logError) {
        // No fallar si hay error al escribir el log
        console.error("[API /ask] Error logging query:", logError);
        if (logError instanceof Error) {
          console.error("[API /ask] Error details:", logError.message, logError.stack);
        }
      }

      return res.json(response);
    } catch (error) {
      responseTimeMs = Date.now() - startTime;
      
      // Intentar registrar el error también
      try {
        const { logQuery } = await import("./rag/query-logger");
        logQuery({
          question: req.body?.question || "ERROR: pregunta no disponible",
          responseTimeMs,
          tesisFound: 0,
          confidence: "low",
          hasEvidence: false,
          tokenUsage: undefined, // No hay tokens si hay error
        });
      } catch (logError) {
        // Ignorar errores de logging
      }
      
      // Log detallado del error
      console.error("=".repeat(60));
      console.error("[API /ask] ERROR al procesar pregunta:");
      console.error("Pregunta:", req.body?.question);
      console.error("Error:", error);
      if (error instanceof Error) {
        console.error("Mensaje:", error.message);
        console.error("Stack:", error.stack);
      }
      console.error("=".repeat(60));
      
      return res.status(500).json({ 
        error: "Error al procesar la pregunta",
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  return httpServer;
}
