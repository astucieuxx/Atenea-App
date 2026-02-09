import { z } from "zod";

// Precedente judicial (ejecutoria) del SJF
export interface Precedente {
  id: string;
  ius: number;
  rubro: string;
  texto_publicacion: string;
  localizacion: string;
  sala: string;
  tipo_asunto: string;
  tipo_asunto_expediente: string;
  promovente: string;
  fecha_publicacion: string;
  temas: string; // JSON array serializado
  votos: string; // JSON array serializado
  votacion: boolean;
  semanal: boolean;
  url_origen: string;
  raw_fields: string; // JSON con campos extra
  scraped_at: string;
}

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

// Strength levels for UX display
export type FuerzaLevel = "Alta" | "Media" | "Baja";

// Pertinence levels - how relevant is the thesis to the problem
export type PertinenciaLevel = "Alta" | "Media";

// Authority levels - how strong is the criterion legally
export type AutoridadLevel = "Alta" | "Media" | "Baja";

// Risk flags - potential weaknesses in citing this thesis
export type RiskFlag = 
  | "tesis_aislada"           // Not binding jurisprudence
  | "epoca_antigua"           // From old epoch, may not reflect current interpretation
  | "criterio_no_reiterado"   // Has not been consistently applied
  | "autoridad_limitada"      // From lower court
  | "materia_parcial";        // Only partial subject matter match

// Structured legal insight for each thesis
export interface LegalInsight {
  what_it_says: string;
  when_it_applies: string;
  main_risk: string;
  recommendation: string;
}

// Case classification result
export interface CaseClassification {
  materia: string;
  via_procesal?: string;
  acto_reclamado?: string;
  problema_juridico: string;
  detected_concepts: string[];
}

// Three-dimensional scoring for tesis
export interface TesisDimensionalScore {
  pertinence_score: number;  // 0-100: Does this thesis address the legal problem?
  authority_score: number;   // 0-100: How strong is this criterion legally?
  risk_flags: RiskFlag[];    // Legal weaknesses to surface in UX
}

// Scored tesis with the new dimensional scoring
export interface ScoredTesis extends Tesis {
  score: number;
  fuerza: FuerzaLevel;
  razon_fuerza: string;
  por_que_aplica: string;
  // New dimensional scoring
  pertinencia: PertinenciaLevel;
  autoridad: AutoridadLevel;
  riesgos: RiskFlag[];
  insight?: LegalInsight;
}

// Case analysis request with optional role
export const analyzeRequestSchema = z.object({
  descripcion: z.string().min(10, "La descripción debe tener al menos 10 caracteres"),
  rol_procesal: z.enum(["Actor", "Demandado", "Tercero Interesado", "Quejoso"]).optional(),
});

export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>;

// Case analysis response
export interface AnalysisResult {
  id: string;
  descripcion: string;
  problema_juridico: string;
  clasificacion: CaseClassification;
  tesis_relevantes: ScoredTesis[];
  insight_juridico: string;
  created_at: string;
}

// Argument generation request
export const argumentRequestSchema = z.object({
  tesis_id: z.string(),
  tipo_escrito: z.enum(["Demanda", "Contestación de Demanda", "Amparo Directo", "Amparo Indirecto", "Recurso de Revisión"]),
  rol_procesal: z.enum(["Actor", "Demandado", "Tercero Interesado", "Quejoso"]),
  tono: z.enum(["Conservador", "Persuasivo", "Técnico"]),
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

// RAG Ask response (from /api/ask)
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
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
