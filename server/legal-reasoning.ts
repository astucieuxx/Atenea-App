import type { Tesis, ScoredTesis, FuerzaLevel } from "@shared/schema";

const LEGAL_KEYWORDS: Record<string, string[]> = {
  amparo: ["amparo", "garantías", "constitucional", "quejoso", "acto reclamado", "suspensión"],
  laboral: ["trabajador", "despido", "patrón", "salario", "indemnización", "junta de conciliación", "relación laboral"],
  civil: ["contrato", "obligaciones", "daños", "perjuicios", "cláusula penal", "nulidad", "rescisión"],
  administrativo: ["multa", "administrativa", "autoridad", "acto administrativo", "procedimiento", "audiencia"],
  penal: ["delito", "penal", "sentencia", "culpabilidad", "ministerio público"],
  mercantil: ["mercantil", "comercio", "sociedad", "título de crédito", "quiebra"],
  fiscal: ["fiscal", "impuesto", "contribución", "crédito fiscal", "hacienda"],
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2);
}

function identifyMaterias(descripcion: string): string[] {
  const tokens = tokenize(descripcion);
  const materias: string[] = [];

  for (const [materia, keywords] of Object.entries(LEGAL_KEYWORDS)) {
    const matches = keywords.filter((keyword) =>
      tokens.some((token) => keyword.includes(token) || token.includes(keyword))
    );
    if (matches.length > 0) {
      materias.push(materia);
    }
  }

  return materias.length > 0 ? materias : ["general"];
}

export function identifyLegalProblem(descripcion: string): string {
  const materias = identifyMaterias(descripcion);
  const tokens = tokenize(descripcion);

  const legalTerms = [
    "procedencia", "improcedencia", "competencia", "jurisdicción",
    "prescripción", "caducidad", "legitimación", "interés jurídico",
    "fundamentación", "motivación", "violación", "garantías",
    "debido proceso", "audiencia", "defensa", "pruebas"
  ];

  const foundTerms = legalTerms.filter((term) =>
    tokens.some((token) => term.includes(token) || token.includes(term))
  );

  let problemStatement = "Determinación de ";

  if (materias.includes("amparo")) {
    problemStatement += "la procedencia del juicio de amparo ";
    if (foundTerms.length > 0) {
      problemStatement += `en relación con ${foundTerms.slice(0, 2).join(" y ")} `;
    }
  } else if (materias.includes("laboral")) {
    problemStatement += "los derechos laborales ";
    if (tokens.some(t => t.includes("despido"))) {
      problemStatement += "derivados de la terminación de la relación de trabajo ";
    }
  } else if (materias.includes("civil")) {
    problemStatement += "las obligaciones civiles ";
    if (tokens.some(t => t.includes("contrat"))) {
      problemStatement += "derivadas del contrato celebrado entre las partes ";
    }
  } else if (materias.includes("administrativo")) {
    problemStatement += "la legalidad del acto administrativo ";
    if (tokens.some(t => t.includes("multa"))) {
      problemStatement += "consistente en la imposición de una sanción pecuniaria ";
    }
  } else {
    problemStatement += "los efectos jurídicos de la situación planteada ";
  }

  problemStatement += "conforme a la legislación aplicable y los criterios jurisprudenciales vigentes.";

  return problemStatement;
}

