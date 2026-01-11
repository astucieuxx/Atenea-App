/**
 * ATENEA - Motor de Razonamiento Legal Avanzado
 * 
 * Este módulo implementa un sistema de razonamiento legal de tres dimensiones:
 * 1) PERTINENCIA - ¿La tesis aborda el problema jurídico?
 * 2) AUTORIDAD - ¿Qué tan fuerte es el criterio legalmente?
 * 3) RIESGO - ¿Qué debilidades tiene su uso?
 * 
 * Filosofía: Confianza legal > Sofisticación algorítmica
 *           Razonamiento explicable > Caja negra
 *           Outputs conservadores > Recall agresivo
 */

import type { 
  Tesis, 
  ScoredTesis, 
  FuerzaLevel,
  PertinenciaLevel,
  AutoridadLevel,
  RiskFlag,
  LegalInsight,
  CaseClassification,
  TesisDimensionalScore
} from "@shared/schema";

// ===========================================================================
// DICCIONARIOS DE TÉRMINOS LEGALES ESTRUCTURALES POR MATERIA
// Estos términos tienen mayor peso que tokens genéricos
// ===========================================================================

const STRUCTURAL_LEGAL_TERMS: Record<string, string[]> = {
  amparo: [
    "improcedencia", "sobreseimiento", "acto reclamado", "interés jurídico",
    "interés legítimo", "quejoso", "tercero interesado", "autoridad responsable",
    "suspensión", "informe justificado", "demanda de amparo", "violación directa",
    "concepto de violación", "agravio", "litis constitucional", "efectos del amparo",
    "amparo directo", "amparo indirecto", "revisión", "queja"
  ],
  laboral: [
    "despido injustificado", "rescisión", "relación de trabajo", "patrón",
    "trabajador", "carga de la prueba", "salarios caídos", "prima de antigüedad",
    "indemnización constitucional", "reinstalación", "contrato colectivo",
    "jornada de trabajo", "subordinación", "laudo", "junta de conciliación",
    "prescripción laboral", "prueba testimonial", "confesional"
  ],
  civil: [
    "nulidad", "rescisión contractual", "daños y perjuicios", "cláusula penal",
    "incumplimiento", "obligaciones", "contrato", "arrendamiento", "compraventa",
    "posesión", "usucapión", "servidumbre", "copropiedad", "hipoteca",
    "fianza", "mandato", "sociedad conyugal", "divorcio", "alimentos",
    "patria potestad", "sucesión", "heredero"
  ],
  administrativo: [
    "acto administrativo", "fundamentación", "motivación", "competencia",
    "legalidad", "recurso de revisión", "juicio de nulidad", "autoridad administrativa",
    "multa administrativa", "sanción", "procedimiento administrativo",
    "garantía de audiencia", "derechos adquiridos", "concesión", "permiso"
  ],
  penal: [
    "delito", "tipicidad", "culpabilidad", "antijuridicidad", "punibilidad",
    "ministerio público", "auto de formal prisión", "sentencia condenatoria",
    "presunción de inocencia", "debido proceso", "prueba ilícita",
    "cadena de custodia", "defensa adecuada", "víctima", "ofendido"
  ],
  fiscal: [
    "contribución", "impuesto", "crédito fiscal", "determinación presuntiva",
    "visita domiciliaria", "revisión de gabinete", "caducidad fiscal",
    "prescripción fiscal", "devolución", "compensación", "estímulo fiscal"
  ],
  mercantil: [
    "título de crédito", "letra de cambio", "pagaré", "cheque", "endoso",
    "aval", "sociedad mercantil", "quiebra", "concurso mercantil",
    "acción cambiaria", "prescripción mercantil", "contrato mercantil"
  ],
  constitucional: [
    "derechos humanos", "garantías individuales", "principio pro persona",
    "control de convencionalidad", "suspensión de garantías", 
    "jerarquía normativa", "supremacía constitucional"
  ]
};

