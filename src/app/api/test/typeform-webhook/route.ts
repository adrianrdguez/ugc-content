import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { email, name } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    // Simular webhook de Typeform
    const mockTypeformWebhook = {
      event_id: `evt_${Date.now()}`,
      event_type: 'form_response',
      form_response: {
        form_id: 'test_form',
        token: `tok_${Date.now()}`,
        submitted_at: new Date().toISOString(),
        definition: {
          id: 'test_form',
          title: 'UGC Interest Form'
        },
        answers: [
          {
            field: { id: 'email_field', type: 'email', ref: 'email' },
            type: 'email',
            email: email
          },
          {
            field: { id: 'name_field', type: 'short_text', ref: 'name' },
            type: 'text',
            text: name || 'Test User'
          },
          {
            field: { id: 'shop_field', type: 'short_text', ref: 'shop_domain' },
            type: 'text',
            text: 'demo-shop.myshopify.com'
          }
        ]
      }
    }

    // Enviar al webhook real
    const webhookResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/webhooks/typeform`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mockTypeformWebhook)
    })

    const result = await webhookResponse.json()

    return NextResponse.json({
      success: true,
      message: 'Typeform webhook simulation successful',
      webhook_result: result,
      test_data: {
        email,
        name: name || 'Test User',
        form_token: mockTypeformWebhook.form_response.token
      }
    })

  } catch (error) {
    console.error('Test webhook error:', error)
    return NextResponse.json({
      success: false,
      error: 'Test failed'
    }, { status: 500 })
  }
}