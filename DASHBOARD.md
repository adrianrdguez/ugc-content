Objetivo

Permitir que los merchants gestionen los contenidos generados por clientes (UGC), revisen los vídeos enviados y puedan aprobar o rechazar submissions.
Al aprobar, se genera automáticamente una recompensa (discount/gift card) y se notifica al cliente.

🛠️ Arquitectura General

Frontend: Next.js + Shopify Polaris

Backend: Next.js API Routes (/api/admin/ugc)

Base de datos: Supabase (ugc_submissions, customers, shops)

Integraciones:

Shopify Discounts API (crear descuentos/gift cards)

Email provider (opcional, para notificar al cliente tras aprobación)

🔐 Autenticación

El dashboard está embebido en el Admin de Shopify.

Valida sesión vía OAuth y shop + accessToken.

Todos los endpoints de administración requieren:

x-shopify-shop-domain

x-access-token (el que guardamos en Supabase en la tabla shops).

📂 Endpoints
1. Listar submissions
GET /api/admin/ugc?status=pending|approved|rejected


Params:

status (opcional, default = pending)

page, limit (para paginación)

Response:

{
  "submissions": [
    {
      "id": "uuid",
      "customer_email": "test@example.com",
      "customer_name": "John Doe",
      "video_url": "https://cdn.cloudflare.r2/ugc/shop/.../video.mp4",
      "status": "pending",
      "created_at": "2025-09-19T12:00:00Z"
    }
  ]
}

2. Aprobar submission
POST /api/admin/ugc/[id]/approve


Body (opcional):

{
  "notes": "Buen vídeo, aprobado!"
}


Lógica interna:

UPDATE ugc_submissions SET status = 'approved', review_notes = $notes WHERE id = $id

Crear recompensa:

Si reward_type = discount → crear discount code en Shopify API.

Si reward_type = gift_card → crear gift card en Shopify API.

Marcar reward_sent = true.

(Opcional) Enviar email al cliente con el código.

3. Rechazar submission
POST /api/admin/ugc/[id]/reject


Body (requerido):

{
  "notes": "El vídeo no cumple los requisitos"
}


Lógica interna:

UPDATE ugc_submissions SET status = 'rejected', review_notes = $notes WHERE id = $id

(Opcional) enviar email al cliente con feedback.

🎨 UI – Shopify Polaris
Pantalla principal

Tabs: Pending | Approved | Rejected

Tabla/Listado:

Cliente (nombre + email)

Fecha

Estado

Preview del vídeo (thumbnail + link “Ver vídeo”)

Botones: ✅ Aprobar | ❌ Rechazar

Modal de revisión

Al clicar en un submission → abre modal con:

Reproductor del vídeo (embed)

Datos del cliente

Notas del merchant

Botones de acción

🎁 Creación de recompensas
Shopify Discounts API

Crear descuento único (price_rule + discount_code).

Guardar el código en ugc_submissions.reward_code.

Ejemplo: UGC-15USD-2025

Shopify Gift Cards API

Crear gift card en el admin.

Guardar en Supabase reward_code o reward_link.

🚦 Rate limiting

Un cliente no puede recibir más de 1 recompensa por submission aprobado.

En caso de duplicados, retornar error 409 Conflict.

📧 Emails opcionales

Approved → “Tu vídeo ha sido aprobado 🎉, aquí está tu recompensa”.

Rejected → “Tu vídeo no cumple los requisitos 😔, pero puedes intentarlo de nuevo”.