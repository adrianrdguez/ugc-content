import { NextRequest, NextResponse } from 'next/server'
import { generateUploadURL } from '@/lib/cloudflare-r2'

export async function GET() {
  try {
    // Probar generación de URL de upload
    const testResult = await generateUploadURL(
      'test-video.mp4',
      'video/mp4',
      'test-customer-123',
      'test-shop.myshopify.com'
    )

    return NextResponse.json({
      success: true,
      message: 'Cloudflare R2 connection successful',
      data: {
        uploadUrl: testResult.uploadUrl.substring(0, 100) + '...', // Truncar por seguridad
        videoKey: testResult.videoKey,
        publicUrl: testResult.publicUrl
      }
    })
  } catch (error) {
    console.error('R2 connection error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}