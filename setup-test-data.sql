-- Script para crear datos de prueba en Supabase

-- Crear tienda de prueba
INSERT INTO shops (shopify_domain, access_token, reward_type, reward_value, reward_currency) 
VALUES ('test-shop.myshopify.com', 'test_token_123', 'discount', 15.00, 'USD')
ON CONFLICT (shopify_domain) DO UPDATE SET
  access_token = EXCLUDED.access_token,
  reward_type = EXCLUDED.reward_type,
  reward_value = EXCLUDED.reward_value,
  reward_currency = EXCLUDED.reward_currency;

-- Verificar que se creó correctamente
SELECT id, shopify_domain, reward_type, reward_value, reward_currency 
FROM shops 
WHERE shopify_domain = 'test-shop.myshopify.com';