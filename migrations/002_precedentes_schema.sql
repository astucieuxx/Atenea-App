-- ============================================================================
-- ATENEA RAG - Esquema para Precedentes Judiciales
-- ============================================================================
-- Almacena los precedentes (ejecutorias) scrapeados del SJF de la SCJN.
-- Estructura paralela a tesis: precedentes + precedentes_chunks con pgvector.
-- ============================================================================

-- ============================================================================
-- TABLA: precedentes
-- ============================================================================
CREATE TABLE IF NOT EXISTS precedentes (
    id TEXT PRIMARY KEY,
    ius INTEGER,

    -- Contenido principal
    rubro TEXT NOT NULL,
    texto_publicacion TEXT,

    -- Metadata jurídica
    localizacion TEXT,
    sala TEXT,
    tipo_asunto TEXT,
    tipo_asunto_expediente TEXT,
    promovente TEXT,
    fecha_publicacion TEXT,

    -- Campos adicionales
    temas TEXT, -- JSON array serializado
    votos TEXT, -- JSON array serializado
    votacion BOOLEAN DEFAULT false,
    semanal BOOLEAN DEFAULT false,

    url_origen TEXT,
    raw_fields TEXT, -- JSON con campos extra no mapeados
    scraped_at TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT precedentes_id_not_empty CHECK (id != '')
);

-- Índices para búsqueda full-text en precedentes
CREATE INDEX IF NOT EXISTS idx_precedentes_rubro_gin ON precedentes USING gin(to_tsvector('spanish', rubro));
CREATE INDEX IF NOT EXISTS idx_precedentes_texto_gin ON precedentes USING gin(to_tsvector('spanish', COALESCE(texto_publicacion, '')));
CREATE INDEX IF NOT EXISTS idx_precedentes_tipo_asunto ON precedentes(tipo_asunto);
CREATE INDEX IF NOT EXISTS idx_precedentes_sala ON precedentes(sala);
CREATE INDEX IF NOT EXISTS idx_precedentes_ius ON precedentes(ius);

-- ============================================================================
-- TABLA: precedentes_chunks
-- ============================================================================
CREATE TABLE IF NOT EXISTS precedentes_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    precedente_id TEXT NOT NULL REFERENCES precedentes(id) ON DELETE CASCADE,

    -- Contenido del chunk
    chunk_text TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    chunk_type TEXT DEFAULT 'body', -- 'rubro', 'texto_publicacion', 'metadata'

    -- Embedding vectorial (misma dimensión que tesis_chunks)
    embedding vector(1536),

    -- Metadata del chunk
    token_count INTEGER,
    char_start INTEGER,
    char_end INTEGER,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT prec_chunks_id_not_empty CHECK (precedente_id != ''),
    CONSTRAINT prec_chunks_text_not_empty CHECK (chunk_text != ''),
    CONSTRAINT prec_chunks_index_non_negative CHECK (chunk_index >= 0)
);

-- Índice vectorial HNSW
CREATE INDEX IF NOT EXISTS idx_prec_chunks_embedding_hnsw
ON precedentes_chunks
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Índice full-text
CREATE INDEX IF NOT EXISTS idx_prec_chunks_text_gin
ON precedentes_chunks
USING gin(to_tsvector('spanish', chunk_text));

-- Índices de filtrado
CREATE INDEX IF NOT EXISTS idx_prec_chunks_precedente_id ON precedentes_chunks(precedente_id);
CREATE INDEX IF NOT EXISTS idx_prec_chunks_chunk_index ON precedentes_chunks(precedente_id, chunk_index);
CREATE INDEX IF NOT EXISTS idx_prec_chunks_type ON precedentes_chunks(chunk_type);

-- Trigger para updated_at
CREATE TRIGGER update_precedentes_updated_at
BEFORE UPDATE ON precedentes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Vista de estadísticas
CREATE OR REPLACE VIEW v_precedentes_chunk_stats AS
SELECT
    p.id AS precedente_id,
    p.rubro,
    COUNT(c.id) AS total_chunks,
    SUM(c.token_count) AS total_tokens,
    BOOL_OR(c.embedding IS NULL) AS has_missing_embeddings
FROM precedentes p
LEFT JOIN precedentes_chunks c ON p.id = c.precedente_id
GROUP BY p.id, p.rubro;

COMMENT ON TABLE precedentes IS 'Precedentes judiciales (ejecutorias) del Semanario Judicial de la Federación.';
COMMENT ON TABLE precedentes_chunks IS 'Chunks con embeddings vectoriales para búsqueda semántica de precedentes.';
