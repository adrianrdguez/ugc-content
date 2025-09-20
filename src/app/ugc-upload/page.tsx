'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Page,
  Layout,
  Card,
  Form,
  FormLayout,
  Button,
  Text,
  Banner,
  ProgressBar,
  Spinner,
  EmptyState,
  DropZone,
  Thumbnail,
  AppProvider,
  Toast
} from '@shopify/polaris'

interface CustomerData {
  id: string
  email: string
  first_name: string
  shop_id: string
  shopDomain: string
}

interface UploadProgress {
  stage: 'idle' | 'validating' | 'uploading' | 'processing' | 'completed' | 'error'
  progress: number
  message: string
}

export default function UGCUploadPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [customerData, setCustomerData] = useState<CustomerData | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    stage: 'idle',
    progress: 0,
    message: ''
  })
  const [error, setError] = useState<string>('')
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [toastActive, setToastActive] = useState(false)

  useEffect(() => {
    if (token) {
      validateToken(token)
    } else {
      setError('Invalid upload link. Please check your email for the correct link.')
    }
  }, [token])

  const validateToken = async (token: string) => {
    setUploadProgress({ stage: 'validating', progress: 10, message: 'Validating your link...' })
    
    try {
      const response = await fetch('/api/ugc/validate-upload-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      })

      const result = await response.json()

      if (result.valid) {
        setCustomerData(result.customer)
        setUploadProgress({ stage: 'idle', progress: 0, message: 'Ready to upload your video' })
      } else {
        setError(result.error || 'Invalid or expired link')
        setUploadProgress({ stage: 'error', progress: 0, message: result.error || 'Invalid link' })
      }
    } catch (err) {
      setError('Failed to validate link')
      setUploadProgress({ stage: 'error', progress: 0, message: 'Failed to validate link' })
    }
  }

  const handleDropZoneDrop = useCallback(
    (_dropFiles: File[], acceptedFiles: File[], _rejectedFiles: File[]) => {
      const file = acceptedFiles[0]
      if (file) {
        handleFileSelect(file)
      }
    },
    [],
  )

  const handleFileSelect = (file: File) => {
    const maxSize = 100 * 1024 * 1024 // 100MB
    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']

    if (file.size > maxSize) {
      setError('File too large. Maximum size: 100MB')
      return
    }

    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Please upload MP4, WebM, MOV, or AVI files.')
      return
    }

    setSelectedFile(file)
    setError('')
  }

  const handleSubmit = async () => {
    if (!selectedFile || !customerData) return

    try {
      setUploadProgress({ stage: 'uploading', progress: 20, message: 'Preparing upload...' })

      // 1. Get upload URL
      const uploadResponse = await fetch('/api/ugc/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: selectedFile.name,
          contentType: selectedFile.type,
          customerId: customerData.id,
          shopDomain: customerData.shopDomain,
          fileSize: selectedFile.size
        })
      })

      const uploadData = await uploadResponse.json()

      if (!uploadData.success) {
        throw new Error(uploadData.error)
      }

      setUploadProgress({ stage: 'uploading', progress: 40, message: 'Uploading video...' })

      // 2. Upload to R2 with fallback to proxy
      let uploadSuccess = false
      let finalVideoKey = uploadData.videoKey

      try {
        const uploadToR2 = await fetch(uploadData.uploadUrl, {
          method: 'PUT',
          body: selectedFile,
          headers: {
            'Content-Type': selectedFile.type,
          }
        })

        if (uploadToR2.ok) {
          uploadSuccess = true
        } else {
          throw new Error('Direct upload failed, trying proxy...')
        }
      } catch (directUploadError) {
        console.warn('Direct upload failed, using proxy:', directUploadError)
        
        setUploadProgress({ stage: 'uploading', progress: 50, message: 'Using proxy upload...' })
        
        const formData = new FormData()
        formData.append('file', selectedFile)
        formData.append('customerId', customerData.id)
        formData.append('shopDomain', customerData.shopDomain)

        const proxyResponse = await fetch('/api/ugc/proxy-upload', {
          method: 'POST',
          body: formData
        })

        const proxyResult = await proxyResponse.json()

        if (proxyResult.success) {
          uploadSuccess = true
          finalVideoKey = proxyResult.videoKey
        } else {
          throw new Error(proxyResult.error || 'Proxy upload failed')
        }
      }

      if (!uploadSuccess) {
        throw new Error('Both direct and proxy uploads failed')
      }

      setUploadProgress({ stage: 'processing', progress: 80, message: 'Processing submission...' })

      // 3. Create submission
      const submissionResponse = await fetch('/api/ugc/submit-from-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          videoKey: finalVideoKey
        })
      })

      const submissionResult = await submissionResponse.json()

      if (!submissionResult.success) {
        throw new Error(submissionResult.error)
      }

      setUploadProgress({ stage: 'completed', progress: 100, message: 'Video submitted successfully!' })
      setIsSubmitted(true)
      setToastActive(true)

    } catch (err) {
      console.error('Upload error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Upload failed'
      setError(errorMessage)
      setUploadProgress({ stage: 'error', progress: 0, message: errorMessage })
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const validVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']

  const fileUpload = !selectedFile && (
    <DropZone
      accept={validVideoTypes.join(',')}
      type="video"
      onDrop={handleDropZoneDrop}
      disabled={uploadProgress.stage === 'uploading' || uploadProgress.stage === 'processing'}
    >
      <DropZone.FileUpload actionTitle="Upload video" actionHint="or drop video to upload" />
    </DropZone>
  )

  const uploadedFile = selectedFile && (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <Thumbnail
          size="small"
          alt={selectedFile.name}
          source="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23666'%3E%3Cpath d='M8 5v14l11-7z'/%3E%3C/svg%3E"
        />
        <div>
          <Text variant="bodyMd" as="p" fontWeight="medium">
            {selectedFile.name}
          </Text>
          <Text variant="bodySm" as="p" tone="subdued">
            {formatFileSize(selectedFile.size)} • {selectedFile.type}
          </Text>
        </div>
      </div>
      <Button
        size="slim"
        onClick={() => setSelectedFile(null)}
        disabled={uploadProgress.stage === 'uploading' || uploadProgress.stage === 'processing'}
      >
        Remove file
      </Button>
    </div>
  )

  const toastMarkup = toastActive ? (
    <Toast 
      content="Video submitted successfully!" 
      onDismiss={() => setToastActive(false)} 
    />
  ) : null

  // Loading state
  if (uploadProgress.stage === 'validating') {
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
        <Page>
          <Layout>
            <Layout.Section>
              <Card>
                <div style={{ padding: '2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                  <Spinner size="large" />
                  <Text as="p" variant="bodyMd" alignment="center">
                    Validating your upload link...
                  </Text>
                </div>
              </Card>
            </Layout.Section>
          </Layout>
        </Page>
      </AppProvider>
    )
  }

  // Error state - invalid link
  if (error && !customerData) {
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
        <Page>
          <Layout>
            <Layout.Section>
              <EmptyState
                heading="Invalid Upload Link"
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <Text as="p">{error}</Text>
                <Text as="p" tone="subdued">
                  Please check your email for the correct upload link or contact support.
                </Text>
              </EmptyState>
            </Layout.Section>
          </Layout>
        </Page>
      </AppProvider>
    )
  }

  // Success state
  if (isSubmitted) {
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
        {toastMarkup}
        <Page>
          <Layout>
            <Layout.Section>
              <EmptyState
                heading="Video Submitted Successfully! 🎉"
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <Text as="p">
                  Thank you for sharing your experience! Your video has been submitted for review.
                </Text>
                <Text as="p" tone="subdued">
                  You'll receive your reward once the video is approved by our team.
                </Text>
                <div style={{ marginTop: '1rem' }}>
                  <Banner tone="info">
                    We'll notify you at <strong>{customerData?.email}</strong> when your video is reviewed.
                  </Banner>
                </div>
              </EmptyState>
            </Layout.Section>
          </Layout>
        </Page>
      </AppProvider>
    )
  }

  // Main upload form
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
        title="Share Your Experience! 🎬"
        subtitle={`Hi ${customerData?.first_name}! Upload your video to earn your reward.`}
      >
        <Layout>
          <Layout.Section>
            {/* Progress indicator */}
            {uploadProgress.stage !== 'idle' && (
              <Card>
                <div style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <Text as="p" variant="bodyMd">
                      {uploadProgress.message}
                    </Text>
                    <Text as="p" variant="bodyMd">
                      {uploadProgress.progress}%
                    </Text>
                  </div>
                  <ProgressBar 
                    progress={uploadProgress.progress} 
                    tone={uploadProgress.stage === 'error' ? 'critical' : 'primary'}
                  />
                </div>
              </Card>
            )}

            {/* Error banner */}
            {error && (
              <Banner tone="critical">
                <Text as="p">{error}</Text>
              </Banner>
            )}

            {/* Upload form */}
            <Card>
              <div style={{ padding: '1rem' }}>
                <Form onSubmit={handleSubmit}>
                  <FormLayout>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <Text as="h2" variant="headingMd">Upload Your Video</Text>
                        <Text as="p" tone="subdued">
                          MP4, WebM, MOV, or AVI. Maximum size: 100MB.
                        </Text>
                      </div>

                      <div>
                        {fileUpload}
                        {uploadedFile}
                      </div>

                      {/* Guidelines */}
                      <Card>
                        <div style={{ padding: '1rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <Text as="h3" variant="headingMd">Video Guidelines</Text>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                              <Text as="p">• Good lighting and clear audio</Text>
                              <Text as="p">• Show the product in use</Text>
                              <Text as="p">• Share your honest experience</Text>
                              <Text as="p">• Keep it between 30-120 seconds</Text>
                            </div>
                          </div>
                        </div>
                      </Card>

                      <Button
                        variant="primary"
                        size="large"
                        submit
                        disabled={!selectedFile || uploadProgress.stage === 'uploading' || uploadProgress.stage === 'processing'}
                        loading={uploadProgress.stage === 'uploading' || uploadProgress.stage === 'processing'}
                      >
                        {uploadProgress.stage === 'uploading' || uploadProgress.stage === 'processing' 
                          ? 'Uploading...' 
                          : 'Submit Video'
                        }
                      </Button>
                    </div>
                  </FormLayout>
                </Form>
              </div>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    </AppProvider>
  )
}