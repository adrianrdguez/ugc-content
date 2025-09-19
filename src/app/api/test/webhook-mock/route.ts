import { NextRequest, NextResponse } from 'next/server'

// Mock webhook que simula el flujo completo sin Supabase
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

  // Simular el procesamiento del webhook
  console.log(`📦 Mock Order processed: ${mockOrder.order_number} for ${mockOrder.customer.email}`)

  // Simular different scenarios
  const scenarios = [
    { orders_count: 1, ugc_eligible: false, invitation_status: 'not_eligible' },
    { orders_count: 2, ugc_eligible: false, invitation_status: 'not_eligible' },
    { orders_count: 3, ugc_eligible: true, invitation_status: 'sent' },
    { orders_count: 4, ugc_eligible: true, invitation_status: 'already_sent' },
  ]

  const scenario = scenarios[Math.floor(Math.random() * scenarios.length)]

  if (scenario.invitation_status === 'sent') {
    console.log(`🎬 Mock UGC invitation sent to ${mockOrder.customer.email}`)
  } else if (scenario.invitation_status === 'already_sent') {
    console.log(`📧 Mock customer ${mockOrder.customer.email} already received UGC invitation`)
  }

  return NextResponse.json({
    success: true,
    customer: mockOrder.customer.email,
    orders_count: scenario.orders_count,
    ugc_eligible: scenario.ugc_eligible,
    invitation_status: scenario.invitation_status,
    mock_data: {
      order: mockOrder,
      shop: mockShop,
      scenario: scenario
    }
  })
}