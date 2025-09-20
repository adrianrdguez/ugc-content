'use client'

import { useState } from 'react'
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
  Badge,
  Link,
  Frame,
  Toast,
  Collapsible,
  List,
  Divider,
  AppProvider
} from '@shopify/polaris'
import { PlayIcon, NoteIcon } from '@shopify/polaris-icons'

interface TestResult {
  step: string
  status: 'pending' | 'success' | 'error'
  data?: any
  error?: string
}

export default function DemoPage() {
  const [email, setEmail] = useState('demo@test.com')
  const [name, setName] = useState('Usuario Demo')
  const [results, setResults] = useState<TestResult[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [uploadToken, setUploadToken] = useState<string>('')
  const [toastActive, setToastActive] = useState(false)
  const [expandedResults, setExpandedResults] = useState<string[]>([])

  const addResult = (step: string, status: 'pending' | 'success' | 'error', data?: any, error?: string) => {
    setResults(prev => [...prev, { step, status, data, error }])
  }

  const toggleResultExpanded = (step: string) => {
    setExpandedResults(prev => 
      prev.includes(step) 
        ? prev.filter(s => s !== step)
        : [...prev, step]
    )
  }

  const runTypeformFlow = async () => {
    setIsRunning(true)
    setResults([])
    setUploadToken('')
    
    try {
      // Step 1: Simulate Typeform webhook
      addResult('Simulating Typeform webhook', 'pending')
      
      const webhookResponse = await fetch('/api/webhooks/typeform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: `demo_${Date.now()}`,
          event_type: 'form_response',
          form_response: {
            form_id: 'demo_form',
            token: `demo_token_${Date.now()}`,
            submitted_at: new Date().toISOString(),
            definition: {
              id: 'demo_form',
              title: 'Demo UGC Form'
            },
            answers: [
              {
                field: { id: 'email_field', type: 'email', ref: 'email' },
                type: 'email',
                email: email
              },
              {
                field: { id: 'name_field', type: 'short_text', ref: 'name' },
                type: 'text',
                text: name
              }
            ]
          }
        })
      })

      const webhookResult = await webhookResponse.json()
      
      if (webhookResult.success) {
        addResult('Typeform webhook processed successfully', 'success', webhookResult)
        setUploadToken(webhookResult.upload_token)
        
        // Step 2: Validate generated token
        addResult('Validating generated token', 'pending')
        
        const validateResponse = await fetch('/api/ugc/validate-upload-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: webhookResult.upload_token })
        })
        
        const validateResult = await validateResponse.json()
        
        if (validateResult.valid) {
          addResult('Token validation successful', 'success', validateResult)
          
          // Step 3: Test upload URL generation
          addResult('Generating upload URL', 'pending')
          
          const uploadUrlResponse = await fetch('/api/ugc/upload-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename: 'demo-video.mp4',
              contentType: 'video/mp4',
              customerId: validateResult.customer.id,
              shopDomain: validateResult.customer.shopDomain,
              fileSize: 1024 * 1024 // 1MB demo
            })
          })
          
          const uploadUrlResult = await uploadUrlResponse.json()
          
          if (uploadUrlResult.success) {
            addResult('Upload URL generated successfully', 'success', {
              videoKey: uploadUrlResult.videoKey,
              publicUrl: uploadUrlResult.publicUrl
            })
            setToastActive(true)
          } else {
            addResult('Failed to generate upload URL', 'error', null, uploadUrlResult.error)
          }
          
        } else {
          addResult('Token validation failed', 'error', null, validateResult.error)
        }
        
      } else {
        addResult('Webhook processing failed', 'error', null, webhookResult.error)
      }
      
    } catch (error) {
      addResult('General error occurred', 'error', null, error instanceof Error ? error.message : 'Unknown error')
    }
    
    setIsRunning(false)
  }

  const getStatusBadge = (status: string) => {
    const config = {
      pending: { tone: 'warning' as const, text: 'Processing...' },
      success: { tone: 'success' as const, text: 'Success' },
      error: { tone: 'critical' as const, text: 'Error' },
    }
    return <Badge tone={config[status as keyof typeof config]?.tone || 'info'}>
      {config[status as keyof typeof config]?.text || status}
    </Badge>
  }

  const toastMarkup = toastActive ? (
    <Toast 
      content="Demo flow completed successfully!" 
      onDismiss={() => setToastActive(false)} 
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
          title="🧪 Typeform + UGC Flow Demo"
          subtitle="Test the complete integration flow from Typeform to video upload"
        >
        <Layout>
          <Layout.Section>
            <Card>
              <div style={{ padding: '1rem' }}>
                <Form onSubmit={runTypeformFlow}>
                <FormLayout>
                  <FormLayout.Group>
                    <TextField
                      type="email"
                      label="Customer Email"
                      value={email}
                      onChange={setEmail}
                      disabled={isRunning}
                      autoComplete="email"
                    />
                    <TextField
                      label="Customer Name"
                      value={name}
                      onChange={setName}
                      disabled={isRunning}
                      autoComplete="name"
                    />
                  </FormLayout.Group>
                  
                  <Button
                    variant="primary"
                    size="large"
                    submit
                    loading={isRunning}
                    icon={PlayIcon}
                  >
                    {isRunning ? 'Running Demo...' : 'Test Complete Flow'}
                  </Button>
                </FormLayout>
                </Form>
              </div>
            </Card>
          </Layout.Section>

          {uploadToken && (
            <Layout.Section>
              <Banner tone="success">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <Text as="p" fontWeight="medium">
                    ✅ Upload token generated successfully!
                  </Text>
                  <Text as="p">
                    Link is valid for 7 days. Click below to test the upload page:
                  </Text>
                  <Link 
                    url={`/ugc-upload?token=${uploadToken}`}
                  >
                    Open Upload Page →
                  </Link>
                </div>
              </Banner>
            </Layout.Section>
          )}

          {results.length > 0 && (
            <Layout.Section>
              <Card>
                <div style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <Text as="h2" variant="headingMd">Test Results</Text>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {results.map((result, index) => (
                        <Card key={index}>
                          <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <Text as="p" fontWeight="medium">
                                  {result.step}
                                </Text>
                                {getStatusBadge(result.status)}
                              </div>
                              {result.data && (
                                <Button
                                  variant="plain"
                                  icon={NoteIcon}
                                  onClick={() => toggleResultExpanded(result.step)}
                                >
                                  {expandedResults.includes(result.step) ? 'Hide' : 'Show'} Details
                                </Button>
                              )}
                            </div>
                            
                            {result.error && (
                              <Banner tone="critical">
                                <Text as="p">{result.error}</Text>
                              </Banner>
                            )}
                            
                            {result.data && (
                              <Collapsible 
                                open={expandedResults.includes(result.step)}
                                id={`result-${index}`}
                              >
                                <Card>
                                  <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <Text as="p" fontWeight="medium">Response Data:</Text>
                                    <div style={{ 
                                      backgroundColor: '#f6f6f7', 
                                      padding: '12px', 
                                      borderRadius: '6px',
                                      fontSize: '12px',
                                      fontFamily: 'monospace',
                                      overflow: 'auto',
                                      maxHeight: '200px'
                                    }}>
                                      <pre>{JSON.stringify(result.data, null, 2)}</pre>
                                    </div>
                                  </div>
                                </Card>
                              </Collapsible>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            </Layout.Section>
          )}

          <Layout.Section>
            <Card>
              <div style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <Text as="h2" variant="headingMd">💡 How the Flow Works</Text>
                  <div>
                    <List type="number">
                      <List.Item>Simulates a user completing your Typeform</List.Item>
                      <List.Item>Webhook processes the data and creates an upload token</List.Item>
                      <List.Item>Token is validated and customer data is retrieved</List.Item>
                      <List.Item>Signed URL is generated for direct upload to Cloudflare R2</List.Item>
                      <List.Item>User can access the upload page with their unique link</List.Item>
                    </List>
                  </div>
                  
                  <Divider />
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <Text as="p" fontWeight="medium">Next Steps:</Text>
                    <List>
                      <List.Item>Configure your Typeform webhook URL</List.Item>
                      <List.Item>Set up email provider for sending upload links</List.Item>
                      <List.Item>Customize email templates for your brand</List.Item>
                      <List.Item>Configure OAuth for Shopify integration</List.Item>
                    </List>
                  </div>
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