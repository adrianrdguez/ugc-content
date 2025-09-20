'use client'

import { useState, useCallback } from 'react'
import {
  Page,
  Layout,
  Card,
  Button,
  Text,
  Banner,
  AppProvider,
  Toast,
  ProgressBar,
  List,
  Divider,
  Badge,
  Link
} from '@shopify/polaris'
import { 
  ConnectIcon, 
  FormIcon, 
  VideoIcon, 
  CheckIcon,
  ChevronRightIcon,
  ChevronLeftIcon
} from '@shopify/polaris-icons'

interface OnboardingStep {
  id: string
  title: string
  description: string
  icon: any
  content: React.ReactNode
  completed: boolean
}

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<string[]>([])
  const [toastActive, setToastActive] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  const showToast = useCallback((message: string) => {
    setToastMessage(message)
    setToastActive(true)
  }, [])

  const hideToast = useCallback(() => {
    setToastActive(false)
  }, [])

  const markStepCompleted = (stepId: string) => {
    if (!completedSteps.includes(stepId)) {
      setCompletedSteps([...completedSteps, stepId])
      showToast('Step completed! 🎉')
    }
  }

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to UGC Content Manager! 🚀',
      description: 'Learn how to collect and manage user-generated content from your customers',
      icon: CheckIcon,
      completed: completedSteps.includes('welcome'),
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <Banner tone="success">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Text as="p" fontWeight="medium">
                🎉 Congratulations! Your UGC app is successfully installed.
              </Text>
              <Text as="p">
                This powerful app helps you collect authentic content from your customers 
                and turn it into marketing gold. Let's get you set up!
              </Text>
            </div>
          </Banner>

          <Card>
            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <Text as="h3" variant="headingMd">What you'll achieve:</Text>
                <List>
                  <List.Item>📧 Automatically request content from customers</List.Item>
                  <List.Item>🎬 Collect videos and reviews from happy customers</List.Item>
                  <List.Item>✅ Review and approve content before publishing</List.Item>
                  <List.Item>🎁 Reward customers for their contributions</List.Item>
                  <List.Item>📈 Build trust and increase conversions</List.Item>
                </List>
                
                <Divider />
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <Text as="p" tone="subdued">Estimated setup time:</Text>
                  <Badge tone="info">5-10 minutes</Badge>
                </div>
              </div>
            </div>
          </Card>

          <Button
            variant="primary"
            size="large"
            onClick={() => markStepCompleted('welcome')}
          >
            Let's Get Started! 🚀
          </Button>
        </div>
      )
    },
    {
      id: 'connect',
      title: 'Step 1: Connect Your Store',
      description: 'Your Shopify store is already connected and ready to go',
      icon: ConnectIcon,
      completed: completedSteps.includes('connect'),
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <Banner tone="success">
            <Text as="p">
              ✅ Great! Your Shopify store is already connected to the UGC app.
            </Text>
          </Banner>

          <Card>
            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <Text as="h3" variant="headingMd">What's Connected:</Text>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text as="p">🏪 Shopify Store</Text>
                    <Badge tone="success">Connected</Badge>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text as="p">👥 Customer Data Access</Text>
                    <Badge tone="success">Enabled</Badge>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text as="p">📦 Order Information</Text>
                    <Badge tone="success">Available</Badge>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text as="p">☁️ Cloud Storage (R2)</Text>
                    <Badge tone="success">Active</Badge>
                  </div>
                </div>

                <Divider />

                <div>
                  <Text as="p" tone="subdued">
                    The app can now access your customer information and orders to send 
                    personalized UGC requests after purchases.
                  </Text>
                </div>
              </div>
            </div>
          </Card>

          <Button
            variant="primary"
            size="large"
            onClick={() => markStepCompleted('connect')}
          >
            Connection Verified ✅
          </Button>
        </div>
      )
    },
    {
      id: 'typeform',
      title: 'Step 2: Create Your Collection Form',
      description: 'Set up a Typeform to collect customer information and trigger video requests',
      icon: FormIcon,
      completed: completedSteps.includes('typeform'),
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <Banner tone="info">
            <Text as="p">
              📝 You'll need a Typeform account to collect customer data and trigger UGC requests.
            </Text>
          </Banner>

          <Card>
            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <Text as="h3" variant="headingMd">Create Your Typeform:</Text>
                
                <List type="number">
                  <List.Item>
                    <strong>Go to Typeform:</strong> Create an account at{' '}
                    <Link url="https://typeform.com" external>typeform.com</Link>
                  </List.Item>
                  <List.Item>
                    <strong>Create a new form</strong> with these fields:
                    <div style={{ marginTop: '0.5rem', marginLeft: '1rem' }}>
                      <List>
                        <List.Item>📧 Email address (required)</List.Item>
                        <List.Item>👤 Customer name (required)</List.Item>
                        <List.Item>🛍️ Order number (optional)</List.Item>
                        <List.Item>💭 Product feedback (optional)</List.Item>
                      </List>
                    </div>
                  </List.Item>
                  <List.Item>
                    <strong>Configure webhook:</strong> In Typeform settings, add webhook URL:
                    <div style={{ 
                      backgroundColor: '#f6f6f7', 
                      padding: '8px 12px', 
                      borderRadius: '4px',
                      fontFamily: 'monospace',
                      fontSize: '14px',
                      marginTop: '0.5rem'
                    }}>
                      https://your-domain.com/api/webhooks/typeform
                    </div>
                  </List.Item>
                  <List.Item>
                    <strong>Test the webhook</strong> using our{' '}
                    <Link url="/demo">demo page</Link>
                  </List.Item>
                </List>

                <Divider />

                <Banner tone="warning">
                  <Text as="p">
                    <strong>Important:</strong> Make sure your Typeform webhook is configured 
                    correctly. This is how customers will trigger UGC upload requests.
                  </Text>
                </Banner>
              </div>
            </div>
          </Card>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <Button
              variant="primary"
              size="large"
              onClick={() => markStepCompleted('typeform')}
            >
              Typeform Configured ✅
            </Button>
            <Button
              url="/demo"
              size="large"
            >
              Test Integration
            </Button>
          </div>
        </div>
      )
    },
    {
      id: 'workflow',
      title: 'Step 3: Understand the Workflow',
      description: 'Learn how customers will submit content and how you\'ll manage it',
      icon: VideoIcon,
      completed: completedSteps.includes('workflow'),
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <Banner tone="info">
            <Text as="p">
              🔄 Here's how the complete UGC workflow works from start to finish.
            </Text>
          </Banner>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {[
              {
                step: '1',
                title: 'Customer Completes Typeform',
                description: 'Customer fills out your Typeform with their details',
                color: '#2563eb'
              },
              {
                step: '2', 
                title: 'Webhook Triggers',
                description: 'Typeform sends data to your app via webhook',
                color: '#7c3aed'
              },
              {
                step: '3',
                title: 'Upload Link Generated',
                description: 'App creates secure 7-day upload token and link',
                color: '#dc2626'
              },
              {
                step: '4',
                title: 'Email Sent',
                description: 'Customer receives personalized email with upload link',
                color: '#ea580c'
              },
              {
                step: '5',
                title: 'Customer Uploads Video',
                description: 'Customer uses link to upload video content',
                color: '#65a30d'
              },
              {
                step: '6',
                title: 'Review & Approve',
                description: 'You review content in dashboard and approve/reject',
                color: '#0891b2'
              },
              {
                step: '7',
                title: 'Reward Delivered',
                description: 'Approved customers receive their reward automatically',
                color: '#c026d3'
              }
            ].map((item, index) => (
              <Card key={index}>
                <div style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: item.color,
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold',
                      fontSize: '14px'
                    }}>
                      {item.step}
                    </div>
                    <div style={{ flex: 1 }}>
                      <Text as="p" fontWeight="medium">{item.title}</Text>
                      <Text as="p" tone="subdued">{item.description}</Text>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <Banner tone="success">
            <Text as="p">
              💡 <strong>Pro Tip:</strong> Start with a small group of loyal customers 
              to test your workflow before rolling out to everyone!
            </Text>
          </Banner>

          <Button
            variant="primary"
            size="large"
            onClick={() => markStepCompleted('workflow')}
          >
            I Understand the Workflow ✅
          </Button>
        </div>
      )
    },
    {
      id: 'complete',
      title: 'You\'re All Set! 🎉',
      description: 'Start collecting amazing content from your customers',
      icon: CheckIcon,
      completed: completedSteps.includes('complete'),
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <Banner tone="success">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Text as="p" fontWeight="medium">
                🎉 Congratulations! Your UGC Content Manager is ready to go.
              </Text>
              <Text as="p">
                You're now equipped to collect, review, and leverage user-generated 
                content to grow your business.
              </Text>
            </div>
          </Banner>

          <Card>
            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <Text as="h3" variant="headingMd">Next Steps:</Text>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <Button url="/settings">⚙️ Configure Settings</Button>
                    <Text as="p" tone="subdued">Customize email templates and rewards</Text>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <Button url="/demo">🧪 Test the Flow</Button>
                    <Text as="p" tone="subdued">Run a complete test before going live</Text>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <Button url="/dashboard">📊 View Dashboard</Button>
                    <Text as="p" tone="subdued">Monitor submissions and manage content</Text>
                  </div>
                </div>

                <Divider />

                <div>
                  <Text as="h4" variant="headingMd">Quick Checklist:</Text>
                  <div style={{ marginTop: '1rem' }}>
                    <List>
                      <List.Item>✅ Shopify store connected</List.Item>
                      <List.Item>✅ Typeform webhook configured</List.Item>
                      <List.Item>✅ Upload workflow understood</List.Item>
                      <List.Item>⚙️ Email templates customized</List.Item>
                      <List.Item>🎁 Reward settings configured</List.Item>
                      <List.Item>🧪 End-to-end test completed</List.Item>
                    </List>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <Button
              variant="primary"
              size="large"
              url="/dashboard"
              onClick={() => markStepCompleted('complete')}
            >
              Go to Dashboard 🚀
            </Button>
            <Button
              size="large"
              url="/settings"
            >
              Configure Settings
            </Button>
          </div>
        </div>
      )
    }
  ]

  const progress = ((currentStep + 1) / steps.length) * 100
  const currentStepData = steps[currentStep]

  const toastMarkup = toastActive ? (
    <Toast 
      content={toastMessage} 
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
      <Page
        title="Welcome to UGC Content Manager"
        subtitle="Let's get you set up to collect amazing content from your customers"
        breadcrumbs={[{content: 'Dashboard', url: '/dashboard'}]}
      >
        {toastMarkup}
        <Layout>
          {/* Progress Header */}
          <Layout.Section>
            <Card>
              <div style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text as="h2" variant="headingMd">Setup Progress</Text>
                    <Text as="p" variant="bodySm">
                      Step {currentStep + 1} of {steps.length}
                    </Text>
                  </div>
                  <ProgressBar progress={progress} tone="primary" />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text as="p" tone="subdued">
                      {Math.round(progress)}% Complete
                    </Text>
                    <Text as="p" tone="subdued">
                      {completedSteps.length} of {steps.length} steps completed
                    </Text>
                  </div>
                </div>
              </div>
            </Card>
          </Layout.Section>

          {/* Current Step Content */}
          <Layout.Section>
            <Card>
              <div style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  <div style={{ textAlign: 'center' }}>
                    <Text as="h1" variant="headingLg">{currentStepData.title}</Text>
                    <Text as="p" tone="subdued" variant="bodyLg">
                      {currentStepData.description}
                    </Text>
                  </div>

                  {currentStepData.content}
                </div>
              </div>
            </Card>
          </Layout.Section>

          {/* Navigation */}
          <Layout.Section>
            <Card>
              <div style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Button
                    icon={ChevronLeftIcon}
                    disabled={currentStep === 0}
                    onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                  >
                    Previous
                  </Button>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {steps.map((_, index) => (
                      <div
                        key={index}
                        style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          backgroundColor: 
                            index === currentStep ? '#2563eb' :
                            index < currentStep ? '#10b981' : '#e5e7eb'
                        }}
                      />
                    ))}
                  </div>

                  <Button
                    variant="primary"
                    icon={ChevronRightIcon}
                    disabled={currentStep === steps.length - 1}
                    onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    </AppProvider>
  )
}