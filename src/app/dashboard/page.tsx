'use client'

import { useEffect, useState } from 'react'

export default function Dashboard() {
  const [shop, setShop] = useState<string>('')

  useEffect(() => {
    // Extraer el shop domain de los URL parameters si estamos embebidos
    const urlParams = new URLSearchParams(window.location.search)
    const shopParam = urlParams.get('shop')
    if (shopParam) {
      setShop(shopParam)
    }
  }, [])

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          UGC Dashboard
        </h1>
        
        {shop && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              Conectado a: <strong>{shop}</strong>
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Videos Pendientes
            </h3>
            <p className="text-3xl font-bold text-yellow-600">0</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Videos Aprobados
            </h3>
            <p className="text-3xl font-bold text-green-600">0</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Recompensas Enviadas
            </h3>
            <p className="text-3xl font-bold text-blue-600">0</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Submissions de UGC
            </h2>
          </div>
          <div className="p-6">
            <p className="text-gray-500 text-center py-8">
              No hay submissions de UGC aún. Los videos aparecerán aquí cuando los clientes los suban.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}