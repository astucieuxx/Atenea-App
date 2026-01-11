import { z } from "zod";

// Tesis/Jurisprudencia from CSV
export interface Tesis {
  id: string;
  url: string;
  title: string;
  abstract: string;
  body: string;
  body_full: string;
  extra_sections: string;
  instancia: string;
  epoca: string;
  materias: string;
  tesis_numero: string;
  tipo: string;
  fuente: string;
  localizacion_libro: string;
  localizacion_tomo: string;
  localizacion_mes: string;
  localizacion_anio: string;
  localizacion_pagina: string;
  organo_jurisdiccional: string;
  clave: string;
  notas: string;
  formas_integracion: string;
  fecha_publicacion: string;
  extracted_at: string;
}

// Strength levels for UX
export type FuerzaLevel = "Alta" | "Media" | "Baja";

// Scored tesis for recommendations
export interface ScoredTesis extends Tesis {
  score: number;
  fuerza: FuerzaLevel;
  razon_fuerza: string;
  por_que_aplica: string;
}

// Case analysis request
export const analyzeRequestSchema = z.object({
  descripcion: z.string().min(10, "La descripción debe tener al menos 10 caracteres"),
});

export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>;

// Case analysis response
export interface AnalysisResult {
  id: string;
  descripcion: string;
  problema_juridico: string;
  tesis_relevantes: ScoredTesis[];
  insight_juridico: string;
  created_at: string;
}

// Argument generation request
export const argumentRequestSchema = z.object({
  tesis_id: z.string(),
  tipo_escrito: z.enum(["Demanda", "Contestación", "Amparo"]),
  rol_procesal: z.enum(["Actor", "Demandado"]),
  tono: z.enum(["Conservador", "Técnico", "Contundente"]),
});

export type ArgumentRequest = z.infer<typeof argumentRequestSchema>;

// Generated argument
export interface GeneratedArgument {
  id: string;
  tesis_id: string;
  tesis_title: string;
  tipo_escrito: string;
  rol_procesal: string;
  tono: string;
  parrafos: string[];
  cita_formal: string;
  created_at: string;
}

// Case history entry
export interface CaseHistoryEntry {
  id: string;
  titulo: string;
  descripcion: string;
  problema_juridico: string;
  tesis_usadas: { id: string; title: string }[];
  argumentos_generados: GeneratedArgument[];
  created_at: string;
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
