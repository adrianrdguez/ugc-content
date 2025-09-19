import { NextRequest, NextResponse } from 'next/server'

// Endpoint para testing del webhook orders/create
export async function POST(request: NextRequest) {
  const mockOrder = {
    id: 123456789,
    order_number: 1001,
    total_price: "29.99",
    financial_status: "paid",
    fulfillment_status: null,
    created_at: new Date().toISOString(),
    customer: {
      id: 987654321,
      email: "test@example.com",
      first_name: "Juan",
      last_name: "Pérez"
    }
  }

  const mockShop = "test-shop.myshopify.com"

  try {
    // Llamar al webhook de orders/create
    const webhookUrl = new URL('/api/webhooks/orders/create', request.url)
    
    const response = await fetch(webhookUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-shopify-shop-domain': mockShop,
        'x-shopify-hmac-sha256': 'mock-signature' // En testing no verificamos la firma
      },
      body: JSON.stringify(mockOrder)
    })

    let result
    try {
      result = await response.json()
    } catch (jsonError) {
      const text = await response.text()
      return NextResponse.json({
        success: false,
        error: 'Webhook returned non-JSON response',
        status: response.status,
        response_body: text.substring(0, 500) + '...'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: response.ok,
      status: response.status,
      webhook_response: result,
      mock_data: {
        order: mockOrder,
        shop: mockShop
      }
    })

  } catch (error) {
    console.error('Test webhook error:', error)
    return NextResponse.json({ error: 'Test failed' }, { status: 500 })
  }
}