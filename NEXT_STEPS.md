# 🔑 Autenticación y Gamificación en la App Shopify + Supabase

## 1. Merchants (Dueños de tiendas Shopify)

Los merchants instalan la app desde el Shopify Admin → aquí es **obligatorio usar OAuth de Shopify**.

### Flujo OAuth Shopify
1. Merchant instala la app desde el Shopify Admin.
2. Shopify redirige a tu backend con un `code` + `shop`.
3. Backend → solicita `access_token` a Shopify.
4. Guardas en tu DB (ejemplo en Supabase):

```sql
CREATE TABLE merchants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    shop_domain TEXT UNIQUE NOT NULL,
    access_token TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

Cada vez que el merchant abre la app desde el Admin:

Shopify envía un session token firmado en la URL.

Verificas ese token con tu API_SECRET.

Renderizas el dashboard embebido en Shopify.

👉 Esto asegura que solo el merchant dueño de la tienda pueda entrar a su dashboard.

Usuarios Finales (Clientes que suben videos)

Los usuarios finales no tienen cuenta de Shopify, así que necesitas un sistema propio para gamificación.

Supabase Auth (Recomendada)

Registro/login con email (passwordless magic links).

Cada usuario tiene un perfil con puntos/rewards.

CREATE TABLE users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE rewards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    points INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

Esto permite que el usuario pueda:

Subir más de un video.

Acumular puntos.

Canjear recompensas.

Integración Gamificación + Shopify

Merchant define las rewards desde el dashboard (ej: "10 puntos = cupón 10%").

Usuario acumula puntos al subir videos.

Cuando alcanza X puntos → backend genera discount code en Shopify usando la API del merchant.

Resumen del Sistema

Merchants → OAuth de Shopify → Dashboard Polaris (embebido en Admin).

Usuarios finales → Supabase Auth → Onboarding + página de upload + rewards page.

Gamificación → puntos acumulados en DB, canjeables por descuentos creados en Shopify vía API.

Próximos pasos de implementación

Crear tabla merchants en Supabase para tokens de Shopify.

Implementar endpoint OAuth en tu backend:

/auth/shopify/install

/auth/shopify/callback

Configurar Supabase Auth para usuarios finales.

Crear tabla rewards para puntos.

Probar flujo básico:

Merchant instala la app.

Cliente se registra con email → sube video → gana puntos.

Backend genera reward → merchant lo ve en el dashboard.