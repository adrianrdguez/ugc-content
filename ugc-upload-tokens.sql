-- Tabla para tokens temporales de upload UGC
CREATE TABLE ugc_upload_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    token VARCHAR(255) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    typeform_response_token VARCHAR(255),
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_ugc_upload_tokens_token ON ugc_upload_tokens(token);
CREATE INDEX idx_ugc_upload_tokens_customer ON ugc_upload_tokens(customer_id);
CREATE INDEX idx_ugc_upload_tokens_expires ON ugc_upload_tokens(expires_at);

-- Función para limpiar tokens expirados
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void AS $$
  DELETE FROM ugc_upload_tokens 
  WHERE expires_at < NOW();
$$ LANGUAGE sql;