// Términos que indican vía procesal
const VIA_PROCESAL_TERMS: Record<string, string[]> = {
  "amparo directo": ["amparo directo", "contra sentencia", "tribunal colegiado"],
  "amparo indirecto": ["amparo indirecto", "juez de distrito", "acto de autoridad"],
  "juicio ordinario civil": ["juicio ordinario", "demanda civil", "juzgado civil"],
  "juicio laboral": ["demanda laboral", "junta de conciliación", "laudo"],
  "juicio de nulidad": ["juicio de nulidad", "tribunal fiscal", "sala regional"],
  "recurso de revisión": ["recurso de revisión", "revisión fiscal"]
};

// ===========================================================================
// PASO 1: CLASIFICACIÓN FORMAL DEL CASO
// Clasifica el caso ANTES de evaluar cualquier tesis
// ===========================================================================

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2);
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Clasifica formalmente el caso antes de evaluar tesis.
 * Usa heurísticas conservadoras - prefiere sub-clasificar que sobre-clasificar.
 */
export function classifyCase(descripcion: string): CaseClassification {
  const normalized = normalizeText(descripcion);
  const tokens = tokenize(descripcion);
  
  // Detectar materia principal
  let materia = "general";
  let maxMatches = 0;
  const detectedConcepts: string[] = [];
  
  for (const [mat, terms] of Object.entries(STRUCTURAL_LEGAL_TERMS)) {
    const matches = terms.filter(term => normalized.includes(normalizeText(term)));
    if (matches.length > maxMatches) {
      maxMatches = matches.length;
      materia = mat;
    }
    detectedConcepts.push(...matches.slice(0, 3));
  }
  
  // Detectar vía procesal (si es identificable)
  let via_procesal: string | undefined;
  for (const [via, terms] of Object.entries(VIA_PROCESAL_TERMS)) {
    const hasMatch = terms.some(term => normalized.includes(normalizeText(term)));
    if (hasMatch) {
      via_procesal = via;
      break;
    }
  }
  
  // Detectar acto reclamado (para casos de amparo)
  let acto_reclamado: string | undefined;
  if (materia === "amparo" || normalized.includes("amparo")) {
    const actoPatterns = [
      { pattern: /sentencia|resoluci[oó]n|laudo/, acto: "resolución judicial" },
      { pattern: /acto de autoridad|multa|sancion/, acto: "acto administrativo" },
      { pattern: /ley|decreto|reglamento/, acto: "norma general" },
      { pattern: /orden de aprehension|prision/, acto: "privación de libertad" }
    ];
    for (const { pattern, acto } of actoPatterns) {
      if (pattern.test(normalized)) {
        acto_reclamado = acto;
        break;
      }
    }
  }
  
  // Generar problema jurídico estructurado
  const problema_juridico = generateProblemaJuridico(materia, via_procesal, detectedConcepts, tokens);
  
  return {
    materia,
    via_procesal,
    acto_reclamado,
    problema_juridico,
    detected_concepts: Array.from(new Set(detectedConcepts)).slice(0, 5)
  };
}

function generateProblemaJuridico(
  materia: string, 
  via_procesal: string | undefined,
  concepts: string[],
  tokens: string[]
): string {
  const conceptsStr = concepts.slice(0, 2).join(" y ");
  
  const templates: Record<string, (c: string) => string> = {
    amparo: (c) => `Análisis de la procedencia y fundabilidad del juicio de amparo${c ? ` en relación con ${c}` : ""}, conforme a los criterios jurisprudenciales aplicables.`,
    laboral: (c) => `Determinación de los derechos laborales${c ? ` relacionados con ${c}` : ""} y las prestaciones procedentes conforme a la Ley Federal del Trabajo y criterios jurisdiccionales.`,
    civil: (c) => `Análisis de las obligaciones y derechos civiles${c ? ` derivados de ${c}` : ""} conforme al código civil aplicable y la jurisprudencia vigente.`,
    administrativo: (c) => `Evaluación de la legalidad del acto administrativo${c ? ` en materia de ${c}` : ""} y los medios de impugnación procedentes.`,
    penal: (c) => `Análisis del tipo penal y elementos del delito${c ? ` en relación con ${c}` : ""} conforme a la legislación penal aplicable.`,
    fiscal: (c) => `Determinación de la legalidad de los actos fiscales${c ? ` relacionados con ${c}` : ""} y los medios de defensa procedentes.`,
    mercantil: (c) => `Análisis de las obligaciones mercantiles${c ? ` derivadas de ${c}` : ""} conforme al Código de Comercio y legislación aplicable.`,
    constitucional: (c) => `Análisis de la posible violación a derechos humanos${c ? ` en relación con ${c}` : ""} y los remedios constitucionales procedentes.`,
    general: (c) => `Determinación de los efectos jurídicos de la situación planteada${c ? ` en materia de ${c}` : ""} conforme a la legislación aplicable y los criterios jurisprudenciales vigentes.`
  };
  
  const template = templates[materia] || templates.general;
  return template(conceptsStr);
}

