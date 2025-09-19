import { NextRequest, NextResponse } from 'next/server'
import { 
  findOrCreateCustomer, 
  incrementOrderCount, 
  isEligibleForUGC, 
  hasReceivedInvitation,
  recordInvitationSent,
  type ShopifyCustomer 
} from '@/lib/customers'
import crypto from 'crypto'

interface ShopifyOrder {
  id: number
  customer: ShopifyCustomer | null
  order_number: number
  total_price: string
  created_at: string
  financial_status: string
  fulfillment_status: string | null
}

function verifyShopifyWebhook(body: string, signature: string): boolean {
  const hmac = crypto.createHmac('sha256', process.env.SHOPIFY_WEBHOOK_SECRET!)
  const digest = hmac.update(body, 'utf8').digest('base64')
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature))
}


export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-shopify-hmac-sha256')
    const shop = request.headers.get('x-shopify-shop-domain')

    if (!signature || !shop) {
      return NextResponse.json({ error: 'Missing required headers' }, { status: 400 })
    }

    // Verificar la autenticidad del webhook
    if (!verifyShopifyWebhook(body, signature)) {
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 })
    }

    const order: ShopifyOrder = JSON.parse(body)

    // Verificaciones de elegibilidad del pedido
    if (!order.customer) {
      return NextResponse.json({ success: true, message: 'No customer in order' })
    }

    // Solo contar pedidos pagados
    if (order.financial_status !== 'paid') {
      return NextResponse.json({ success: true, message: 'Order not paid yet' })
    }

    // Buscar o crear customer
    const customer = await findOrCreateCustomer(order.customer, shop)
    
    // Incrementar contador de pedidos
    const updatedCustomer = await incrementOrderCount(customer.id)

    // Log para debugging
    console.log(`📦 Order processed: ${order.order_number} for ${updatedCustomer.email} (${updatedCustomer.orders_count} orders)`)

    // Verificar elegibilidad para UGC (3+ pedidos)
    const isEligible = await isEligibleForUGC(updatedCustomer.id)
    
    let invitationStatus: 'not_eligible' | 'sent' | 'already_sent' = 'not_eligible'

    if (isEligible) {
      const alreadyInvited = await hasReceivedInvitation(updatedCustomer.id, shop)
      
      if (!alreadyInvited) {
        const invitationSent = await sendUGCInvitation(updatedCustomer, shop)
        
        if (invitationSent) {
          await recordInvitationSent(updatedCustomer.id, shop)
          invitationStatus = 'sent'
          console.log(`🎬 UGC invitation sent to ${updatedCustomer.email}`)
        }
      } else {
        invitationStatus = 'already_sent'
        console.log(`📧 Customer ${updatedCustomer.email} already received UGC invitation`)
      }
    }

    return NextResponse.json({ 
      success: true, 
      customer: updatedCustomer.email,
      orders_count: updatedCustomer.orders_count,
      ugc_eligible: isEligible,
      invitation_status: invitationStatus
    })

  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function sendUGCInvitation(customer: any, shopDomain: string): Promise<boolean> {
  const { sendUGCInvitationEmail } = await import('@/lib/email')
  
  return await sendUGCInvitationEmail({
    customerEmail: customer.email,
    customerName: customer.first_name || 'Cliente',
    shopDomain,
    customerId: customer.id,
  })
}