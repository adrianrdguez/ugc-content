'use client'

import { useEffect, useState } from 'react'

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

  const tabs = [
    { id: 'pending', content: 'Pending', status: 'pending' },
    { id: 'approved', content: 'Approved', status: 'approved' },
    { id: 'rejected', content: 'Rejected', status: 'rejected' },
  ]

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
        console.error('Failed to fetch submissions:', result.error)
      }
    } catch (error) {
      console.error('Error fetching submissions:', error)
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
        // Refresh submissions
        fetchSubmissions(tabs[selectedTab].status, shop, accessToken)
        setModalActive(false)
      } else {
        console.error('Failed to approve:', result.error)
      }
    } catch (error) {
      console.error('Error approving submission:', error)
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
        // Refresh submissions
        fetchSubmissions(tabs[selectedTab].status, shop, accessToken)
        setModalActive(false)
      } else {
        console.error('Failed to reject:', result.error)
      }
    } catch (error) {
      console.error('Error rejecting submission:', error)
    } finally {
      setActionLoading('')
    }
  }

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    }
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusClasses[status as keyof typeof statusClasses]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">UGC Dashboard</h1>
          {shop && (
            <p className="mt-2 text-sm text-gray-600">
              Connected to: <span className="font-medium">{shop}</span>
            </p>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <nav className="flex space-x-8" aria-label="Tabs">
            {tabs.map((tab, index) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(index)}
                className={`${
                  selectedTab === index
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
              >
                {tab.content}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="bg-white shadow rounded-lg">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : submissions.length > 0 ? (
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {submissions.map((submission) => (
                    <tr key={submission.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {submission.customer_name || submission.customer_email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {submission.customer_email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(submission.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(submission.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setSelectedSubmission(submission)
                              setModalActive(true)
                            }}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            View
                          </button>
                          {submission.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(submission.id)}
                                disabled={actionLoading === submission.id}
                                className="text-green-600 hover:text-green-900 disabled:opacity-50"
                              >
                                {actionLoading === submission.id ? 'Loading...' : 'Approve'}
                              </button>
                              <button
                                onClick={() => handleReject(submission.id)}
                                disabled={actionLoading === submission.id}
                                className="text-red-600 hover:text-red-900 disabled:opacity-50"
                              >
                                {actionLoading === submission.id ? 'Loading...' : 'Reject'}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">
                No submissions found for {tabs[selectedTab].content.toLowerCase()} status.
              </p>
            </div>
          )}
        </div>

        {/* Modal */}
        {modalActive && selectedSubmission && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Review UGC Submission</h3>
                  <button
                    onClick={() => setModalActive(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <span className="sr-only">Close</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Customer Info */}
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-2">Customer Information</h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p><strong>Name:</strong> {selectedSubmission.customer_name}</p>
                      <p><strong>Email:</strong> {selectedSubmission.customer_email}</p>
                      <p><strong>Status:</strong> {getStatusBadge(selectedSubmission.status)}</p>
                      <p><strong>Submitted:</strong> {new Date(selectedSubmission.created_at).toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Video */}
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-2">Video</h4>
                    {selectedSubmission.video_url ? (
                      <video 
                        controls 
                        className="w-full max-h-96 rounded-lg"
                        src={selectedSubmission.video_url}
                      >
                        Your browser does not support the video tag.
                      </video>
                    ) : (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-blue-700">
                          Video preview not available. Video key: {selectedSubmission.video_key}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Review Notes */}
                  {selectedSubmission.review_notes && (
                    <div>
                      <h4 className="text-md font-medium text-gray-900 mb-2">Review Notes</h4>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p>{selectedSubmission.review_notes}</p>
                      </div>
                    </div>
                  )}

                  {/* Reward Info */}
                  {selectedSubmission.reward && (
                    <div>
                      <h4 className="text-md font-medium text-gray-900 mb-2">Reward Information</h4>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p><strong>Type:</strong> {selectedSubmission.reward.type}</p>
                        <p><strong>Value:</strong> {selectedSubmission.reward.value} {selectedSubmission.reward.currency}</p>
                        <p><strong>Status:</strong> {selectedSubmission.reward.status}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                {selectedSubmission.status === 'pending' && (
                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      onClick={() => handleReject(selectedSubmission.id)}
                      disabled={actionLoading === selectedSubmission.id}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                    >
                      {actionLoading === selectedSubmission.id ? 'Processing...' : 'Reject'}
                    </button>
                    <button
                      onClick={() => handleApprove(selectedSubmission.id)}
                      disabled={actionLoading === selectedSubmission.id}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                    >
                      {actionLoading === selectedSubmission.id ? 'Processing...' : 'Approve'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}