import * as fs from "fs";
import * as path from "path";
import type { Tesis } from "@shared/schema";

function parseCSV(content: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentField);
      currentField = "";
    } else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !inQuotes) {
      currentRow.push(currentField);
      if (currentRow.length > 1 || currentRow[0] !== "") {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = "";
      if (char === '\r') i++;
    } else if (char === '\r' && !inQuotes) {
      currentRow.push(currentField);
      if (currentRow.length > 1 || currentRow[0] !== "") {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = "";
    } else {
      currentField += char;
    }
  }

  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.length > 1 || currentRow[0] !== "") {
      rows.push(currentRow);
    }
  }

  return rows;
}

export function loadTesisFromCSV(): Tesis[] {
  const csvPath = path.join(process.cwd(), "attached_assets", "tesis_1768148635273.csv");
  
  if (!fs.existsSync(csvPath)) {
    console.error("CSV file not found at:", csvPath);
    return [];
  }

  let content = fs.readFileSync(csvPath, "utf-8");
  content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const rows = parseCSV(content);
  console.log(`Parsed ${rows.length} rows from CSV`);
  
  if (rows.length < 2) {
    console.error("CSV file is empty or has no data rows");
    return [];
  }

  const headers = rows[0];
  const tesisList: Tesis[] = [];

  for (let i = 1; i < rows.length; i++) {
    try {
      const values = rows[i];
      if (values.length < 10) continue;

      const getValue = (index: number): string => {
        return (values[index] || "").trim();
      };

      const tesis: Tesis = {
        id: getValue(0),
        url: getValue(1),
        title: getValue(2),
        abstract: getValue(3),
        body: getValue(4),
        body_full: getValue(5),
        extra_sections: getValue(6),
        instancia: getValue(7),
        epoca: getValue(8),
        materias: getValue(9),
        tesis_numero: getValue(10),
        tipo: getValue(11),
        fuente: getValue(12),
        localizacion_libro: getValue(13),
        localizacion_tomo: getValue(14),
        localizacion_mes: getValue(15),
        localizacion_anio: getValue(16),
        localizacion_pagina: getValue(17),
        organo_jurisdiccional: getValue(18),
        clave: getValue(19),
        notas: getValue(20),
        formas_integracion: getValue(21),
        fecha_publicacion: getValue(22),
        extracted_at: getValue(23),
      };

      if (tesis.id && tesis.title) {
        tesisList.push(tesis);
      }
    } catch (err) {
      console.error(`Error parsing row ${i}:`, err);
    }
  }

  console.log(`Loaded ${tesisList.length} tesis from CSV`);
  return tesisList;
}
