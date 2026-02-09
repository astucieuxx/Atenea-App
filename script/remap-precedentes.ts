/**
 * Re-mapea los datos de precedentes ya scrapeados con el nuevo esquema.
 * Lee data/ejecutorias.json (datos viejos) y genera data/precedentes.json
 *
 * Uso: npx tsx script/remap-precedentes.ts
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";

const BASE_URL = "https://sjf2.scjn.gob.mx";

const dataDir = resolve(import.meta.dirname, "..", "data");

// Try both old and new file names
const inputPath = existsSync(resolve(dataDir, "precedentes.json"))
  ? resolve(dataDir, "precedentes.json")
  : resolve(dataDir, "ejecutorias.json");

const outputJson = resolve(dataDir, "precedentes.json");
const outputJsonl = resolve(dataDir, "precedentes.jsonl");

console.log(`Leyendo ${inputPath}...`);
const oldData: any[] = JSON.parse(readFileSync(inputPath, "utf-8"));
console.log(`  ${oldData.length} registros leídos.`);

console.log("Re-mapeando campos...");
const newData = oldData.map((old) => {
  const raw = old.raw_fields || {};

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
    tipo_asunto: old.tipo_asunto || raw.tipoAsunto || "",
    tipo_asunto_expediente: old.tipo_asunto_expediente || raw.tipoAsuntoE || "",
    promovente: old.promovente || raw.promovente || "",
    texto_publicacion: old.texto_publicacion || raw.textoPublicacion || "",
    fecha_publicacion: old.fecha_publicacion || "",
    temas: old.temas || (Array.isArray(raw.themes) ? raw.themes : []),
    votos: old.votos || (Array.isArray(raw.votos) ? raw.votos : []),
    votacion: old.votacion ?? raw.votacion ?? false,
    semanal: old.semanal ?? (raw.semanal === 1 || raw.semanal === true),
    url_origen: `${BASE_URL}/detalle/ejecutoria/${old.ius || old.id}`,
    raw_fields: newRawFields,
    scraped_at: old.scraped_at,
  };
});

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
console.log(`  data/precedentes.json  (${sizeMB} MB)`);
console.log(`  data/precedentes.jsonl`);
console.log(`\nListo! ${newData.length} precedentes guardados.`);
