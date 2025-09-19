-- Supabase Schema for Shopify UGC App (Improved Version)

-- Tabla de tiendas Shopify
CREATE TABLE shops (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    shopify_domain VARCHAR(255) UNIQUE NOT NULL,
    access_token TEXT NOT NULL,
    email_template TEXT,
    reward_type VARCHAR(20) DEFAULT 'discount' CHECK (reward_type IN ('discount', 'gift_card')),
    reward_value DECIMAL(10,2) DEFAULT 10.00,
    reward_currency VARCHAR(3) DEFAULT 'USD',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de clientes (usando shop_id como FK)
CREATE TABLE customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    shopify_customer_id VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    orders_count INTEGER DEFAULT 0,
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(shopify_customer_id, shop_id),
    UNIQUE(shop_id, email) -- Evita duplicados del mismo email por tienda
);

-- Tabla de submissions de UGC (con status processing)
CREATE TABLE ugc_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    video_url TEXT,
    video_key VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'approved', 'rejected')),
    review_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de rewards (separada para mejor tracking)
CREATE TABLE rewards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    submission_id UUID NOT NULL REFERENCES ugc_submissions(id) ON DELETE CASCADE,
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('discount', 'gift_card')),
    value DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    shopify_discount_id VARCHAR(255), -- ID del descuento en Shopify
    shopify_gift_card_id VARCHAR(255), -- ID de la gift card en Shopify
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de invitaciones enviadas (usando shop_id)
CREATE TABLE email_invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(customer_id, shop_id)
);

-- Índices para performance mejorados
CREATE INDEX idx_customers_shop_id ON customers(shop_id);
CREATE INDEX idx_customers_shopify_id ON customers(shopify_customer_id);
CREATE INDEX idx_customers_shop_email ON customers(shop_id, email);

CREATE INDEX idx_ugc_submissions_customer ON ugc_submissions(customer_id);
CREATE INDEX idx_ugc_submissions_shop ON ugc_submissions(shop_id);
CREATE INDEX idx_ugc_submissions_status ON ugc_submissions(status);
CREATE INDEX idx_ugc_shop_status ON ugc_submissions(shop_id, status);

CREATE INDEX idx_rewards_submission ON rewards(submission_id);
CREATE INDEX idx_rewards_shop ON rewards(shop_id);
CREATE INDEX idx_rewards_status ON rewards(status);

CREATE INDEX idx_email_invitations_customer ON email_invitations(customer_id);
CREATE INDEX idx_email_invitations_shop ON email_invitations(shop_id);

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_shops_updated_at BEFORE UPDATE ON shops
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ugc_submissions_updated_at BEFORE UPDATE ON ugc_submissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rewards_updated_at BEFORE UPDATE ON rewards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Función RPC para incrementar order count de forma atómica
CREATE OR REPLACE FUNCTION increment_order_count(customer_id uuid)
RETURNS customers AS $$
  UPDATE customers
  SET orders_count = orders_count + 1,
      updated_at = NOW()
  WHERE id = customer_id
  RETURNING *;
$$ LANGUAGE sql;

-- Función RPC para obtener shop_id desde shop_domain
CREATE OR REPLACE FUNCTION get_shop_id(domain text)
RETURNS uuid AS $$
  SELECT id FROM shops WHERE shopify_domain = domain;
$$ LANGUAGE sql;