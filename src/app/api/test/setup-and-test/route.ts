import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Setting up test data...')
    
    // 1. Crear/actualizar tienda de prueba
    const { data: shop, error: shopError } = await supabaseAdmin
      .from('shops')
      .upsert({
        shopify_domain: 'test-shop.myshopify.com',
        access_token: 'test_token_123',
        reward_type: 'discount',
        reward_value: 15.00,
        reward_currency: 'USD'
      })
      .select()
      .single()

    if (shopError) {
      throw new Error(`Failed to create shop: ${shopError.message}`)
    }

    console.log('✅ Test shop created:', shop)

    // 2. Simular webhook order
    const mockOrder = {
      id: 123456789,
      order_number: 1001,
      total_price: "29.99",
      financial_status: "paid",
      fulfillment_status: null,
      created_at: new Date().toISOString(),
      customer: {
        id: 987654321,
        email: "juan.perez@example.com",
        first_name: "Juan",
        last_name: "Pérez"
      }
    }

    console.log('📦 Testing webhook with order:', mockOrder.order_number)

    // 3. Llamar al webhook real
    const webhookUrl = new URL('/api/webhooks/orders/create', request.url)
    
    const response = await fetch(webhookUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-shopify-shop-domain': 'test-shop.myshopify.com',
        'x-shopify-hmac-sha256': 'mock-signature'
      },
      body: JSON.stringify(mockOrder)
    })

    const webhookResult = await response.json()

    // 4. Verificar resultados en la BD
    const { data: customer } = await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('shopify_customer_id', '987654321')
      .single()

    const { data: invitation } = await supabaseAdmin
      .from('email_invitations')
      .select('*')
      .eq('customer_id', customer?.id || '')
      .single()

    return NextResponse.json({
      success: true,
      setup: {
        shop_created: !!shop,
        shop_id: shop?.id
      },
      webhook: {
        status: response.status,
        result: webhookResult
      },
      database_state: {
        customer: customer || null,
        invitation: invitation || null,
        customer_orders: customer?.orders_count || 0,
        ugc_eligible: (customer?.orders_count || 0) >= 3
      }
    })

  } catch (error) {
    console.error('Setup and test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}