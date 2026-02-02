# 🚀 Próximos Pasos - ATENEA RAG

Plan de acción para poner en funcionamiento el sistema RAG.

## 📋 Checklist de Implementación

### Fase 1: Setup Inicial (30 min)

- [ ] **1.1. Configurar Base de Datos**
  ```bash
  # Opción A: Usar Neon (recomendado - pgvector incluido)
  # https://neon.tech → Crear proyecto → Copiar DATABASE_URL
  
  # Opción B: Usar Supabase (pgvector incluido)
  # https://supabase.com → Crear proyecto → Copiar DATABASE_URL
  
  # Opción C: Railway Postgres (puede requerir configuración adicional)
  ```

- [ ] **1.2. Crear Esquema en BD**
  ```bash
  # Ejecutar migración SQL
  psql $DATABASE_URL -f migrations/001_rag_schema.sql
  
  # O desde Railway CLI
  railway run psql $DATABASE_URL -f migrations/001_rag_schema.sql
  ```

- [ ] **1.3. Configurar Variables de Entorno**
  ```bash
  # Crear archivo .env (o configurar en Railway)
  DATABASE_URL=postgresql://...
  OPENAI_API_KEY=sk-...
  EMBEDDING_PROVIDER=openai
  EMBEDDING_MODEL=text-embedding-3-small
  ```

- [ ] **1.4. Verificar Conexión**
  ```bash
  npm run rag:status
  ```

### Fase 2: Ingesta de Datos (2-4 horas para 300k tesis)

- [ ] **2.1. Probar con Subset Pequeño**
  ```bash
  # Crear archivo de prueba con 100 tesis
  # Modificar script/ingest-rag.ts temporalmente para limitar
  npm run rag:ingest:test
  ```

- [ ] **2.2. Verificar Calidad de Embeddings**
  ```bash
  # Revisar que los chunks se crearon correctamente
  npm run rag:status
  ```

- [ ] **2.3. Ingesta Completa**
  ```bash
  # Para producción, ejecutar en background o servidor dedicado
  npm run rag:ingest
  
  # Monitorear progreso
  npm run rag:status
  ```

### Fase 3: Integración y Pruebas (1-2 horas)

- [ ] **3.1. Probar Endpoint /ask**
  ```bash
  # Probar localmente
  curl -X POST http://localhost:5000/api/ask \
    -H "Content-Type: application/json" \
    -d '{"question": "¿Cuándo procede el amparo directo?"}'
  ```

- [ ] **3.2. Integrar con Frontend**
  - Crear componente de búsqueda RAG
  - Agregar página/endpoint en la UI
  - Mostrar respuestas con citas

- [ ] **3.3. Pruebas de Carga**
  - Probar con múltiples queries simultáneas
  - Verificar tiempos de respuesta
  - Ajustar configuración si es necesario

### Fase 4: Optimización (Opcional)

- [ ] **4.1. Ajustar Parámetros de Búsqueda**
  - `minSimilarity` en retrieval
  - `vectorWeight` vs `textWeight`
  - `maxResults` y `finalLimit`

- [ ] **4.2. Monitoreo**
  - Agregar logging de queries
  - Métricas de rendimiento
  - Alertas de errores

- [ ] **4.3. Caching (Opcional)**
  - Cachear embeddings de queries frecuentes
  - Cachear respuestas para preguntas similares

## 🛠️ Scripts Útiles

Agregar a `package.json`:

```json
{
  "scripts": {
    "rag:status": "tsx -e \"import { checkIngestionStatus } from './server/rag/ingestion.js'; const s = await checkIngestionStatus(); console.log(s);\"",
    "rag:ingest": "tsx script/ingest-rag.ts",
    "rag:ingest:test": "tsx script/ingest-rag-test.ts",
    "rag:test": "tsx script/test-rag.ts"
  }
}
```

## 🧪 Pruebas Recomendadas

### Test 1: Verificar Esquema
```sql
-- Ejecutar en psql
SELECT COUNT(*) FROM tesis;
SELECT COUNT(*) FROM tesis_chunks;
SELECT COUNT(*) FROM tesis_chunks WHERE embedding IS NOT NULL;
```

### Test 2: Búsqueda Vectorial
```typescript
// test-vector-search.ts
import { generateEmbedding } from './server/rag/embeddings';
import { vectorSearch } from './server/rag/database';

const query = "amparo directo";
const embedding = await generateEmbedding(query);
const results = await vectorSearch(embedding, 5);
console.log(results);
```

### Test 3: Endpoint Completo
```bash
# Preguntas de prueba
curl -X POST http://localhost:5000/api/ask \
  -d '{"question": "¿Qué es el amparo directo?"}'

curl -X POST http://localhost:5000/api/ask \
  -d '{"question": "¿Cuándo procede la suspensión en amparo?"}'

curl -X POST http://localhost:5000/api/ask \
  -d '{"question": "¿Qué es un tema completamente aleatorio que no existe?"}'
```

## 🎯 Decisiones Pendientes

1. **¿Usar OpenAI o Cohere?**
   - OpenAI: Más rápido, mejor soporte
   - Cohere: Mejor para español, puede ser más económico

2. **¿Integrar RAG con sistema actual?**
   - Opción A: Reemplazar sistema de scoring actual
   - Opción B: Usar RAG como complemento
   - Opción C: Usar ambos (RAG para búsqueda, scoring para ranking)

3. **¿Frontend para /ask?**
   - Agregar nueva página de búsqueda
   - Integrar en página existente
   - Modal/popup de búsqueda rápida

## 📊 Métricas a Monitorear

- Tiempo de respuesta promedio de `/api/ask`
- Tasa de éxito de búsquedas (con evidencia vs sin evidencia)
- Calidad de respuestas (feedback de usuarios)
- Costo de embeddings (si usas API externa)
- Uso de recursos de BD

## 🚨 Problemas Comunes y Soluciones

### Error: "extension vector does not exist"
**Solución**: Usa Neon o Supabase, o instala pgvector manualmente

### Ingesta muy lenta
**Solución**: 
- Aumenta `INGESTION_BATCH_SIZE`
- Usa embeddings más rápidos (text-embedding-3-small)
- Considera ingesta incremental

### Respuestas sin evidencia
**Solución**: 
- Ajusta `minSimilarity` (bajar a 0.3-0.4)
- Verifica que la ingesta se completó
- Revisa calidad de embeddings

### Timeout en Railway
**Solución**:
- Usa ingesta local conectada a Railway DB
- O ejecuta ingesta en batches separados

## 🎉 Siguiente Paso Inmediato

**Recomendación**: Empezar con Fase 1 (Setup Inicial)

1. Crear cuenta en Neon (gratis, pgvector incluido)
2. Ejecutar migración SQL
3. Configurar variables de entorno
4. Probar con 10-20 tesis primero

¿Quieres que te ayude con alguno de estos pasos específicos?