function calculateScore(tesis: Tesis, descripcion: string, materias: string[]): number {
  let score = 0;

  if (tesis.tipo.toLowerCase().includes("jurisprudencia")) {
    score += 40;
  } else if (tesis.tipo.toLowerCase().includes("aislada")) {
    score += 15;
  }

  const instancia = tesis.instancia.toLowerCase();
  if (instancia.includes("scjn") || instancia.includes("suprema corte") || instancia.includes("pleno")) {
    score += 30;
  } else if (instancia.includes("sala")) {
    score += 25;
  } else if (instancia.includes("tribunal") && instancia.includes("colegiado")) {
    score += 20;
  } else if (instancia.includes("tribunal")) {
    score += 15;
  }

  const epoca = tesis.epoca.toLowerCase();
  if (epoca.includes("onceava") || epoca.includes("décima") || epoca.includes("undécima")) {
    score += 20;
  } else if (epoca.includes("novena")) {
    score += 10;
  } else if (epoca.includes("octava")) {
    score += 7;
  } else {
    score += 5;
  }

  const tesisMaterias = tesis.materias.toLowerCase();
  for (const materia of materias) {
    if (tesisMaterias.includes(materia)) {
      score += 25;
      break;
    }
  }
  for (const materia of materias) {
    if (tesisMaterias.includes(materia.slice(0, 4))) {
      score += 10;
      break;
    }
  }

  const year = parseInt(tesis.localizacion_anio) || 1979;
  const currentYear = new Date().getFullYear();
  const age = currentYear - year;

  if (age < 10) {
    score += 10;
  } else if (age < 25) {
    score += 5;
  }

  const descripcionTokens = tokenize(descripcion);
  const tesisTokens = tokenize(tesis.title + " " + tesis.abstract + " " + tesis.body);
  
  const matchingTokens = descripcionTokens.filter((token) =>
    tesisTokens.some((t) => t.includes(token) || token.includes(t))
  );
  score += Math.min(matchingTokens.length * 2, 20);

  return score;
}

function getFuerzaLevel(score: number): FuerzaLevel {
  if (score >= 80) return "Alta";
  if (score >= 50) return "Media";
  return "Baja";
}

function getRazonFuerza(tesis: Tesis, fuerza: FuerzaLevel): string {
  const tipo = tesis.tipo.toLowerCase().includes("jurisprudencia") 
    ? "jurisprudencia obligatoria" 
    : "tesis aislada";
  
  const instancia = tesis.instancia.toLowerCase();
  let organo = "órgano jurisdiccional";
  if (instancia.includes("scjn") || instancia.includes("suprema corte")) {
    organo = "la Suprema Corte de Justicia de la Nación";
  } else if (instancia.includes("pleno")) {
    organo = "el Pleno de la SCJN";
  } else if (instancia.includes("sala")) {
    organo = "Sala de la SCJN";
  } else if (instancia.includes("colegiado")) {
    organo = "Tribunal Colegiado de Circuito";
  }

  const epoca = tesis.epoca;

  if (fuerza === "Alta") {
    return `Fuerza alta por tratarse de ${tipo} emitida por ${organo} en ${epoca}, con criterio vigente y aplicable.`;
  } else if (fuerza === "Media") {
    return `Fuerza media por tratarse de ${tipo} de ${organo} emitida en ${epoca}.`;
  } else {
    return `Fuerza baja por tratarse de ${tipo} de ${organo} en época anterior, cuyo criterio podría no reflejar la interpretación actual.`;
  }
}

function getPorQueAplica(tesis: Tesis, descripcion: string): string {
  const tesisTitle = tesis.title.toLowerCase();
  const descripcionLower = descripcion.toLowerCase();

  if (tesisTitle.includes("amparo") && descripcionLower.includes("amparo")) {
    return "El criterio aborda aspectos procesales del juicio de amparo aplicables al caso planteado.";
  }
  if (tesisTitle.includes("despido") || tesisTitle.includes("trabajador")) {
    return "La tesis establece criterios sobre relaciones laborales relevantes para la situación descrita.";
  }
  if (tesisTitle.includes("prueba")) {
    return "El criterio define reglas sobre valoración y desahogo de pruebas aplicables al procedimiento.";
  }
  if (tesisTitle.includes("multa") || tesisTitle.includes("administrativa")) {
    return "La tesis contiene criterios sobre actos administrativos pertinentes al caso.";
  }
  if (tesisTitle.includes("contrato") || tesisTitle.includes("obligación")) {
    return "El criterio interpreta obligaciones contractuales relevantes para el caso civil planteado.";
  }

  return "El criterio jurisprudencial contiene principios generales aplicables a la situación jurídica descrita.";
}

