# Prompt para Claude Code - Shopify UGC App

Hola Claude! Voy a desarrollar una **Shopify App para generar User Generated Content (UGC)** con el siguiente concepto:

## 📋 Concepto de la App
- Detectar clientes que han hecho 3+ pedidos
- Enviarles automáticamente un email invitándoles a subir vídeo UGC
- Dashboard para que el merchant revise y apruebe/rechace vídeos
- Recompensar automáticamente con descuentos/gift cards cuando se apruebe el UGC

## 🏗️ Stack Técnico
- **Frontend**: Next.js + Shopify Polaris (para la app embebida)
- **Backend**: Node.js con API routes de Next.js
- **DB**: Supabase (Postgres)
- **Storage**: Cloudflare R2 para vídeos
- **Shopify**: Webhooks, OAuth2, Discounts API, Customers API

## 🔄 Flujo Principal
1. **Webhook** `orders/create` → guardar customer + contador pedidos en Supabase
2. Si `orders_count >= 3` → trigger email con link al formulario UGC
3. **Formulario público** para subir vídeo + datos del cliente
4. **Dashboard embebido** en Shopify admin para revisar submissions
5. **Auto-recompensa** al aprobar (crear descuento via Shopify API)

## 🎯 Lo que necesito ahora
Quiero que me ayudes **paso a paso**, empezando por:

1. **Estructura inicial del proyecto Next.js** con las carpetas organizadas
2. **Setup básico de Supabase** (schema de tablas principales)
3. **Configuración de OAuth con Shopify** (usando el SDK oficial)

**NO hagas todo de golpe** - prefiero ir construyendo incrementalmente y entendiendo cada parte.

Empecemos por la **estructura del proyecto** y las **dependencias principales** que necesitaré instalar.