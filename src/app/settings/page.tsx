'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Page,
  Layout,
  Card,
  Form,
  FormLayout,
  TextField,
  Button,
  Text,
  Banner,
  AppProvider,
  Toast,
  Frame,
  Select,
  Checkbox,
  Divider,
  Badge
} from '@shopify/polaris'

interface EmailSettings {
  senderEmail: string
  senderName: string
  logoUrl: string
  welcomeSubject: string
  welcomeMessage: string
  approvalSubject: string
  approvalMessage: string
  rejectionSubject: string
  rejectionMessage: string
}

interface RewardSettings {
  enabled: boolean
  type: 'discount_code' | 'store_credit' | 'free_shipping'
  value: string
  currency: string
  autoApprove: boolean
}

interface AppSettings {
  language: string
  timezone: string
  notifications: boolean
}

export default function SettingsPage() {
  const [shop, setShop] = useState<string>('')
  const [accessToken, setAccessToken] = useState<string>('')
  const [emailSettings, setEmailSettings] = useState<EmailSettings>({
    senderEmail: '',
    senderName: '',
    logoUrl: '',
    welcomeSubject: 'Share your experience and get rewarded! 🎁',
    welcomeMessage: 'Hi {customer_name}! Thank you for your purchase. We\'d love to see how you\'re using your new product!',
    approvalSubject: 'Your video has been approved! 🎉',
    approvalMessage: 'Great news! Your video submission has been approved. Your reward is on the way!',
    rejectionSubject: 'Update needed on your video submission',
    rejectionMessage: 'Thank you for your submission. We need some updates before we can approve it.'
  })
  const [rewardSettings, setRewardSettings] = useState<RewardSettings>({
    enabled: true,
    type: 'discount_code',
    value: '10',
    currency: 'USD',
    autoApprove: false
  })
  const [appSettings, setAppSettings] = useState<AppSettings>({
    language: 'en',
    timezone: 'UTC',
    notifications: true
  })
  const [loading, setLoading] = useState(false)
  const [toastActive, setToastActive] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastError, setToastError] = useState(false)

  const showToast = useCallback((message: string, isError = false) => {
    setToastMessage(message)
    setToastError(isError)
    setToastActive(true)
  }, [])

  const hideToast = useCallback(() => {
    setToastActive(false)
  }, [])

  useEffect(() => {
    // Extract URL parameters
    const urlParams = new URLSearchParams(window.location.search)
    const shopParam = urlParams.get('shop')
    const tokenParam = urlParams.get('access_token') || 'test_token_123'
    
    if (shopParam) {
      setShop(shopParam)
      setAccessToken(tokenParam)
      loadSettings(shopParam, tokenParam)
    } else {
      // For local testing
      setShop('test-shop.myshopify.com')
      setAccessToken('test_token_123')
      loadSettings('test-shop.myshopify.com', 'test_token_123')
    }
  }, [])

  const loadSettings = async (shopDomain: string, token: string) => {
    try {
      const response = await fetch('/api/admin/settings', {
        headers: {
          'x-shopify-shop-domain': shopDomain,
          'x-access-token': token
        }
      })

      const result = await response.json()
      if (result.success) {
        if (result.settings.email) setEmailSettings(result.settings.email)
        if (result.settings.rewards) setRewardSettings(result.settings.rewards)
        if (result.settings.app) setAppSettings(result.settings.app)
      }
    } catch (error) {
      // Use default settings if load fails
      console.log('Using default settings')
    }
  }

  const handleSaveSettings = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-shopify-shop-domain': shop,
          'x-access-token': accessToken
        },
        body: JSON.stringify({
          email: emailSettings,
          rewards: rewardSettings,
          app: appSettings
        })
      })

      const result = await response.json()
      if (result.success) {
        showToast('Settings saved successfully!')
      } else {
        showToast('Failed to save settings', true)
      }
    } catch (error) {
      showToast('Error saving settings', true)
    } finally {
      setLoading(false)
    }
  }

  const languageOptions = [
    { label: 'English', value: 'en' },
    { label: 'Español', value: 'es' },
    { label: 'Français', value: 'fr' },
    { label: 'Deutsch', value: 'de' }
  ]

  const rewardTypeOptions = [
    { label: 'Discount Code', value: 'discount_code' },
    { label: 'Store Credit', value: 'store_credit' },
    { label: 'Free Shipping', value: 'free_shipping' }
  ]

  const timezoneOptions = [
    { label: 'UTC', value: 'UTC' },
    { label: 'America/New_York', value: 'America/New_York' },
    { label: 'America/Los_Angeles', value: 'America/Los_Angeles' },
    { label: 'Europe/London', value: 'Europe/London' },
    { label: 'Europe/Paris', value: 'Europe/Paris' }
  ]

  const toastMarkup = toastActive ? (
    <Toast 
      content={toastMessage} 
      error={toastError}
      onDismiss={hideToast} 
    />
  ) : null

  return (
    <AppProvider
      i18n={{
        Polaris: {
          Avatar: { label: 'Avatar', labelWithInitials: 'Avatar with initials {initials}' },
          ContextualSaveBar: { save: 'Save', discard: 'Discard' },
          TextField: { characterCount: '{count} characters' },
          TopBar: { toggleMenuLabel: 'Toggle menu', SearchField: { clearButtonLabel: 'Clear', search: 'Search' } },
          Modal: { iFrameTitle: 'body markup' },
          Frame: { skipToContent: 'Skip to content', Navigation: { closeMobileNavigationLabel: 'Close navigation' } },
        },
      }}
    >
      <Frame>
        {toastMarkup}
        <Page
          title="Settings ⚙️"
          subtitle={shop ? `Configure your UGC app for ${shop}` : 'Configure your UGC app'}
          primaryAction={{
            content: 'Save Settings',
            onAction: handleSaveSettings,
            loading: loading
          }}
        >
        <Layout>
          {/* Email Configuration */}
          <Layout.Section>
            <Card>
              <div style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Text as="h2" variant="headingMd">📧 Email Templates</Text>
                    <Badge tone="info">Customize your communication</Badge>
                  </div>
                  
                  <Form onSubmit={handleSaveSettings}>
                    <FormLayout>
                      <FormLayout.Group>
                        <TextField
                          label="Sender Email"
                          value={emailSettings.senderEmail}
                          onChange={(value) => setEmailSettings({...emailSettings, senderEmail: value})}
                          placeholder="noreply@yourstore.com"
                          helpText="Email address that customers will see as sender"
                          autoComplete="email"
                        />
                        <TextField
                          label="Sender Name"
                          value={emailSettings.senderName}
                          onChange={(value) => setEmailSettings({...emailSettings, senderName: value})}
                          placeholder="Your Store Name"
                          helpText="Name displayed as email sender"
                          autoComplete="organization"
                        />
                      </FormLayout.Group>
                      
                      <TextField
                        label="Logo URL"
                        value={emailSettings.logoUrl}
                        onChange={(value) => setEmailSettings({...emailSettings, logoUrl: value})}
                        placeholder="https://yourstore.com/logo.png"
                        helpText="URL to your logo for email templates"
                        autoComplete="url"
                      />

                      <Divider />

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <Text as="h3" variant="headingMd">Welcome Email (sent after Typeform)</Text>
                        <TextField
                          label="Subject"
                          value={emailSettings.welcomeSubject}
                          onChange={(value) => setEmailSettings({...emailSettings, welcomeSubject: value})}
                          autoComplete="off"
                        />
                        <TextField
                          label="Message"
                          value={emailSettings.welcomeMessage}
                          onChange={(value) => setEmailSettings({...emailSettings, welcomeMessage: value})}
                          multiline={4}
                          helpText="Use {customer_name} to personalize the message"
                          autoComplete="off"
                        />
                      </div>

                      <Divider />

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <Text as="h3" variant="headingMd">Approval Email</Text>
                        <TextField
                          label="Subject"
                          value={emailSettings.approvalSubject}
                          onChange={(value) => setEmailSettings({...emailSettings, approvalSubject: value})}
                          autoComplete="off"
                        />
                        <TextField
                          label="Message"
                          value={emailSettings.approvalMessage}
                          onChange={(value) => setEmailSettings({...emailSettings, approvalMessage: value})}
                          multiline={4}
                          autoComplete="off"
                        />
                      </div>

                      <Divider />

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <Text as="h3" variant="headingMd">Rejection Email</Text>
                        <TextField
                          label="Subject"
                          value={emailSettings.rejectionSubject}
                          onChange={(value) => setEmailSettings({...emailSettings, rejectionSubject: value})}
                          autoComplete="off"
                        />
                        <TextField
                          label="Message"
                          value={emailSettings.rejectionMessage}
                          onChange={(value) => setEmailSettings({...emailSettings, rejectionMessage: value})}
                          multiline={4}
                          autoComplete="off"
                        />
                      </div>
                    </FormLayout>
                  </Form>
                </div>
              </div>
            </Card>
          </Layout.Section>

          {/* Reward Settings */}
          <Layout.Section>
            <Card>
              <div style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Text as="h2" variant="headingMd">🎁 Reward Configuration</Text>
                    <Badge tone="success">Incentivize submissions</Badge>
                  </div>

                  <Form onSubmit={handleSaveSettings}>
                    <FormLayout>
                      <Checkbox
                        label="Enable rewards for approved submissions"
                        checked={rewardSettings.enabled}
                        onChange={(checked) => setRewardSettings({...rewardSettings, enabled: checked})}
                        helpText="Automatically reward customers when their content is approved"
                      />

                      {rewardSettings.enabled && (
                        <>
                          <FormLayout.Group>
                            <Select
                              label="Reward Type"
                              options={rewardTypeOptions}
                              value={rewardSettings.type}
                              onChange={(value) => setRewardSettings({...rewardSettings, type: value as any})}
                            />
                            <TextField
                              label="Value"
                              value={rewardSettings.value}
                              onChange={(value) => setRewardSettings({...rewardSettings, value})}
                              placeholder="10"
                              suffix={rewardSettings.type === 'discount_code' ? '%' : rewardSettings.currency}
                              helpText={
                                rewardSettings.type === 'discount_code' ? 'Percentage discount' :
                                rewardSettings.type === 'store_credit' ? 'Credit amount' :
                                'Free shipping threshold'
                              }
                              autoComplete="off"
                            />
                          </FormLayout.Group>

                          <Checkbox
                            label="Auto-approve submissions"
                            checked={rewardSettings.autoApprove}
                            onChange={(checked) => setRewardSettings({...rewardSettings, autoApprove: checked})}
                            helpText="Automatically approve and reward all submissions (not recommended)"
                          />

                          {rewardSettings.autoApprove && (
                            <Banner tone="warning">
                              <Text as="p">
                                Auto-approval is enabled. All submissions will be automatically approved and rewarded.
                                Make sure you trust your content sources.
                              </Text>
                            </Banner>
                          )}
                        </>
                      )}
                    </FormLayout>
                  </Form>
                </div>
              </div>
            </Card>
          </Layout.Section>

          {/* App Settings */}
          <Layout.Section>
            <Card>
              <div style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Text as="h2" variant="headingMd">🌍 App Configuration</Text>
                    <Badge tone="attention">General preferences</Badge>
                  </div>

                  <Form onSubmit={handleSaveSettings}>
                    <FormLayout>
                      <FormLayout.Group>
                        <Select
                          label="Language"
                          options={languageOptions}
                          value={appSettings.language}
                          onChange={(value) => setAppSettings({...appSettings, language: value})}
                          helpText="Default language for customer-facing content"
                        />
                        <Select
                          label="Timezone"
                          options={timezoneOptions}
                          value={appSettings.timezone}
                          onChange={(value) => setAppSettings({...appSettings, timezone: value})}
                          helpText="Timezone for submissions and reports"
                        />
                      </FormLayout.Group>

                      <Checkbox
                        label="Email notifications"
                        checked={appSettings.notifications}
                        onChange={(checked) => setAppSettings({...appSettings, notifications: checked})}
                        helpText="Receive email notifications for new submissions"
                      />
                    </FormLayout>
                  </Form>
                </div>
              </div>
            </Card>
          </Layout.Section>

          {/* Integration Status */}
          <Layout.Section>
            <Card>
              <div style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <Text as="h2" variant="headingMd">🔗 Integration Status</Text>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text as="p">Shopify Store Connection</Text>
                      <Badge tone="success">Connected</Badge>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text as="p">Cloudflare R2 Storage</Text>
                      <Badge tone="success">Active</Badge>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text as="p">Email Provider</Text>
                      <Badge tone="warning">Setup Required</Badge>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text as="p">Typeform Webhook</Text>
                      <Badge tone="attention">Manual Setup</Badge>
                    </div>
                  </div>

                  <Banner tone="info">
                    <Text as="p">
                      Need help with setup? Check out our{' '}
                      <Button variant="plain" url="/demo">demo page</Button>{' '}
                      to test the complete flow.
                    </Text>
                  </Banner>
                </div>
              </div>
            </Card>
          </Layout.Section>
        </Layout>
        </Page>
      </Frame>
    </AppProvider>
  )
}