// ===========================================================================
// PASO 2: CÁLCULO DE PERTINENCIA (0-100)
// ¿La tesis realmente habla del problema jurídico?
// ===========================================================================

function calculatePertinenceScore(
  tesis: Tesis, 
  caseClassification: CaseClassification,
  descripcion: string
): number {
  let score = 0;
  const tesisText = normalizeText(`${tesis.title} ${tesis.abstract} ${tesis.body}`);
  const tesisMaterias = normalizeText(tesis.materias);
  
  // Match de materia principal (peso alto: 0-35 puntos)
  if (tesisMaterias.includes(caseClassification.materia)) {
    score += 35;
  } else if (tesisMaterias.includes(caseClassification.materia.slice(0, 4))) {
    score += 15;
  }
  
  // Match de conceptos legales estructurales detectados (peso alto: 0-35 puntos)
  const structuralTerms = STRUCTURAL_LEGAL_TERMS[caseClassification.materia] || [];
  const matchedTerms = structuralTerms.filter(term => 
    tesisText.includes(normalizeText(term))
  );
  score += Math.min(matchedTerms.length * 7, 35);
  
  // Match con conceptos detectados en el caso (peso medio: 0-20 puntos)
  const conceptMatches = caseClassification.detected_concepts.filter(concept =>
    tesisText.includes(normalizeText(concept))
  );
  score += Math.min(conceptMatches.length * 5, 20);
  
  // Overlap léxico con descripción (peso bajo: 0-10 puntos)
  const descripcionTokens = tokenize(descripcion);
  const tesisTokens = tokenize(tesisText);
  const lexicalMatches = descripcionTokens.filter(token =>
    tesisTokens.some(t => t.includes(token) || token.includes(t))
  );
  score += Math.min(lexicalMatches.length, 10);
  
  return Math.min(score, 100);
}

// ===========================================================================
// PASO 3: CÁLCULO DE AUTORIDAD (0-100)
// ¿Qué tan fuerte es este criterio legalmente?
// Independiente de la pertinencia
// ===========================================================================

