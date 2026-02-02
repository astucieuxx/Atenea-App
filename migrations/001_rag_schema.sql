-- ============================================================================
-- ATENEA RAG - Esquema de Base de Datos con pgvector
-- ============================================================================
-- Este esquema soporta:
-- 1. Almacenamiento de tesis completas (metadata)
-- 2. Chunks de texto con embeddings vectoriales
-- 3. Búsqueda híbrida (vectorial + full-text)
-- 4. Escalabilidad a 300k+ tesis
-- ============================================================================

-- Habilitar extensión pgvector (requiere instalación previa)
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- TABLA: tesis
-- ============================================================================
-- Almacena metadata completa de cada tesis.
-- Esta tabla NO contiene embeddings (se almacenan en chunks).
-- Diseño: Una tesis = un registro, sin duplicación.
CREATE TABLE IF NOT EXISTS tesis (
    id TEXT PRIMARY KEY,
    
    -- Metadata básica
    url TEXT,
    title TEXT NOT NULL,
    abstract TEXT,
    body TEXT,
    body_full TEXT,
    extra_sections TEXT,
    
    -- Metadata jurídica
    instancia TEXT,
    epoca TEXT,
    materias TEXT,
    tesis_numero TEXT,
    tipo TEXT, -- "Jurisprudencia", "Tesis Aislada", etc.
    fuente TEXT,
    
    -- Localización
    localizacion_libro TEXT,
    localizacion_tomo TEXT,
    localizacion_mes TEXT,
    localizacion_anio TEXT,
    localizacion_pagina TEXT,
    
    -- Órgano y clasificación
    organo_jurisdiccional TEXT,
    clave TEXT,
    notas TEXT,
    formas_integracion TEXT,
    fecha_publicacion TEXT,
    extracted_at TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Índices para búsqueda textual
    CONSTRAINT tesis_id_not_empty CHECK (id != '')
);

-- Índices para búsqueda full-text en tesis
CREATE INDEX IF NOT EXISTS idx_tesis_title_gin ON tesis USING gin(to_tsvector('spanish', title));
CREATE INDEX IF NOT EXISTS idx_tesis_abstract_gin ON tesis USING gin(to_tsvector('spanish', abstract));
CREATE INDEX IF NOT EXISTS idx_tesis_materias_gin ON tesis USING gin(to_tsvector('spanish', COALESCE(materias, '')));
CREATE INDEX IF NOT EXISTS idx_tesis_tipo ON tesis(tipo);
CREATE INDEX IF NOT EXISTS idx_tesis_organo ON tesis(organo_jurisdiccional);
CREATE INDEX IF NOT EXISTS idx_tesis_epoca ON tesis(epoca);

-- ============================================================================
-- TABLA: tesis_chunks
-- ============================================================================
-- Almacena chunks de texto con embeddings vectoriales.
-- Estrategia de chunking:
-- - Cada tesis se divide en chunks de ~500-800 tokens
-- - Chunks se solapan ligeramente (50-100 tokens) para contexto
-- - Cada chunk tiene su propio embedding
-- Diseño: Una tesis puede tener múltiples chunks.
CREATE TABLE IF NOT EXISTS tesis_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tesis_id TEXT NOT NULL REFERENCES tesis(id) ON DELETE CASCADE,
    
    -- Contenido del chunk
    chunk_text TEXT NOT NULL,
    chunk_index INTEGER NOT NULL, -- Orden del chunk dentro de la tesis (0, 1, 2...)
    chunk_type TEXT DEFAULT 'body', -- 'title', 'abstract', 'body', 'body_full'
    
    -- Embedding vectorial (dimensión 1536 para OpenAI text-embedding-3-small)
    -- Ajustar dimensión según el modelo usado
    embedding vector(1536),
    
    -- Metadata del chunk
    token_count INTEGER, -- Número aproximado de tokens
    char_start INTEGER, -- Posición de inicio en el texto original
    char_end INTEGER, -- Posición de fin en el texto original
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chunks_tesis_id_not_empty CHECK (tesis_id != ''),
    CONSTRAINT chunks_text_not_empty CHECK (chunk_text != ''),
    CONSTRAINT chunks_index_non_negative CHECK (chunk_index >= 0)
);

-- Índice vectorial HNSW para búsqueda por similitud (pgvector)
-- HNSW es más rápido que IVFFlat para búsquedas, especialmente con muchos vectores
-- m=16, ef_construction=64 son valores conservadores para calidad/prestaciones
CREATE INDEX IF NOT EXISTS idx_chunks_embedding_hnsw 
ON tesis_chunks 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Índice para búsqueda full-text en chunks
CREATE INDEX IF NOT EXISTS idx_chunks_text_gin 
ON tesis_chunks 
USING gin(to_tsvector('spanish', chunk_text));

-- Índices para filtrado y joins
CREATE INDEX IF NOT EXISTS idx_chunks_tesis_id ON tesis_chunks(tesis_id);
CREATE INDEX IF NOT EXISTS idx_chunks_chunk_index ON tesis_chunks(tesis_id, chunk_index);
CREATE INDEX IF NOT EXISTS idx_chunks_type ON tesis_chunks(chunk_type);

-- ============================================================================
-- TABLA: ingestion_log
-- ============================================================================
-- Registra el estado de la ingesta para debugging y monitoreo
CREATE TABLE IF NOT EXISTS ingestion_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tesis_id TEXT NOT NULL,
    status TEXT NOT NULL, -- 'pending', 'processing', 'completed', 'failed'
    chunks_count INTEGER DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT ingestion_status_valid CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_ingestion_tesis_id ON ingestion_log(tesis_id);
CREATE INDEX IF NOT EXISTS idx_ingestion_status ON ingestion_log(status);

-- ============================================================================
-- FUNCIONES AUXILIARES
-- ============================================================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para actualizar updated_at en tesis
CREATE TRIGGER update_tesis_updated_at 
BEFORE UPDATE ON tesis 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VISTAS ÚTILES
-- ============================================================================

-- Vista: Estadísticas de chunks por tesis
CREATE OR REPLACE VIEW v_tesis_chunk_stats AS
SELECT 
    t.id AS tesis_id,
    t.title,
    COUNT(c.id) AS total_chunks,
    SUM(c.token_count) AS total_tokens,
    BOOL_OR(c.embedding IS NULL) AS has_missing_embeddings
FROM tesis t
LEFT JOIN tesis_chunks c ON t.id = c.tesis_id
GROUP BY t.id, t.title;

-- ============================================================================
-- COMENTARIOS PARA DOCUMENTACIÓN
-- ============================================================================

COMMENT ON TABLE tesis IS 'Almacena metadata completa de tesis jurídicas. Sin embeddings.';
COMMENT ON TABLE tesis_chunks IS 'Chunks de texto con embeddings vectoriales para búsqueda semántica.';
COMMENT ON TABLE ingestion_log IS 'Log de ingesta para monitoreo y debugging.';
COMMENT ON COLUMN tesis_chunks.embedding IS 'Vector embedding de dimensión 1536 (OpenAI text-embedding-3-small). Ajustar según modelo.';
COMMENT ON INDEX idx_chunks_embedding_hnsw IS 'Índice HNSW para búsqueda por similitud coseno. Optimizado para 300k+ vectores.';
