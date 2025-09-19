import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { validateShopAuth } from '@/lib/auth'

interface UGCListingParams {
  status?: 'pending' | 'processing' | 'approved' | 'rejected'
  page?: number
  limit?: number
  customer_email?: string
  date_from?: string
  date_to?: string
}

export async function GET(request: NextRequest) {
  try {
    // Validar autenticación de la tienda
    const auth = await validateShopAuth(request)
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    
    // Parámetros de consulta
    const params: UGCListingParams = {
      status: (searchParams.get('status') as any) || 'pending',
      page: parseInt(searchParams.get('page') || '1'),
      limit: Math.min(parseInt(searchParams.get('limit') || '20'), 100), // Máximo 100
      customer_email: searchParams.get('customer_email') || undefined,
      date_from: searchParams.get('date_from') || undefined,
      date_to: searchParams.get('date_to') || undefined,
    }

    // Construir query base
    let query = supabaseAdmin
      .from('ugc_submissions')
      .select(`
        id,
        video_url,
        video_key,
        status,
        review_notes,
        created_at,
        updated_at,
        customers!inner(
          id,
          email,
          first_name,
          last_name
        ),
        rewards(
          id,
          type,
          value,
          currency,
          status,
          sent_at
        )
      `)
      .eq('shop_id', auth.shop!.id)

    // Aplicar filtros
    if (params.status) {
      query = query.eq('status', params.status)
    }

    if (params.customer_email) {
      query = query.ilike('customers.email', `%${params.customer_email}%`)
    }

    if (params.date_from) {
      query = query.gte('created_at', params.date_from)
    }

    if (params.date_to) {
      query = query.lte('created_at', params.date_to)
    }

    // Ordenar por fecha más reciente
    query = query.order('created_at', { ascending: false })

    // Paginación
    const offset = (params.page! - 1) * params.limit!
    query = query.range(offset, offset + params.limit! - 1)

    const { data: submissions, error, count } = await query

    if (error) {
      throw new Error(`Failed to fetch submissions: ${error.message}`)
    }

    // Contar total para paginación
    const { count: totalCount } = await supabaseAdmin
      .from('ugc_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('shop_id', auth.shop!.id)
      .eq('status', params.status!)

    // Formatear respuesta
    const formattedSubmissions = submissions?.map(submission => ({
      id: submission.id,
      customer_email: submission.customers?.email,
      customer_name: `${submission.customers?.first_name || ''} ${submission.customers?.last_name || ''}`.trim(),
      customer_id: submission.customers?.id,
      video_url: submission.video_url,
      video_key: submission.video_key,
      status: submission.status,
      review_notes: submission.review_notes,
      created_at: submission.created_at,
      updated_at: submission.updated_at,
      reward: submission.rewards?.[0] || null // Primer reward asociado
    })) || []

    return NextResponse.json({
      success: true,
      submissions: formattedSubmissions,
      pagination: {
        page: params.page,
        limit: params.limit,
        total: totalCount || 0,
        pages: Math.ceil((totalCount || 0) / params.limit!)
      },
      filters: params
    })

  } catch (error) {
    console.error('Admin UGC listing error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch submissions'
    }, { status: 500 })
  }
}