import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { validateUGCToken } from '@/lib/email'

interface TokenValidationResult {
  valid: boolean
  customerId?: string
  shopDomain?: string
  email?: string
  customerName?: string
  shopSettings?: {
    reward_type: string
    reward_value: number
    reward_currency: string
  }
  error?: string
}

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token || typeof token !== 'string') {
      return NextResponse.json({
        valid: false,
        error: 'Token is required'
      } as TokenValidationResult)
    }

    // Buscar invitaciones recientes (últimos 7 días) con todos los datos necesarios
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data: recentInvitations, error: invitationError } = await supabaseAdmin
      .from('email_invitations')
      .select(`
        customer_id,
        sent_at,
        customers!inner(
          id,
          email,
          first_name,
          last_name,
          shop_id,
          shops!inner(
            shopify_domain,
            reward_type,
            reward_value,
            reward_currency
          )
        )
      `)
      .gte('sent_at', sevenDaysAgo.toISOString())

    if (invitationError) {
      throw new Error(`Failed to fetch invitations: ${invitationError.message}`)
    }

    // Verificar el token contra cada invitación
    let validTokenData: any = null

    for (const invitation of recentInvitations || []) {
      const customer = invitation.customers
      if (!customer || !customer.shops) continue

      const shop = customer.shops
      
      // Validar el token usando la función helper
      if (validateUGCToken(token, customer.id, shop.shopify_domain, invitation.sent_at)) {
        validTokenData = {
          customerId: customer.id,
          shopDomain: shop.shopify_domain,
          email: customer.email,
          customerName: customer.first_name || 'Cliente',
          shopSettings: {
            reward_type: shop.reward_type,
            reward_value: shop.reward_value,
            reward_currency: shop.reward_currency
          }
        }
        break
      }
    }

    if (!validTokenData) {
      return NextResponse.json({
        valid: false,
        error: 'Invalid or expired token'
      } as TokenValidationResult)
    }

    // Verificar si ya existe una submission para este customer
    const { data: existingSubmission } = await supabaseAdmin
      .from('ugc_submissions')
      .select('id, status')
      .eq('customer_id', validTokenData.customerId)
      .single()

    if (existingSubmission) {
      return NextResponse.json({
        valid: false,
        error: `You have already submitted a video (Status: ${existingSubmission.status})`
      } as TokenValidationResult)
    }

    return NextResponse.json({
      valid: true,
      ...validTokenData
    } as TokenValidationResult)

  } catch (error) {
    console.error('Token validation error:', error)
    return NextResponse.json({
      valid: false,
      error: 'Internal server error'
    } as TokenValidationResult, { status: 500 })
  }
}