import { randomUUID } from "crypto";
import path from "path";
import type { 
  Tesis, 
  ScoredTesis, 
  AnalysisResult, 
  CaseHistoryEntry, 
  GeneratedArgument 
} from "@shared/schema";
import { loadTesisFromJSON } from "./json-loader";
import { 
  identifyLegalProblem,
  classifyCase,
  scoreTesis, 
  generateInsight,
  generateArgument 
} from "./legal-reasoning";

export interface IStorage {
  getAllTesis(): Tesis[];
  getTesisById(id: string): Tesis | undefined;
  analyzeCase(descripcion: string, rol_procesal?: string): Promise<AnalysisResult>;
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
  private loadingPromise: Promise<void>;
  private isLoaded: boolean = false;

  constructor() {
    console.log("Initializing storage and loading JSON...");
    console.log(`Working directory: ${process.cwd()}`);
    console.log(`Looking for tesis files in: ${path.join(process.cwd(), "attached_assets")}`);
    
    // Start with empty list, will be populated asynchronously
    this.tesisList = [];
    this.analyses = new Map();
    this.history = new Map();
    this.arguments = new Map();
    this.tesisScoreCache = new Map();
    
    // Load tesis asynchronously and track when it's done
    this.loadingPromise = loadTesisFromJSON().then((tesis) => {
      this.tesisList = tesis;
      this.isLoaded = true;
      if (tesis.length === 0) {
        console.warn("⚠️  WARNING: No tesis loaded! Check if files exist in attached_assets/");
        console.warn("   Expected files: tesis_part1.jsonl, tesis_part2.jsonl, etc.");
      } else {
        console.log(`✅ Storage initialized with ${this.tesisList.length} tesis`);
      }
    }).catch((error) => {
      console.error("❌ Error loading tesis:", error);
      console.error("Stack trace:", error.stack);
      console.log("Storage initialized with 0 tesis (error loading file)");
      this.isLoaded = true; // Mark as loaded even on error so requests don't hang
    });
  }

  private async waitForLoad(): Promise<void> {
    if (!this.isLoaded) {
      await this.loadingPromise;
    }
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
      pertinencia: "Media",
      autoridad: "Media",
      riesgos: [],
      razon_fuerza: `Tesis ${tesis.tipo.toLowerCase().includes("jurisprudencia") ? "jurisprudencial" : "aislada"} de ${tesis.organo_jurisdiccional}.`,
      por_que_aplica: "Criterio jurisprudencial relevante para el caso.",
    };

    this.tesisScoreCache.set(tesisId, scored);
    return scored;
  }

  async analyzeCase(descripcion: string, rol_procesal?: string): Promise<AnalysisResult> {
    // Wait for tesis to be loaded before analyzing
    await this.waitForLoad();
    
    const id = randomUUID();
    const clasificacion = classifyCase(descripcion);
    const problema_juridico = clasificacion.problema_juridico;
    const tesis_relevantes = scoreTesis(this.tesisList, descripcion, 5, rol_procesal);
    const insight_juridico = generateInsight(tesis_relevantes, descripcion);

    tesis_relevantes.forEach((t) => {
      this.tesisScoreCache.set(t.id, t);
    });

    const analysis: AnalysisResult = {
      id,
      descripcion,
      problema_juridico,
      clasificacion,
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
