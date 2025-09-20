import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    // Obtener las últimas submissions
    const { data: submissions, error } = await supabaseAdmin
      .from('ugc_submissions')
      .select(`
        *,
        customers!inner (
          email,
          first_name,
          shops!inner (
            shopify_domain
          )
        )
      `)
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      throw error
    }

    // Para cada submission, verificar si el video existe
    const submissionsWithStatus = await Promise.all(
      submissions.map(async (submission) => {
        let videoStatus = 'unknown'
        let videoError = null
        
        if (submission.video_url) {
          try {
            const response = await fetch(submission.video_url, { method: 'HEAD' })
            videoStatus = response.ok ? 'accessible' : `error_${response.status}`
          } catch (error) {
            videoStatus = 'fetch_error'
            videoError = error instanceof Error ? error.message : 'Unknown error'
          }
        }

        return {
          ...submission,
          videoStatus,
          videoError,
          customer: submission.customers
        }
      })
    )

    return NextResponse.json({
      success: true,
      submissions: submissionsWithStatus
    })

  } catch (error) {
    console.error('Debug submissions error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}