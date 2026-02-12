import type { Tesis, Precedente } from "@shared/schema";

export interface LegalHierarchyInfo {
  hierarchyLevel: number;
  isJurisprudencia: boolean;
  organLevel: number;
  epocaLevel: number;
}

const ORGAN_LEVELS: Record<string, number> = {
  "pleno": 5,
  "pleno de la suprema corte": 5,
  "pleno en materia": 4,
  "primera sala": 4,
  "segunda sala": 4,
  "sala superior": 3,
  "tribunal colegiado": 2,
  "tribunales colegiados": 2,
};

const EPOCA_LEVELS: Record<string, number> = {
  "undécima": 5,
  "11a.": 5,
  "décima": 4,
  "10a.": 4,
  "novena": 3,
  "9a.": 3,
  "octava": 2,
  "8a.": 2,
};

function getOrganLevel(organ: string): number {
  const lower = (organ || "").toLowerCase();
  for (const [key, level] of Object.entries(ORGAN_LEVELS)) {
    if (lower.includes(key)) return level;
  }
  return 1;
}

function getEpocaLevel(epoca: string): number {
  const lower = (epoca || "").toLowerCase();
  for (const [key, level] of Object.entries(EPOCA_LEVELS)) {
    if (lower.includes(key)) return level;
  }
  return 1;
}

export function getTesisHierarchy(tesis: Tesis): LegalHierarchyInfo {
  const isJurisprudencia = (tesis.tipo || "").toLowerCase().includes("jurisprudencia");
  const organLevel = getOrganLevel(tesis.instancia || "");
  const epocaLevel = getEpocaLevel(tesis.epoca || "");

  const hierarchyLevel =
    (isJurisprudencia ? 3 : 1) +
    organLevel +
    epocaLevel;

  return { hierarchyLevel, isJurisprudencia, organLevel, epocaLevel };
}

export function getPrecedenteHierarchy(precedente: Precedente): LegalHierarchyInfo {
  const isJurisprudencia = true;
  const organLevel = getOrganLevel(precedente.sala || "");
  const epocaLevel = 4;

  const hierarchyLevel = 3 + organLevel + epocaLevel;

  return { hierarchyLevel, isJurisprudencia, organLevel, epocaLevel };
}

export function compareByHierarchyAndRelevance(
  a: { hierarchy: LegalHierarchyInfo; relevanceScore: number },
  b: { hierarchy: LegalHierarchyInfo; relevanceScore: number },
): number {
  if (a.hierarchy.hierarchyLevel !== b.hierarchy.hierarchyLevel) {
    return b.hierarchy.hierarchyLevel - a.hierarchy.hierarchyLevel;
  }
  return b.relevanceScore - a.relevanceScore;
}
