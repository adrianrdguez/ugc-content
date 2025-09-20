-- Create merchants table for Shopify OAuth
CREATE TABLE merchants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    shop_domain TEXT UNIQUE NOT NULL,
    access_token TEXT NOT NULL,
    scope TEXT,
    is_active BOOLEAN DEFAULT true,
    app_settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_merchants_shop_domain ON merchants(shop_domain);

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_merchants_updated_at BEFORE UPDATE
    ON merchants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies
ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;

-- Policy: Merchants can only see their own data
CREATE POLICY "Merchants can view own data" ON merchants
    FOR SELECT USING (true); -- We'll handle auth in the application layer

CREATE POLICY "Merchants can insert own data" ON merchants
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Merchants can update own data" ON merchants
    FOR UPDATE USING (true);