function calculateAuthorityScore(tesis: Tesis): number {
  let score = 0;
  
  // Tipo de criterio (0-40 puntos)
  // Jurisprudencia obligatoria vs tesis aislada
  const tipo = tesis.tipo.toLowerCase();
  if (tipo.includes("jurisprudencia")) {
    score += 40;
  } else if (tipo.includes("aislada")) {
    score += 15;
  } else {
    score += 10;
  }
  
  // Órgano emisor (0-30 puntos)
  // SCJN/Pleno > Salas > Tribunales Colegiados
  const instancia = normalizeText(tesis.instancia);
  const organo = normalizeText(tesis.organo_jurisdiccional);
  
  if (instancia.includes("pleno") || organo.includes("pleno")) {
    score += 30;
  } else if (instancia.includes("scjn") || instancia.includes("suprema corte")) {
    score += 28;
  } else if (instancia.includes("sala") && (instancia.includes("primera") || instancia.includes("segunda"))) {
    score += 25;
  } else if (organo.includes("sala")) {
    score += 22;
  } else if (instancia.includes("tribunal colegiado") || organo.includes("tribunal colegiado")) {
    score += 18;
  } else if (instancia.includes("tribunal")) {
    score += 12;
  } else {
    score += 8;
  }
  
  // Época jurisprudencial (0-20 puntos)
  // Criterios más recientes reflejan interpretación vigente
  const epoca = normalizeText(tesis.epoca);
  if (epoca.includes("undecima") || epoca.includes("onceava") || epoca.includes("11")) {
    score += 20;
  } else if (epoca.includes("decima") || epoca.includes("10")) {
    score += 18;
  } else if (epoca.includes("novena") || epoca.includes("9")) {
    score += 12;
  } else if (epoca.includes("octava") || epoca.includes("8")) {
    score += 8;
  } else {
    score += 5;
  }
  
  // Antigüedad del criterio (0-10 puntos)
  // Criterios recientes son más confiables
  const year = parseInt(tesis.localizacion_anio) || 1970;
  const currentYear = new Date().getFullYear();
  const age = currentYear - year;
  
  if (age <= 5) {
    score += 10;
  } else if (age <= 10) {
    score += 8;
  } else if (age <= 20) {
    score += 5;
  } else if (age <= 30) {
    score += 3;
  } else {
    score += 0;
  }
  
  return Math.min(score, 100);
}

// ===========================================================================
// PASO 4: DETECCIÓN DE RIESGOS
// Identificar debilidades legales para advertir al usuario
// ===========================================================================

function detectRiskFlags(tesis: Tesis, authorityScore: number): RiskFlag[] {
  const flags: RiskFlag[] = [];
  const tipo = tesis.tipo.toLowerCase();
  const epoca = normalizeText(tesis.epoca);
  const instancia = normalizeText(tesis.instancia);
  const formasIntegracion = normalizeText(tesis.formas_integracion || "");
  
  // Tesis aislada - no obligatoria
  if (tipo.includes("aislada") && !tipo.includes("jurisprudencia")) {
    flags.push("tesis_aislada");
  }
  
  // Época antigua - puede no reflejar interpretación actual
  if (epoca.includes("septima") || epoca.includes("sexta") || epoca.includes("quinta")) {
    flags.push("epoca_antigua");
  }
  
  // Criterio no reiterado
  if (!formasIntegracion.includes("reiteracion") && !formasIntegracion.includes("contradiccion")) {
    if (tipo.includes("aislada")) {
      flags.push("criterio_no_reiterado");
    }
  }
  
  // Autoridad limitada - tribunal inferior
  if (!instancia.includes("scjn") && !instancia.includes("suprema") && !instancia.includes("pleno")) {
    if (!instancia.includes("sala")) {
      flags.push("autoridad_limitada");
    }
  }
  
  return flags;
}

// ===========================================================================
// PASO 5: GENERACIÓN DE INSIGHTS ESTRUCTURADOS
// Explicación conservadora y educativa
// ===========================================================================

