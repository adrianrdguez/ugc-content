# Configurar CORS en Cloudflare R2

## Opción 1: Desde Cloudflare Dashboard (Más fácil)

1. Ve a tu dashboard de Cloudflare
2. Navega a **R2 Object Storage**
3. Selecciona tu bucket `shopify-ugc-videos`
4. Ve a la pestaña **Settings**
5. Busca la sección **CORS policy**
6. Pega esta configuración:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "http://localhost:3001",
      "https://*.vercel.app"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "POST",
      "DELETE",
      "HEAD"
    ],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

## Opción 2: Con AWS CLI (Si tienes configurado)

```bash
# Configurar CORS usando el archivo JSON
aws s3api put-bucket-cors \
  --bucket shopify-ugc-videos \
  --cors-configuration file://r2-cors-config.json \
  --endpoint-url https://e4566d5b4f5ff8906901cc5772d44513.r2.cloudflarestorage.com
```

## Opción 3: Workaround temporal (Usar servidor como proxy)

Si no puedes configurar CORS ahora mismo, podemos crear un endpoint proxy.