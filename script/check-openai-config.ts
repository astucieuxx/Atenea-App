/**
 * Script para verificar la configuración de OpenAI API Key
 */

import "dotenv/config";

console.log("=".repeat(60));
console.log("🔍 Verificando configuración de OpenAI API Key");
console.log("=".repeat(60));

// Verificar si existe la variable de entorno
const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.error("\n❌ ERROR: OPENAI_API_KEY no está configurada");
  console.error("\n📝 Pasos para solucionarlo:");
  console.error("   1. Abre el archivo .env en la raíz del proyecto");
  console.error("   2. Agrega o actualiza la línea:");
  console.error("      OPENAI_API_KEY=sk-tu-api-key-aqui");
  console.error("   3. Guarda el archivo y reinicia el servidor");
  process.exit(1);
}

// Verificar formato básico
if (!apiKey.startsWith("sk-")) {
  console.warn("\n⚠️  ADVERTENCIA: La API key no parece tener el formato correcto");
  console.warn("   Las API keys de OpenAI normalmente empiezan con 'sk-'");
}

// Mostrar información (sin exponer la key completa)
const keyLength = apiKey.length;
const keyPreview = apiKey.substring(0, 7) + "...";
const keyEnd = apiKey.substring(keyLength - 4);

console.log("\n✅ OPENAI_API_KEY está configurada");
console.log(`   Formato: ${keyPreview}${keyEnd}`);
console.log(`   Longitud: ${keyLength} caracteres`);

// Verificar otras variables relacionadas
console.log("\n📋 Otras variables de entorno relacionadas:");
console.log(`   EMBEDDING_PROVIDER: ${process.env.EMBEDDING_PROVIDER || "no configurada (default: openai)"}`);
console.log(`   EMBEDDING_MODEL: ${process.env.EMBEDDING_MODEL || "no configurada (default: text-embedding-3-small)"}`);
console.log(`   OPENAI_BASE_URL: ${process.env.OPENAI_BASE_URL || "no configurada (default: https://api.openai.com/v1)"}`);

// Intentar hacer una petición de prueba (opcional)
console.log("\n🧪 Para probar la conexión, ejecuta una consulta en la aplicación");
console.log("   o usa el script: tsx script/test-rag.ts");

console.log("\n" + "=".repeat(60));
