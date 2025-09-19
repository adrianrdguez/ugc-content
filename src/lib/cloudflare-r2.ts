import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
})

export interface UploadURLResponse {
  uploadUrl: string
  videoKey: string
  publicUrl: string
}

export async function generateUploadURL(
  filename: string,
  contentType: string,
  customerId: string,
  shopDomain: string
): Promise<UploadURLResponse> {
  // Validar tipo de archivo
  const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']
  if (!allowedTypes.includes(contentType)) {
    throw new Error(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`)
  }

  // Generar key único para el video
  const timestamp = Date.now()
  const cleanFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
  const videoKey = `ugc/${shopDomain}/${customerId}/${timestamp}_${cleanFilename}`

  try {
    const command = new PutObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET!,
      Key: videoKey,
      ContentType: contentType,
      Metadata: {
        customerId,
        shopDomain,
        uploadedAt: new Date().toISOString(),
      },
    })

    // Generar URL firmada (válida por 1 hora)
    const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 3600 })

    // URL pública para acceder al video (después del upload)
    const publicUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${videoKey}`

    return {
      uploadUrl,
      videoKey,
      publicUrl,
    }
  } catch (error) {
    console.error('Error generating upload URL:', error)
    throw new Error('Failed to generate upload URL')
  }
}

export function getPublicURL(videoKey: string): string {
  return `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${videoKey}`
}