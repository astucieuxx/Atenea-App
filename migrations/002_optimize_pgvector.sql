-- ============================================================================
-- MIGRACIÓN 002: Optimización de pgvector para escalabilidad
-- ============================================================================
-- 
-- Esta migración optimiza los índices HNSW para mejor rendimiento
-- con datasets grandes (300k+ vectores) y crecimiento futuro.
--
-- Cambios:
-- 1. Aumenta parámetros HNSW para mejor calidad/prestaciones
-- 2. Agrega índices compuestos para queries más eficientes
-- 3. Optimiza configuración para búsquedas rápidas
-- ============================================================================

-- ============================================================================
-- PASO 1: Eliminar índice HNSW antiguo (si existe)
-- ============================================================================
-- Nota: Esto puede tardar si hay muchos vectores. Ejecutar durante mantenimiento.
-- Usamos CONCURRENTLY para no bloquear la tabla durante la eliminación
DROP INDEX CONCURRENTLY IF EXISTS idx_chunks_embedding_hnsw;

-- ============================================================================
-- PASO 2: Crear índice HNSW optimizado
-- ============================================================================
-- Parámetros optimizados para escalabilidad:
-- - m=32: Más conexiones por nodo = mejor calidad, más memoria (recomendado para 300k+)
-- - ef_construction=200: Mayor precisión durante construcción = mejor índice
-- 
-- Trade-offs:
-- - Más memoria (~30-40% más que m=16)
-- - Construcción más lenta (~2x más lento)
-- - Búsquedas más rápidas y precisas
--
-- NOTA: CONCURRENTLY permite que la tabla siga siendo accesible durante la construcción
-- pero requiere que no haya transacciones activas. Si falla, ejecutar sin CONCURRENTLY.
CREATE INDEX CONCURRENTLY idx_chunks_embedding_hnsw 
ON tesis_chunks 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 32, ef_construction = 200);

-- Comentario explicativo
COMMENT ON INDEX idx_chunks_embedding_hnsw IS 
'Índice HNSW optimizado para escalabilidad. m=32, ef_construction=200 para mejor calidad/prestaciones con 300k+ vectores. Usar ef_search en queries para controlar precisión/velocidad.';

-- ============================================================================
-- PASO 3: Índices compuestos para queries comunes
-- ============================================================================

-- Índice compuesto para búsqueda vectorial con filtro por tipo
-- Útil cuando se filtra por chunk_type (title, abstract, body)
CREATE INDEX IF NOT EXISTS idx_chunks_embedding_type 
ON tesis_chunks (chunk_type) 
WHERE embedding IS NOT NULL;

-- Índice compuesto para búsqueda vectorial con filtro por tesis_id
-- Útil para recuperar todos los chunks de una tesis específica
CREATE INDEX IF NOT EXISTS idx_chunks_embedding_tesis_id 
ON tesis_chunks (tesis_id) 
WHERE embedding IS NOT NULL;

-- ============================================================================
-- PASO 4: Optimizar estadísticas de PostgreSQL
-- ============================================================================
-- Actualizar estadísticas para que el query planner tome mejores decisiones
ANALYZE tesis_chunks;

-- ============================================================================
-- PASO 5: Configuración recomendada de PostgreSQL (comentarios)
-- ============================================================================
-- Estas configuraciones deben ajustarse en postgresql.conf o como variables de entorno:
--
-- # Memoria para operaciones de índice
-- maintenance_work_mem = '1GB'  # Para construcción de índices grandes
-- work_mem = '256MB'             # Para operaciones de ordenamiento
-- 
-- # Para búsquedas vectoriales rápidas
-- shared_buffers = '25% of RAM'  # Cache de PostgreSQL
-- effective_cache_size = '50% of RAM'  # Estimación para query planner
--
-- # Para datasets grandes
-- random_page_cost = 1.1  # Si usas SSD (default es 4.0 para HDD)
-- effective_io_concurrency = 200  # Para SSD

-- ============================================================================
-- NOTAS DE RENDIMIENTO
-- ============================================================================
-- 
-- Búsquedas optimizadas:
-- - Usar ef_search=40-100 en queries para balance precisión/velocidad
-- - ef_search más alto = más preciso pero más lento
-- - ef_search más bajo = más rápido pero menos preciso
--
-- Ejemplo de query optimizada:
-- SET LOCAL hnsw.ef_search = 64;
-- SELECT ... ORDER BY embedding <=> $1 LIMIT 10;
--
-- Mantenimiento periódico:
-- - REINDEX INDEX idx_chunks_embedding_hnsw;  (cada 6 meses o después de muchas inserciones)
-- - ANALYZE tesis_chunks;  (semanal o después de ingesta masiva)
--
-- Monitoreo:
-- - Ver tamaño del índice: SELECT pg_size_pretty(pg_relation_size('idx_chunks_embedding_hnsw'));
-- - Ver estadísticas: SELECT * FROM pg_stat_user_indexes WHERE indexrelname = 'idx_chunks_embedding_hnsw';
