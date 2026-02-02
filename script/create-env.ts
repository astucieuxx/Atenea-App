/**
 * Script para crear archivo .env con configuración de Supabase y OpenAI
 */

import { writeFileSync } from "fs";
import { join } from "path";

const envContent = `# Supabase Database Connection
# La contraseña tiene caracteres especiales codificados en URL:
#   ! → %21
#   " → %22
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres

# OpenAI API Key (reemplaza con tu API key)
OPENAI_API_KEY=sk-your-api-key-here

# Embedding Configuration
EMBEDDING_PROVIDER=openai
EMBEDDING_MODEL=text-embedding-3-small

# Ingesta Configuration (opcional)
INGESTION_BATCH_SIZE=10
EMBEDDING_BATCH_SIZE=50
`;

const envPath = join(process.cwd(), ".env");

try {
  writeFileSync(envPath, envContent, "utf-8");
  console.log("✅ Archivo .env creado exitosamente en:", envPath);
  console.log("\n📋 Contenido:");
  console.log(envContent);
} catch (error) {
  console.error("❌ Error al crear .env:", error);
  process.exit(1);
}
