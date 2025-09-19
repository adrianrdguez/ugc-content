# 📹 Implementación del Formulario UGC Público

Este documento describe los pasos para implementar el formulario de subida de videos (UGC) accesible desde el email enviado a los clientes.

---

## 1. Flujo Completo

1. Cliente recibe **email con token único**.
2. Cliente accede a `/ugc-form?token=XYZ`.
3. El sistema valida el token → identifica al cliente y la tienda.
4. El formulario permite subir un video a **Cloudflare R2** (via URL firmada).
5. Una vez subido, se guarda un registro en `ugc_submissions` en Supabase con `status = pending`.
6. El cliente recibe feedback en pantalla:  
   _"🎉 ¡Gracias! Tu video está pendiente de aprobación."_

---

## 2. Endpoints en Next.js

### `POST /api/ugc/validate-token`
- Input: `{ token }`
- Verifica que el token exista y corresponda a un `customer_id` válido.
- Devuelve datos mínimos: `{ customerId, shopDomain, email }`.

### `POST /api/ugc/upload-url`
- Input: `{ filename, contentType }`
- Genera **pre-signed URL** en Cloudflare R2 para subir el video.
- Devuelve `{ uploadUrl, videoKey }`.

### `POST /api/ugc/submit`
- Input: `{ customerId, shopDomain, videoKey, videoUrl }`
- Inserta registro en `ugc_submissions`:
  ```sql
  id, customer_id, shop_domain, video_key, video_url, status='pending'
