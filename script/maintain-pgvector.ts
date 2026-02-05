#!/usr/bin/env tsx
/**
 * Script de Mantenimiento para pgvector
 * 
 * Este script realiza tareas de mantenimiento periódico para optimizar
 * el rendimiento de búsquedas vectoriales:
 * 
 * 1. ANALYZE: Actualiza estadísticas para el query planner
 * 2. REINDEX: Reconstruye índices HNSW (opcional, solo si es necesario)
 * 3. Estadísticas: Muestra información sobre índices y rendimiento
 * 
 * Uso:
 *   npm run maintain:pgvector          # Solo ANALYZE (rápido, seguro)
 *   npm run maintain:pgvector --reindex # Incluye REINDEX (lento, solo en mantenimiento)
 */

import pg from "pg";
const { Pool } = pg;

interface IndexStats {
  indexName: string;
  indexSize: string;
  indexScans: number;
  tuplesRead: number;
  tuplesFetched: number;
}

async function getIndexStats(pool: pg.Pool): Promise<IndexStats[]> {
  const result = await pool.query(`
    SELECT 
      indexrelname as index_name,
      pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
      idx_scan as index_scans,
      idx_tup_read as tuples_read,
      idx_tup_fetch as tuples_fetched
    FROM pg_stat_user_indexes
    WHERE indexrelname LIKE '%embedding%' OR indexrelname LIKE '%chunks%'
    ORDER BY pg_relation_size(indexrelid) DESC
  `);

  return result.rows.map((row) => ({
    indexName: row.index_name,
    indexSize: row.index_size,
    indexScans: parseInt(row.index_scans) || 0,
    tuplesRead: parseInt(row.tuples_read) || 0,
    tuplesFetched: parseInt(row.tuples_fetched) || 0,
  }));
}

async function getTableStats(pool: pg.Pool) {
  const result = await pool.query(`
    SELECT 
      schemaname,
      tablename,
      pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
      pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
      pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as indexes_size,
      n_live_tup as row_count
    FROM pg_stat_user_tables
    WHERE tablename IN ('tesis', 'tesis_chunks')
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
  `);

  return result.rows;
}

async function main() {
  const shouldReindex = process.argv.includes("--reindex");
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error("❌ Error: DATABASE_URL environment variable is required");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    max: 1, // Solo una conexión para mantenimiento
  });

  try {
    console.log("🔧 Mantenimiento de pgvector\n");

    // 1. Mostrar estadísticas actuales
    console.log("📊 Estadísticas Actuales:\n");
    
    const tableStats = await getTableStats(pool);
    console.log("📋 Tablas:");
    tableStats.forEach((table) => {
      console.log(`   ${table.tablename}:`);
      console.log(`      Tamaño total: ${table.total_size}`);
      console.log(`      Tamaño tabla: ${table.table_size}`);
      console.log(`      Tamaño índices: ${table.indexes_size}`);
      console.log(`      Filas: ${parseInt(table.row_count || 0).toLocaleString()}`);
    });

    const indexStats = await getIndexStats(pool);
    console.log("\n📇 Índices:");
    indexStats.forEach((index) => {
      console.log(`   ${index.indexName}:`);
      console.log(`      Tamaño: ${index.indexSize}`);
      console.log(`      Escaneos: ${index.indexScans.toLocaleString()}`);
      console.log(`      Tuplas leídas: ${index.tuplesRead.toLocaleString()}`);
      console.log(`      Tuplas obtenidas: ${index.tuplesFetched.toLocaleString()}`);
    });

    // 2. ANALYZE (siempre recomendado)
    console.log("\n🔄 Ejecutando ANALYZE...");
    const analyzeStart = Date.now();
    await pool.query("ANALYZE tesis_chunks");
    await pool.query("ANALYZE tesis");
    const analyzeTime = ((Date.now() - analyzeStart) / 1000).toFixed(2);
    console.log(`   ✅ ANALYZE completado en ${analyzeTime}s`);

    // 3. REINDEX (solo si se solicita explícitamente)
    if (shouldReindex) {
      console.log("\n⚠️  REINDEX puede tardar varios minutos...");
      console.log("   Reconstruyendo índice HNSW...");
      
      const reindexStart = Date.now();
      await pool.query("REINDEX INDEX CONCURRENTLY idx_chunks_embedding_hnsw");
      const reindexTime = ((Date.now() - reindexStart) / 1000).toFixed(2);
      console.log(`   ✅ REINDEX completado en ${reindexTime}s`);
    } else {
      console.log("\n💡 Tip: Ejecuta con --reindex para reconstruir índices");
      console.log("   (Solo necesario si el rendimiento ha degradado)");
    }

    // 4. Verificar extensión pgvector
    const vectorCheck = await pool.query(
      "SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'vector') as has_vector"
    );
    const hasVector = vectorCheck.rows[0].has_vector;
    console.log(`\n🔍 pgvector: ${hasVector ? "✅ Instalada" : "❌ No instalada"}`);

    // 5. Verificar configuración HNSW
    const hnswConfig = await pool.query(`
      SELECT 
        indexname,
        indexdef
      FROM pg_indexes
      WHERE indexname = 'idx_chunks_embedding_hnsw'
    `);

    if (hnswConfig.rows.length > 0) {
      console.log("\n⚙️  Configuración HNSW:");
      const indexDef = hnswConfig.rows[0].indexdef;
      const mMatch = indexDef.match(/m\s*=\s*(\d+)/);
      const efMatch = indexDef.match(/ef_construction\s*=\s*(\d+)/);
      
      if (mMatch) console.log(`   m = ${mMatch[1]}`);
      if (efMatch) console.log(`   ef_construction = ${efMatch[1]}`);
    }

    console.log("\n✅ Mantenimiento completado");

  } catch (error) {
    console.error("❌ Error durante mantenimiento:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
