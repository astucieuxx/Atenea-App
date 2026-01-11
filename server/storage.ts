import { randomUUID } from "crypto";
import type { 
  Tesis, 
  ScoredTesis, 
  AnalysisResult, 
  CaseHistoryEntry, 
  GeneratedArgument 
} from "@shared/schema";
import { loadTesisFromCSV } from "./csv-loader";
import { 
  identifyLegalProblem, 
  scoreTesis, 
  generateInsight,
  generateArgument 
} from "./legal-reasoning";

export interface IStorage {
  getAllTesis(): Tesis[];
  getTesisById(id: string): Tesis | undefined;
  analyzeCase(descripcion: string): AnalysisResult;
  getAnalysisById(id: string): AnalysisResult | undefined;
  getAllHistory(): CaseHistoryEntry[];
  createArgument(
    tesisId: string,
    tipoEscrito: string,
    rolProcesal: string,
    tono: string
  ): GeneratedArgument | undefined;
  getScoredTesisById(tesisId: string, analysisId?: string): ScoredTesis | undefined;
}

export class MemStorage implements IStorage {
  private tesisList: Tesis[];
  private analyses: Map<string, AnalysisResult>;
  private history: Map<string, CaseHistoryEntry>;
  private arguments: Map<string, GeneratedArgument>;
  private tesisScoreCache: Map<string, ScoredTesis>;

  constructor() {
    console.log("Initializing storage and loading CSV...");
    this.tesisList = loadTesisFromCSV();
    this.analyses = new Map();
    this.history = new Map();
    this.arguments = new Map();
    this.tesisScoreCache = new Map();
    console.log(`Storage initialized with ${this.tesisList.length} tesis`);
  }

  getAllTesis(): Tesis[] {
    return this.tesisList;
  }

  getTesisById(id: string): Tesis | undefined {
    return this.tesisList.find((t) => t.id === id);
  }

  getScoredTesisById(tesisId: string, analysisId?: string): ScoredTesis | undefined {
    if (analysisId) {
      const analysis = this.analyses.get(analysisId);
      if (analysis) {
        const scored = analysis.tesis_relevantes.find((t) => t.id === tesisId);
        if (scored) return scored;
      }
    }

    const cached = this.tesisScoreCache.get(tesisId);
    if (cached) return cached;

    const tesis = this.getTesisById(tesisId);
    if (!tesis) return undefined;

    const scored: ScoredTesis = {
      ...tesis,
      score: 50,
      fuerza: "Media",
      razon_fuerza: `Tesis ${tesis.tipo.toLowerCase().includes("jurisprudencia") ? "jurisprudencial" : "aislada"} de ${tesis.organo_jurisdiccional}.`,
      por_que_aplica: "Criterio jurisprudencial relevante para el caso.",
    };

    this.tesisScoreCache.set(tesisId, scored);
    return scored;
  }

  analyzeCase(descripcion: string): AnalysisResult {
    const id = randomUUID();
    const problema_juridico = identifyLegalProblem(descripcion);
    const tesis_relevantes = scoreTesis(this.tesisList, descripcion, 5);
    const insight_juridico = generateInsight(tesis_relevantes, descripcion);

    tesis_relevantes.forEach((t) => {
      this.tesisScoreCache.set(t.id, t);
    });

    const analysis: AnalysisResult = {
      id,
      descripcion,
      problema_juridico,
      tesis_relevantes,
      insight_juridico,
      created_at: new Date().toISOString(),
    };

    this.analyses.set(id, analysis);

    const titulo = problema_juridico.slice(0, 80);
    const historyEntry: CaseHistoryEntry = {
      id,
      titulo,
      descripcion,
      problema_juridico,
      tesis_usadas: tesis_relevantes.map((t) => ({ id: t.id, title: t.title })),
      argumentos_generados: [],
      created_at: analysis.created_at,
    };
    this.history.set(id, historyEntry);

    return analysis;
  }

  getAnalysisById(id: string): AnalysisResult | undefined {
    return this.analyses.get(id);
  }

  getAllHistory(): CaseHistoryEntry[] {
    return Array.from(this.history.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  createArgument(
    tesisId: string,
    tipoEscrito: string,
    rolProcesal: string,
    tono: string
  ): GeneratedArgument | undefined {
    const tesis = this.getTesisById(tesisId);
    if (!tesis) return undefined;

    const { parrafos, cita_formal } = generateArgument(
      tesis,
      tipoEscrito,
      rolProcesal,
      tono
    );

    const id = randomUUID();
    const argument: GeneratedArgument = {
      id,
      tesis_id: tesisId,
      tesis_title: tesis.title,
      tipo_escrito: tipoEscrito,
      rol_procesal: rolProcesal,
      tono,
      parrafos,
      cita_formal,
      created_at: new Date().toISOString(),
    };

    this.arguments.set(id, argument);

    const historyEntries = Array.from(this.history.values());
    for (const entry of historyEntries) {
      if (entry.tesis_usadas.some((t: { id: string; title: string }) => t.id === tesisId)) {
        entry.argumentos_generados.push(argument);
        break;
      }
    }

    return argument;
  }
}

export const storage = new MemStorage();
