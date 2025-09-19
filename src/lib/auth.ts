import { NextRequest } from 'next/server'
import { supabaseAdmin } from './supabase'

export interface ShopAuthResult {
  valid: boolean
  shop?: {
    id: string
    shopify_domain: string
    access_token: string
  }
  error?: string
}

export async function validateShopAuth(request: NextRequest): Promise<ShopAuthResult> {
  const shopDomain = request.headers.get('x-shopify-shop-domain')
  const accessToken = request.headers.get('x-access-token')

  if (!shopDomain || !accessToken) {
    return {
      valid: false,
      error: 'Missing x-shopify-shop-domain or x-access-token headers'
    }
  }

  try {
    // Verificar que la tienda existe y el token coincide
    const { data: shop, error } = await supabaseAdmin
      .from('shops')
      .select('id, shopify_domain, access_token')
      .eq('shopify_domain', shopDomain)
      .eq('access_token', accessToken)
      .single()

    if (error || !shop) {
      return {
        valid: false,
        error: 'Invalid shop or access token'
      }
    }

    return {
      valid: true,
      shop
    }
  } catch (error) {
    return {
      valid: false,
      error: 'Authentication failed'
    }
  }
}