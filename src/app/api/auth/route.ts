import { NextRequest, NextResponse } from 'next/server'
import shopify from '@/lib/shopify'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const shop = url.searchParams.get('shop')

  if (!shop) {
    return NextResponse.json({ error: 'Missing shop parameter' }, { status: 400 })
  }

  try {
    const authUrl = await shopify.auth.begin({
      shop: shop.toString(),
      callbackPath: '/api/auth/callback',
      isOnline: false,
    })

    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('Auth error:', error)
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 })
  }
}