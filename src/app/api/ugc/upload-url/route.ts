import { NextRequest, NextResponse } from 'next/server'
import { generateUploadURL } from '@/lib/cloudflare-r2'

interface UploadURLRequest {
  filename: string
  contentType: string
  customerId: string
  shopDomain: string
  fileSize?: number // En bytes
}

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB

export async function POST(request: NextRequest) {
  try {
    const { filename, contentType, customerId, shopDomain, fileSize }: UploadURLRequest = await request.json()

    // Validaciones
    if (!filename || !contentType || !customerId || !shopDomain) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: filename, contentType, customerId, shopDomain'
      }, { status: 400 })
    }

    // Validar tamaño del archivo
    if (fileSize && fileSize > MAX_FILE_SIZE) {
      return NextResponse.json({
        success: false,
        error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`
      }, { status: 400 })
    }

    // Validar extensión del archivo
    const allowedExtensions = ['.mp4', '.webm', '.mov', '.avi']
    const fileExtension = filename.toLowerCase().substring(filename.lastIndexOf('.'))
    
    if (!allowedExtensions.includes(fileExtension)) {
      return NextResponse.json({
        success: false,
        error: `Invalid file extension. Allowed: ${allowedExtensions.join(', ')}`
      }, { status: 400 })
    }

    // Generar URL de upload
    const uploadData = await generateUploadURL(filename, contentType, customerId, shopDomain)

    return NextResponse.json({
      success: true,
      ...uploadData,
      constraints: {
        maxFileSize: MAX_FILE_SIZE,
        allowedTypes: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'],
        expiresIn: 3600 // 1 hora
      }
    })

  } catch (error) {
    console.error('Upload URL generation error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate upload URL'
    }, { status: 500 })
  }
}