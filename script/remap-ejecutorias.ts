/**
 * Re-mapea los datos de ejecutorias ya scrapeados con el nuevo esquema.
 * Lee data/ejecutorias.json (con raw_fields) y genera archivos limpios.
 *
 * Uso: npx tsx script/remap-ejecutorias.ts
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const BASE_URL = "https://sjf2.scjn.gob.mx";

interface OldEjecutoria {
  id: string;
  ius: number;
  rubro: string;
  localizacion: string;
  sala: string;
  fecha_publicacion: string;
  raw_fields: Record<string, any>;
  scraped_at: string;
  [key: string]: any;
}

interface Ejecutoria {
  id: string;
  ius: number;
  rubro: string;
  localizacion: string;
  sala: string;
  tipo_asunto: string;
  tipo_asunto_expediente: string;
  promovente: string;
  texto_publicacion: string;
  fecha_publicacion: string;
  temas: string[];
  votos: any[];
  votacion: boolean;
  semanal: boolean;
  url_origen: string;
  raw_fields: Record<string, any>;
  scraped_at: string;
}

const dataDir = resolve(import.meta.dirname, "..", "data");
const inputPath = resolve(dataDir, "ejecutorias.json");
const outputJson = resolve(dataDir, "ejecutorias.json");
const outputJsonl = resolve(dataDir, "ejecutorias.jsonl");

console.log("Leyendo datos existentes...");
const oldData: OldEjecutoria[] = JSON.parse(readFileSync(inputPath, "utf-8"));
console.log(`  ${oldData.length} registros leídos.`);

console.log("Re-mapeando campos...");
const newData: Ejecutoria[] = oldData.map((old) => {
  // Merge top-level fields with raw_fields to get all original API data
  const raw = old.raw_fields || {};

  // Build new raw_fields excluding the ones we now map explicitly
  const mappedKeys = new Set([
    "textoPublicacion", "promovente", "tipoAsunto", "tipoAsuntoE",
    "themes", "votos", "votacion", "semanal",
  ]);
  const newRawFields: Record<string, any> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!mappedKeys.has(k) && v !== null && v !== undefined && v !== "") {
      newRawFields[k] = v;
    }
  }

  return {
    id: old.id,
    ius: old.ius,
    rubro: (old.rubro || "").trim(),
    localizacion: old.localizacion || "",
    sala: old.sala || "",
    tipo_asunto: raw.tipoAsunto || "",
    tipo_asunto_expediente: raw.tipoAsuntoE || "",
    promovente: raw.promovente || "",
    texto_publicacion: raw.textoPublicacion || "",
    fecha_publicacion: old.fecha_publicacion || "",
    temas: Array.isArray(raw.themes) ? raw.themes : [],
    votos: Array.isArray(raw.votos) ? raw.votos : [],
    votacion: raw.votacion ?? false,
    semanal: raw.semanal === 1 || raw.semanal === true,
    url_origen: `${BASE_URL}/detalle/ejecutoria/${old.ius || old.id}`,
    raw_fields: newRawFields,
    scraped_at: old.scraped_at,
  };
});

// Stats
const withTipoAsunto = newData.filter((e) => e.tipo_asunto).length;
const withPromovente = newData.filter((e) => e.promovente).length;
const withTexto = newData.filter((e) => e.texto_publicacion).length;

console.log(`\nEstadísticas:`);
console.log(`  Con tipo_asunto:          ${withTipoAsunto}`);
console.log(`  Con promovente:           ${withPromovente}`);
console.log(`  Con texto_publicacion:    ${withTexto}`);

console.log(`\nGuardando...`);
writeFileSync(outputJson, JSON.stringify(newData, null, 2), "utf-8");
const jsonlContent = newData.map((e) => JSON.stringify(e)).join("\n") + "\n";
writeFileSync(outputJsonl, jsonlContent, "utf-8");

const sizeMB = (Buffer.byteLength(JSON.stringify(newData)) / 1024 / 1024).toFixed(1);
console.log(`  data/ejecutorias.json  (${sizeMB} MB)`);
console.log(`  data/ejecutorias.jsonl`);
console.log(`\nListo! ${newData.length} registros re-mapeados.`);
