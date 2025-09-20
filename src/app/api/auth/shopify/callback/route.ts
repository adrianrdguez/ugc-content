import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const shop = searchParams.get('shop')

  // Get stored state and shop from cookies
  const storedState = request.cookies.get('shopify_oauth_state')?.value
  const storedShop = request.cookies.get('shopify_shop_domain')?.value

  // Validate parameters
  if (!code || !state || !shop) {
    return NextResponse.json(
      { error: 'Missing required OAuth parameters' },
      { status: 400 }
    )
  }

  // Verify state parameter (CSRF protection)
  if (!storedState || state !== storedState) {
    return NextResponse.json(
      { error: 'Invalid state parameter' },
      { status: 400 }
    )
  }

  // Verify shop domain matches
  const shopDomain = shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`
  if (!storedShop || shopDomain !== storedShop) {
    return NextResponse.json(
      { error: 'Shop domain mismatch' },
      { status: 400 }
    )
  }

  // Required environment variables
  const clientId = process.env.SHOPIFY_CLIENT_ID
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET
  
  if (!clientId || !clientSecret) {
    console.error('Missing Shopify OAuth configuration')
    return NextResponse.json(
      { error: 'OAuth configuration missing' },
      { status: 500 }
    )
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch(`https://${shopDomain}/admin/oauth/access_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
      }),
    })

    if (!tokenResponse.ok) {
      throw new Error(`Token exchange failed: ${tokenResponse.statusText}`)
    }

    const tokenData = await tokenResponse.json()
    const { access_token, scope } = tokenData

    if (!access_token) {
      throw new Error('No access token received')
    }

    // Save merchant to database
    const { data, error } = await supabase
      .from('merchants')
      .upsert({
        shop_domain: shopDomain,
        access_token: access_token,
        scope: scope,
        is_active: true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'shop_domain'
      })
      .select()

    if (error) {
      console.error('Database error:', error)
      throw new Error('Failed to save merchant data')
    }

    // Create session for the merchant
    const sessionToken = crypto.randomBytes(32).toString('hex')
    
    // In production, you'd store this session in Redis or database
    // For now, we'll use a simple approach

    // Clear OAuth cookies
    const response = NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?shop=${shopDomain}&access_token=${access_token}`
    )
    
    response.cookies.delete('shopify_oauth_state')
    response.cookies.delete('shopify_shop_domain')

    // Set merchant session cookie
    response.cookies.set('shopify_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 86400 // 24 hours
    })

    response.cookies.set('shopify_shop', shopDomain, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 86400 // 24 hours
    })

    return response

  } catch (error) {
    console.error('OAuth callback error:', error)
    return NextResponse.json(
      { 
        error: 'OAuth callback failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}