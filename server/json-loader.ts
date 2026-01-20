import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import type { Tesis } from "@shared/schema";

/**
 * Maps a raw JSON object to the Tesis interface
 * Handles both flat structure and nested structure (with metadata object)
 */
function mapToTesis(item: any): Tesis {
  // Handle nested structure (metadata object)
  const metadata = item.metadata || {};
  const localizacion = metadata.localizacion || {};
  const sections = item.sections || {};
  
  // Handle materias - can be array or string
  let materias = "";
  if (metadata.materias) {
    if (Array.isArray(metadata.materias)) {
      materias = metadata.materias.join(", ");
    } else {
      materias = String(metadata.materias);
    }
  }
  
  // Handle epoca - can be object with numero/nombre or string
  let epoca = "";
  if (metadata.epoca) {
    if (typeof metadata.epoca === "object" && metadata.epoca.nombre) {
      epoca = metadata.epoca.nombre;
    } else {
      epoca = String(metadata.epoca);
    }
  }
  
  return {
    id: String(item.id || item.ID || metadata.registro_digital || ""),
    url: String(item.url || item.URL || ""),
    title: String(item.title || item.titulo || item.TITLE || ""),
    abstract: String(item.abstract || item.resumen || item.ABSTRACT || ""),
    body: String(item.body || item.cuerpo || item.BODY || ""),
    body_full: String(item.body_full || item.bodyFull || item.body_full_text || item.BODY_FULL || ""),
    extra_sections: String(
      item.extra_sections || 
      item.extraSections || 
      JSON.stringify(sections) || 
      ""
    ),
    instancia: String(
      item.instancia || 
      item.INSTANCIA || 
      metadata.instancia || 
      ""
    ),
    epoca: epoca || String(
      item.epoca || 
      item.epoca_numero || 
      item.EPOCA || 
      ""
    ),
    materias: materias || String(
      item.materias || 
      item.materia || 
      item.MATERIAS || 
      ""
    ),
    tesis_numero: String(
      item.tesis_numero || 
      item.tesisNumero || 
      item.numero || 
      item.TESIS_NUMERO || 
      metadata.tesis_numero || 
      ""
    ),
    tipo: String(
      item.tipo || 
      item.TIPO || 
      metadata.tipo || 
      ""
    ),
    fuente: String(
      item.fuente || 
      item.FUENTE || 
      metadata.fuente || 
      ""
    ),
    localizacion_libro: String(
      item.localizacion_libro || 
      item.localizacionLibro || 
      item.libro || 
      item.LOCALIZACION_LIBRO || 
      localizacion.libro || 
      ""
    ),
    localizacion_tomo: String(
      item.localizacion_tomo || 
      item.localizacionTomo || 
      item.tomo || 
      item.LOCALIZACION_TOMO || 
      localizacion.tomo || 
      ""
    ),
    localizacion_mes: String(
      item.localizacion_mes || 
      item.localizacionMes || 
      item.mes || 
      item.LOCALIZACION_MES || 
      localizacion.mes || 
      ""
    ),
    localizacion_anio: String(
      item.localizacion_anio || 
      item.localizacionAnio || 
      item.anio || 
      item.ano || 
      item.LOCALIZACION_ANIO || 
      localizacion.anio || 
      ""
    ),
    localizacion_pagina: String(
      item.localizacion_pagina || 
      item.localizacionPagina || 
      item.pagina || 
      item.LOCALIZACION_PAGINA || 
      localizacion.pagina || 
      ""
    ),
    organo_jurisdiccional: String(
      item.organo_jurisdiccional || 
      item.organoJurisdiccional || 
      item.organo || 
      item.ORGANO_JURISDICCIONAL || 
      metadata.organo_jurisdiccional || 
      ""
    ),
    clave: String(
      item.clave || 
      item.CLAVE || 
      metadata.clave || 
      ""
    ),
    notas: String(
      item.notas || 
      item.NOTAS || 
      metadata.notas || 
      sections.notas || 
      ""
    ),
    formas_integracion: String(
      item.formas_integracion || 
      item.formasIntegracion || 
      item.FORMAS_INTEGRACION || 
      metadata.formas_integracion || 
      sections.formasIntegracion || 
      ""
    ),
    fecha_publicacion: String(
      item.fecha_publicacion || 
      item.fechaPublicacion || 
      item.fecha || 
      item.FECHA_PUBLICACION || 
      metadata.fecha_publicacion || 
      ""
    ),
    extracted_at: String(
      item.extracted_at || 
      item.extractedAt || 
      item.extracted || 
      item.EXTRACTED_AT || 
      ""
    ),
  };
}

/**
 * Loads tesis from a JSONL file (JSON Lines format - one JSON object per line).
 * Uses streaming to handle large files efficiently without loading entire file into memory.
 */
