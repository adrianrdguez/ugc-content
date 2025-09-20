# 🔐 Authentication Setup Guide

This guide explains how to set up both Shopify OAuth and Supabase Auth for the UGC Content Manager app.

## 📋 Prerequisites

1. **Shopify Partner Account** (for Shopify OAuth)
2. **Supabase Project** (for user authentication and database)
3. **Environment Variables** configured

## 🏪 Shopify OAuth Setup

### 1. Create Shopify App (When you have Partner access)

1. Go to [Shopify Partner Dashboard](https://partners.shopify.com/)
2. Click "Apps" → "Create app"
3. Choose "Custom app" 
4. Fill in app details:
   - **App name**: UGC Content Manager
   - **App URL**: `https://your-domain.com`
   - **Allowed redirection URLs**: `https://your-domain.com/api/auth/shopify/callback`

### 2. Configure App Permissions

Add these scopes in your app settings:
- `read_customers` - Read customer data
- `write_customers` - Update customer data  
- `read_orders` - Read order information
- `write_discounts` - Create discount codes
- `read_discounts` - Read existing discounts

### 3. Environment Variables

Add to your `.env.local`:
```env
SHOPIFY_CLIENT_ID=your_shopify_app_client_id
SHOPIFY_CLIENT_SECRET=your_shopify_app_client_secret
SHOPIFY_REDIRECT_URI=https://your-domain.com/api/auth/shopify/callback
SHOPIFY_WEBHOOK_SECRET=your_webhook_secret
```

### 4. Test Installation Flow

1. Go to: `https://your-domain.com/api/auth/shopify/install?shop=your-test-shop`
2. Complete OAuth flow
3. Should redirect to dashboard with shop parameter

## 👥 Supabase Auth Setup

### 1. Configure Supabase Auth

In your Supabase dashboard:

1. Go to **Authentication** → **Settings**
2. Enable **Email** provider
3. Configure **Site URL**: `https://your-domain.com`
4. Add **Redirect URLs**:
   - `https://your-domain.com/auth/callback`
   - `http://localhost:3000/auth/callback` (for development)

### 2. Email Templates (Optional)

Customize the magic link email template in Supabase:

1. Go to **Authentication** → **Email Templates**
2. Edit "Magic Link" template
3. Customize subject and content for your brand

### 3. Database Migration

Run the database migrations:

```bash
# Apply Shopify OAuth tables
supabase db push

# Or manually run the SQL files:
# 003_shopify_oauth.sql
# 004_user_auth_rewards.sql
```

### 4. Environment Variables

Ensure these are in your `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## 🔄 Testing the Complete Flow

### For Merchants (Shopify OAuth)

1. **Install App**: 
   ```
   GET /api/auth/shopify/install?shop=your-shop
   ```

2. **Access Dashboard**:
   ```
   GET /dashboard?shop=your-shop.myshopify.com&access_token=token
   ```

3. **API Calls**:
   ```javascript
   fetch('/api/admin/ugc', {
     headers: {
       'x-shopify-shop-domain': 'your-shop.myshopify.com',
       'x-access-token': 'your-access-token'
     }
   })
   ```

### For End Users (Supabase Auth)

1. **Sign In**:
   ```
   GET /auth/login
   ```

2. **Access Profile**:
   ```
   GET /profile
   ```

3. **Upload with Auth** (future enhancement):
   ```
   GET /ugc-upload?token=upload-token&user=authenticated
   ```

## 🎯 Integration Points

### 1. Video Upload → Points

When a video is uploaded, award points:

```javascript
// In your upload success handler
await fetch('/api/rewards/add-points', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: user.id,
    shopDomain: 'shop.myshopify.com',
    points: 50,
    description: 'Video uploaded',
    submissionId: submission.id
  })
})
```

### 2. Video Approval → More Points

When merchant approves video:

```javascript
// In your approval handler
await fetch('/api/rewards/add-points', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: submission.user_id,
    shopDomain: session.shop,
    points: 100,
    description: 'Video approved',
    submissionId: submission.id
  })
})
```

### 3. Points → Shopify Discounts

When user redeems points:

```javascript
// Create discount in Shopify
const discount = await shopifyApiRequest(session, 'discount_codes.json', {
  method: 'POST',
  body: JSON.stringify({
    discount_code: {
      code: generateUniqueCode(),
      percentage: 10,
      usage_limit: 1,
      expires_at: futureDate
    }
  })
})
```

## 🔧 Development vs Production

### Development
- Use test Shopify stores
- Local Supabase or development project
- HTTP URLs allowed

### Production
- Real Shopify app in Partner dashboard
- Production Supabase project
- HTTPS required for all URLs
- Proper domain verification

## 🚀 Next Steps

1. **Create Shopify Partner Account**
2. **Deploy to production domain** 
3. **Configure real OAuth credentials**
4. **Test complete merchant flow**
5. **Implement reward redemption system**
6. **Add email notifications**
7. **Create admin analytics dashboard**

## 🔍 Troubleshooting

### Common Issues

1. **OAuth redirect mismatch**: Ensure redirect URI exactly matches Shopify app settings
2. **CORS errors**: Check Supabase URL configuration
3. **Database errors**: Verify all migrations have been applied
4. **Session issues**: Check cookie settings and domain configuration

### Debug Mode

Enable debug logging by adding:
```env
DEBUG=true
LOG_LEVEL=debug
```

This will provide detailed logs for OAuth flows and API calls.