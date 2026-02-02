/**
 * Script de Prueba RAG
 * 
 * Prueba el sistema RAG con preguntas de ejemplo.
 */

import "dotenv/config";
import { askQuestion } from "../server/rag/ask";

const TEST_QUESTIONS = [
  "¿Qué es el amparo directo?",
  "¿Cuándo procede la suspensión en juicio de amparo?",
  "¿Qué es el interés jurídico en amparo?",
  "¿Cuándo se considera que hay violación directa en amparo?",
];

async function main() {
  console.log("=".repeat(60));
  console.log("🧪 ATENEA RAG - Pruebas del Sistema");
  console.log("=".repeat(60));

  // Verificar configuración
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL no está configurada");
    process.exit(1);
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error("❌ OPENAI_API_KEY no está configurada");
    process.exit(1);
  }

  console.log("\n✅ Configuración verificada\n");

  // Probar cada pregunta
  for (let i = 0; i < TEST_QUESTIONS.length; i++) {
    const question = TEST_QUESTIONS[i];
    console.log(`\n${"=".repeat(60)}`);
    console.log(`Pregunta ${i + 1}/${TEST_QUESTIONS.length}: ${question}`);
    console.log("=".repeat(60));

    try {
      const startTime = Date.now();
      const response = await askQuestion(question);
      const duration = Date.now() - startTime;

      console.log(`\n⏱️  Tiempo de respuesta: ${duration}ms`);
      console.log(`📊 Confianza: ${response.confidence}`);
      console.log(`📚 Tesis encontradas: ${response.tesisUsed.length}`);
      console.log(`✅ Tiene evidencia: ${response.hasEvidence ? "Sí" : "No"}`);

      if (response.hasEvidence) {
        console.log("\n📖 Respuesta:");
        console.log(response.answer);
        console.log("\n📋 Tesis citadas:");
        response.tesisUsed.forEach((tesis, idx) => {
          console.log(`\n${idx + 1}. [ID: ${tesis.id}]`);
          console.log(`   Rubro: "${tesis.title}"`);
          console.log(`   Cita: ${tesis.citation}`);
          console.log(`   Relevancia: ${(tesis.relevanceScore * 100).toFixed(1)}%`);
        });
      } else {
        console.log("\n⚠️  No se encontró evidencia suficiente");
        console.log(response.answer);
      }
    } catch (error) {
      console.error(`\n❌ Error al procesar pregunta:`, error);
      if (error instanceof Error) {
        console.error(`   Mensaje: ${error.message}`);
      }
    }

    // Pausa entre preguntas
    if (i < TEST_QUESTIONS.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("✅ Pruebas completadas");
  console.log("=".repeat(60));
}

main().catch((error) => {
  console.error("Error fatal:", error);
  process.exit(1);
});
