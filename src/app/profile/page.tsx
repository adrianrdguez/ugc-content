'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient, signOut, ensureUserProfile } from '@/lib/supabase-client'
import type { UserReward, RewardTransaction } from '@/lib/supabase-server'

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [rewards, setRewards] = useState<UserReward | null>(null)
  const [transactions, setTransactions] = useState<RewardTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [shopDomain, setShopDomain] = useState('demo-shop.myshopify.com')
  const router = useRouter()

  useEffect(() => {
    loadUserData()
  }, [])

  const loadUserData = async () => {
    try {
      // Ensure user profile exists
      const user = await ensureUserProfile()
      
      if (!user) {
        router.push('/auth/login')
        return
      }

      setUser(user)
      const supabase = createSupabaseClient()

      // Load user rewards and transactions (client-side calls)
      const { data: userRewards } = await supabase
        .from('user_rewards')
        .select('*')
        .eq('user_id', user.id)
        .eq('shop_domain', shopDomain)
        .single()

      const { data: userTransactions } = await supabase
        .from('reward_transactions')
        .select('*')
        .eq('user_id', user.id)
        .eq('shop_domain', shopDomain)
        .order('created_at', { ascending: false })
        .limit(50)

      setRewards(userRewards)
      setTransactions(userTransactions || [])
    } catch (error) {
      console.error('Failed to load user data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/auth/login')
    } catch (error) {
      console.error('Failed to sign out:', error)
    }
  }

  const getLevelInfo = (level: number) => {
    const levels = [
      { name: 'Beginner', color: 'bg-gray-500', emoji: '🌟' },
      { name: 'Creator', color: 'bg-blue-500', emoji: '🎬' },
      { name: 'Star', color: 'bg-purple-500', emoji: '⭐' },
      { name: 'Pro', color: 'bg-orange-500', emoji: '🏆' },
      { name: 'Expert', color: 'bg-red-500', emoji: '💎' },
      { name: 'Legend', color: 'bg-gradient-to-r from-yellow-400 to-orange-500', emoji: '👑' }
    ]
    return levels[level - 1] || levels[0]
  }

  const getPointsToNextLevel = (currentPoints: number, currentLevel: number) => {
    const thresholds = [0, 100, 500, 1000, 2500, 5000]
    const nextThreshold = thresholds[currentLevel] || 5000
    return Math.max(0, nextThreshold - currentPoints)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const levelInfo = getLevelInfo(rewards?.level || 1)
  const pointsToNext = getPointsToNextLevel(rewards?.points || 0, rewards?.level || 1)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Your Profile</h1>
              <p className="text-gray-600">Track your progress and rewards</p>
            </div>
            <button
              onClick={handleSignOut}
              className="text-gray-600 hover:text-gray-800 font-medium"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 py-8 space-y-6">
        {/* User Info Card */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-2xl">
                {user.email?.charAt(0).toUpperCase() || '👤'}
              </div>
              <div>
                <h2 className="text-xl font-semibold">{user.email}</h2>
                <p className="text-blue-100">Member since {new Date(user.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{rewards?.points || 0}</div>
                <div className="text-gray-600">Total Points</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{rewards?.total_approved || 0}</div>
                <div className="text-gray-600">Videos Approved</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">{rewards?.total_videos || 0}</div>
                <div className="text-gray-600">Total Submissions</div>
              </div>
            </div>
          </div>
        </div>

        {/* Level Progress Card */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-900">Your Level</h3>
            <div className={`px-3 py-1 rounded-full text-white font-medium ${levelInfo.color}`}>
              {levelInfo.emoji} {levelInfo.name}
            </div>
          </div>
          
          {pointsToNext > 0 ? (
            <div>
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Progress to next level</span>
                <span>{pointsToNext} points needed</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${Math.max(10, ((rewards?.points || 0) / ((rewards?.points || 0) + pointsToNext)) * 100)}%` 
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <div className="text-4xl mb-2">🎉</div>
              <p className="text-lg font-medium text-gray-900">You've reached the maximum level!</p>
              <p className="text-gray-600">Keep creating amazing content!</p>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h3>
          
          {transactions.length > 0 ? (
            <div className="space-y-4">
              {transactions.slice(0, 10).map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${
                      transaction.type === 'earned' ? 'bg-green-500' :
                      transaction.type === 'redeemed' ? 'bg-red-500' :
                      transaction.type === 'bonus' ? 'bg-blue-500' : 'bg-gray-500'
                    }`} />
                    <div>
                      <p className="font-medium text-gray-900">{transaction.description}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className={`font-semibold ${
                    transaction.points > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transaction.points > 0 ? '+' : ''}{transaction.points} points
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">📝</div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">No activity yet</h4>
              <p className="text-gray-600">Start uploading videos to earn your first points!</p>
            </div>
          )}
        </div>

        {/* Rewards Information */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-200">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">🎁 How to Earn Rewards</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <span className="text-green-500">+50</span>
                <span className="text-gray-700">Video uploaded</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-green-500">+100</span>
                <span className="text-gray-700">Video approved</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-green-500">+25</span>
                <span className="text-gray-700">Video gets engagement</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <span className="text-blue-500">500</span>
                <span className="text-gray-700">10% discount code</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-blue-500">1000</span>
                <span className="text-gray-700">Free shipping</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-blue-500">2000</span>
                <span className="text-gray-700">Exclusive products</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}