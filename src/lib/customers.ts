import { supabaseAdmin } from './supabase'
import { Database } from './database.types'

type Customer = Database['public']['Tables']['customers']['Row']
type CustomerInsert = Database['public']['Tables']['customers']['Insert']

export interface ShopifyCustomer {
  id: number
  email: string
  first_name: string
  last_name: string
}

export async function findOrCreateCustomer(
  shopifyCustomer: ShopifyCustomer,
  shopDomain: string
): Promise<Customer> {
  // Primero obtener shop_id desde el dominio
  const { data: shopId, error: shopError } = await supabaseAdmin.rpc('get_shop_id', {
    domain: shopDomain
  })

  if (shopError || !shopId) {
    throw new Error(`Shop not found for domain: ${shopDomain}`)
  }

  // Buscar customer existente
  const { data: existingCustomer } = await supabaseAdmin
    .from('customers')
    .select('*')
    .eq('shopify_customer_id', shopifyCustomer.id.toString())
    .eq('shop_id', shopId)
    .single()

  if (existingCustomer) {
    return existingCustomer
  }

  // Crear nuevo customer
  const customerData: CustomerInsert = {
    shopify_customer_id: shopifyCustomer.id.toString(),
    email: shopifyCustomer.email,
    first_name: shopifyCustomer.first_name,
    last_name: shopifyCustomer.last_name,
    orders_count: 0,
    shop_id: shopId,
  }

  const { data: newCustomer, error } = await supabaseAdmin
    .from('customers')
    .insert(customerData)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create customer: ${error.message}`)
  }

  return newCustomer
}

export async function incrementOrderCount(customerId: string): Promise<Customer> {
  const { data, error } = await supabaseAdmin.rpc('increment_order_count', { 
    customer_id: customerId 
  })
  
  if (error) {
    throw new Error(`Failed to update order count: ${error.message}`)
  }
  
  return data
}

export async function isEligibleForUGC(customerId: string): Promise<boolean> {
  const { data: customer } = await supabaseAdmin
    .from('customers')
    .select('orders_count')
    .eq('id', customerId)
    .single()

  return customer ? customer.orders_count >= 3 : false
}

export async function hasReceivedInvitation(
  customerId: string, 
  shopDomain: string
): Promise<boolean> {
  // Obtener shop_id desde el dominio
  const { data: shopId, error: shopError } = await supabaseAdmin.rpc('get_shop_id', {
    domain: shopDomain
  })

  if (shopError || !shopId) {
    throw new Error(`Shop not found for domain: ${shopDomain}`)
  }

  const { data: invitation } = await supabaseAdmin
    .from('email_invitations')
    .select('id')
    .eq('customer_id', customerId)
    .eq('shop_id', shopId)
    .single()

  return !!invitation
}

export async function recordInvitationSent(
  customerId: string,
  shopDomain: string
): Promise<void> {
  // Obtener shop_id desde el dominio
  const { data: shopId, error: shopError } = await supabaseAdmin.rpc('get_shop_id', {
    domain: shopDomain
  })

  if (shopError || !shopId) {
    throw new Error(`Shop not found for domain: ${shopDomain}`)
  }

  const { error } = await supabaseAdmin
    .from('email_invitations')
    .insert({
      customer_id: customerId,
      shop_id: shopId,
    })

  if (error) {
    throw new Error(`Failed to record invitation: ${error.message}`)
  }
}