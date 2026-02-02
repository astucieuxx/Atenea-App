import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { analyzeRequestSchema, argumentRequestSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
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
  // RAG ENDPOINT: /api/ask
  // ============================================================================
  app.post("/api/ask", async (req, res) => {
    try {
      const { question } = req.body;
      
      if (!question || typeof question !== "string" || question.trim().length < 10) {
        return res.status(400).json({ 
          error: "La pregunta debe ser una cadena de texto con al menos 10 caracteres." 
        });
      }

      // Importar dinámicamente para evitar errores si el módulo no está disponible
      const { askQuestion } = await import("./rag/ask");
      const response = await askQuestion(question.trim());

      return res.json(response);
    } catch (error) {
      console.error("Error in /api/ask:", error);
      return res.status(500).json({ 
        error: "Error al procesar la pregunta",
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  return httpServer;
}
