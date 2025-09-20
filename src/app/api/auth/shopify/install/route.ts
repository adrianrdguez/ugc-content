import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const shop = searchParams.get('shop')

  // Validate shop parameter
  if (!shop) {
    return NextResponse.json(
      { error: 'Missing shop parameter' },
      { status: 400 }
    )
  }

  // Validate shop domain format
  const shopDomain = shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`
  const shopRegex = /^[a-zA-Z0-9][a-zA-Z0-9\-]*\.myshopify\.com$/
  
  if (!shopRegex.test(shopDomain)) {
    return NextResponse.json(
      { error: 'Invalid shop domain' },
      { status: 400 }
    )
  }

  // Required environment variables
  const clientId = process.env.SHOPIFY_CLIENT_ID
  const redirectUri = process.env.SHOPIFY_REDIRECT_URI
  
  if (!clientId || !redirectUri) {
    console.error('Missing Shopify OAuth configuration')
    return NextResponse.json(
      { error: 'OAuth configuration missing' },
      { status: 500 }
    )
  }

  // Shopify OAuth scopes
  const scopes = [
    'read_customers',
    'write_customers', 
    'read_orders',
    'write_discounts',
    'read_discounts'
  ].join(',')

  // Generate state parameter for security
  const state = crypto.randomBytes(32).toString('hex')
  
  // Store state in session/cookie for verification (in production)
  const response = NextResponse.redirect(
    `https://${shopDomain}/admin/oauth/authorize?` +
    new URLSearchParams({
      client_id: clientId,
      scope: scopes,
      redirect_uri: redirectUri,
      state: state,
      grant_options: '[]' // per-user grants
    }).toString()
  )

  // Set state cookie for verification in callback
  response.cookies.set('shopify_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600 // 10 minutes
  })

  // Set shop domain for callback
  response.cookies.set('shopify_shop_domain', shopDomain, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600 // 10 minutes
  })

  return response
}