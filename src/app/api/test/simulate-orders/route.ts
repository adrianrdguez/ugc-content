import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const results = []
    
    // Simular 4 pedidos del mismo cliente para trigger UGC eligibility
    for (let i = 1; i <= 4; i++) {
      const mockOrder = {
        id: 123456789 + i,
        order_number: 1000 + i,
        total_price: (29.99 + i).toString(),
        financial_status: "paid",
        fulfillment_status: null,
        created_at: new Date().toISOString(),
        customer: {
          id: 987654321, // Mismo customer ID
          email: "juan.perez@example.com",
          first_name: "Juan",
          last_name: "Pérez"
        }
      }

      console.log(`📦 Processing order ${i}/4: #${mockOrder.order_number}`)

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

      const result = await response.json()
      results.push({
        order: i,
        order_number: mockOrder.order_number,
        webhook_result: result
      })

      // Pequeña pausa entre pedidos
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    return NextResponse.json({
      success: true,
      message: 'Simulated 4 orders for the same customer',
      results,
      summary: {
        final_order_count: results[results.length - 1]?.webhook_result?.orders_count,
        ugc_eligible: results[results.length - 1]?.webhook_result?.ugc_eligible,
        invitation_status: results[results.length - 1]?.webhook_result?.invitation_status
      }
    })

  } catch (error) {
    console.error('Simulate orders error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}