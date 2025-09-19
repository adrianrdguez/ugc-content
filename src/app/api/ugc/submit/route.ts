import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getPublicURL } from '@/lib/cloudflare-r2'

interface UGCSubmissionRequest {
  customerId: string
  shopDomain: string
  videoKey: string
  videoUrl?: string
}

export async function POST(request: NextRequest) {
  try {
    const { customerId, shopDomain, videoKey }: UGCSubmissionRequest = await request.json()

    // Validaciones
    if (!customerId || !shopDomain || !videoKey) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: customerId, shopDomain, videoKey'
      }, { status: 400 })
    }

    // Obtener shop_id desde el dominio
    const { data: shopId, error: shopError } = await supabaseAdmin.rpc('get_shop_id', {
      domain: shopDomain
    })

    if (shopError || !shopId) {
      return NextResponse.json({
        success: false,
        error: `Shop not found for domain: ${shopDomain}`
      }, { status: 404 })
    }

    // Verificar que el customer existe y pertenece a la tienda
    const { data: customer, error: customerError } = await supabaseAdmin
      .from('customers')
      .select('id, email, first_name, last_name')
      .eq('id', customerId)
      .eq('shop_id', shopId)
      .single()

    if (customerError || !customer) {
      return NextResponse.json({
        success: false,
        error: 'Customer not found or does not belong to this shop'
      }, { status: 404 })
    }

    // Verificar que no existe ya una submission para este customer
    const { data: existingSubmission } = await supabaseAdmin
      .from('ugc_submissions')
      .select('id, status')
      .eq('customer_id', customerId)
      .single()

    if (existingSubmission) {
      return NextResponse.json({
        success: false,
        error: `A video submission already exists for this customer (Status: ${existingSubmission.status})`
      }, { status: 409 })
    }

    // Generar URL pública del video
    const videoUrl = getPublicURL(videoKey)

    // Crear la submission en la base de datos
    const { data: submission, error: submissionError } = await supabaseAdmin
      .from('ugc_submissions')
      .insert({
        customer_id: customerId,
        shop_id: shopId,
        video_key: videoKey,
        video_url: videoUrl,
        status: 'pending'
      })
      .select()
      .single()

    if (submissionError) {
      console.error('Error creating submission:', submissionError)
      return NextResponse.json({
        success: false,
        error: 'Failed to create submission'
      }, { status: 500 })
    }

    // Log para tracking
    console.log(`🎬 UGC Submission created: ${submission.id} by ${customer.email} (${customer.first_name} ${customer.last_name})`)

    return NextResponse.json({
      success: true,
      submission: {
        id: submission.id,
        status: submission.status,
        video_url: videoUrl,
        created_at: submission.created_at
      },
      customer: {
        email: customer.email,
        name: `${customer.first_name} ${customer.last_name}`.trim()
      },
      message: '🎉 Video submitted successfully! It will be reviewed by the store team.'
    })

  } catch (error) {
    console.error('UGC submission error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}