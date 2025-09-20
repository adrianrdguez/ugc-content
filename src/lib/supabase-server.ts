import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Server-side Supabase client
export const createSupabaseServerClient = () => {
  const cookieStore = cookies()
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )
}

// Service role client (for admin operations)
export const createSupabaseAdminClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

// Types
export interface UserProfile {
  id: string
  email: string
  first_name?: string
  last_name?: string
  avatar_url?: string
  preferences: any
  created_at: string
  updated_at: string
}

export interface UserReward {
  id: string
  user_id: string
  shop_domain: string
  points: number
  total_videos: number
  total_approved: number
  level: number
  badges: string[]
  created_at: string
  updated_at: string
}

export interface RewardTransaction {
  id: string
  user_id: string
  shop_domain: string
  type: 'earned' | 'redeemed' | 'bonus' | 'penalty'
  points: number
  description: string
  submission_id?: string
  metadata: any
  created_at: string
}

export interface RewardRedemption {
  id: string
  user_id: string
  shop_domain: string
  reward_type: 'discount_code' | 'store_credit' | 'free_shipping' | 'product'
  points_cost: number
  reward_value: string
  status: 'pending' | 'fulfilled' | 'expired' | 'cancelled'
  expires_at?: string
  fulfilled_at?: string
  metadata: any
  created_at: string
}

// Server-side auth helpers
export async function getCurrentUser() {
  const supabase = createSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    return null
  }

  return user
}

export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return profile
}

export async function getUserRewards(shopDomain: string): Promise<UserReward | null> {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  const { data: rewards } = await supabase
    .from('user_rewards')
    .select('*')
    .eq('user_id', user.id)
    .eq('shop_domain', shopDomain)
    .single()

  return rewards
}

export async function getRewardTransactions(
  shopDomain: string,
  limit: number = 50
): Promise<RewardTransaction[]> {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return []

  const { data: transactions } = await supabase
    .from('reward_transactions')
    .select('*')
    .eq('user_id', user.id)
    .eq('shop_domain', shopDomain)
    .order('created_at', { ascending: false })
    .limit(limit)

  return transactions || []
}

export async function getRewardRedemptions(
  shopDomain: string,
  limit: number = 50
): Promise<RewardRedemption[]> {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return []

  const { data: redemptions } = await supabase
    .from('reward_redemptions')
    .select('*')
    .eq('user_id', user.id)
    .eq('shop_domain', shopDomain)
    .order('created_at', { ascending: false })
    .limit(limit)

  return redemptions || []
}

// Admin functions (using service role)
export async function addUserPoints(
  userId: string,
  shopDomain: string,
  points: number,
  description: string = 'Points earned',
  submissionId?: string
): Promise<void> {
  const supabase = createSupabaseAdminClient()
  
  const { error } = await supabase.rpc('add_user_points', {
    p_user_id: userId,
    p_shop_domain: shopDomain,
    p_points: points,
    p_description: description,
    p_submission_id: submissionId
  })

  if (error) {
    throw new Error(`Failed to add points: ${error.message}`)
  }
}

export async function createRedemption(
  userId: string,
  shopDomain: string,
  rewardType: RewardRedemption['reward_type'],
  pointsCost: number,
  rewardValue: string,
  expiresAt?: Date
): Promise<RewardRedemption> {
  const supabase = createSupabaseAdminClient()
  
  // First, check if user has enough points
  const { data: userRewards } = await supabase
    .from('user_rewards')
    .select('points')
    .eq('user_id', userId)
    .eq('shop_domain', shopDomain)
    .single()

  if (!userRewards || userRewards.points < pointsCost) {
    throw new Error('Insufficient points for redemption')
  }

  // Create redemption
  const { data: redemption, error } = await supabase
    .from('reward_redemptions')
    .insert({
      user_id: userId,
      shop_domain: shopDomain,
      reward_type: rewardType,
      points_cost: pointsCost,
      reward_value: rewardValue,
      expires_at: expiresAt?.toISOString()
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create redemption: ${error.message}`)
  }

  // Deduct points
  await addUserPoints(userId, shopDomain, -pointsCost, `Redeemed: ${rewardType}`)

  return redemption
}