function generateStructuredInsight(
  tesis: Tesis,
  caseClassification: CaseClassification,
  riskFlags: RiskFlag[]
): LegalInsight {
  // What it says - resumen del criterio
  const what_it_says = tesis.abstract 
    ? tesis.abstract 
    : tesis.body.slice(0, 200) + "...";
  
  // When it applies - cuándo usar este criterio
  let when_it_applies = "";
  const tesisText = normalizeText(tesis.title);
  
  if (tesisText.includes("improcedencia") || tesisText.includes("sobreseimiento")) {
    when_it_applies = "Cuando se requiera acreditar causales de improcedencia o sobreseimiento en un juicio.";
  } else if (tesisText.includes("carga de la prueba") || tesisText.includes("prueba")) {
    when_it_applies = "Al momento de determinar a quién corresponde la carga probatoria o valorar medios de prueba.";
  } else if (tesisText.includes("competencia")) {
    when_it_applies = "Para establecer qué autoridad es competente para conocer del asunto.";
  } else if (tesisText.includes("prescripcion") || tesisText.includes("caducidad")) {
    when_it_applies = "Cuando se discuta el transcurso del tiempo para ejercer una acción o derecho.";
  } else if (tesisText.includes("fundamentacion") || tesisText.includes("motivacion")) {
    when_it_applies = "Para impugnar actos de autoridad que carezcan de la debida fundamentación y motivación.";
  } else {
    when_it_applies = `Este criterio resulta aplicable cuando se presenten hechos análogos en materia ${caseClassification.materia}.`;
  }
  
  // Main risk - principal debilidad
  let main_risk = "No se identificaron riesgos significativos en el uso de este criterio.";
  if (riskFlags.includes("tesis_aislada")) {
    main_risk = "Al ser tesis aislada, no es de observancia obligatoria. El juzgador puede apartarse de este criterio.";
  } else if (riskFlags.includes("epoca_antigua")) {
    main_risk = "Criterio de época anterior que podría no reflejar la interpretación judicial vigente.";
  } else if (riskFlags.includes("criterio_no_reiterado")) {
    main_risk = "Este criterio no ha sido reiterado, lo que debilita su fuerza persuasiva.";
  } else if (riskFlags.includes("autoridad_limitada")) {
    main_risk = "Emitido por órgano de menor jerarquía. Busque criterios de la SCJN si existen.";
  }
  
  // Recommendation - consejo de uso
  let recommendation = "";
  const esJurisprudencia = tesis.tipo.toLowerCase().includes("jurisprudencia");
  const esSCJN = normalizeText(tesis.instancia).includes("scjn") || normalizeText(tesis.instancia).includes("suprema");
  
  if (esJurisprudencia && esSCJN) {
    recommendation = "Cite este criterio con confianza. Es jurisprudencia obligatoria de la SCJN.";
  } else if (esJurisprudencia) {
    recommendation = "Criterio de observancia obligatoria. Verifique que no exista jurisprudencia más reciente de la SCJN.";
  } else if (riskFlags.length === 0) {
    recommendation = "Criterio persuasivo sólido. Considere complementar con jurisprudencia obligatoria si existe.";
  } else {
    recommendation = "Use este criterio como apoyo complementario. Fortalezca su argumento con jurisprudencia obligatoria.";
  }
  
  return { what_it_says, when_it_applies, main_risk, recommendation };
}

// ===========================================================================
// PASO 6: AJUSTE POR ROL PROCESAL
// Ligero ajuste contextual según el rol del usuario
// ===========================================================================

function applyRoleAdjustment(
  pertinenceScore: number,
  tesis: Tesis,
  rol?: string
): number {
  if (!rol) return pertinenceScore;
  
  const tesisText = normalizeText(`${tesis.title} ${tesis.abstract}`);
  let adjustment = 0;
  
  if (rol === "Actor" || rol === "Quejoso") {
    // Favorecer criterios pro-acción
    if (tesisText.includes("procedencia") && !tesisText.includes("improcedencia")) {
      adjustment += 5;
    }
    if (tesisText.includes("derecho") || tesisText.includes("obligacion del demandado")) {
      adjustment += 3;
    }
  } else if (rol === "Demandado" || rol === "Tercero Interesado") {
    // Favorecer criterios defensivos
    if (tesisText.includes("improcedencia") || tesisText.includes("sobreseimiento")) {
      adjustment += 5;
    }
    if (tesisText.includes("excepcion") || tesisText.includes("carga de la prueba")) {
      adjustment += 3;
    }
  }
  
  return Math.min(pertinenceScore + adjustment, 100);
}

// ===========================================================================
// CONVERSIÓN A NIVELES DE UX
// Nunca exponer scores numéricos al usuario
// ===========================================================================

function getPertinenceLevel(score: number): PertinenciaLevel {
  // Solo mostramos "Alta" o "Media" - si no es pertinente, no se muestra
  return score >= 50 ? "Alta" : "Media";
}

function getAuthorityLevel(score: number): AutoridadLevel {
  if (score >= 70) return "Alta";
  if (score >= 45) return "Media";
  return "Baja";
}

