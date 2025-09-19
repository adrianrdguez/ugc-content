import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { validateShopAuth } from '@/lib/auth'

interface RejectSubmissionRequest {
  notes: string // Requerido para rechazo
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Validar autenticación
    const auth = await validateShopAuth(request)
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: 401 })
    }

    const { notes }: RejectSubmissionRequest = await request.json()
    const submissionId = params.id

    // Validar que se proporcionaron notas (requerido para rechazo)
    if (!notes || notes.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Notes are required when rejecting a submission'
      }, { status: 400 })
    }

    // Verificar que la submission existe y pertenece a esta tienda
    const { data: submission, error: fetchError } = await supabaseAdmin
      .from('ugc_submissions')
      .select(`
        id,
        status,
        customer_id,
        customers!inner(
          email,
          first_name,
          last_name
        )
      `)
      .eq('id', submissionId)
      .eq('shop_id', auth.shop!.id)
      .single()

    if (fetchError || !submission) {
      return NextResponse.json({
        success: false,
        error: 'Submission not found or access denied'
      }, { status: 404 })
    }

    // Verificar que no esté ya procesada
    if (submission.status === 'rejected') {
      return NextResponse.json({
        success: false,
        error: 'Submission is already rejected'
      }, { status: 409 })
    }

    if (submission.status === 'approved') {
      return NextResponse.json({
        success: false,
        error: 'Cannot reject an approved submission'
      }, { status: 409 })
    }

    // Actualizar submission a rechazada
    const { error: updateError } = await supabaseAdmin
      .from('ugc_submissions')
      .update({
        status: 'rejected',
        review_notes: notes.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', submissionId)

    if (updateError) {
      throw new Error(`Failed to update submission: ${updateError.message}`)
    }

    // TODO: Enviar email de notificación al cliente con feedback

    console.log(`❌ UGC Submission rejected: ${submissionId} for ${submission.customers?.email}`)
    console.log(`📝 Rejection notes: ${notes.trim()}`)

    return NextResponse.json({
      success: true,
      submission: {
        id: submissionId,
        status: 'rejected',
        review_notes: notes.trim(),
        updated_at: new Date().toISOString()
      },
      message: 'Submission rejected successfully.'
    })

  } catch (error) {
    console.error('Reject submission error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reject submission'
    }, { status: 500 })
  }
}