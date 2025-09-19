import shopify from './shopify'

export interface RewardConfig {
  type: 'discount' | 'gift_card'
  value: number
  currency: string
  customerEmail: string
  customerName: string
}

export interface RewardResult {
  success: boolean
  shopify_id?: string
  code?: string
  url?: string
  error?: string
}

export async function createShopifyReward(
  shopDomain: string,
  accessToken: string,
  config: RewardConfig
): Promise<RewardResult> {
  try {
    const session = {
      shop: shopDomain,
      accessToken: accessToken
    }

    if (config.type === 'discount') {
      return await createDiscountCode(session, config)
    } else if (config.type === 'gift_card') {
      return await createGiftCard(session, config)
    } else {
      return {
        success: false,
        error: 'Invalid reward type'
      }
    }
  } catch (error) {
    console.error('Shopify reward creation error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create reward'
    }
  }
}

async function createDiscountCode(session: any, config: RewardConfig): Promise<RewardResult> {
  try {
    const client = new shopify.clients.Rest({ session })

    // Crear Price Rule
    const priceRuleData = {
      price_rule: {
        title: `UGC Reward - ${config.customerName}`,
        target_type: 'line_item',
        target_selection: 'all',
        allocation_method: 'across',
        value_type: config.currency === 'PERCENTAGE' ? 'percentage' : 'fixed_amount',
        value: config.currency === 'PERCENTAGE' ? `-${config.value}` : `-${config.value * 100}`, // Shopify usa centavos
        customer_selection: 'all',
        usage_limit: 1,
        once_per_customer: true,
        starts_at: new Date().toISOString(),
        ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 días
      }
    }

    const priceRuleResponse = await client.post({
      path: 'price_rules',
      data: priceRuleData,
    })

    const priceRule = priceRuleResponse.body.price_rule

    // Crear Discount Code
    const discountCodeData = {
      discount_code: {
        code: `UGC-${config.value}${config.currency === 'PERCENTAGE' ? 'PCT' : config.currency}-${Date.now().toString().slice(-6)}`
      }
    }

    const discountCodeResponse = await client.post({
      path: `price_rules/${priceRule.id}/discount_codes`,
      data: discountCodeData,
    })

    const discountCode = discountCodeResponse.body.discount_code

    return {
      success: true,
      shopify_id: priceRule.id.toString(),
      code: discountCode.code
    }

  } catch (error) {
    console.error('Discount creation error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create discount'
    }
  }
}

async function createGiftCard(session: any, config: RewardConfig): Promise<RewardResult> {
  try {
    const client = new shopify.clients.Rest({ session })

    const giftCardData = {
      gift_card: {
        initial_value: config.value * 100, // Shopify usa centavos
        currency: config.currency,
        note: `UGC Reward for ${config.customerName} (${config.customerEmail})`
      }
    }

    const response = await client.post({
      path: 'gift_cards',
      data: giftCardData,
    })

    const giftCard = response.body.gift_card

    return {
      success: true,
      shopify_id: giftCard.id.toString(),
      code: giftCard.code,
      url: giftCard.url
    }

  } catch (error) {
    console.error('Gift card creation error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create gift card'
    }
  }
}