function getFuerzaLevel(pertinence: number, authority: number): FuerzaLevel {
  // Combina pertinencia y autoridad para fuerza general
  const combined = (pertinence * 0.4) + (authority * 0.6);
  if (combined >= 65) return "Alta";
  if (combined >= 40) return "Media";
  return "Baja";
}

function getRazonFuerza(
  tesis: Tesis, 
  fuerza: FuerzaLevel,
  pertinencia: PertinenciaLevel,
  autoridad: AutoridadLevel,
  riskFlags: RiskFlag[]
): string {
  const tipo = tesis.tipo.toLowerCase().includes("jurisprudencia") 
    ? "jurisprudencia obligatoria" 
    : "tesis aislada";
  
  const organo = getOrganoDescription(tesis);
  const epoca = tesis.epoca;
  
  let razon = `Fuerza ${fuerza.toLowerCase()} por tratarse de ${tipo} de ${organo}`;
  
  if (fuerza === "Alta") {
    razon += ` en ${epoca}, con criterio vigente y de alta pertinencia al caso.`;
  } else if (fuerza === "Media") {
    razon += ` emitida en ${epoca}.`;
    if (riskFlags.includes("tesis_aislada")) {
      razon += " Al no ser obligatoria, su aplicación queda a discreción del juzgador.";
    }
  } else {
    razon += ` en época anterior.`;
    if (riskFlags.length > 0) {
      razon += " Se recomienda buscar criterios más recientes o de mayor jerarquía.";
    }
  }
  
  return razon;
}

function getOrganoDescription(tesis: Tesis): string {
  const instancia = normalizeText(tesis.instancia);
  const organo = normalizeText(tesis.organo_jurisdiccional);
  
  if (instancia.includes("pleno") || organo.includes("pleno")) {
    return "el Pleno de la SCJN";
  } else if (instancia.includes("scjn") || instancia.includes("suprema")) {
    return "la Suprema Corte de Justicia de la Nación";
  } else if (organo.includes("primera sala")) {
    return "la Primera Sala de la SCJN";
  } else if (organo.includes("segunda sala")) {
    return "la Segunda Sala de la SCJN";
  } else if (instancia.includes("tribunal colegiado") || organo.includes("tribunal colegiado")) {
    return "Tribunal Colegiado de Circuito";
  }
  return tesis.organo_jurisdiccional || "órgano jurisdiccional";
}

function getPorQueAplica(
  tesis: Tesis, 
  caseClassification: CaseClassification,
  pertinenceScore: number
): string {
  const tesisText = normalizeText(tesis.title);
  const matchedConcepts = caseClassification.detected_concepts.filter(concept =>
    tesisText.includes(normalizeText(concept))
  );
  
  if (matchedConcepts.length > 0) {
    return `El criterio aborda directamente ${matchedConcepts.slice(0, 2).join(" y ")}, conceptos centrales al problema jurídico planteado.`;
  }
  
  const structuralTerms = STRUCTURAL_LEGAL_TERMS[caseClassification.materia] || [];
  const matchedTerms = structuralTerms.filter(term => tesisText.includes(normalizeText(term)));
  
  if (matchedTerms.length > 0) {
    return `La tesis establece principios sobre ${matchedTerms.slice(0, 2).join(" y ")} aplicables al caso en materia ${caseClassification.materia}.`;
  }
  
  if (pertinenceScore >= 60) {
    return `El criterio contiene principios jurídicos de alta relevancia para la materia ${caseClassification.materia} que resultan aplicables al caso.`;
  }
  
  return `El criterio jurisprudencial contiene principios generales en materia ${caseClassification.materia} potencialmente aplicables a la situación descrita.`;
}

// ===========================================================================
// FUNCIÓN PRINCIPAL: SCORE DE TESIS
// Implementa el ranking de dos etapas
// ===========================================================================

