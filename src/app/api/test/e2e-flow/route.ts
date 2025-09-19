import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { generateUGCToken, generateUGCFormUrl } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    console.log('🎬 Starting E2E UGC Flow Test...')

    // 1. Ensure shop exists
    const { data: shop, error: shopError } = await supabaseAdmin
      .from('shops')
      .select()
      .eq('shopify_domain', 'test-shop.myshopify.com')
      .single()

    if (shopError) {
      throw new Error(`Failed to create shop: ${shopError.message}`)
    }

    console.log('✅ 1. Shop created/updated')

    // 2. Get existing customer and ensure 3+ orders
    const { data: customer, error: customerError } = await supabaseAdmin
      .from('customers')
      .select()
      .eq('email', 'juan.perez@example.com')
      .eq('shop_id', shop.id)
      .single()
    
    if (customerError) {
      throw new Error(`Customer not found: ${customerError.message}. Run webhook test first.`)
    }

    // Update customer to have 3+ orders if needed
    if (customer.orders_count < 3) {
      const { data: updatedCustomer, error: updateError } = await supabaseAdmin
        .from('customers')
        .update({ orders_count: 3 })
        .eq('id', customer.id)
        .select()
        .single()
      
      if (updateError) {
        throw new Error(`Failed to update customer: ${updateError.message}`)
      }
      
      customer.orders_count = updatedCustomer.orders_count
    }

    console.log('✅ 2. Customer created with 3 orders (UGC eligible)')

    // 3. Create email invitation
    await supabaseAdmin
      .from('email_invitations')
      .delete()
      .eq('customer_id', customer.id)

    const invitationTimestamp = new Date().toISOString()
    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from('email_invitations')
      .insert({
        customer_id: customer.id,
        shop_id: shop.id,
        sent_at: invitationTimestamp
      })
      .select()
      .single()

    if (invitationError) {
      throw new Error(`Failed to create invitation: ${invitationError.message}`)
    }

    console.log('✅ 3. Email invitation created')

    // 4. Generate UGC token and form URL
    const timestamp = new Date(invitation.sent_at).getTime()
    const token = generateUGCToken(customer.id, shop.shopify_domain, timestamp)
    const formUrl = generateUGCFormUrl(token)

    console.log('✅ 4. UGC token and form URL generated')

    // 5. Create a mock UGC submission (simulating user uploaded video)
    // First delete any existing submission for this customer
    await supabaseAdmin
      .from('ugc_submissions')
      .delete()
      .eq('customer_id', customer.id)

    const { data: submission, error: submissionError } = await supabaseAdmin
      .from('ugc_submissions')
      .insert({
        customer_id: customer.id,
        shop_id: shop.id,
        video_key: `ugc/${shop.shopify_domain}/${customer.id}/${Date.now()}_test_video.mp4`,
        video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', // Sample video URL
        status: 'pending'
      })
      .select()
      .single()

    if (submissionError) {
      throw new Error(`Failed to create submission: ${submissionError.message}`)
    }

    console.log('✅ 5. Mock UGC submission created')

    // 6. Summary
    const testData = {
      shop: {
        id: shop.id,
        domain: shop.shopify_domain,
        reward_type: shop.reward_type,
        reward_value: shop.reward_value
      },
      customer: {
        id: customer.id,
        email: customer.email,
        name: `${customer.first_name} ${customer.last_name}`,
        orders_count: customer.orders_count
      },
      invitation: {
        id: invitation.id,
        sent_at: invitation.sent_at
      },
      ugc_form: {
        token,
        url: formUrl
      },
      submission: {
        id: submission.id,
        status: submission.status,
        video_url: submission.video_url,
        video_key: submission.video_key
      },
      next_steps: {
        dashboard_url: 'http://localhost:3001/dashboard',
        form_url: formUrl,
        test_approve_url: `http://localhost:3001/api/admin/ugc/${submission.id}/approve`,
        test_reject_url: `http://localhost:3001/api/admin/ugc/${submission.id}/reject`
      }
    }

    console.log('🎉 E2E Flow Test Complete!')
    console.log('📊 Dashboard URL:', testData.next_steps.dashboard_url)
    console.log('📝 UGC Form URL:', testData.ugc_form.url)

    return NextResponse.json({
      success: true,
      message: 'E2E flow test completed successfully!',
      data: testData,
      instructions: {
        step_1: 'Open dashboard URL to see the pending submission',
        step_2: 'Click View to see video details',
        step_3: 'Click Approve to create reward and test Shopify integration',
        step_4: 'Check rewards table for created discount/gift card'
      }
    })

  } catch (error) {
    console.error('E2E Flow test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'E2E flow test failed'
    }, { status: 500 })
  }
}