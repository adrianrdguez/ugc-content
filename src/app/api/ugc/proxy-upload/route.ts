import { NextRequest, NextResponse } from 'next/server'
import { generateUploadURL } from '@/lib/cloudflare-r2'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const customerId = formData.get('customerId') as string
    const shopDomain = formData.get('shopDomain') as string

    if (!file || !customerId || !shopDomain) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 })
    }

    // Validaciones
    const maxSize = 100 * 1024 * 1024 // 100MB
    if (file.size > maxSize) {
      return NextResponse.json({
        success: false,
        error: 'File too large. Maximum size: 100MB'
      }, { status: 400 })
    }

    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid file type'
      }, { status: 400 })
    }

    // Generar URL de upload
    const uploadData = await generateUploadURL(
      file.name,
      file.type,
      customerId,
      shopDomain
    )

    // Convertir File a ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()

    // Upload directo desde el servidor a R2
    console.log('Uploading to R2:', {
      filename: file.name,
      size: file.size,
      type: file.type,
      videoKey: uploadData.videoKey
    })

    const uploadResponse = await fetch(uploadData.uploadUrl, {
      method: 'PUT',
      body: arrayBuffer,
      headers: {
        'Content-Type': file.type,
      }
    })

    console.log('R2 Upload response:', {
      status: uploadResponse.status,
      statusText: uploadResponse.statusText,
      headers: Object.fromEntries(uploadResponse.headers.entries())
    })

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text()
      console.error('R2 Upload error details:', errorText)
      throw new Error(`Upload failed: ${uploadResponse.status} ${uploadResponse.statusText} - ${errorText}`)
    }

    // Verificar que el archivo se subió correctamente
    console.log('Verifying upload...')
    const verifyResponse = await fetch(uploadData.publicUrl, { method: 'HEAD' })
    console.log('Verification response:', {
      status: verifyResponse.status,
      statusText: verifyResponse.statusText
    })

    if (!verifyResponse.ok) {
      throw new Error(`Upload verification failed: File not accessible at ${uploadData.publicUrl}`)
    }

    return NextResponse.json({
      success: true,
      videoKey: uploadData.videoKey,
      publicUrl: uploadData.publicUrl,
      message: 'Video uploaded successfully via proxy'
    })

  } catch (error) {
    console.error('Proxy upload error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    }, { status: 500 })
  }
}