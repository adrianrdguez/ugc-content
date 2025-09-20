'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Page,
  Layout,
  Card,
  DataTable,
  Tabs,
  Button,
  Modal,
  Spinner,
  EmptyState,
  Banner,
  AppProvider,
  Toast,
  Text
} from '@shopify/polaris'
import { StatusBadge } from '@/components/ui/StatusBadge'

interface UGCSubmission {
  id: string
  customer_email: string
  customer_name: string
  customer_id: string
  video_url: string
  video_key: string
  status: 'pending' | 'processing' | 'approved' | 'rejected'
  review_notes?: string
  created_at: string
  updated_at: string
  reward?: any
}

export default function Dashboard() {
  const [shop, setShop] = useState<string>('')
  const [accessToken, setAccessToken] = useState<string>('')
  const [selectedTab, setSelectedTab] = useState(0)
  const [submissions, setSubmissions] = useState<UGCSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSubmission, setSelectedSubmission] = useState<UGCSubmission | null>(null)
  const [modalActive, setModalActive] = useState(false)
  const [actionLoading, setActionLoading] = useState<string>('')
  const [toastActive, setToastActive] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastError, setToastError] = useState(false)

  const tabs = [
    { id: 'pending', content: 'Pending Review', status: 'pending' },
    { id: 'approved', content: 'Approved', status: 'approved' },
    { id: 'rejected', content: 'Rejected', status: 'rejected' },
  ]

  const showToast = useCallback((message: string, isError = false) => {
    setToastMessage(message)
    setToastError(isError)
    setToastActive(true)
  }, [])

  const hideToast = useCallback(() => {
    setToastActive(false)
  }, [])

  useEffect(() => {
    // Extraer parámetros de la URL
    const urlParams = new URLSearchParams(window.location.search)
    const shopParam = urlParams.get('shop')
    const tokenParam = urlParams.get('access_token') || 'test_token_123' // Para testing
    
    if (shopParam) {
      setShop(shopParam)
      setAccessToken(tokenParam)
      fetchSubmissions(tabs[selectedTab].status, shopParam, tokenParam)
    } else {
      // Para testing local
      setShop('test-shop.myshopify.com')
      setAccessToken('test_token_123')
      fetchSubmissions(tabs[selectedTab].status, 'test-shop.myshopify.com', 'test_token_123')
    }
  }, [])

  useEffect(() => {
    if (shop && accessToken) {
      fetchSubmissions(tabs[selectedTab].status, shop, accessToken)
    }
  }, [selectedTab])

  const fetchSubmissions = async (status: string, shopDomain: string, token: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/ugc?status=${status}`, {
        headers: {
          'x-shopify-shop-domain': shopDomain,
          'x-access-token': token
        }
      })

      const result = await response.json()
      if (result.success) {
        setSubmissions(result.submissions)
      } else {
        showToast('Failed to fetch submissions', true)
      }
    } catch (error) {
      showToast('Error loading submissions', true)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (submissionId: string) => {
    setActionLoading(submissionId)
    try {
      const response = await fetch(`/api/admin/ugc/${submissionId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-shopify-shop-domain': shop,
          'x-access-token': accessToken
        },
        body: JSON.stringify({ notes: 'Approved from dashboard' })
      })

      const result = await response.json()
      if (result.success) {
        showToast('Submission approved successfully!')
        fetchSubmissions(tabs[selectedTab].status, shop, accessToken)
        setModalActive(false)
      } else {
        showToast('Failed to approve submission', true)
      }
    } catch (error) {
      showToast('Error approving submission', true)
    } finally {
      setActionLoading('')
    }
  }

  const handleReject = async (submissionId: string) => {
    setActionLoading(submissionId)
    try {
      const response = await fetch(`/api/admin/ugc/${submissionId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-shopify-shop-domain': shop,
          'x-access-token': accessToken
        },
        body: JSON.stringify({ notes: 'Does not meet requirements' })
      })

      const result = await response.json()
      if (result.success) {
        showToast('Submission rejected successfully!')
        fetchSubmissions(tabs[selectedTab].status, shop, accessToken)
        setModalActive(false)
      } else {
        showToast('Failed to reject submission', true)
      }
    } catch (error) {
      showToast('Error rejecting submission', true)
    } finally {
      setActionLoading('')
    }
  }

  // Prepare data for DataTable
  const rows = submissions.map((submission) => [
    submission.customer_name || submission.customer_email,
    submission.customer_email,
    new Date(submission.created_at).toLocaleDateString(),
    <StatusBadge key={submission.id} status={submission.status} />,
    (
      <div key={submission.id} style={{ display: 'flex', gap: '8px' }}>
        <Button
          size="slim"
          onClick={() => {
            setSelectedSubmission(submission)
            setModalActive(true)
          }}
        >
          View
        </Button>
        {submission.status === 'pending' && (
          <>
            <Button
              size="slim"
              loading={actionLoading === submission.id}
              onClick={() => handleApprove(submission.id)}
            >
              Approve
            </Button>
            <Button
              size="slim"
              loading={actionLoading === submission.id}
              onClick={() => handleReject(submission.id)}
            >
              Reject
            </Button>
          </>
        )}
      </div>
    ),
  ])

  const headings = [
    'Customer',
    'Email',
    'Date Submitted',
    'Status',
    'Actions',
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
          Avatar: {
            label: 'Avatar',
            labelWithInitials: 'Avatar with initials {initials}',
          },
          ContextualSaveBar: {
            save: 'Save',
            discard: 'Discard',
          },
          TextField: {
            characterCount: '{count} characters',
          },
          TopBar: {
            toggleMenuLabel: 'Toggle menu',
            SearchField: {
              clearButtonLabel: 'Clear',
              search: 'Search',
            },
          },
          Modal: {
            iFrameTitle: 'body markup',
          },
          Frame: {
            skipToContent: 'Skip to content',
            Navigation: {
              closeMobileNavigationLabel: 'Close navigation',
            },
          },
        },
      }}
    >
      <Page
        title="UGC Content Review"
        subtitle={shop ? `Connected to ${shop}` : undefined}
      >
        {toastMarkup}
        <Layout>
          <Layout.Section>
            <Card>
              <Tabs
                tabs={tabs.map((tab) => ({
                  id: tab.id,
                  content: tab.content,
                  accessibilityLabel: tab.content,
                }))}
                selected={selectedTab}
                onSelect={setSelectedTab}
              >
                <div style={{ padding: '1rem' }}>
                  {loading ? (
                    <div style={{ padding: '2rem', textAlign: 'center' }}>
                      <Spinner size="large" />
                      <Text as="p" variant="bodyMd" tone="subdued">
                        Loading submissions...
                      </Text>
                    </div>
                  ) : submissions.length > 0 ? (
                    <DataTable
                      columnContentTypes={[
                        'text',
                        'text',
                        'text',
                        'text',
                        'text',
                      ]}
                      headings={headings}
                      rows={rows}
                      footerContent={`Showing ${submissions.length} ${submissions.length === 1 ? 'submission' : 'submissions'}`}
                    />
                  ) : (
                    <EmptyState
                      heading={`No ${tabs[selectedTab].content.toLowerCase()} submissions`}
                      image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                    >
                      <Text as="p">When customers submit UGC content, it will appear here for review.</Text>
                    </EmptyState>
                  )}
                </div>
              </Tabs>
            </Card>
          </Layout.Section>
        </Layout>

        {modalActive && selectedSubmission && (
          <Modal
            open={modalActive}
            onClose={() => setModalActive(false)}
            title="Review UGC Submission"
            primaryAction={selectedSubmission.status === 'pending' ? {
              content: 'Approve',
              onAction: () => handleApprove(selectedSubmission.id),
              loading: actionLoading === selectedSubmission.id
            } : undefined}
            secondaryActions={selectedSubmission.status === 'pending' ? [{
              content: 'Reject',
              onAction: () => handleReject(selectedSubmission.id),
              loading: actionLoading === selectedSubmission.id,
              destructive: true
            }] : undefined}
          >
            <Modal.Section>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Customer Information */}
                <div>
                  <Text as="h3" variant="headingMd">Customer Information</Text>
                  <Card>
                    <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <Text as="p"><strong>Name:</strong> {selectedSubmission.customer_name}</Text>
                      <Text as="p"><strong>Email:</strong> {selectedSubmission.customer_email}</Text>
                      <Text as="p"><strong>Status:</strong> <StatusBadge status={selectedSubmission.status} /></Text>
                      <Text as="p"><strong>Submitted:</strong> {new Date(selectedSubmission.created_at).toLocaleString()}</Text>
                    </div>
                  </Card>
                </div>

                {/* Video Preview */}
                <div>
                  <Text as="h3" variant="headingMd">Video Content</Text>
                  <Card>
                    <div style={{ padding: '1rem' }}>
                      {selectedSubmission.video_url ? (
                        <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
                          <video 
                            controls 
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: '100%',
                              borderRadius: '6px'
                            }}
                            src={selectedSubmission.video_url}
                          >
                            Your browser does not support the video tag.
                          </video>
                        </div>
                      ) : (
                        <Banner tone="info">
                          <Text as="p">Video preview not available. Video key: {selectedSubmission.video_key}</Text>
                        </Banner>
                      )}
                    </div>
                  </Card>
                </div>

                {/* Review Notes */}
                {selectedSubmission.review_notes && (
                  <div>
                    <Text as="h3" variant="headingMd">Review Notes</Text>
                    <Card>
                      <div style={{ padding: '1rem' }}>
                        <Text as="p">{selectedSubmission.review_notes}</Text>
                      </div>
                    </Card>
                  </div>
                )}

                {/* Reward Information */}
                {selectedSubmission.reward && (
                  <div>
                    <Text as="h3" variant="headingMd">Reward Information</Text>
                    <Card>
                      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <Text as="p"><strong>Type:</strong> {selectedSubmission.reward.type}</Text>
                        <Text as="p"><strong>Value:</strong> {selectedSubmission.reward.value} {selectedSubmission.reward.currency}</Text>
                        <Text as="p"><strong>Status:</strong> {selectedSubmission.reward.status}</Text>
                      </div>
                    </Card>
                  </div>
                )}
              </div>
            </Modal.Section>
          </Modal>
        )}
      </Page>
    </AppProvider>
  )
}