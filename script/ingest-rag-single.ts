/**
 * Script de Ingesta RAG - Archivo Único
 * 
 * Ingiere tesis desde un archivo JSONL específico.
 * 
 * Uso:
 *   tsx script/ingest-rag-single.ts tesis_part1.jsonl
 */

import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import * as zlib from "zlib";
import { ingestTesisBatch } from "../server/rag/ingestion";
import { getProcessedTesisIds } from "../server/rag/database";
import type { Tesis } from "../shared/schema";

// Importar la función de mapeo
function mapToTesis(item: any): Tesis {
  const metadata = item.metadata || {};
  const localizacion = metadata.localizacion || {};
  const sections = item.sections || {};
  
  let materias = "";
  if (metadata.materias) {
    if (Array.isArray(metadata.materias)) {
      materias = metadata.materias.join(", ");
    } else {
      materias = String(metadata.materias);
    }
  }
  
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

// Función para cargar solo un archivo JSONL
async function loadSingleJSONL(filePath: string): Promise<Tesis[]> {
  console.log(`📖 Cargando tesis desde archivo específico: ${path.basename(filePath)}`);
  const tesisList: Tesis[] = [];
  let validCount = 0;
  let invalidCount = 0;
  let lineNumber = 0;

  return new Promise<Tesis[]>((resolve, reject) => {
    const isGzipped = filePath.endsWith('.gz');
    const fileStream = fs.createReadStream(filePath);
    const inputStream = isGzipped 
      ? fileStream.pipe(zlib.createGunzip())
      : fileStream;
    
    const rl = readline.createInterface({
      input: inputStream,
      crlfDelay: Infinity,
    });

    rl.on("line", (line) => {
      lineNumber++;
      const trimmedLine = line.trim();
      
      if (!trimmedLine) return;

      try {
        const item = JSON.parse(trimmedLine);
        const tesis = mapToTesis(item);

        if (tesis.id && tesis.title) {
          tesisList.push(tesis);
          validCount++;
        } else {
          invalidCount++;
          if (invalidCount <= 5) {
            console.warn(`⚠️  Saltando tesis inválida en línea ${lineNumber}: falta id o título`);
          }
        }
      } catch (err) {
        invalidCount++;
        if (invalidCount <= 5) {
          console.error(`❌ Error parseando JSON en línea ${lineNumber}:`, err);
        }
      }

      if (lineNumber % 5000 === 0) {
        process.stdout.write(`\r   Procesadas ${lineNumber.toLocaleString()} líneas...`);
      }
    });

    rl.on("close", () => {
      console.log(`\n✅ Cargadas ${validCount} tesis válidas (${invalidCount} inválidas, ${lineNumber} líneas totales)`);
      resolve(tesisList);
    });

    rl.on("error", (error) => {
      console.error("❌ Error leyendo archivo:", error);
      reject(error);
    });

    fileStream.on("error", (error) => {
      console.error("❌ Error abriendo archivo:", error);
      reject(error);
    });
  });
}

async function main() {
  const fileName = process.argv[2];
  
  if (!fileName) {
    console.error("❌ Error: Debes especificar el nombre del archivo");
    console.error("   Uso: tsx script/ingest-rag-single.ts tesis_part1.jsonl");
    process.exit(1);
  }

  console.log("=".repeat(60));
  console.log("🚀 ATENEA RAG - Ingesta de Archivo Único");
  console.log("=".repeat(60));

  // Verificar variables de entorno
  if (!process.env.DATABASE_URL) {
    console.error("❌ Error: DATABASE_URL no está definida");
    process.exit(1);
  }

  if (!process.env.OPENAI_API_KEY && !process.env.EMBEDDING_API_KEY) {
    console.error("❌ Error: OPENAI_API_KEY o EMBEDDING_API_KEY no está definida");
    process.exit(1);
  }

  // Buscar el archivo
  const assetsDir = path.join(process.cwd(), "attached_assets");
  const filePath = path.join(assetsDir, fileName);

  if (!fs.existsSync(filePath)) {
    console.error(`❌ Error: Archivo no encontrado: ${filePath}`);
    console.error(`   Verifica que el archivo existe en attached_assets/`);
    process.exit(1);
  }

  console.log(`\n📂 Cargando tesis desde: ${fileName}`);
  console.log(`   Ruta completa: ${filePath}`);

  // Cargar tesis desde el archivo específico (solo este archivo, no todos)
  let tesisList: Tesis[];
  
  try {
    tesisList = await loadSingleJSONL(filePath);
    console.log(`✅ Total: ${tesisList.length} tesis cargadas desde ${fileName}`);
  } catch (error) {
    console.error("❌ Error al cargar tesis:", error);
    if (error instanceof Error) {
      console.error(`   Mensaje: ${error.message}`);
    }
    process.exit(1);
  }

  if (tesisList.length === 0) {
    console.error("❌ No se encontraron tesis en el archivo");
    process.exit(1);
  }

  // Verificar qué tesis ya están procesadas (para reanudar)
  console.log("\n🔍 Verificando tesis ya procesadas...");
  let processedIds: Set<string>;
  try {
    processedIds = await getProcessedTesisIds();
    console.log(`   ✅ Encontradas ${processedIds.size} tesis ya procesadas en la BD`);
  } catch (error) {
    console.warn("   ⚠️  No se pudo verificar tesis procesadas, procesando todas");
    processedIds = new Set();
  }

  // Filtrar tesis ya procesadas
  const originalCount = tesisList.length;
  tesisList = tesisList.filter(tesis => !processedIds.has(tesis.id));
  const skippedCount = originalCount - tesisList.length;

  if (skippedCount > 0) {
    console.log(`   ⏭️  Se saltarán ${skippedCount} tesis ya procesadas`);
  }

  if (tesisList.length === 0) {
    console.log("\n✅ Todas las tesis de este archivo ya están procesadas!");
    console.log("   No hay nada que hacer.");
    process.exit(0);
  }

  console.log(`\n📊 Tesis a procesar: ${tesisList.length} (de ${originalCount} totales)`);

  // Configuración de ingesta
  const batchSize = parseInt(process.env.INGESTION_BATCH_SIZE || "10");
  const embeddingBatchSize = parseInt(process.env.EMBEDDING_BATCH_SIZE || "50");

  console.log("\n⚙️  Configuración:");
  console.log(`   Batch size (tesis): ${batchSize}`);
  console.log(`   Embedding batch size: ${embeddingBatchSize}`);
  console.log(`   Provider: ${process.env.EMBEDDING_PROVIDER || "openai"}`);
  console.log(`   Total tesis a procesar: ${tesisList.length}`);

  // Confirmar
  console.log(`\n⚠️  Se procesarán ${tesisList.length} tesis.`);
  console.log("   Esto puede tardar varios minutos dependiendo del tamaño.");
  console.log("\n¿Continuar? (Ctrl+C para cancelar)");
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Iniciar ingesta
  console.log("\n🔄 Iniciando ingesta...\n");
  
  try {
    const stats = await ingestTesisBatch(tesisList, {
      batchSize,
      embeddingBatchSize,
      continueOnError: true,
      logProgress: true,
    });

    console.log("\n" + "=".repeat(60));
    console.log("✅ INGESTA COMPLETADA");
    console.log("=".repeat(60));
    console.log(`   Tesis procesadas: ${stats.processedTesis}/${stats.totalTesis}`);
    console.log(`   Tesis fallidas: ${stats.failedTesis}`);
    console.log(`   Chunks creados: ${stats.processedChunks}`);
    if (stats.durationMs) {
      const minutes = Math.floor(stats.durationMs / 60000);
      const seconds = Math.floor((stats.durationMs % 60000) / 1000);
      console.log(`   Duración: ${minutes}m ${seconds}s`);
    }
    
    console.log("\n💡 Siguiente paso:");
    console.log(`   Para procesar más archivos, ejecuta:`);
    console.log(`   tsx script/ingest-rag-single.ts tesis_part2.jsonl`);
    console.log(`   (o usa npm run rag:ingest para procesar todos)`);
  } catch (error) {
    console.error("\n❌ Error durante la ingesta:", error);
    process.exit(1);
  }
}

// Ejecutar
main().catch((error) => {
  console.error("Error fatal:", error);
  process.exit(1);
});
