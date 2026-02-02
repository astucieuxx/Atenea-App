# 🚂 Railway Setup - ATENEA RAG

Guía práctica para desplegar el sistema RAG en Railway.

## 📋 Prerrequisitos

1. **Cuenta de Railway** (https://railway.app)
2. **Postgres con pgvector** (Railway Postgres + extensión)
3. **API Key de OpenAI** (o Cohere) para embeddings

## 🔧 Paso 1: Crear Base de Datos Postgres

```bash
# En Railway Dashboard:
# 1. New Project → Add Database → Postgres
# 2. Una vez creada, haz clic en la DB → Variables
# 3. Copia DATABASE_URL (se usará más adelante)
```

## 🔧 Paso 2: Habilitar pgvector

Railway Postgres no incluye pgvector por defecto. Opciones:

### Opción A: Usar Postgres con pgvector preinstalado

Railway tiene un template para esto, o puedes usar un servicio externo como:
- **Neon** (https://neon.tech) - Postgres con pgvector incluido
- **Supabase** (https://supabase.com) - Postgres con pgvector

### Opción B: Instalar pgvector manualmente (si Railway lo permite)

```sql
-- Conectarse a la BD y ejecutar:
CREATE EXTENSION IF NOT EXISTS vector;
```

**Nota**: Railway Postgres estándar puede no permitir instalar extensiones. Verifica en la documentación de Railway o usa Neon/Supabase.

## 🔧 Paso 3: Crear Esquema

Una vez que tengas acceso a la BD con pgvector:

```bash
# Opción 1: Desde tu máquina local
psql $DATABASE_URL -f migrations/001_rag_schema.sql

# Opción 2: Desde Railway CLI
railway run psql $DATABASE_URL -f migrations/001_rag_schema.sql

# Opción 3: Desde Railway Dashboard → Database → Query
# Copia y pega el contenido de migrations/001_rag_schema.sql
```

## 🔧 Paso 4: Configurar Variables de Entorno

En Railway Dashboard → Tu Proyecto → Variables:

```env
# Base de datos (automático si usas Railway Postgres)
DATABASE_URL=postgresql://user:pass@host:port/db

# Embeddings (OpenAI - recomendado)
OPENAI_API_KEY=sk-...
EMBEDDING_PROVIDER=openai
EMBEDDING_MODEL=text-embedding-3-small

# O Cohere (alternativa)
# EMBEDDING_API_KEY=...
# EMBEDDING_PROVIDER=cohere
# EMBEDDING_MODEL=embed-multilingual-v3.0

# Configuración de ingesta (opcional)
INGESTION_BATCH_SIZE=10
EMBEDDING_BATCH_SIZE=50
```

## 🔧 Paso 5: Desplegar Aplicación

### Opción A: Desde GitHub (recomendado)

1. Conecta tu repo a Railway
2. Railway detectará automáticamente el proyecto
3. Asegúrate de que el build script esté configurado

### Opción B: Desde CLI

```bash
railway login
railway init
railway up
```

## 🔧 Paso 6: Ingesta de Datos

**IMPORTANTE**: La ingesta debe ejecutarse **una vez** antes de usar el RAG.

### Opción A: Ingesta Local (recomendado para primera vez)

```bash
# Desde tu máquina local (conectado a Railway DB)
export DATABASE_URL="postgresql://..." # De Railway
export OPENAI_API_KEY="sk-..."
tsx script/ingest-rag.ts
```

**Ventajas**:
- Puedes monitorear el progreso
- No consume recursos de Railway
- Puedes pausar/reanudar fácilmente

### Opción B: Ingesta en Railway (para producción)

```bash
# Usar Railway CLI para ejecutar el script
railway run tsx script/ingest-rag.ts
```

**Consideraciones**:
- Railway puede tener timeouts en procesos largos
- Usa un servicio separado o un "one-off" container
- Monitorea el uso de recursos

### Opción C: Ingesta Incremental

Para 300k tesis, considera dividir la ingesta:

```bash
# Ingesta por lotes (ejemplo con 50k tesis por vez)
# Modifica el script para procesar solo un rango
tsx script/ingest-rag.ts --start 0 --end 50000
tsx script/ingest-rag.ts --start 50000 --end 100000
# ... etc
```

## 🔧 Paso 7: Verificar Instalación

```bash
# Verificar estado de ingesta
railway run tsx -e "
  import { checkIngestionStatus } from './server/rag/ingestion';
  const status = await checkIngestionStatus();
  console.log(status);
"
```

O desde la aplicación:

```bash
curl https://tu-app.railway.app/api/ask \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"question": "¿Qué es el amparo directo?"}'
```

## 📊 Monitoreo y Optimización

### Índices Vectoriales

El esquema crea un índice HNSW. Para optimizar con 300k+ vectores:

```sql
-- Reindexar periódicamente (ejecutar durante mantenimiento)
REINDEX INDEX idx_chunks_embedding_hnsw;

-- Analizar estadísticas
ANALYZE tesis_chunks;
```

### Connection Pooling

Railway puede tener límites de conexiones. Ajusta en `server/rag/database.ts`:

```typescript
pool = new Pool({
  connectionString,
  max: 10, // Reducir si hay problemas
  idleTimeoutMillis: 30000,
});
```

### Rate Limits de OpenAI

Para 300k tesis, la ingesta puede tardar horas. Considera:

1. **Batch size más grande** (si tu plan lo permite)
2. **Pausas entre batches** (ya implementado)
3. **Retry logic** (ya implementado)
4. **Usar Cohere** (puede tener límites más generosos)

## 🚨 Troubleshooting

### Error: "extension vector does not exist"

**Solución**: La BD no tiene pgvector. Usa Neon o Supabase, o instala manualmente.

### Error: "connection timeout"

**Solución**: 
- Reduce `max` en el connection pool
- Verifica que Railway DB esté accesible
- Usa connection pooling externo (PgBouncer)

### Error: "rate limit exceeded" (OpenAI)

**Solución**:
- Reduce `EMBEDDING_BATCH_SIZE`
- Aumenta pausas entre batches
- Usa un plan de OpenAI con más límites

### Ingesta muy lenta

**Optimizaciones**:
- Aumenta `INGESTION_BATCH_SIZE` (más paralelismo)
- Usa embeddings más rápidos (text-embedding-3-small es rápido)
- Considera ingesta incremental por materias

## 📝 Checklist de Producción

- [ ] Postgres con pgvector habilitado
- [ ] Esquema creado (`001_rag_schema.sql`)
- [ ] Variables de entorno configuradas
- [ ] Ingesta completada (verificar con `checkIngestionStatus`)
- [ ] Endpoint `/api/ask` funcionando
- [ ] Índices vectoriales creados
- [ ] Connection pooling configurado
- [ ] Monitoreo de recursos activo

## 🔄 Actualizaciones Incrementales

Para agregar nuevas tesis sin re-ingestar todo:

```typescript
// Script futuro: ingest-incremental.ts
// Solo procesa tesis nuevas (comparar IDs)
```

## 💰 Estimación de Costos

Para 300k tesis con OpenAI text-embedding-3-small:

- **Embeddings**: ~$30-50 (depende de longitud de texto)
- **Railway Postgres**: ~$5-20/mes (depende del plan)
- **Railway App**: ~$5-10/mes (depende del uso)

**Total estimado**: ~$40-80/mes para setup completo.

---

## 📚 Recursos Adicionales

- [Railway Docs](https://docs.railway.app)
- [pgvector Docs](https://github.com/pgvector/pgvector)
- [OpenAI Embeddings](https://platform.openai.com/docs/guides/embeddings)
