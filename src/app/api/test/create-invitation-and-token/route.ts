import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { generateUGCToken, generateUGCFormUrl } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    // Obtener customer y shop de prueba
    const { data: customer, error: customerError } = await supabaseAdmin
      .from('customers')
      .select(`
        id,
        email,
        first_name,
        shop_id,
        shops!inner(
          shopify_domain,
          reward_type,
          reward_value,
          reward_currency
        )
      `)
      .eq('email', 'juan.perez@example.com')
      .single()

    if (customerError || !customer) {
      return NextResponse.json({
        success: false,
        error: 'Test customer not found. Run the webhook test first.'
      })
    }

    const shop = customer.shops

    // Eliminar invitación existente para recrearla
    await supabaseAdmin
      .from('email_invitations')
      .delete()
      .eq('customer_id', customer.id)

    // Crear nueva invitación con timestamp específico
    const invitationTimestamp = new Date().toISOString()
    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from('email_invitations')
      .insert({
        customer_id: customer.id,
        shop_id: customer.shop_id,
        sent_at: invitationTimestamp
      })
      .select()
      .single()

    if (invitationError) {
      throw new Error(`Failed to create invitation: ${invitationError.message}`)
    }

    // Generar token usando el timestamp de la invitación
    const timestamp = new Date(invitation.sent_at).getTime()
    const token = generateUGCToken(customer.id, shop.shopify_domain, timestamp)
    const formUrl = generateUGCFormUrl(token)

    console.log(`🎬 New UGC invitation created for ${customer.email}`)
    console.log(`📧 Form URL: ${formUrl}`)
    console.log(`🔑 Token: ${token}`)

    return NextResponse.json({
      success: true,
      customer: {
        id: customer.id,
        email: customer.email,
        name: customer.first_name
      },
      shop: shop.shopify_domain,
      invitation: {
        id: invitation.id,
        sent_at: invitation.sent_at
      },
      token,
      form_url: formUrl,
      debug: {
        timestamp,
        token_data: `${customer.id}:${shop.shopify_domain}:${timestamp}`
      }
    })

  } catch (error) {
    console.error('Create invitation error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create invitation'
    }, { status: 500 })
  }
}