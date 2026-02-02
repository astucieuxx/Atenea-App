/**
 * Script para explorar un archivo JSONL
 * 
 * Muestra estadísticas y ejemplos del contenido.
 * 
 * Uso:
 *   tsx script/explore-jsonl.ts tesis_part1.jsonl
 */

import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import * as zlib from "zlib";

async function exploreJSONL(fileName: string) {
  const assetsDir = path.join(process.cwd(), "attached_assets");
  const filePath = path.join(assetsDir, fileName);

  if (!fs.existsSync(filePath)) {
    console.error(`❌ Archivo no encontrado: ${filePath}`);
    process.exit(1);
  }

  console.log("=".repeat(60));
  console.log("🔍 Explorando archivo JSONL");
  console.log("=".repeat(60));
  console.log(`📁 Archivo: ${fileName}`);
  console.log(`📂 Ruta: ${filePath}`);

  // Obtener tamaño del archivo
  const stats = fs.statSync(filePath);
  const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`📊 Tamaño: ${fileSizeMB} MB (${stats.size.toLocaleString()} bytes)`);

  // Leer y analizar el archivo
  const isGzipped = filePath.endsWith('.gz');
  const fileStream = fs.createReadStream(filePath);
  const inputStream = isGzipped 
    ? fileStream.pipe(zlib.createGunzip())
    : fileStream;

  const rl = readline.createInterface({
    input: inputStream,
    crlfDelay: Infinity,
  });

  let lineCount = 0;
  let validJSONCount = 0;
  let invalidJSONCount = 0;
  const sampleItems: any[] = [];
  const allKeys = new Set<string>();

  console.log(`\n📖 Leyendo archivo${isGzipped ? ' (comprimido)' : ''}...`);

  for await (const line of rl) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    lineCount++;

    try {
      const item = JSON.parse(trimmedLine);
      validJSONCount++;
      
      // Guardar primeros 3 items como muestra
      if (sampleItems.length < 3) {
        sampleItems.push(item);
      }

      // Recopilar todas las keys
      if (typeof item === 'object' && item !== null) {
        Object.keys(item).forEach(key => allKeys.add(key));
      }
    } catch (err) {
      invalidJSONCount++;
      if (invalidJSONCount <= 3) {
        console.warn(`⚠️  Línea ${lineCount} no es JSON válido`);
      }
    }

    // Mostrar progreso cada 10000 líneas
    if (lineCount % 10000 === 0) {
      process.stdout.write(`\r   Procesadas ${lineCount.toLocaleString()} líneas...`);
    }
  }

  console.log(`\n\n📊 Estadísticas:`);
  console.log(`   Total de líneas: ${lineCount.toLocaleString()}`);
  console.log(`   JSON válidos: ${validJSONCount.toLocaleString()}`);
  console.log(`   JSON inválidos: ${invalidJSONCount.toLocaleString()}`);

  if (validJSONCount > 0) {
    console.log(`\n🔑 Campos encontrados (${allKeys.size} únicos):`);
    const sortedKeys = Array.from(allKeys).sort();
    sortedKeys.forEach(key => {
      console.log(`   - ${key}`);
    });

    console.log(`\n📄 Ejemplo de tesis (primeras 3):`);
    sampleItems.forEach((item, idx) => {
      console.log(`\n   --- Tesis ${idx + 1} ---`);
      console.log(`   ID: ${item.id || item.ID || 'N/A'}`);
      console.log(`   Título: ${(item.title || item.titulo || item.TITLE || 'N/A').substring(0, 80)}...`);
      console.log(`   Tipo: ${item.tipo || item.TIPO || item.metadata?.tipo || 'N/A'}`);
      console.log(`   Órgano: ${item.organo_jurisdiccional || item.organoJurisdiccional || item.ORGANO_JURISDICCIONAL || item.metadata?.organo_jurisdiccional || 'N/A'}`);
      console.log(`   Época: ${item.epoca || item.EPOCA || item.metadata?.epoca?.nombre || item.metadata?.epoca || 'N/A'}`);
      
      // Mostrar estructura si tiene metadata
      if (item.metadata) {
        console.log(`   Estructura: Tiene objeto 'metadata'`);
      }
      if (item.sections) {
        console.log(`   Estructura: Tiene objeto 'sections'`);
      }
      
      // Mostrar tamaño aproximado del contenido
      const contentSize = JSON.stringify(item).length;
      console.log(`   Tamaño del objeto: ${(contentSize / 1024).toFixed(2)} KB`);
    });

    // Estimar cuántas tesis hay
    console.log(`\n💡 Estimación:`);
    console.log(`   Si cada tesis tiene ~${(stats.size / validJSONCount / 1024).toFixed(2)} KB,`);
    console.log(`   el archivo contiene aproximadamente ${validJSONCount.toLocaleString()} tesis.`);
    console.log(`   Tiempo estimado de ingesta: ~${Math.ceil(validJSONCount / 150)} minutos`);
  }

  console.log("\n" + "=".repeat(60));
}

// Ejecutar
const fileName = process.argv[2];

if (!fileName) {
  console.error("❌ Error: Debes especificar el nombre del archivo");
  console.error("   Uso: tsx script/explore-jsonl.ts tesis_part1.jsonl");
  process.exit(1);
}

exploreJSONL(fileName).catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
