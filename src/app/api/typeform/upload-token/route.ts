import { NextRequest, NextResponse } from 'next/server'
import { generateUploadURL } from '@/lib/cloudflare-r2'

export async function POST(request: NextRequest) {
  try {
    const { email, customerToken } = await request.json()

    if (!email || !customerToken) {
      return NextResponse.json(
        { error: 'Email and customer token required' },
        { status: 400 }
      )
    }

    // TODO: Validar token y obtener customer/shop info
    // Por ahora usamos datos de prueba
    const customerId = `customer_${email.split('@')[0]}`
    const shopDomain = 'test-shop.myshopify.com'

    // Generar URL de upload genérica (el usuario subirá desde Typeform)
    const uploadData = await generateUploadURL(
      'ugc-video.mp4',
      'video/mp4',
      customerId,
      shopDomain
    )

    return NextResponse.json({
      success: true,
      uploadUrl: uploadData.uploadUrl,
      videoKey: uploadData.videoKey,
      publicUrl: uploadData.publicUrl,
      // URL que el usuario puede usar para completar el upload
      uploadPageUrl: `${process.env.NEXTAUTH_URL}/typeform-upload?token=${uploadData.videoKey}`
    })
  } catch (error) {
    console.error('Error generating upload token:', error)
    return NextResponse.json(
      { error: 'Failed to generate upload token' },
      { status: 500 }
    )
  }
}