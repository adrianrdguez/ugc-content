import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendUGCUploadEmail } from '@/lib/email'

interface TypeformAnswer {
  field: {
    id: string
    type: string
    ref: string
  }
  type: string
  text?: string
  email?: string
  choice?: {
    label: string
  }
}

interface TypeformWebhook {
  event_id: string
  event_type: string
  form_response: {
    form_id: string
    token: string
    submitted_at: string
    definition: {
      id: string
      title: string
    }
    answers: TypeformAnswer[]
  }
}

export async function POST(request: NextRequest) {
  try {
    const webhook: TypeformWebhook = await request.json()
    
    console.log('Typeform webhook received:', {
      event_type: webhook.event_type,
      form_id: webhook.form_response.form_id,
      token: webhook.form_response.token
    })

    // Solo procesar envíos de formulario
    if (webhook.event_type !== 'form_response') {
      return NextResponse.json({ message: 'Event ignored' })
    }

    // Extraer datos del formulario
    const answers = webhook.form_response.answers
    const email = answers.find(a => a.type === 'email')?.email
    const name = answers.find(a => a.field.type === 'short_text' && a.field.ref === 'name')?.text
    const shopDomain = answers.find(a => a.field.ref === 'shop_domain')?.text || 'demo-shop.myshopify.com'
    const customerToken = answers.find(a => a.field.ref === 'customer_token')?.text

    if (!email) {
      console.error('No email found in Typeform response')
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    // Buscar o crear cliente en la base de datos
    let customer
    try {
      // Buscar cliente existente
      const { data: existingCustomer } = await supabaseAdmin
        .from('customers')
        .select('*')
        .eq('email', email)
        .single()

      if (existingCustomer) {
        customer = existingCustomer
      } else {
        // Crear nuevo cliente
        const { data: newCustomer, error: createError } = await supabaseAdmin
          .from('customers')
          .insert({
            email,
            first_name: name || email.split('@')[0],
            shopify_customer_id: `typeform_${webhook.form_response.token}`,
            orders_count: 3, // Asumimos que viene de Typeform porque ya tiene 3+ pedidos
            shop_id: (await getShopId(shopDomain))
          })
          .select()
          .single()

        if (createError) throw createError
        customer = newCustomer
      }
    } catch (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    // Generar token único para upload
    const uploadToken = `ugc_${customer.id}_${Date.now()}`
    
    // Guardar token (expira automáticamente en 7 días por defecto)
    await supabaseAdmin
      .from('ugc_upload_tokens')
      .insert({
        token: uploadToken,
        customer_id: customer.id,
        typeform_response_token: webhook.form_response.token
        // expires_at se setea automáticamente a NOW() + 7 días
      })

    // Generar URL del formulario de upload
    const uploadUrl = `${process.env.NEXTAUTH_URL}/ugc-upload?token=${uploadToken}`

    // Enviar email con el link
    await sendUGCUploadEmail({
      to: email,
      customerName: customer.first_name || 'Valued Customer',
      uploadUrl,
      shopDomain
    })

    console.log('Upload link sent to:', email)

    return NextResponse.json({
      success: true,
      message: 'Upload link sent successfully',
      customer_id: customer.id,
      upload_token: uploadToken
    })

  } catch (error) {
    console.error('Typeform webhook error:', error)
    return NextResponse.json({
      error: 'Webhook processing failed'
    }, { status: 500 })
  }
}

async function getShopId(shopDomain: string): Promise<string> {
  const { data: shop } = await supabaseAdmin
    .from('shops')
    .select('id')
    .eq('shopify_domain', shopDomain)
    .single()

  if (!shop) {
    // Crear shop de demo si no existe
    const { data: newShop } = await supabaseAdmin
      .from('shops')
      .insert({
        shopify_domain: shopDomain,
        access_token: 'demo_token'
      })
      .select('id')
      .single()
    
    return newShop!.id
  }

  return shop.id
}