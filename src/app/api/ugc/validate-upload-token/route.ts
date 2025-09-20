import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json({
        valid: false,
        error: 'Token required'
      }, { status: 400 })
    }

    // Buscar token en la base de datos
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('ugc_upload_tokens')
      .select(`
        *,
        customers!inner (
          id,
          email,
          first_name,
          shops!inner (
            shopify_domain
          )
        )
      `)
      .eq('token', token)
      .is('used_at', null) // Token no usado
      .gt('expires_at', new Date().toISOString()) // No expirado
      .single()

    if (tokenError || !tokenData) {
      return NextResponse.json({
        valid: false,
        error: 'Invalid or expired token'
      })
    }

    // Retornar datos del cliente
    return NextResponse.json({
      valid: true,
      customer: {
        id: tokenData.customers.id,
        email: tokenData.customers.email,
        first_name: tokenData.customers.first_name,
        shopDomain: tokenData.customers.shops.shopify_domain
      }
    })

  } catch (error) {
    console.error('Token validation error:', error)
    return NextResponse.json({
      valid: false,
      error: 'Failed to validate token'
    }, { status: 500 })
  }
}