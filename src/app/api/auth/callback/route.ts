import { NextRequest, NextResponse } from 'next/server'
import shopify from '@/lib/shopify'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  
  try {
    const callback = await shopify.auth.callback({
      rawRequest: request,
    })

    const { session } = callback

    if (!session) {
      return NextResponse.json({ error: 'No session found' }, { status: 400 })
    }

    // Guardar/actualizar la tienda en Supabase
    const { error } = await supabaseAdmin
      .from('shops')
      .upsert({
        shopify_domain: session.shop,
        access_token: session.accessToken!,
      })

    if (error) {
      console.error('Error saving shop:', error)
      return NextResponse.json({ error: 'Failed to save shop data' }, { status: 500 })
    }

    // Redirigir al dashboard embebido
    const redirectUrl = `https://${session.shop}/admin/apps/${process.env.SHOPIFY_API_KEY}`
    return NextResponse.redirect(redirectUrl)

  } catch (error) {
    console.error('Callback error:', error)
    return NextResponse.json({ error: 'Authentication callback failed' }, { status: 500 })
  }
}