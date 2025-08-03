'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function AddPage() {
  const router = useRouter()
  
  useEffect(() => {
    router.replace('/dashboard/items/add-item')
  }, [router])
  
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting...</p>
      </div>
    </div>
  )
}
  