'use client'

import { useEffect, useState, useCallback } from 'react'
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

interface OnboardingStep {
  id: number
  title: string
  description: string
  icon: string
  content: React.ReactNode
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
  const [showOnboarding, setShowOnboarding] = useState(true)
  const [onboardingStep, setOnboardingStep] = useState(0)
  const [agreedToTerms, setAgreedToTerms] = useState(false)

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
    if (file) {
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

  const onboardingSteps: OnboardingStep[] = [
    {
      id: 1,
      title: "Video Requirements",
      description: "Let's make sure your video meets our guidelines",
      icon: "🎬",
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <div className="mb-6">
              {/* Animated Camera Icon */}
              <div className="relative mx-auto w-20 h-20">
                <div className="absolute inset-0 animate-pulse">
                  <svg className="w-20 h-20 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17 10.5V7a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h12a1 1 0 001-1v-3.5l4 2v-7l-4 2zM14 13H5V9h9v4z"/>
                  </svg>
                </div>
                <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
              </div>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Video Requirements</h3>
            <p className="text-gray-600">Follow these guidelines for the best results</p>
          </div>
          
          <div className="bg-blue-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-gray-700"><strong>Duration:</strong> 30 seconds to 2 minutes</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-gray-700"><strong>Format:</strong> MP4, WebM, MOV, or AVI</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-gray-700"><strong>Size:</strong> Maximum 100MB</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-gray-700"><strong>Quality:</strong> Good lighting and clear audio</span>
            </div>
          </div>

          <div className="bg-yellow-50 rounded-lg p-4">
            <h4 className="font-medium text-yellow-800 mb-2">💡 Pro Tips</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Film in landscape (horizontal) mode</li>
              <li>• Show the product in use or action</li>
              <li>• Share your honest experience</li>
              <li>• Keep it authentic and natural</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 2,
      title: "Usage Permissions",
      description: "Understanding how your content will be used",
      icon: "📋",
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <div className="mb-6">
              {/* Animated Shield/Protection Icon */}
              <div className="relative mx-auto w-20 h-20">
                <div className="absolute inset-0 animate-bounce">
                  <svg className="w-20 h-20 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M10,17L6,13L7.41,11.59L10,14.17L16.59,7.58L18,9L10,17Z"/>
                  </svg>
                </div>
                <div className="absolute inset-0 bg-green-100 rounded-full opacity-30 animate-pulse"></div>
              </div>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Usage Permissions</h3>
            <p className="text-gray-600">Here's how we'll use your amazing content</p>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-green-800 mb-3">✅ We may use your video for:</h4>
            <div className="space-y-2 text-sm text-green-700">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Product pages and website galleries</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Social media marketing (Instagram, Facebook, TikTok)</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Email campaigns and newsletters</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Advertising and promotional materials</span>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 mb-2">🛡️ Your Privacy</h4>
            <p className="text-sm text-blue-700">
              We respect your privacy. Your personal information will never be shared, 
              and you'll always be credited when we use your content. You can request 
              removal at any time by contacting us.
            </p>
          </div>

          <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
            <input
              type="checkbox"
              id="terms-agreement"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="terms-agreement" className="text-sm text-gray-700">
              I agree to allow the use of my video content for marketing purposes as described above. 
              I understand that I will be credited and can request removal at any time.
            </label>
          </div>
        </div>
      )
    },
    {
      id: 3,
      title: "Upload Your Video",
      description: "Share your experience with us",
      icon: "📤",
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <div className="mb-6">
              {/* Animated Rocket/Upload Icon */}
              <div className="relative mx-auto w-20 h-20">
                <div className="absolute inset-0 animate-bounce">
                  <svg className="w-20 h-20 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M2.81,14.17L5.64,11.35L8.47,14.18L11.29,11.36C10.77,9.85 11.06,8.18 12.14,7.09C13.38,5.85 15.21,5.56 16.65,6.22L14.43,8.44L15.85,9.85L18.07,7.63C18.73,9.07 18.44,10.9 17.2,12.14C16.11,13.22 14.44,13.5 12.93,12.99L10.11,15.81L12.94,18.64L10.12,21.46L4.75,16.09L2.81,14.17M5.64,16.07L7.58,18L9.86,15.74L7.92,13.8L5.64,16.07M16.5,5.5L18.5,7.5L20.27,5.73C21.33,6.04 22,6.5 22,7.5C22,8.14 21.56,8.64 21,9.12V10.5C21.56,10.92 22,11.42 22,12C22,13 21.33,13.46 20.27,13.77L18.5,12L16.5,10L15.04,11.46C14.76,11.06 14.56,10.61 14.45,10.11L16.5,8.06V5.5Z"/>
                  </svg>
                </div>
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                  <div className="flex space-x-1">
                    <div className="w-1 h-3 bg-orange-400 rounded-full animate-pulse"></div>
                    <div className="w-1 h-4 bg-red-400 rounded-full animate-pulse delay-75"></div>
                    <div className="w-1 h-3 bg-orange-400 rounded-full animate-pulse delay-150"></div>
                  </div>
                </div>
              </div>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Ready to Upload!</h3>
            <p className="text-gray-600">You're all set. Let's get your video uploaded.</p>
          </div>
          
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-700 mb-3">
              Thanks for taking the time to share your experience! 
              Your authentic content helps other customers make confident purchases.
            </p>
            <div className="inline-flex items-center space-x-3 text-blue-600">
              {/* Animated Gift Box */}
              <div className="relative">
                <div className="relative w-8 h-8 group">
                  {/* Gift box base */}
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg transform group-hover:scale-110 transition-transform duration-300"></div>
                  
                  {/* Gift box ribbon vertical */}
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-1 h-full bg-yellow-300 z-10"></div>
                  
                  {/* Gift box ribbon horizontal */}
                  <div className="absolute top-1/2 left-0 transform -translate-y-1/2 w-full h-1 bg-yellow-300 z-10"></div>
                  
                  {/* Bow */}
                  <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 z-20">
                    <div className="relative">
                      <div className="w-3 h-2 bg-red-500 rounded-full animate-pulse"></div>
                      <div className="absolute top-0 left-0 w-1.5 h-2 bg-red-600 rounded-l-full"></div>
                      <div className="absolute top-0 right-0 w-1.5 h-2 bg-red-600 rounded-r-full"></div>
                    </div>
                  </div>
                  
                  {/* Sparkles around gift */}
                  <div className="absolute -top-1 -right-1 w-1 h-1 bg-yellow-400 rounded-full animate-ping"></div>
                  <div className="absolute -bottom-1 -left-1 w-1 h-1 bg-yellow-400 rounded-full animate-ping delay-100"></div>
                  <div className="absolute top-1/2 -right-2 w-0.5 h-0.5 bg-yellow-400 rounded-full animate-ping delay-200"></div>
                </div>
              </div>
              <span className="font-medium">Reward waiting after approval!</span>
            </div>
          </div>
        </div>
      )
    }
  ]

  // Loading state
  if (uploadProgress.stage === 'validating') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center max-w-md w-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Validating your link...</h2>
          <p className="text-gray-600">Please wait while we verify your upload permissions.</p>
        </div>
      </div>
    )
  }

  // Error state - invalid link
  if (error && !customerData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center max-w-md w-full">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Invalid Upload Link</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">
            Please check your email for the correct upload link or contact support.
          </p>
        </div>
      </div>
    )
  }

  // Success state
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center max-w-md w-full">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Video Submitted Successfully!</h2>
          <p className="text-gray-600 mb-4">
            Thank you for sharing your experience! Your video has been submitted for review.
          </p>
          <div className="bg-blue-50 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-800">
              You'll receive your reward once the video is approved by our team.
            </p>
          </div>
          <p className="text-sm text-gray-500">
            We'll notify you at <strong>{customerData?.email}</strong> when your video is reviewed.
          </p>
        </div>
      </div>
    )
  }

  // Onboarding Modal
  if (showOnboarding && customerData) {
    const currentStep = onboardingSteps[onboardingStep]
    const isLastStep = onboardingStep === onboardingSteps.length - 1
    const canProceed = onboardingStep !== 1 || agreedToTerms // Step 2 (index 1) requires terms agreement

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Step {currentStep.id} of {onboardingSteps.length}
                </h2>
                <p className="text-sm text-gray-500">{currentStep.title}</p>
              </div>
              <button
                onClick={() => setShowOnboarding(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                ×
              </button>
            </div>
            
            {/* Progress bar */}
            <div className="mt-4">
              <div className="flex space-x-2">
                {onboardingSteps.map((_, index) => (
                  <div
                    key={index}
                    className={`h-2 flex-1 rounded-full ${
                      index <= onboardingStep ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {currentStep.content}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 flex justify-between">
            <button
              onClick={() => setOnboardingStep(Math.max(0, onboardingStep - 1))}
              disabled={onboardingStep === 0}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Back
            </button>
            
            <button
              onClick={() => {
                if (isLastStep) {
                  setShowOnboarding(false)
                } else {
                  setOnboardingStep(onboardingStep + 1)
                }
              }}
              disabled={!canProceed}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLastStep ? 'Start Upload' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Main upload form
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Share Your Experience! 🎬
            </h1>
            <p className="text-lg text-gray-600">
              Hi {customerData?.first_name}! Upload your video to earn your reward.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 py-8">
        {/* Progress indicator */}
        {uploadProgress.stage !== 'idle' && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">{uploadProgress.message}</span>
              <span className="text-sm font-medium text-gray-900">{uploadProgress.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  uploadProgress.stage === 'error' ? 'bg-red-500' : 'bg-blue-600'
                }`}
                style={{ width: `${uploadProgress.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-center">
              <span className="text-red-600 text-xl mr-3">⚠️</span>
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Main upload card */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-8">
            <div className="text-center mb-8">
              <button
                onClick={() => setShowOnboarding(true)}
                className="inline-flex items-center text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                <span className="mr-2">ℹ️</span>
                Need help? View upload guide
              </button>
            </div>

            {/* File upload area */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-4">
                Upload Your Video
              </label>
              
              {!selectedFile ? (
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-blue-400 transition-all duration-300 hover:bg-blue-50">
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="video-upload"
                    disabled={uploadProgress.stage === 'uploading' || uploadProgress.stage === 'processing'}
                  />
                  <label 
                    htmlFor="video-upload" 
                    className="cursor-pointer block"
                  >
                    {/* Animated Professional Camera */}
                    <div className="mb-6">
                      <div className="relative mx-auto w-24 h-24 group">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-600 rounded-2xl transform rotate-3 group-hover:rotate-6 transition-transform duration-300"></div>
                        <div className="relative bg-white rounded-2xl p-4 shadow-lg transform group-hover:scale-105 transition-transform duration-300">
                          <svg className="w-16 h-16 text-gray-700 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17 10.5V7a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h12a1 1 0 001-1v-3.5l4 2v-7l-4 2zM14 13H5V9h9v4z"/>
                          </svg>
                          {/* Recording dot */}
                          <div className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                          {/* Lens reflection */}
                          <div className="absolute top-6 left-6 w-2 h-2 bg-white rounded-full opacity-60 animate-ping"></div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-xl font-semibold text-gray-700 mb-2 group-hover:text-blue-600 transition-colors">
                      Click to upload your video
                    </div>
                    <div className="text-gray-500 mb-4">
                      or drag and drop your file here
                    </div>
                    <div className="text-sm text-gray-400">
                      MP4, WebM, MOV, or AVI • Maximum 100MB
                    </div>
                    
                    {/* Upload animation arrows */}
                    <div className="mt-4 flex justify-center space-x-1">
                      <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce"></div>
                      <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce delay-100"></div>
                      <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce delay-200"></div>
                    </div>
                  </label>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-xl p-6 bg-gradient-to-r from-green-50 to-blue-50">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-green-400 to-blue-500 rounded-lg flex items-center justify-center relative overflow-hidden">
                      <svg className="w-6 h-6 text-white z-10" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18,16V10.5L22,14.5V7.5L18,11.5V6A1,1 0 0,0 17,5H3A1,1 0 0,0 2,6V18A1,1 0 0,0 3,19H17A1,1 0 0,0 18,18V16M16,10.97V13.03L20,10.97V13.03L16,10.97M4,7H16V17H4V7Z"/>
                      </svg>
                      {/* Success checkmark */}
                      <div className="absolute top-0 right-0 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                        <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M9,20.42L2.79,14.21L5.62,11.38L9,14.77L18.88,4.88L21.71,7.71L9,20.42Z"/>
                        </svg>
                      </div>
                      {/* Animated glow */}
                      <div className="absolute inset-0 bg-white opacity-20 animate-pulse"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {selectedFile.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatFileSize(selectedFile.size)} • {selectedFile.type}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedFile(null)}
                      disabled={uploadProgress.stage === 'uploading' || uploadProgress.stage === 'processing'}
                      className="group p-2 rounded-lg hover:bg-red-50 text-red-600 hover:text-red-700 disabled:opacity-50 transition-all duration-200"
                    >
                      <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Guidelines */}
            <div className="bg-gray-50 rounded-xl p-6 mb-8">
              <h3 className="font-semibold text-gray-900 mb-3">📝 Quick Guidelines</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>Good lighting and clear audio</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>Show the product in use</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>Share your honest experience</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>Keep it between 30-120 seconds</span>
                </div>
              </div>
            </div>

            {/* Submit button */}
            <button
              onClick={handleSubmit}
              disabled={!selectedFile || uploadProgress.stage === 'uploading' || uploadProgress.stage === 'processing'}
              className="group w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-center space-x-3">
                <span>
                  {uploadProgress.stage === 'uploading' || uploadProgress.stage === 'processing' 
                    ? 'Uploading...' 
                    : 'Submit Video & Claim Reward'
                  }
                </span>
                {!(uploadProgress.stage === 'uploading' || uploadProgress.stage === 'processing') && (
                  <div className="relative">
                    {/* Animated Gift Icon */}
                    <div className="relative w-6 h-6">
                      {/* Gift box base */}
                      <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 to-orange-500 rounded transform group-hover:rotate-12 transition-transform duration-300"></div>
                      
                      {/* Ribbon */}
                      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-0.5 h-full bg-red-400 z-10"></div>
                      <div className="absolute top-1/2 left-0 transform -translate-y-1/2 w-full h-0.5 bg-red-400 z-10"></div>
                      
                      {/* Bow */}
                      <div className="absolute -top-0.5 left-1/2 transform -translate-x-1/2 z-20">
                        <div className="w-2 h-1 bg-red-500 rounded-full group-hover:animate-pulse"></div>
                      </div>
                      
                      {/* Sparkle */}
                      <div className="absolute -top-1 -right-1 w-1 h-1 bg-white rounded-full animate-ping group-hover:animate-bounce"></div>
                    </div>
                  </div>
                )}
              </div>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>
            Having trouble? Contact us at{' '}
            <a href="mailto:support@example.com" className="text-blue-600 hover:underline">
              support@example.com
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}