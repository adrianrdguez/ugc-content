import { NextRequest, NextResponse } from 'next/server'
import { addUserPoints } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, shopDomain, points, description, submissionId } = body

    // Validate required fields
    if (!userId || !shopDomain || !points) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, shopDomain, points' },
        { status: 400 }
      )
    }

    // Validate points is a positive number
    if (typeof points !== 'number' || points <= 0) {
      return NextResponse.json(
        { error: 'Points must be a positive number' },
        { status: 400 }
      )
    }

    // Add points to user
    await addUserPoints(
      userId,
      shopDomain,
      points,
      description || 'Points earned',
      submissionId
    )

    return NextResponse.json({
      success: true,
      message: `Successfully added ${points} points to user`
    })

  } catch (error) {
    console.error('Add points error:', error)
    return NextResponse.json(
      {
        error: 'Failed to add points',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}