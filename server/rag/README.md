# ATENEA RAG - Sistema de Búsqueda Jurídica

Sistema RAG (Retrieval-Augmented Generation) para búsqueda de criterios/tesis jurídicas con ~300k documentos.

## 🏗️ Arquitectura

```
┌─────────────┐
│   JSON      │ → Ingesta → Chunking → Embeddings → Postgres + pgvector
│  (300k)     │
└─────────────┘

┌─────────────┐
│   Query     │ → Embedding → Vector Search + Full-Text → LLM → Respuesta
│  (español)  │
└─────────────┘
```

## 📁 Estructura de Módulos

```
server/rag/
├── embeddings.ts    # Generación de embeddings (OpenAI/Cohere)
├── chunking.ts      # División de textos en chunks optimizados
├── database.ts      # Operaciones BD (vector search, full-text)
├── ingestion.ts     # Pipeline completo de ingesta
├── retrieval.ts     # Recuperación de tesis relevantes
└── ask.ts          # Endpoint /ask con generación de respuestas
```

## 🔄 Flujo de Ingesta

1. **Cargar JSON**: `loadTesisFromJSON()` → Array de `Tesis`
2. **Chunking**: `chunkTesis()` → Dividir en chunks de ~600 tokens
3. **Embeddings**: `generateEmbeddingsBatch()` → Vectores de 1536 dims
4. **Insertar BD**: `insertTesis()` + `insertChunk()` → Postgres

**Ejecutar ingesta**:
```bash
tsx script/ingest-rag.ts
```

## 🔍 Flujo de Búsqueda (/ask)

1. **Query embedding**: Convertir pregunta a vector
2. **Hybrid search**: 
   - Vector search (similitud coseno)
   - Full-text search (Postgres tsvector)
   - RRF (Reciprocal Rank Fusion)
3. **Retrieval**: Top 5 tesis más relevantes
4. **LLM generation**: Respuesta citando tesis (ID + rubro)
5. **Response**: JSON con respuesta + tesis usadas

**Ejemplo de uso**:
```bash
curl -X POST http://localhost:5000/api/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "¿Cuándo procede el amparo directo?"}'
```

## 🗄️ Esquema de Base de Datos

### Tabla: `tesis`
- Metadata completa de cada tesis
- Sin embeddings (se almacenan en chunks)
- Índices full-text en title, abstract, materias

### Tabla: `tesis_chunks`
- Chunks de texto con embeddings vectoriales
- Índice HNSW para búsqueda vectorial rápida
- Índice GIN para búsqueda full-text

**Ver esquema completo**: `migrations/001_rag_schema.sql`

## ⚙️ Configuración

### Variables de Entorno

```env
# Base de datos
DATABASE_URL=postgresql://...

# Embeddings
OPENAI_API_KEY=sk-...
EMBEDDING_PROVIDER=openai  # o "cohere"
EMBEDDING_MODEL=text-embedding-3-small

# Ingesta (opcional)
INGESTION_BATCH_SIZE=10
EMBEDDING_BATCH_SIZE=50
```

### Configuración de Chunking

```typescript
{
  chunkSize: 600,        // tokens por chunk
  chunkOverlap: 75,      // overlap entre chunks
  respectParagraphs: true // no cortar párrafos
}
```

### Configuración de Retrieval

```typescript
{
  maxResults: 20,        // chunks a recuperar
  finalLimit: 5,         // tesis únicas a retornar
  minSimilarity: 0.5,    // relevancia mínima
  vectorWeight: 0.7,     // peso búsqueda vectorial
  textWeight: 0.3        // peso búsqueda full-text
}
```

## 🎯 Características Clave

### ✅ Búsqueda Híbrida
- **Vectorial**: Captura similitud semántica
- **Full-text**: Captura coincidencias exactas de términos
- **RRF**: Combina ambos rankings inteligentemente

### ✅ Chunking Inteligente
- Respeta párrafos y estructura jurídica
- Overlap para preservar contexto
- Separación de título, abstract y cuerpo

### ✅ Sin Alucinaciones
- Respuestas basadas ÚNICAMENTE en tesis recuperadas
- Citas obligatorias (ID + rubro)
- Indica explícitamente si no hay evidencia

### ✅ Escalable
- HNSW index para 300k+ vectores
- Connection pooling
- Batch processing en ingesta

## 📊 Rendimiento Esperado

- **Ingesta**: ~100-200 tesis/minuto (depende de API de embeddings)
- **Búsqueda**: <500ms para query típica
- **Generación**: 2-5s (depende de LLM)

## 🚀 Próximos Pasos

1. **Ejecutar migración SQL**: `migrations/001_rag_schema.sql`
2. **Configurar variables de entorno**
3. **Ejecutar ingesta**: `tsx script/ingest-rag.ts`
4. **Probar endpoint**: `POST /api/ask`

Ver `RAILWAY_RAG_SETUP.md` para guía completa de despliegue.
