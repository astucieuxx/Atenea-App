# 🚀 Optimización de pgvector para Escalabilidad

Este documento describe las optimizaciones aplicadas a pgvector para mejorar el rendimiento con datasets grandes (300k+ vectores) y preparar para crecimiento futuro.

## 📋 Cambios Implementados

### 1. Índice HNSW Optimizado

**Antes:**
- `m = 16` (conexiones por nodo)
- `ef_construction = 64` (precisión durante construcción)

**Después:**
- `m = 32` (más conexiones = mejor calidad)
- `ef_construction = 200` (mayor precisión durante construcción)

**Impacto:**
- ✅ Búsquedas más rápidas y precisas
- ✅ Mejor escalabilidad para 500k+ vectores
- ⚠️ Más memoria (~30-40% más)
- ⚠️ Construcción más lenta (~2x)

### 2. Búsqueda Vectorial Optimizada

**Mejoras:**
- Uso de `ef_search` para controlar precisión/velocidad
- Query optimizada para mejor uso del índice
- Filtrado en memoria después de ordenamiento

**Parámetros:**
- `ef_search = 64` (default, balance óptimo)
- Ajustable según necesidades (40-100 recomendado)

### 3. Índices Compuestos

Nuevos índices para queries comunes:
- `idx_chunks_embedding_type`: Filtrado por tipo de chunk
- `idx_chunks_embedding_tesis_id`: Búsqueda por tesis específica

## 🔧 Aplicar Optimizaciones

### Paso 1: Ejecutar Migración

```bash
# Opción 1: Desde línea de comandos
psql $DATABASE_URL -f migrations/002_optimize_pgvector.sql

# Opción 2: Desde Railway/Supabase dashboard
# Copiar y pegar el contenido de migrations/002_optimize_pgvector.sql
```

**⚠️ Nota:** La reconstrucción del índice puede tardar 10-30 minutos dependiendo del tamaño de la base de datos. Ejecutar durante mantenimiento.

### Paso 2: Verificar Optimizaciones

```bash
npm run maintain:pgvector
```

Esto mostrará:
- Tamaño de índices
- Estadísticas de uso
- Configuración HNSW actual

## 📊 Mantenimiento Periódico

### Semanal (Recomendado)

```bash
npm run maintain:pgvector
```

Ejecuta `ANALYZE` para actualizar estadísticas del query planner.

### Mensual o Después de Ingesta Masiva

```bash
npm run maintain:pgvector -- --reindex
```

Reconstruye el índice HNSW (solo si el rendimiento ha degradado).

## ⚙️ Configuración de PostgreSQL (Opcional)

Para máximo rendimiento, ajusta estas configuraciones en `postgresql.conf`:

```ini
# Memoria para operaciones de índice
maintenance_work_mem = '1GB'  # Para construcción de índices grandes
work_mem = '256MB'             # Para operaciones de ordenamiento

# Para búsquedas vectoriales rápidas
shared_buffers = '25% of RAM'  # Cache de PostgreSQL
effective_cache_size = '50% of RAM'  # Estimación para query planner

# Para datasets grandes (SSD)
random_page_cost = 1.1  # Default es 4.0 para HDD
effective_io_concurrency = 200  # Para SSD
```

**Nota:** En servicios gestionados (Supabase, Neon, Railway), estas configuraciones pueden estar limitadas.

## 🎯 Ajuste de Parámetros de Búsqueda

### ef_search

Controla el balance precisión/velocidad en búsquedas HNSW:

```typescript
// Más rápido, menos preciso
await vectorSearch(embedding, 10, 0.5, 40);

// Balance óptimo (default)
await vectorSearch(embedding, 10, 0.5, 64);

// Más preciso, más lento
await vectorSearch(embedding, 10, 0.5, 100);
```

**Recomendaciones:**
- **40-60**: Búsquedas rápidas, buena precisión
- **64-80**: Balance óptimo (default)
- **80-100**: Máxima precisión, útil para queries críticas

### minSimilarity

Filtro de relevancia mínima:

```typescript
// Más estricto (solo resultados muy relevantes)
await vectorSearch(embedding, 10, 0.7);

// Balance (default)
await vectorSearch(embedding, 10, 0.5);

// Más permisivo (más resultados)
await vectorSearch(embedding, 10, 0.3);
```

## 📈 Monitoreo de Rendimiento

### Ver Tamaño de Índices

```sql
SELECT 
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_indexes
WHERE tablename = 'tesis_chunks';
```

### Ver Estadísticas de Uso

```sql
SELECT 
  indexrelname,
  idx_scan as scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE indexrelname = 'idx_chunks_embedding_hnsw';
```

### Ver Rendimiento de Queries

```sql
EXPLAIN ANALYZE
SELECT 
  c.id,
  1 - (c.embedding <=> $1::vector) AS similarity
FROM tesis_chunks c
WHERE c.embedding IS NOT NULL
ORDER BY c.embedding <=> $1::vector
LIMIT 10;
```

## 🚨 Troubleshooting

### Búsquedas Lentas

1. **Verificar ef_search:**
   ```sql
   SHOW hnsw.ef_search;
   ```
   Aumentar si es muy bajo (<40)

2. **Verificar estadísticas:**
   ```bash
   npm run maintain:pgvector
   ```

3. **Reindexar si es necesario:**
   ```bash
   npm run maintain:pgvector -- --reindex
   ```

### Índice Muy Grande

Si el índice ocupa demasiada memoria:
- Reducir `m` a 24 (trade-off calidad/memoria)
- Considerar particionamiento si >1M vectores

### Búsquedas Imprecisas

1. Aumentar `ef_search` (80-100)
2. Verificar que `ef_construction` sea suficiente (200+)
3. Reindexar si el índice es antiguo

## 📚 Referencias

- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [HNSW Algorithm](https://arxiv.org/abs/1603.09320)
- [PostgreSQL Performance Tuning](https://www.postgresql.org/docs/current/performance-tips.html)

## 🔄 Próximos Pasos

1. ✅ Optimización de índice HNSW
2. ✅ Búsqueda optimizada con ef_search
3. ✅ Script de mantenimiento
4. ⏳ Monitoreo de rendimiento en producción
5. ⏳ Ajuste fino según métricas reales
