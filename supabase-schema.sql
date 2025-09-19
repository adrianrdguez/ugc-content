-- Supabase Schema for Shopify UGC App

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

-- Tabla de clientes
CREATE TABLE customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    shopify_customer_id VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    orders_count INTEGER DEFAULT 0,
    shop_domain VARCHAR(255) NOT NULL REFERENCES shops(shopify_domain),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(shopify_customer_id, shop_domain)
);

-- Tabla de submissions de UGC
CREATE TABLE ugc_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID NOT NULL REFERENCES customers(id),
    shop_domain VARCHAR(255) NOT NULL REFERENCES shops(shopify_domain),
    video_url TEXT,
    video_key VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    review_notes TEXT,
    reward_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de invitaciones enviadas (para evitar spam)
CREATE TABLE email_invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID NOT NULL REFERENCES customers(id),
    shop_domain VARCHAR(255) NOT NULL REFERENCES shops(shopify_domain),
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(customer_id, shop_domain)
);

-- Índices para performance
CREATE INDEX idx_customers_shop_domain ON customers(shop_domain);
CREATE INDEX idx_customers_shopify_id ON customers(shopify_customer_id);
CREATE INDEX idx_ugc_submissions_customer ON ugc_submissions(customer_id);
CREATE INDEX idx_ugc_submissions_shop ON ugc_submissions(shop_domain);
CREATE INDEX idx_ugc_submissions_status ON ugc_submissions(status);

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

-- Función RPC para incrementar order count de forma atómica
CREATE OR REPLACE FUNCTION increment_order_count(customer_id uuid)
RETURNS customers AS $$
  UPDATE customers
  SET orders_count = orders_count + 1,
      updated_at = NOW()
  WHERE id = customer_id
  RETURNING *;
$$ LANGUAGE sql;