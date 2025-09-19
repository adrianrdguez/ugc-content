import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { generateUGCToken } from '@/lib/email'

export async function GET(request: NextRequest) {
  try {
    // Buscar la invitación más reciente para testing
    const { data: recentInvitation, error } = await supabaseAdmin
      .from('email_invitations')
      .select(`
        customer_id,
        sent_at,
        customers!inner(
          id,
          email,
          first_name,
          shops!inner(
            shopify_domain
          )
        )
      `)
      .order('sent_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !recentInvitation) {
      return NextResponse.json({
        success: false,
        error: 'No invitations found. Run the webhook test first.'
      })
    }

    const customer = recentInvitation.customers
    const shop = customer.shops

    // Generar token correcto usando el timestamp de la invitación
    const timestamp = new Date(recentInvitation.sent_at).getTime()
    const correctToken = generateUGCToken(customer.id, shop.shopify_domain, timestamp)

    // URL del formulario
    const formUrl = `${process.env.SHOPIFY_APP_URL || 'http://localhost:3000'}/ugc-form?token=${correctToken}`

    return NextResponse.json({
      success: true,
      customer: {
        id: customer.id,
        email: customer.email,
        name: customer.first_name
      },
      shop: shop.shopify_domain,
      invitation_sent_at: recentInvitation.sent_at,
      token: correctToken,
      form_url: formUrl,
      debug: {
        timestamp,
        token_data: `${customer.id}:${shop.shopify_domain}:${timestamp}`
      }
    })

  } catch (error) {
    console.error('Token generation error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to generate test token'
    }, { status: 500 })
  }
}