export function scoreTesis(
  tesisList: Tesis[],
  descripcion: string,
  limit: number = 5
): ScoredTesis[] {
  const materias = identifyMaterias(descripcion);

  const scored: ScoredTesis[] = tesisList.map((tesis) => {
    const score = calculateScore(tesis, descripcion, materias);
    const fuerza = getFuerzaLevel(score);
    
    return {
      ...tesis,
      score,
      fuerza,
      razon_fuerza: getRazonFuerza(tesis, fuerza),
      por_que_aplica: getPorQueAplica(tesis, descripcion),
    };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function generateInsight(tesis: ScoredTesis[], descripcion: string): string {
  if (tesis.length === 0) {
    return "No se encontró jurisprudencia directamente aplicable. Se recomienda reformular la búsqueda con términos jurídicos más específicos o consultar fuentes doctrinales complementarias.";
  }

  const tieneJurisprudencia = tesis.some((t) => 
    t.tipo.toLowerCase().includes("jurisprudencia")
  );
  const tieneSCJN = tesis.some((t) => 
    t.instancia.toLowerCase().includes("scjn") || 
    t.instancia.toLowerCase().includes("suprema")
  );
  const fuerzaAlta = tesis.filter((t) => t.fuerza === "Alta").length;

  let insight = "";

  if (tieneJurisprudencia && tieneSCJN) {
    insight += "Existe jurisprudencia de la Suprema Corte aplicable al caso, lo que fortalece significativamente la posición argumentativa. ";
  } else if (tieneJurisprudencia) {
    insight += "Se identificó jurisprudencia obligatoria de Tribunales Colegiados que debe ser observada por los juzgadores. ";
  } else {
    insight += "Los criterios encontrados son tesis aisladas, por lo que su aplicación queda a discreción del juzgador. ";
  }

  if (fuerzaAlta >= 2) {
    insight += "La mayoría de los criterios tienen fuerza alta, lo que sugiere una línea jurisprudencial consolidada. ";
  } else if (fuerzaAlta === 0) {
    insight += "Los criterios encontrados tienen fuerza media o baja, por lo que se recomienda buscar criterios más recientes o de mayor jerarquía. ";
  }

  insight += "Es importante verificar que no existan criterios contradictorios o jurisprudencia más reciente que pudiera modificar la interpretación aplicable.";

  return insight;
}

export function generateArgument(
  tesis: Tesis,
  tipoEscrito: string,
  rolProcesal: string,
  tono: string
): { parrafos: string[]; cita_formal: string } {
  const cita_formal = `${tesis.title}. ${tesis.tipo}. ${tesis.organo_jurisdiccional}. ${tesis.epoca}. ${tesis.fuente || ""}`.trim();

  let parrafos: string[] = [];

  const introFrases: Record<string, string> = {
    Conservador: "Conforme al criterio jurisprudencial aplicable",
    Técnico: "En términos de la interpretación jurisdiccional establecida",
    Contundente: "De manera categórica y conforme a la jurisprudencia vigente",
  };

  const rolFrases: Record<string, string> = {
    Actor: "resulta procedente sostener que",
    Demandado: "debe considerarse que contrario a lo pretendido por la contraparte",
  };

  const intro = introFrases[tono] || introFrases.Conservador;
  const rol = rolFrases[rolProcesal] || rolFrases.Actor;

  const parrafo1 = `${intro}, ${rol} el criterio contenido en la tesis de rubro "${tesis.title.slice(0, 80)}..." resulta plenamente aplicable al presente caso. Dicho criterio fue emitido por ${tesis.organo_jurisdiccional} durante la ${tesis.epoca}, estableciendo principios jurídicos que deben ser observados en la resolución de controversias análogas a la que nos ocupa.`;

  let parrafo2 = "";
  if (tipoEscrito === "Amparo") {
    parrafo2 = `Por lo anterior, y en atención a los efectos protectores del juicio de amparo, se solicita a este H. Juzgado de Distrito tenga a bien considerar el criterio jurisprudencial invocado al momento de resolver sobre el acto reclamado, en beneficio de los derechos fundamentales de mi representado.`;
  } else if (tipoEscrito === "Demanda") {
    parrafo2 = `En consecuencia, y aplicando el criterio judicial antes citado a los hechos del presente caso, resulta procedente la acción ejercitada, debiendo condenarse a la parte demandada en los términos solicitados en el capítulo de prestaciones.`;
  } else {
    parrafo2 = `Por lo expuesto, y conforme al criterio jurisprudencial invocado, las pretensiones de la parte actora resultan infundadas e improcedentes, debiendo absolverse a mi representado de todas y cada una de las prestaciones reclamadas.`;
  }

  parrafos = [parrafo1, parrafo2];

  return { parrafos, cita_formal };
}
