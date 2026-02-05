#!/usr/bin/env tsx
/**
 * Script para ejecutar migraciones SQL
 * 
 * Uso:
 *   npm run migrate -- 002_optimize_pgvector
 *   npm run migrate -- 001_rag_schema
 */

import "dotenv/config";
import pg from "pg";
import fs from "fs";
import path from "path";

const { Pool } = pg;

async function runMigration(migrationName: string) {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error("❌ Error: DATABASE_URL environment variable is required");
    process.exit(1);
  }

  // Construir ruta del archivo de migración
  const migrationFile = path.join(
    process.cwd(),
    "migrations",
    `${migrationName}.sql`
  );

  if (!fs.existsSync(migrationFile)) {
    console.error(`❌ Error: Archivo de migración no encontrado: ${migrationFile}`);
    process.exit(1);
  }

  // Leer el contenido del archivo SQL
  const sql = fs.readFileSync(migrationFile, "utf-8");

  console.log(`📄 Ejecutando migración: ${migrationName}.sql\n`);

  const pool = new Pool({
    connectionString,
    max: 1, // Solo una conexión para migraciones
    statement_timeout: 0, // Sin timeout para construcción de índices grandes
    query_timeout: 0, // Sin timeout para queries largas
  });

  const client = await pool.connect();
  
  // Configurar timeout ilimitado en la sesión
  await client.query("SET statement_timeout = 0");
  await client.query("SET lock_timeout = 0");

  try {
    console.log("🔄 Ejecutando SQL...");
    const startTime = Date.now();

    // Dividir el SQL en statements individuales
    // Primero remover comentarios de una sola línea
    const lines = sql.split('\n');
    const cleanedLines: string[] = [];
    let inMultiLineComment = false;
    
    for (const line of lines) {
      let processedLine = line;
      
      // Manejar comentarios multi-línea /* */
      if (processedLine.includes('/*')) {
        inMultiLineComment = true;
        const beforeComment = processedLine.split('/*')[0];
        if (beforeComment.trim()) {
          processedLine = beforeComment;
        } else {
          processedLine = '';
        }
      }
      
      if (inMultiLineComment && processedLine.includes('*/')) {
        inMultiLineComment = false;
        const afterComment = processedLine.split('*/')[1];
        processedLine = afterComment || '';
      }
      
      if (inMultiLineComment) {
        continue; // Saltar líneas dentro de comentarios multi-línea
      }
      
      // Remover comentarios de una sola línea
      if (processedLine.includes('--')) {
        processedLine = processedLine.split('--')[0];
      }
      
      if (processedLine.trim()) {
        cleanedLines.push(processedLine);
      }
    }
    
    const cleanedSql = cleanedLines.join('\n');
    
    // Dividir por punto y coma, pero solo si no está dentro de strings
    const statements: string[] = [];
    let currentStatement = '';
    let inString = false;
    let stringChar = '';
    
    for (let i = 0; i < cleanedSql.length; i++) {
      const char = cleanedSql[i];
      const nextChar = cleanedSql[i + 1];
      
      if (!inString && (char === "'" || char === '"')) {
        inString = true;
        stringChar = char;
        currentStatement += char;
      } else if (inString && char === stringChar && cleanedSql[i - 1] !== '\\') {
        inString = false;
        currentStatement += char;
      } else if (!inString && char === ';') {
        if (currentStatement.trim()) {
          statements.push(currentStatement.trim());
        }
        currentStatement = '';
      } else {
        currentStatement += char;
      }
    }
    
    // Agregar el último statement si no termina en punto y coma
    if (currentStatement.trim()) {
      statements.push(currentStatement.trim());
    }
    
    // Filtrar statements vacíos
    const validStatements = statements.filter(s => s.length > 0);

    // Ejecutar cada statement individualmente
    // Los comandos CONCURRENTLY deben ejecutarse fuera de transacciones
    for (let i = 0; i < validStatements.length; i++) {
      const statement = validStatements[i];
      const isConcurrent = statement.toUpperCase().includes('CONCURRENTLY');
      
      if (isConcurrent) {
        // Ejecutar fuera de transacción
        console.log(`   Ejecutando statement ${i + 1}/${validStatements.length} (CONCURRENTLY)...`);
        try {
          await client.query(statement);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          // Algunos errores son esperados
          if (
            !errorMessage.includes("does not exist") &&
            !errorMessage.includes("already exists")
          ) {
            throw error;
          }
        }
      } else {
        // Ejecutar en transacción para statements normales
        await client.query("BEGIN");
        try {
          await client.query(statement);
          await client.query("COMMIT");
        } catch (error) {
          await client.query("ROLLBACK");
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (
            !errorMessage.includes("does not exist") &&
            !errorMessage.includes("already exists")
          ) {
            throw error;
          }
        }
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✅ Migración completada exitosamente en ${duration}s`);

    // Verificar que el índice se creó correctamente
    console.log("\n🔍 Verificando índice HNSW...");
    const indexCheck = await client.query(`
      SELECT 
        indexname,
        indexdef
      FROM pg_indexes
      WHERE indexname = 'idx_chunks_embedding_hnsw'
    `);

    if (indexCheck.rows.length > 0) {
      console.log("✅ Índice HNSW encontrado:");
      const indexDef = indexCheck.rows[0].indexdef;
      const mMatch = indexDef.match(/m\s*=\s*(\d+)/);
      const efMatch = indexDef.match(/ef_construction\s*=\s*(\d+)/);

      if (mMatch) console.log(`   m = ${mMatch[1]}`);
      if (efMatch) console.log(`   ef_construction = ${efMatch[1]}`);
    } else {
      console.log("⚠️  Índice HNSW no encontrado (puede estar en construcción)");
    }

    // Verificar extensión pgvector
    const vectorCheck = await client.query(
      "SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'vector') as has_vector"
    );
    const hasVector = vectorCheck.rows[0].has_vector;
    console.log(`\n🔍 pgvector: ${hasVector ? "✅ Instalada" : "❌ No instalada"}`);

  } catch (error) {
    await client.query("ROLLBACK");
    console.error("\n❌ Error durante la migración:", error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Obtener nombre de migración de los argumentos
const migrationName = process.argv[2];

if (!migrationName) {
  console.error("❌ Error: Debes especificar el nombre de la migración");
  console.error("\nUso:");
  console.error("  npm run migrate -- 002_optimize_pgvector");
  console.error("  npm run migrate -- 001_rag_schema");
  process.exit(1);
}

runMigration(migrationName);
