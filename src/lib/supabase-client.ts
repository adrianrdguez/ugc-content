import { createBrowserClient } from '@supabase/ssr'

// Client-side Supabase client (for use in components)
export const createSupabaseClient = () => {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Auth helpers for client components
export async function signInWithMagicLink(email: string, redirectTo?: string) {
  const supabase = createSupabaseClient()
  
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo || `${window.location.origin}/auth/callback`
    }
  })

  if (error) {
    throw new Error(`Failed to send magic link: ${error.message}`)
  }

  return data
}

// Helper to ensure user profile exists
export async function ensureUserProfile() {
  const supabase = createSupabaseClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    return null
  }

  // Check if profile exists
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('id', user.id)
    .single()

  if (profileError && profileError.code === 'PGRST116') {
    // Profile doesn't exist, create it
    const { error: insertError } = await supabase
      .from('user_profiles')
      .insert({
        id: user.id,
        email: user.email || '',
        first_name: user.user_metadata?.first_name || user.email?.split('@')[0] || 'User'
      })
    
    if (insertError) {
      console.error('Failed to create user profile:', insertError)
      throw new Error('Failed to create user profile')
    }
  }

  return user
}

export async function signOut() {
  const supabase = createSupabaseClient()
  const { error } = await supabase.auth.signOut()
  
  if (error) {
    throw new Error(`Failed to sign out: ${error.message}`)
  }
}

export async function updateUserProfile(updates: any) {
  const supabase = createSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('Not authenticated')
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update profile: ${error.message}`)
  }

  return data
}