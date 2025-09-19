'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

interface CustomerData {
  customerId: string
  shopDomain: string
  email: string
  customerName: string
  shopSettings: {
    reward_type: string
    reward_value: number
    reward_currency: string
  }
}

interface UploadProgress {
  stage: 'idle' | 'validating' | 'uploading' | 'processing' | 'completed' | 'error'
  progress: number
  message: string
}

export default function UGCForm() {
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

  useEffect(() => {
    if (token) {
      validateToken(token)
    } else {
      setError('No token provided in URL')
    }
  }, [token])

  const validateToken = async (token: string) => {
    setUploadProgress({ stage: 'validating', progress: 10, message: 'Validating access...' })
    
    try {
      const response = await fetch('/api/ugc/validate-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      })

      const result = await response.json()

      if (result.valid) {
        setCustomerData(result)
        setUploadProgress({ stage: 'idle', progress: 0, message: 'Ready to upload' })
      } else {
        setError(result.error || 'Invalid token')
        setUploadProgress({ stage: 'error', progress: 0, message: result.error || 'Invalid token' })
      }
    } catch (err) {
      setError('Failed to validate token')
      setUploadProgress({ stage: 'error', progress: 0, message: 'Failed to validate token' })
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validaciones client-side
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    
    if (!selectedFile || !customerData) return

    try {
      setUploadProgress({ stage: 'uploading', progress: 20, message: 'Generating upload URL...' })

      // 1. Obtener URL de upload
      const uploadResponse = await fetch('/api/ugc/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: selectedFile.name,
          contentType: selectedFile.type,
          customerId: customerData.customerId,
          shopDomain: customerData.shopDomain,
          fileSize: selectedFile.size
        })
      })

      const uploadData = await uploadResponse.json()

      if (!uploadData.success) {
        throw new Error(uploadData.error)
      }

      setUploadProgress({ stage: 'uploading', progress: 40, message: 'Uploading video...' })

      // 2. Subir archivo a Cloudflare R2
      const uploadToR2 = await fetch(uploadData.uploadUrl, {
        method: 'PUT',
        body: selectedFile,
        headers: {
          'Content-Type': selectedFile.type,
        }
      })

      if (!uploadToR2.ok) {
        throw new Error('Failed to upload video')
      }

      setUploadProgress({ stage: 'processing', progress: 80, message: 'Processing submission...' })

      // 3. Crear submission en la base de datos
      const submissionResponse = await fetch('/api/ugc/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: customerData.customerId,
          shopDomain: customerData.shopDomain,
          videoKey: uploadData.videoKey
        })
      })

      const submissionResult = await submissionResponse.json()

      if (!submissionResult.success) {
        throw new Error(submissionResult.error)
      }

      setUploadProgress({ stage: 'completed', progress: 100, message: 'Video submitted successfully!' })
      setIsSubmitted(true)

    } catch (err) {
      console.error('Upload error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Upload failed'
      setError(errorMessage)
      setUploadProgress({ stage: 'error', progress: 0, message: errorMessage })
    }
  }

  const getRewardText = () => {
    if (!customerData?.shopSettings) return 'a special reward'
    
    const { reward_type, reward_value, reward_currency } = customerData.shopSettings
    
    if (reward_type === 'discount') {
      return `${reward_value}${reward_currency === 'PERCENTAGE' ? '%' : ` ${reward_currency}`} discount`
    } else if (reward_type === 'gift_card') {
      return `${reward_value} ${reward_currency} gift card`
    }
    return 'a special reward'
  }

  if (uploadProgress.stage === 'validating') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Validating your access...</p>
        </div>
      </div>
    )
  }

  if (error && !customerData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-6 text-center">
          <div className="text-red-500 text-5xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">
            Please check your email for the correct link or contact the store for assistance.
          </p>
        </div>
      </div>
    )
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-6 text-center">
          <div className="text-green-500 text-5xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h1>
          <p className="text-gray-600 mb-4">
            Your video has been submitted successfully and is now pending review.
          </p>
          <p className="text-sm text-gray-500 mb-4">
            You'll receive {getRewardText()} once your video is approved by the store team.
          </p>
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm text-blue-700">
              We'll notify you at <strong>{customerData?.email}</strong> when your video is reviewed.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Share Your Experience! 🎬
            </h1>
            <p className="text-gray-600">
              Hello <strong>{customerData?.customerName}</strong>! 
              Create a video showing our products and earn {getRewardText()}.
            </p>
          </div>

          {/* Progress Bar */}
          {uploadProgress.stage !== 'idle' && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">{uploadProgress.message}</span>
                <span className="text-sm text-gray-600">{uploadProgress.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    uploadProgress.stage === 'error' ? 'bg-red-500' : 'bg-blue-600'
                  }`}
                  style={{ width: `${uploadProgress.progress}%` }}
                ></div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Your Video
              </label>
              <input
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                disabled={uploadProgress.stage === 'uploading' || uploadProgress.stage === 'processing'}
              />
              <p className="mt-2 text-sm text-gray-500">
                MP4, WebM, MOV, or AVI. Maximum size: 100MB. 
                Recommended duration: 30-120 seconds.
              </p>
            </div>

            {selectedFile && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">Selected File:</h3>
                <p className="text-sm text-gray-600">
                  <strong>Name:</strong> {selectedFile.name}<br/>
                  <strong>Size:</strong> {(selectedFile.size / 1024 / 1024).toFixed(1)} MB<br/>
                  <strong>Type:</strong> {selectedFile.type}
                </p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">Video Guidelines:</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Show the product clearly in good lighting</li>
                <li>• Share your honest experience using the product</li>
                <li>• Keep it authentic and natural</li>
                <li>• Duration: 30-120 seconds recommended</li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={!selectedFile || uploadProgress.stage === 'uploading' || uploadProgress.stage === 'processing'}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {uploadProgress.stage === 'uploading' || uploadProgress.stage === 'processing' 
                ? 'Processing...' 
                : 'Submit Video'
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}