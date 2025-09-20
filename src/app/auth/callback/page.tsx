'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createSupabaseClient, ensureUserProfile } from '@/lib/supabase-client'

export default function AuthCallbackPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const supabase = createSupabaseClient()
        
        // Get the auth code from URL params
        const code = searchParams.get('code')
        
        if (code) {
          // Exchange the code for a session
          const { data, error } = await supabase.auth.exchangeCodeForSession(code)
          
          if (error) {
            console.error('Auth error:', error)
            setError('Failed to authenticate. Please try again.')
            return
          }

          if (data.user) {
            // Ensure user profile exists
            await ensureUserProfile()
            
            // Check if this is a new user (created in the last 5 minutes)
            const userCreatedAt = new Date(data.user.created_at)
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
            const isNewUser = userCreatedAt > fiveMinutesAgo
            
            // Redirect based on user status
            if (isNewUser) {
              // New user -> go to upload page
              router.push('/ugc-upload')
            } else {
              // Returning user -> go to profile page  
              router.push('/profile')
            }
            return
          }
        }
        
        // If no code or auth failed, redirect to login
        router.push('/auth/login')
        
      } catch (error) {
        console.error('Callback error:', error)
        setError('Something went wrong. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    handleAuthCallback()
  }, [router, searchParams])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700">Signing you in...</h2>
          <p className="text-gray-500 mt-2">Please wait while we authenticate your account</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center max-w-md w-full">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/auth/login')}
            className="bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return null
}