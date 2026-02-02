# 🚀 Setup Supabase - ATENEA RAG

Guía paso a paso para configurar Supabase con pgvector.

## 📋 Paso 1: Crear/Seleccionar Proyecto

1. Ve a https://supabase.com/dashboard
2. Si ya tienes un proyecto:
   - Haz clic en tu proyecto existente
   - Ve al paso 2
3. Si necesitas crear uno nuevo:
   - Click en "New Project"
   - Nombre: `atenea-rag` (o el que prefieras)
   - Database Password: **Guárdala bien, la necesitarás**
   - Region: Elige la más cercana (México → `us-east-1` o `us-west-1`)
   - Click "Create new project"
   - Espera 2-3 minutos mientras se crea

## 📋 Paso 2: Obtener Connection String

1. En tu proyecto de Supabase, ve a **Settings** (⚙️) → **Database**
2. Busca la sección **Connection string**
3. Selecciona **URI** (no Session mode)
4. Copia la connection string, se ve así:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   ```
5. **Reemplaza `[YOUR-PASSWORD]`** con la contraseña que guardaste
6. La URL final debería verse así:
   ```
   postgresql://postgres:tu_password_aqui@db.xxxxx.supabase.co:5432/postgres
   ```

## 📋 Paso 3: Habilitar pgvector

**¡Buenas noticias!** Supabase ya tiene pgvector instalado, solo necesitas habilitarlo:

1. Ve a **SQL Editor** en el menú lateral
2. Click en **New query**
3. Copia y pega esto:

```sql
-- Habilitar extensión pgvector
CREATE EXTENSION IF NOT EXISTS vector;
```

4. Click **Run** (o Ctrl+Enter)
5. Deberías ver: "Success. No rows returned"

## 📋 Paso 4: Ejecutar Migración del Esquema

1. En el mismo **SQL Editor**, abre una nueva query
2. Abre el archivo `migrations/001_rag_schema.sql` en tu editor
3. Copia **todo el contenido** del archivo
4. Pégalo en el SQL Editor de Supabase
5. Click **Run**
6. Deberías ver varios mensajes de éxito:
   - "CREATE TABLE"
   - "CREATE INDEX"
   - "CREATE FUNCTION"
   - etc.

**Nota**: Si ves algún error sobre "already exists", está bien, significa que ya estaba creado.

## 📋 Paso 5: Verificar que Todo Funcionó

En el SQL Editor, ejecuta esta query:

```sql
-- Verificar extensión
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Verificar tablas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('tesis', 'tesis_chunks', 'ingestion_log');

-- Verificar índices
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'tesis_chunks' 
AND indexname = 'idx_chunks_embedding_hnsw';
```

Deberías ver:
- ✅ 1 fila en la primera query (vector extension)
- ✅ 3 filas en la segunda query (las 3 tablas)
- ✅ 1 fila en la tercera query (índice HNSW)

## 📋 Paso 6: Configurar Variables de Entorno

Ahora configura las variables en tu proyecto local:

### Opción A: Archivo .env (recomendado para desarrollo)

Crea un archivo `.env` en la raíz del proyecto:

```env
# Supabase Database
DATABASE_URL=postgresql://postgres:TU_PASSWORD@db.xxxxx.supabase.co:5432/postgres

# OpenAI (para embeddings)
OPENAI_API_KEY=sk-tu-api-key-aqui

# Configuración de embeddings (opcional)
EMBEDDING_PROVIDER=openai
EMBEDDING_MODEL=text-embedding-3-small
```

**⚠️ IMPORTANTE**: Agrega `.env` a tu `.gitignore` para no subir credenciales.

### Opción B: Variables de Sistema

```bash
export DATABASE_URL="postgresql://postgres:TU_PASSWORD@db.xxxxx.supabase.co:5432/postgres"
export OPENAI_API_KEY="sk-tu-api-key-aqui"
```

## 📋 Paso 7: Verificar Conexión

Ejecuta el script de verificación:

```bash
npm run rag:status
```

Deberías ver:
```
✅ Variables de Entorno configuradas
✅ pgvector instalada
✅ Tablas creadas
✅ Índices creados
```

## 📋 Paso 8: (Opcional) Configurar para Railway

Si vas a desplegar en Railway, agrega la variable `DATABASE_URL` en Railway Dashboard:

1. Railway Dashboard → Tu Proyecto → Variables
2. Agrega:
   - Key: `DATABASE_URL`
   - Value: La misma connection string de Supabase

## 🎉 ¡Listo!

Tu base de datos está configurada. Ahora puedes:

1. **Verificar estado**: `npm run rag:status`
2. **Ejecutar ingesta**: `npm run rag:ingest`
3. **Probar sistema**: `npm run rag:test`

## 🚨 Troubleshooting

### Error: "password authentication failed"
- Verifica que reemplazaste `[YOUR-PASSWORD]` en la connection string
- Asegúrate de usar la contraseña correcta del proyecto

### Error: "extension vector does not exist"
- Ejecuta manualmente: `CREATE EXTENSION IF NOT EXISTS vector;`
- En Supabase SQL Editor

### Error: "relation already exists"
- Normal si ejecutaste la migración dos veces
- Puedes ignorarlo o hacer `DROP TABLE` si quieres empezar de cero

### No puedo conectarme desde mi máquina
- Verifica que la connection string esté correcta
- Supabase permite conexiones externas por defecto
- Si usas VPN/firewall, puede que necesites whitelist

## 📚 Recursos

- [Supabase Docs](https://supabase.com/docs)
- [Supabase SQL Editor](https://supabase.com/docs/guides/database/overview#sql-editor)
- [pgvector en Supabase](https://supabase.com/docs/guides/database/extensions/pgvector)

---

**Siguiente paso**: Una vez configurado, ejecuta `npm run rag:status` para verificar.
