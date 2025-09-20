'use client'

import { useState } from 'react'

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

  const addResult = (step: string, status: 'success' | 'error', data?: any, error?: string) => {
    setResults(prev => [...prev, { step, status, data, error }])
  }

  const runTypeformFlow = async () => {
    setIsRunning(true)
    setResults([])
    
    try {
      // Paso 1: Simular webhook de Typeform
      addResult('1. Simulando Typeform webhook', 'pending')
      
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
        addResult('1. Typeform webhook procesado', 'success', webhookResult)
        setUploadToken(webhookResult.upload_token)
        
        // Paso 2: Validar token generado
        addResult('2. Validando token generado', 'pending')
        
        const validateResponse = await fetch('/api/ugc/validate-upload-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: webhookResult.upload_token })
        })
        
        const validateResult = await validateResponse.json()
        
        if (validateResult.valid) {
          addResult('2. Token válido', 'success', validateResult)
          
          // Paso 3: Probar generación de URL de upload
          addResult('3. Generando URL de upload', 'pending')
          
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
            addResult('3. URL de upload generada', 'success', {
              videoKey: uploadUrlResult.videoKey,
              publicUrl: uploadUrlResult.publicUrl
            })
          } else {
            addResult('3. Error generando URL', 'error', null, uploadUrlResult.error)
          }
          
        } else {
          addResult('2. Token inválido', 'error', null, validateResult.error)
        }
        
      } else {
        addResult('1. Error en webhook', 'error', null, webhookResult.error)
      }
      
    } catch (error) {
      addResult('Error general', 'error', null, error instanceof Error ? error.message : 'Unknown error')
    }
    
    setIsRunning(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            🧪 Demo Typeform + UGC Flow
          </h1>
          
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email del cliente
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                disabled={isRunning}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre del cliente
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                disabled={isRunning}
              />
            </div>
          </div>
          
          <button
            onClick={runTypeformFlow}
            disabled={isRunning}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isRunning ? 'Ejecutando flujo...' : 'Probar flujo completo'}
          </button>
          
          {uploadToken && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-medium text-green-900 mb-2">✅ Token generado</h3>
              <p className="text-sm text-green-700 mb-3">
                Enlace de upload (válido 7 días):
              </p>
              <a
                href={`/ugc-upload?token=${uploadToken}`}
                target="_blank"
                className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 inline-block"
              >
                Abrir página de upload →
              </a>
            </div>
          )}
        </div>

        {/* Resultados */}
        {results.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Resultados del test
            </h2>
            
            <div className="space-y-4">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${
                    result.status === 'success' 
                      ? 'bg-green-50 border-green-200' 
                      : result.status === 'error'
                      ? 'bg-red-50 border-red-200'
                      : 'bg-yellow-50 border-yellow-200'
                  }`}
                >
                  <div className="flex items-center mb-2">
                    <span className={`w-3 h-3 rounded-full mr-3 ${
                      result.status === 'success' 
                        ? 'bg-green-500' 
                        : result.status === 'error'
                        ? 'bg-red-500'
                        : 'bg-yellow-500'
                    }`}></span>
                    <h3 className="font-medium text-gray-900">{result.step}</h3>
                  </div>
                  
                  {result.error && (
                    <p className="text-red-700 text-sm mb-2">❌ {result.error}</p>
                  )}
                  
                  {result.data && (
                    <details className="text-sm text-gray-600">
                      <summary className="cursor-pointer hover:text-gray-800">
                        Ver datos
                      </summary>
                      <pre className="mt-2 bg-gray-100 p-2 rounded text-xs overflow-auto">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instrucciones */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
          <h3 className="font-medium text-blue-900 mb-2">💡 Cómo funciona</h3>
          <ol className="text-sm text-blue-800 space-y-1">
            <li>1. Simula que un usuario completa tu Typeform</li>
            <li>2. El webhook procesa los datos y crea un token de upload</li>
            <li>3. Se valida el token y obtiene datos del cliente</li>
            <li>4. Se genera una URL firmada para upload a Cloudflare R2</li>
            <li>5. El usuario puede usar el enlace para subir su video</li>
          </ol>
        </div>
      </div>
    </div>
  )
}