function loadTesisFromJSONL(filePath: string): Promise<Tesis[]> {
  console.log(`Loading tesis from JSONL file: ${filePath}`);
  const tesisList: Tesis[] = [];
  let validCount = 0;
  let invalidCount = 0;
  let lineNumber = 0;

  return new Promise<Tesis[]>((resolve, reject) => {
    const fileStream = fs.createReadStream(filePath, { encoding: "utf-8" });
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity, // Handle Windows line endings
    });

    rl.on("line", (line) => {
      lineNumber++;
      const trimmedLine = line.trim();
      
      // Skip empty lines
      if (!trimmedLine) return;

      try {
        const item = JSON.parse(trimmedLine);
        const tesis = mapToTesis(item);

        // Validate required fields
        if (tesis.id && tesis.title) {
          tesisList.push(tesis);
          validCount++;
        } else {
          invalidCount++;
          if (invalidCount <= 5) {
            console.warn(`Skipping invalid tesis at line ${lineNumber}: missing id or title`);
          }
        }
      } catch (err) {
        invalidCount++;
        if (invalidCount <= 5) {
          console.error(`Error parsing JSON at line ${lineNumber}:`, err);
        }
      }

      // Progress indicator for large files
      if (lineNumber % 50000 === 0) {
        console.log(`Processed ${lineNumber} lines, loaded ${validCount} valid tesis so far...`);
      }
    });

    rl.on("close", () => {
      if (invalidCount > 5) {
        console.warn(`... and ${invalidCount - 5} more invalid entries`);
      }
      console.log(`Loaded ${validCount} valid tesis from JSONL (${invalidCount} invalid entries skipped, ${lineNumber} total lines)`);
      resolve(tesisList);
    });

    rl.on("error", (error) => {
      console.error("Error reading JSONL file:", error);
      reject(error);
    });

    fileStream.on("error", (error) => {
      console.error("Error opening JSONL file:", error);
      reject(error);
    });
  });
}

/**
 * Loads tesis from a JSON file.
 * Supports both array format: [{...}, {...}] 
 * and object format: { tesis: [{...}, {...}] }
 */
function loadTesisFromRegularJSON(filePath: string): Tesis[] {
  console.log(`Loading tesis from JSON file: ${filePath}`);
  
  try {
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(fileContent);
    
    let tesisArray: any[] = [];
    
    // Handle different JSON structures
    if (Array.isArray(parsed)) {
      // Direct array: [{...}, {...}]
      tesisArray = parsed;
    } else if (parsed.tesis && Array.isArray(parsed.tesis)) {
      // Object with tesis property: { tesis: [{...}, {...}] }
      tesisArray = parsed.tesis;
    } else if (parsed.data && Array.isArray(parsed.data)) {
      // Object with data property: { data: [{...}, {...}] }
      tesisArray = parsed.data;
    } else {
      console.error("JSON file structure not recognized. Expected array or object with 'tesis' or 'data' property.");
      return [];
    }

    console.log(`Parsed ${tesisArray.length} tesis from JSON`);

    const tesisList: Tesis[] = [];
    let validCount = 0;
    let invalidCount = 0;

    for (let i = 0; i < tesisArray.length; i++) {
      try {
        const item = tesisArray[i];
        const tesis = mapToTesis(item);

        // Validate required fields
        if (tesis.id && tesis.title) {
          tesisList.push(tesis);
          validCount++;
        } else {
          invalidCount++;
          if (invalidCount <= 5) {
            console.warn(`Skipping invalid tesis at index ${i}: missing id or title`);
          }
        }
      } catch (err) {
        invalidCount++;
        if (invalidCount <= 5) {
          console.error(`Error parsing tesis at index ${i}:`, err);
        }
      }
    }

    if (invalidCount > 5) {
      console.warn(`... and ${invalidCount - 5} more invalid entries`);
    }

    console.log(`Loaded ${validCount} valid tesis from JSON (${invalidCount} invalid entries skipped)`);
    return tesisList;
  } catch (error) {
    console.error("Error loading JSON file:", error);
    if (error instanceof SyntaxError) {
      console.error("The file may not be valid JSON. Please check the file format.");
    }
    return [];
  }
}

/**
 * Main loader function that automatically detects JSONL vs JSON format
 * and loads tesis from the appropriate file.
 */
export async function loadTesisFromJSON(filePath?: string): Promise<Tesis[]> {
  // Default to looking for tesis.jsonl first, then tesis.json in attached_assets folder
  const defaultPath = filePath || (() => {
    const jsonlPath = path.join(process.cwd(), "attached_assets", "tesis.jsonl");
    const jsonPath = path.join(process.cwd(), "attached_assets", "tesis.json");
    
    if (fs.existsSync(jsonlPath)) {
      return jsonlPath;
    }
    if (fs.existsSync(jsonPath)) {
      return jsonPath;
    }
    return jsonlPath; // Default to jsonl for error message
  })();

  if (!fs.existsSync(defaultPath)) {
    console.error("Tesis file not found at:", defaultPath);
    console.error("Please ensure your file is located at:", defaultPath);
    console.error("Supported formats: tesis.jsonl (JSON Lines) or tesis.json (JSON array)");
    return [];
  }

  // Check file extension to determine format
  const ext = path.extname(defaultPath).toLowerCase();
  
  if (ext === ".jsonl") {
    return await loadTesisFromJSONL(defaultPath);
  } else {
    return loadTesisFromRegularJSON(defaultPath);
  }
}
