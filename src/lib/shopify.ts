import { shopifyApi, LATEST_API_VERSION } from '@shopify/shopify-api'
import '@shopify/shopify-api/adapters/node'

const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY!,
  apiSecretKey: process.env.SHOPIFY_API_SECRET!,
  scopes: ['read_customers', 'write_discounts', 'read_orders'],
  hostName: process.env.SHOPIFY_APP_URL!.replace(/https:\/\//, ''),
  apiVersion: LATEST_API_VERSION,
  isEmbeddedApp: true,
  logger: {
    level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  },
})

export default shopify