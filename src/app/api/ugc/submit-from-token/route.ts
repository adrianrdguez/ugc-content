import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { token, videoKey } = await request.json()

    if (!token || !videoKey) {
      return NextResponse.json({
        success: false,
        error: 'Token and videoKey required'
      }, { status: 400 })
    }

    // Obtener datos del token
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('ugc_upload_tokens')
      .select(`
        *,
        customers!inner (
          id,
          shop_id,
          shops!inner (
            shopify_domain
          )
        )
      `)
      .eq('token', token)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (tokenError || !tokenData) {
      return NextResponse.json({
        success: false,
        error: 'Invalid or expired token'
      }, { status: 400 })
    }

    // Crear submission
    const { data: submission, error: submissionError } = await supabaseAdmin
      .from('ugc_submissions')
      .insert({
        customer_id: tokenData.customers.id,
        shop_id: tokenData.customers.shop_id,
        video_key: videoKey,
        video_url: `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${videoKey}`,
        status: 'pending'
      })
      .select()
      .single()

    if (submissionError) {
      console.error('Submission creation error:', submissionError)
      return NextResponse.json({
        success: false,
        error: 'Failed to create submission'
      }, { status: 500 })
    }

    // Marcar token como usado
    await supabaseAdmin
      .from('ugc_upload_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('token', token)

    console.log('UGC submission created:', {
      submission_id: submission.id,
      customer_id: tokenData.customers.id,
      shop_domain: tokenData.customers.shops.shopify_domain,
      video_key: videoKey
    })

    return NextResponse.json({
      success: true,
      submission_id: submission.id,
      message: 'Video submitted successfully'
    })

  } catch (error) {
    console.error('Submission error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to process submission'
    }, { status: 500 })
  }
}