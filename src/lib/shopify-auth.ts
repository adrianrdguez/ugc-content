import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface ShopifySession {
  shop: string
  accessToken: string
  scope: string
  isActive: boolean
}

/**
 * Verify Shopify session token (for embedded apps)
 */
export function verifyShopifySessionToken(sessionToken: string): boolean {
  try {
    const secret = process.env.SHOPIFY_CLIENT_SECRET
    if (!secret) return false

    // In a real implementation, you'd decode and verify the JWT
    // For now, we'll implement a simple verification
    return sessionToken.length > 0
  } catch (error) {
    console.error('Session token verification failed:', error)
    return false
  }
}

/**
 * Get merchant session from request
 */
export async function getMerchantSession(request: NextRequest): Promise<ShopifySession | null> {
  try {
    // Try to get shop from URL params first (for testing)
    const url = new URL(request.url)
    const shopParam = url.searchParams.get('shop')
    const accessTokenParam = url.searchParams.get('access_token')

    if (shopParam && accessTokenParam) {
      // Verify this merchant exists in database
      const { data: merchant } = await supabase
        .from('merchants')
        .select('*')
        .eq('shop_domain', shopParam)
        .eq('access_token', accessTokenParam)
        .single()

      if (merchant) {
        return {
          shop: merchant.shop_domain,
          accessToken: merchant.access_token,
          scope: merchant.scope || '',
          isActive: merchant.is_active
        }
      }
    }

    // Try to get from headers (for API calls)
    const shopHeader = request.headers.get('x-shopify-shop-domain')
    const tokenHeader = request.headers.get('x-access-token')

    if (shopHeader && tokenHeader) {
      const { data: merchant } = await supabase
        .from('merchants')
        .select('*')
        .eq('shop_domain', shopHeader)
        .eq('access_token', tokenHeader)
        .single()

      if (merchant) {
        return {
          shop: merchant.shop_domain,
          accessToken: merchant.access_token,
          scope: merchant.scope || '',
          isActive: merchant.is_active
        }
      }
    }

    // Try to get from cookies (for browser sessions)
    const sessionCookie = request.cookies.get('shopify_session')?.value
    const shopCookie = request.cookies.get('shopify_shop')?.value

    if (sessionCookie && shopCookie) {
      // In production, you'd verify the session token against stored sessions
      const { data: merchant } = await supabase
        .from('merchants')
        .select('*')
        .eq('shop_domain', shopCookie)
        .single()

      if (merchant) {
        return {
          shop: merchant.shop_domain,
          accessToken: merchant.access_token,
          scope: merchant.scope || '',
          isActive: merchant.is_active
        }
      }
    }

    return null
  } catch (error) {
    console.error('Failed to get merchant session:', error)
    return null
  }
}

/**
 * Require authentication middleware
 */
export async function requireShopifyAuth(request: NextRequest): Promise<ShopifySession> {
  const session = await getMerchantSession(request)
  
  if (!session) {
    throw new Error('Authentication required')
  }

  if (!session.isActive) {
    throw new Error('Merchant account is inactive')
  }

  return session
}

/**
 * Make authenticated request to Shopify API
 */
export async function shopifyApiRequest(
  session: ShopifySession,
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = `https://${session.shop}/admin/api/2024-01/${endpoint}`
  
  return fetch(url, {
    ...options,
    headers: {
      'X-Shopify-Access-Token': session.accessToken,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
}

/**
 * Generate Shopify App install URL
 */
export function generateInstallUrl(shop: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return `${baseUrl}/api/auth/shopify/install?shop=${shop}`
}

/**
 * Verify webhook authenticity
 */
export function verifyWebhook(data: string, signature: string): boolean {
  try {
    const secret = process.env.SHOPIFY_WEBHOOK_SECRET
    if (!secret) return false

    const calculated = crypto
      .createHmac('sha256', secret)
      .update(data, 'utf8')
      .digest('base64')

    return crypto.timingSafeEqual(
      Buffer.from(calculated),
      Buffer.from(signature)
    )
  } catch (error) {
    console.error('Webhook verification failed:', error)
    return false
  }
}