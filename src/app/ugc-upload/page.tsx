'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

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
      setUploadProgress({ stage: 'uploading', progress: 20, message: 'Preparing upload...' })

      // 1. Obtener URL de upload firmada
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

      // 2. Upload directo a Cloudflare R2 (con fallback a proxy)
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
        
        // Fallback: usar proxy upload
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

      // 3. Crear submission y marcar token como usado
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

    } catch (err) {
      console.error('Upload error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Upload failed'
      setError(errorMessage)
      setUploadProgress({ stage: 'error', progress: 0, message: errorMessage })
    }
  }

  if (uploadProgress.stage === 'validating') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Validating your upload link...</p>
        </div>
      </div>
    )
  }

  if (error && !customerData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-6 text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Link</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">
            Please check your email for the correct upload link or contact support.
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Video Submitted!</h1>
          <p className="text-gray-600 mb-4">
            Thank you for sharing your experience! Your video has been submitted for review.
          </p>
          <p className="text-sm text-gray-500 mb-4">
            You'll receive your reward once the video is approved by our team.
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
              Upload Your Video 🎬
            </h1>
            <p className="text-gray-600">
              Hi <strong>{customerData?.first_name}</strong>! Upload your video to earn your reward.
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
                Select Your Video
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
              <h3 className="font-medium text-blue-900 mb-2">Video Tips:</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Good lighting and clear audio</li>
                <li>• Show the product in use</li>
                <li>• Share your honest experience</li>
                <li>• Keep it between 30-120 seconds</li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={!selectedFile || uploadProgress.stage === 'uploading' || uploadProgress.stage === 'processing'}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {uploadProgress.stage === 'uploading' || uploadProgress.stage === 'processing' 
                ? 'Uploading...' 
                : 'Submit Video'
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}