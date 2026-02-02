/**
 * Script para actualizar .env con nueva API key de OpenAI
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";

const envPath = resolve(process.cwd(), ".env");

// Nueva configuración de OpenAI
// NOTA: Este script debe ser actualizado con tu API key antes de ejecutarlo
// O mejor aún, configura la API key directamente en el archivo .env
const newOpenAIKey = process.env.OPENAI_API_KEY || "sk-your-api-key-here";

try {
  let envContent = "";
  
  // Leer .env existente si existe
  if (existsSync(envPath)) {
    envContent = readFileSync(envPath, "utf-8");
  } else {
    // Si no existe, crear uno nuevo con la estructura básica
    envContent = `# Supabase Database Connection
DATABASE_URL=postgresql://postgres.fxesmafcpbtbtmlksvbb:jH2BgFXNqgcVqXTP@aws-1-us-east-1.pooler.supabase.com:6543/postgres

# OpenAI API Key
OPENAI_API_KEY=

# Embedding Configuration
EMBEDDING_PROVIDER=openai
EMBEDDING_MODEL=text-embedding-3-small

# Ingesta Configuration (opcional)
INGESTION_BATCH_SIZE=10
EMBEDDING_BATCH_SIZE=50
`;
  }
  
  // Actualizar o agregar OPENAI_API_KEY
  if (envContent.includes("OPENAI_API_KEY=")) {
    envContent = envContent.replace(
      /OPENAI_API_KEY=.*/,
      `OPENAI_API_KEY=${newOpenAIKey}`
    );
  } else {
    // Agregar si no existe
    envContent += `\nOPENAI_API_KEY=${newOpenAIKey}\n`;
  }
  
  // Actualizar EMBEDDING_PROVIDER a openai
  if (envContent.includes("EMBEDDING_PROVIDER=")) {
    envContent = envContent.replace(
      /EMBEDDING_PROVIDER=.*/,
      "EMBEDDING_PROVIDER=openai"
    );
  } else {
    envContent += `\nEMBEDDING_PROVIDER=openai\n`;
  }
  
  // Actualizar EMBEDDING_MODEL
  if (envContent.includes("EMBEDDING_MODEL=")) {
    envContent = envContent.replace(
      /EMBEDDING_MODEL=.*/,
      "EMBEDDING_MODEL=text-embedding-3-small"
    );
  } else {
    envContent += `\nEMBEDDING_MODEL=text-embedding-3-small\n`;
  }
  
  // Eliminar líneas de Zendesk si existen
  envContent = envContent
    .split("\n")
    .filter(line => !line.includes("ZENDESK_AI_KEY") && !line.includes("ZENDESK_AI_URL") && !line.includes("ZENDESK_MODEL"))
    .join("\n");
  
  // Escribir archivo actualizado
  writeFileSync(envPath, envContent, "utf-8");
  
  console.log("✅ Archivo .env actualizado exitosamente");
  console.log("\n📋 Cambios realizados:");
  console.log("   - OPENAI_API_KEY: Actualizada");
  console.log("   - EMBEDDING_PROVIDER: openai");
  console.log("   - EMBEDDING_MODEL: text-embedding-3-small");
  console.log("   - Líneas de Zendesk: Eliminadas");
  console.log(`\n📁 Archivo: ${envPath}`);
} catch (error) {
  console.error("❌ Error al actualizar .env:", error);
  process.exit(1);
}