export function scoreTesis(
  tesisList: Tesis[],
  descripcion: string,
  limit: number = 5,
  rol_procesal?: string
): ScoredTesis[] {
  // PASO 1: Clasificar el caso formalmente
  const caseClassification = classifyCase(descripcion);
  
  // PASO 2: Calcular scores dimensionales para todas las tesis
  const dimensionalScores: Array<{ tesis: Tesis; scores: TesisDimensionalScore }> = 
    tesisList.map((tesis) => {
      let pertinence_score = calculatePertinenceScore(tesis, caseClassification, descripcion);
      const authority_score = calculateAuthorityScore(tesis);
      const risk_flags = detectRiskFlags(tesis, authority_score);
      
      // Aplicar ajuste por rol
      pertinence_score = applyRoleAdjustment(pertinence_score, tesis, rol_procesal);
      
      return {
        tesis,
        scores: { pertinence_score, authority_score, risk_flags }
      };
    });
  
  // PASO 3: ETAPA 1 - Filtrar por pertinencia (top 15)
  // Solo consideramos tesis con pertinencia mínima
  const PERTINENCE_THRESHOLD = 25;
  const pertinentTesis = dimensionalScores
    .filter(({ scores }) => scores.pertinence_score >= PERTINENCE_THRESHOLD)
    .sort((a, b) => b.scores.pertinence_score - a.scores.pertinence_score)
    .slice(0, 15);
  
  // PASO 4: ETAPA 2 - Ranking final por autoridad (top 5)
  const rankedTesis = pertinentTesis
    .sort((a, b) => {
      // Ordenar primero por autoridad, luego por pertinencia como desempate
      const authorityDiff = b.scores.authority_score - a.scores.authority_score;
      if (Math.abs(authorityDiff) > 5) return authorityDiff;
      return b.scores.pertinence_score - a.scores.pertinence_score;
    })
    .slice(0, limit);
  
  // PASO 5: Construir resultados con toda la información
  return rankedTesis.map(({ tesis, scores }) => {
    const pertinencia = getPertinenceLevel(scores.pertinence_score);
    const autoridad = getAuthorityLevel(scores.authority_score);
    const fuerza = getFuerzaLevel(scores.pertinence_score, scores.authority_score);
    const insight = generateStructuredInsight(tesis, caseClassification, scores.risk_flags);
    
    return {
      ...tesis,
      score: Math.round((scores.pertinence_score + scores.authority_score) / 2),
      fuerza,
      pertinencia,
      autoridad,
      riesgos: scores.risk_flags,
      razon_fuerza: getRazonFuerza(tesis, fuerza, pertinencia, autoridad, scores.risk_flags),
      por_que_aplica: getPorQueAplica(tesis, caseClassification, scores.pertinence_score),
      insight
    };
  });
}

// ===========================================================================
// GENERACIÓN DE INSIGHT GENERAL DEL CASO
// ===========================================================================

export function generateInsight(tesis: ScoredTesis[], descripcion: string): string {
  if (tesis.length === 0) {
    return "No se identificó jurisprudencia con pertinencia suficiente para el caso descrito. Se recomienda reformular la consulta con términos jurídicos más específicos, precisando la materia, vía procesal o problemática concreta.";
  }
  
  const tieneJurisprudencia = tesis.some(t => t.tipo.toLowerCase().includes("jurisprudencia"));
  const tieneSCJN = tesis.some(t => 
    normalizeText(t.instancia).includes("scjn") || 
    normalizeText(t.instancia).includes("suprema")
  );
  const fuerzaAlta = tesis.filter(t => t.fuerza === "Alta").length;
  const pertinenciaAlta = tesis.filter(t => t.pertinencia === "Alta").length;
  const conRiesgos = tesis.filter(t => t.riesgos && t.riesgos.length > 0).length;
  
  let insight = "";
  
  // Análisis de fortaleza
  if (tieneJurisprudencia && tieneSCJN && fuerzaAlta >= 2) {
    insight += "El caso cuenta con sólido respaldo jurisprudencial de la Suprema Corte, lo que fortalece significativamente la posición argumentativa. ";
  } else if (tieneJurisprudencia) {
    insight += "Se identificó jurisprudencia obligatoria aplicable al caso. ";
  } else {
    insight += "Los criterios identificados son principalmente tesis aisladas, por lo que tienen valor orientador pero no vinculante. ";
  }
  
  // Análisis de pertinencia
  if (pertinenciaAlta >= 3) {
    insight += "La mayoría de los criterios muestran alta pertinencia con el problema jurídico planteado. ";
  } else if (pertinenciaAlta >= 1) {
    insight += "Se encontraron criterios relevantes, aunque se recomienda revisar su aplicabilidad específica al caso. ";
  }
  
  // Advertencias de riesgo
  if (conRiesgos > tesis.length / 2) {
    insight += "Varios criterios presentan limitaciones que deben considerarse al momento de citarlos. ";
  }
  
  insight += "Verifique que no existan criterios contradictorios o jurisprudencia más reciente que pudiera modificar la interpretación.";
  
  return insight;
}

