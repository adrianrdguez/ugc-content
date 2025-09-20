import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST() {
  try {
    const newPublicUrl = 'https://pub-1bece16f262c47d8b7a03e99123c3c20.r2.dev'
    const oldPublicUrl = 'https://e4566d5b4f5ff8906901cc5772d44513.r2.dev'

    // Obtener submissions con URLs antiguas
    const { data: submissions, error: fetchError } = await supabaseAdmin
      .from('ugc_submissions')
      .select('id, video_url, video_key')
      .like('video_url', `${oldPublicUrl}%`)

    if (fetchError) {
      throw fetchError
    }

    const updatePromises = submissions.map(submission => {
      const newVideoUrl = `${newPublicUrl}/${submission.video_key}`
      
      return supabaseAdmin
        .from('ugc_submissions')
        .update({ video_url: newVideoUrl })
        .eq('id', submission.id)
    })

    const results = await Promise.all(updatePromises)
    
    const errors = results.filter(result => result.error)
    if (errors.length > 0) {
      console.error('Some updates failed:', errors)
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${submissions.length} video URLs`,
      updated_count: submissions.length,
      errors: errors.length
    })

  } catch (error) {
    console.error('Update video URLs error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}