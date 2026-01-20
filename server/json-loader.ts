import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import * as zlib from "zlib";
import type { Tesis } from "@shared/schema";

// Helper to list files in directory for debugging
function listFilesInDir(dir: string, pattern: string): string[] {
  try {
    if (!fs.existsSync(dir)) {
      return [];
    }
    return fs.readdirSync(dir).filter(f => f.includes(pattern));
  } catch (error) {
    return [];
  }
}

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
    // Check if file is gzipped
    const isGzipped = filePath.endsWith('.gz');
    const fileStream = fs.createReadStream(filePath);
    const inputStream = isGzipped 
      ? fileStream.pipe(zlib.createGunzip())
      : fileStream;
    
    const rl = readline.createInterface({
      input: inputStream,
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
/**
 * Loads tesis from multiple chunked files (tesis_part1.jsonl, tesis_part2.jsonl, etc.)
 * Also handles sub-chunks (tesis_part2_chunk1.jsonl, etc.) for files that were split further
 * This allows splitting large files into smaller uploadable chunks
 */
async function loadTesisFromChunks(baseDir: string): Promise<Tesis[]> {
  const allTesis: Tesis[] = [];
  
  console.log(`🔍 Starting to load chunks from: ${baseDir}`);

  // First, find all part files by scanning the directory
  const allFiles = fs.readdirSync(baseDir);
  const partFiles: { num: number; path: string; isGz: boolean }[] = [];
  
  // Find all tesis_part*.jsonl and tesis_part*.jsonl.gz files
  for (const file of allFiles) {
    const partMatch = file.match(/^tesis_part(\d+)\.jsonl(\.gz)?$/);
    if (partMatch) {
      const partNum = parseInt(partMatch[1], 10);
      const isGz = !!partMatch[2];
      const filePath = path.join(baseDir, file);
      partFiles.push({ num: partNum, path: filePath, isGz });
    }
  }
  
  // Sort by part number
  partFiles.sort((a, b) => a.num - b.num);
  
  console.log(`📦 Found ${partFiles.length} part files to load`);

  if (partFiles.length === 0) {
    return [];
  }

  // Load each part file
  for (const partFile of partFiles) {
    // Check if this part was further split into sub-chunks
    let subChunkNum = 1;
    const subChunks: string[] = [];
    
    while (true) {
      const subChunkPath = path.join(baseDir, `tesis_part${partFile.num}_chunk${subChunkNum}.jsonl`);
      if (fs.existsSync(subChunkPath)) {
        subChunks.push(subChunkPath);
        subChunkNum++;
      } else {
        break;
      }
    }
    
    if (subChunks.length > 0) {
      // Load all sub-chunks for this part
      const beforeCount = allTesis.length;
      console.log(`Loading part ${partFile.num} (split into ${subChunks.length} sub-chunks)...`);
      for (const subChunkPath of subChunks) {
        console.log(`  Loading sub-chunk: ${path.basename(subChunkPath)}`);
        const subChunkTesis = await loadTesisFromJSONL(subChunkPath);
        allTesis.push(...subChunkTesis);
      }
      const loadedFromPart = allTesis.length - beforeCount;
      console.log(`  Loaded ${loadedFromPart} tesis from part ${partFile.num} (total so far: ${allTesis.length})`);
    } else {
      // Load the single part file
      console.log(`Loading part ${partFile.num} from: ${path.basename(partFile.path)}`);
      const chunkTesis = await loadTesisFromJSONL(partFile.path);
      allTesis.push(...chunkTesis);
      console.log(`Loaded ${chunkTesis.length} tesis from part ${partFile.num} (total so far: ${allTesis.length})`);
    }
  }

  console.log(`✅ Total loaded from ${partFiles.length} parts: ${allTesis.length} tesis`);
  return allTesis;
}

export async function loadTesisFromJSON(filePath?: string): Promise<Tesis[]> {
  const assetsDir = path.join(process.cwd(), "attached_assets");
  
  console.log("=".repeat(60));
  console.log("🚀 NEW LOADER VERSION - Scanning for all chunk files");
  console.log("=".repeat(60));
  console.log(`🔍 Searching for tesis files in: ${assetsDir}`);
  
  // Check if directory exists
  if (!fs.existsSync(assetsDir)) {
    console.error(`❌ Directory does not exist: ${assetsDir}`);
    return [];
  }
  
  const existingFiles = listFilesInDir(assetsDir, "tesis");
  console.log(`📁 Found ${existingFiles.length} files matching 'tesis': ${existingFiles.slice(0, 10).join(", ")}${existingFiles.length > 10 ? "..." : ""}`);
  
  // First, try to load from chunks (preferred for large files)
  const chunkedTesis = await loadTesisFromChunks(assetsDir);
  if (chunkedTesis.length > 0) {
    console.log("=".repeat(60));
    return chunkedTesis;
  }
  
  console.log("⚠️  No chunks found, trying single file fallback...");

  // If no chunks, try single file (backward compatibility)
  const defaultPath = filePath || (() => {
    const jsonlPath = path.join(assetsDir, "tesis.jsonl");
    const jsonlGzPath = path.join(assetsDir, "tesis.jsonl.gz");
    const jsonPath = path.join(assetsDir, "tesis.json");
    
    // Check compressed version first (smaller, preferred)
    if (fs.existsSync(jsonlGzPath)) {
      return jsonlGzPath;
    }
    if (fs.existsSync(jsonlPath)) {
      return jsonlPath;
    }
    if (fs.existsSync(jsonPath)) {
      return jsonPath;
    }
    return jsonlPath; // Default to jsonl for error message
  })();

  if (!fs.existsSync(defaultPath)) {
    console.error("Tesis file not found. Options:");
    console.error("  1. Single file: attached_assets/tesis.jsonl or tesis.jsonl.gz");
    console.error("  2. Chunked files: attached_assets/tesis_part1.jsonl, tesis_part2.jsonl, etc.");
    return [];
  }

  // Check file extension to determine format
  const ext = path.extname(defaultPath).toLowerCase();
  const baseExt = defaultPath.endsWith('.gz') 
    ? path.extname(defaultPath.slice(0, -3)).toLowerCase()
    : ext;
  
  if (baseExt === ".jsonl" || ext === ".gz") {
    return await loadTesisFromJSONL(defaultPath);
  } else {
    return loadTesisFromRegularJSON(defaultPath);
  }
}