// ===========================================================================
// EXPORTAR CLASIFICACIÓN DEL CASO
// ===========================================================================

export function identifyLegalProblem(descripcion: string): string {
  return classifyCase(descripcion).problema_juridico;
}

// ===========================================================================
// GENERACIÓN DE ARGUMENTOS
// ===========================================================================

export function generateArgument(
  tesis: Tesis,
  tipoEscrito: string,
  rolProcesal: string,
  tono: string
): { parrafos: string[]; cita_formal: string } {
  const cita_formal = `${tesis.title}. ${tesis.tipo}. ${tesis.organo_jurisdiccional}. ${tesis.epoca}. ${tesis.fuente || ""}`.trim();

  const tonoConfig: Record<string, { intro: string; estilo: string }> = {
    Conservador: {
      intro: "Conforme al criterio jurisprudencial aplicable",
      estilo: "resulta procedente sostener"
    },
    Persuasivo: {
      intro: "Como ha sostenido consistentemente la autoridad judicial",
      estilo: "queda plenamente acreditado"
    },
    Técnico: {
      intro: "En términos de la interpretación jurisdiccional establecida",
      estilo: "debe considerarse"
    }
  };
  
  const rolConfig: Record<string, string> = {
    Actor: "que asiste el derecho a mi representado",
    Demandado: "que son infundadas las pretensiones de la parte actora",
    "Tercero Interesado": "que deben preservarse los derechos adquiridos de mi representado",
    Quejoso: "que el acto reclamado vulnera los derechos fundamentales del quejoso"
  };
  
  const config = tonoConfig[tono] || tonoConfig.Conservador;
  const rolFrase = rolConfig[rolProcesal] || rolConfig.Actor;
  
  const parrafo1 = `${config.intro}, ${config.estilo} ${rolFrase}, en virtud del criterio contenido en la tesis de rubro "${tesis.title.slice(0, 100)}${tesis.title.length > 100 ? "..." : ""}". Dicho criterio fue emitido por ${tesis.organo_jurisdiccional} durante la ${tesis.epoca}, estableciendo principios jurídicos que deben ser observados en la resolución de controversias análogas.`;
  
  let parrafo2 = "";
  if (tipoEscrito.includes("Amparo")) {
    parrafo2 = `Por lo anterior, y en atención a los principios rectores del juicio de amparo, se solicita respetuosamente a este H. Órgano Jurisdiccional considerar el criterio jurisprudencial invocado al momento de resolver sobre el acto reclamado, en tutela de los derechos fundamentales del quejoso.`;
  } else if (tipoEscrito === "Demanda") {
    parrafo2 = `En consecuencia, aplicando el criterio judicial citado a los hechos del presente caso, resulta procedente la acción ejercitada y las prestaciones reclamadas en el capítulo correspondiente.`;
  } else if (tipoEscrito.includes("Contestación")) {
    parrafo2 = `Por lo expuesto, y conforme al criterio jurisprudencial invocado, las pretensiones de la parte actora carecen de sustento jurídico, por lo que deberá absolverse a mi representado de todas y cada una de las prestaciones reclamadas.`;
  } else {
    parrafo2 = `Por lo anterior, se solicita a este H. Tribunal tenga a bien considerar el criterio jurisprudencial citado al momento de resolver el presente medio de impugnación.`;
  }
  
  return { parrafos: [parrafo1, parrafo2], cita_formal };
}
