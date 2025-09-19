import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { validateShopAuth } from '@/lib/auth'

interface ApproveSubmissionRequest {
  notes?: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Validar autenticación
    const auth = await validateShopAuth(request)
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: 401 })
    }

    const { notes }: ApproveSubmissionRequest = await request.json()
    const submissionId = params.id

    // Verificar que la submission existe y pertenece a esta tienda
    const { data: submission, error: fetchError } = await supabaseAdmin
      .from('ugc_submissions')
      .select(`
        id,
        status,
        customer_id,
        customers!inner(
          email,
          first_name,
          last_name
        )
      `)
      .eq('id', submissionId)
      .eq('shop_id', auth.shop!.id)
      .single()

    if (fetchError || !submission) {
      return NextResponse.json({
        success: false,
        error: 'Submission not found or access denied'
      }, { status: 404 })
    }

    // Verificar que no esté ya aprobada
    if (submission.status === 'approved') {
      return NextResponse.json({
        success: false,
        error: 'Submission is already approved'
      }, { status: 409 })
    }

    // Verificar si ya existe un reward para esta submission
    const { data: existingReward } = await supabaseAdmin
      .from('rewards')
      .select('id')
      .eq('submission_id', submissionId)
      .single()

    if (existingReward) {
      return NextResponse.json({
        success: false,
        error: 'Reward already exists for this submission'
      }, { status: 409 })
    }

    // Obtener configuración de recompensa de la tienda
    const { data: shop, error: shopError } = await supabaseAdmin
      .from('shops')
      .select('reward_type, reward_value, reward_currency')
      .eq('id', auth.shop!.id)
      .single()

    if (shopError || !shop) {
      throw new Error('Failed to fetch shop configuration')
    }

    // Actualizar submission a aprobada
    const { error: updateError } = await supabaseAdmin
      .from('ugc_submissions')
      .update({
        status: 'approved',
        review_notes: notes || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', submissionId)

    if (updateError) {
      throw new Error(`Failed to update submission: ${updateError.message}`)
    }

    // Crear reward en la base de datos
    const { data: reward, error: rewardError } = await supabaseAdmin
      .from('rewards')
      .insert({
        submission_id: submissionId,
        shop_id: auth.shop!.id,
        type: shop.reward_type,
        value: shop.reward_value,
        currency: shop.reward_currency,
        status: 'pending'
      })
      .select()
      .single()

    if (rewardError) {
      console.error('Failed to create reward:', rewardError)
      // No fallar la operación completa, pero logear el error
    }

    // Crear recompensa en Shopify
    let shopifyReward = null
    if (reward) {
      const { createShopifyReward } = await import('@/lib/shopify-rewards')
      
      shopifyReward = await createShopifyReward(auth.shop!.shopify_domain, auth.shop!.access_token, {
        type: shop.reward_type as 'discount' | 'gift_card',
        value: shop.reward_value,
        currency: shop.reward_currency,
        customerEmail: submission.customers?.email || '',
        customerName: `${submission.customers?.first_name || ''} ${submission.customers?.last_name || ''}`.trim()
      })

      // Actualizar reward con los datos de Shopify
      if (shopifyReward.success) {
        await supabaseAdmin
          .from('rewards')
          .update({
            shopify_discount_id: shopifyReward.shopify_id,
            shopify_gift_card_id: shopifyReward.shopify_id,
            status: 'sent',
            sent_at: new Date().toISOString()
          })
          .eq('id', reward.id)
      } else {
        await supabaseAdmin
          .from('rewards')
          .update({
            status: 'failed',
            error_message: shopifyReward.error
          })
          .eq('id', reward.id)
      }
    }

    // TODO: Enviar email de notificación al cliente con código de recompensa

    console.log(`✅ UGC Submission approved: ${submissionId} for ${submission.customers?.email}`)
    if (shopifyReward?.success) {
      console.log(`🎁 Reward created: ${shopifyReward.code || shopifyReward.shopify_id}`)
    }

    return NextResponse.json({
      success: true,
      submission: {
        id: submissionId,
        status: 'approved',
        review_notes: notes,
        updated_at: new Date().toISOString()
      },
      reward: reward ? {
        id: reward.id,
        type: reward.type,
        value: reward.value,
        currency: reward.currency,
        status: reward.status
      } : null,
      message: `Submission approved successfully! Reward ${reward ? 'created' : 'creation pending'}.`
    })

  } catch (error) {
    console.error('Approve submission error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to approve submission'
    }, { status: 500 })
  }
}