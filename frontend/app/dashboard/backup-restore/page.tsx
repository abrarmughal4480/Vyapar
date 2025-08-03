'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface BackupData {
  version: string
  timestamp: string
  customers: any[]
  products: any[]
  invoices: any[]
  quotations: any[]
  purchases: any[]
  settings: any
}

interface BackupHistoryItem {
  id: number
  name: string
  date: string
  size: string
  type: string
}

interface User {
  id: string
  email: string
  name: string
  role: string
  businessId: string
}

// Enhanced Modal Component
function EnhancedModal({
  title,
  subtitle,
  open,
  onClose,
  children,
  type = 'default',
  size = 'md'
}: {
  title: string
  subtitle?: string
  open: boolean
  onClose: () => void
  children: React.ReactNode
  type?: 'default' | 'success' | 'error' | 'warning'
  size?: 'sm' | 'md' | 'lg' | 'xl'
}) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose()
      }
      document.addEventListener('keydown', handleEscape)
      return () => {
        document.body.style.overflow = 'unset'
        document.removeEventListener('keydown', handleEscape)
      }
    }
  }, [open, onClose])

  if (!open) return null

  const typeColors = {
    default: 'from-blue-600 to-blue-700',
    success: 'from-green-600 to-green-700',
    error: 'from-red-600 to-red-700',
    warning: 'from-yellow-600 to-yellow-700'
  }

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl'
  }

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={`bg-white rounded-3xl shadow-2xl w-full ${sizeClasses[size]} transform animate-modalSlideIn`}>
        <div className={`bg-gradient-to-r ${typeColors[type]} px-8 py-6 rounded-t-3xl relative overflow-hidden`}>
          <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"></div>
          <div className="flex justify-between items-center relative z-10">
            <div>
              <h2 className="text-2xl font-bold text-white">{title}</h2>
              {subtitle && <p className="text-white/80 text-sm mt-1">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-2xl transition-all duration-200 hover:rotate-90 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-white/50 rounded-lg p-1"
            >
              ✕
            </button>
          </div>
        </div>
        <div className="p-8">{children}</div>
      </div>
    </div>
  )
}

export default function BackupRestorePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [backupData, setBackupData] = useState<BackupData | null>(null)
  const [restoreStatus, setRestoreStatus] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [selectedFileForRestore, setSelectedFileForRestore] = useState<File | null>(null)
  const [backupHistory, setBackupHistory] = useState<BackupHistoryItem[]>([])
  const [selectedBackupType, setSelectedBackupType] = useState('full')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [backupProgress, setBackupProgress] = useState(0)
  const [isInitializing, setIsInitializing] = useState(true)
  const [backupTableExists, setBackupTableExists] = useState(false)
  const [isCheckingTable, setIsCheckingTable] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

  const backupOptions = [
    {
      value: 'full',
      label: 'Complete Business Backup',
      desc: 'All data including customers, products, sales, purchases, and settings',
      icon: '🏢',
      features: ['All Customers', 'All Products', 'All Sales', 'All Purchases', 'Business Settings']
    },
    {
      value: 'customers',
      label: 'Customer Data Only',
      desc: 'Customer information, contacts, and transaction history',
      icon: '👥',
      features: ['Customer Profiles', 'Contact Information', 'Customer Transactions']
    },
    {
      value: 'products',
      label: 'Product Catalog',
      desc: 'Product information, pricing, and inventory data',
      icon: '📦',
      features: ['Product Details', 'Pricing Information', 'Stock Levels']
    }
  ]

  // Mock backup responses for development
  const getMockBackupResponse = useCallback((endpoint: string, method: string = 'GET') => {
    if (endpoint.includes('/backup/history/')) {
      return {
        success: true,
        data: [
          {
            id: 1,
            name: 'Full Backup 2024-01-15',
            date: '2024-01-15',
            size: '2.5 MB',
            type: 'full'
          }
        ]
      }
    }
    
    if (endpoint.includes('/backup/create/') && method === 'POST') {
      return {
        success: true,
        data: {
          version: '1.0',
          timestamp: new Date().toISOString(),
          customers: [],
          products: [],
          sales: [],
          purchases: [],
          settings: {}
        }
      }
    }
    
    return { success: true, data: [] }
  }, [])

  // Enhanced API call with real backend integration
  const makeApiCall = useCallback(async (endpoint: string, options: RequestInit = {}): Promise<any> => {
    // Use frontend API routes that proxy to backend
    const url = `/api${endpoint}`
    
    try {
      const response = await fetch(url, {
        ...options,
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { message: errorText || 'Server error occurred' }
        }
        
        throw new Error(errorData.message || `Server Error: ${response.statusText}`)
      }

      const data = await response.json()
      return data
    } catch (error: any) {
      console.error('API call failed:', error)
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        console.log('Backend not available, using demo data')
        return getMockBackupResponse(endpoint, options.method as string)
      }
      throw error
    }
  }, [getMockBackupResponse])

  // Download backup file function
  const downloadBackupFile = useCallback((backupData: any, backupType: string) => {
    try {
      const fileName = `${backupType}-backup-${new Date().toISOString().split('T')[0]}.json`
      const jsonString = JSON.stringify(backupData, null, 2)
      const blob = new Blob([jsonString], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading backup file:', error)
      setErrorMessage('Failed to download backup file')
      setShowErrorModal(true)
    }
  }, [])

  // Handle file change function
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setRestoreStatus(null)
    setUploadProgress(0)
    
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.json')) {
      setErrorMessage('Invalid file format. Please select a JSON backup file (.json)')
      setShowErrorModal(true)
      return
    }
    
    if (file.size > 100 * 1024 * 1024) {
      setErrorMessage('File too large. Maximum size allowed is 100MB')
      setShowErrorModal(true)
      return
    }
    
    if (file.size < 50) {
      setErrorMessage('File appears to be empty or corrupted')
      setShowErrorModal(true)
      return
    }

    setSelectedFileForRestore(file)
    setFileName(file.name)
    setShowConfirmModal(true)
  }, [])

  // Enhanced backup history fetch with fallback
  const fetchBackupHistory = useCallback(async () => {
    try {
      const result = await makeApiCall(`/backup/history/${user?.businessId}`)
      
      if (result.success && Array.isArray(result.data)) {
        setBackupHistory(result.data)
        setBackupTableExists(true)
      } else {
        setBackupHistory([])
        if (result.message && result.message.includes('table not found')) {
          setBackupTableExists(false)
        }
      }
    } catch (error: any) {
      console.error('Error fetching backup history:', error)
      setBackupHistory([])
      if (error.message && (error.message.includes('backup') || error.message.includes('table'))) {
        setBackupTableExists(false)
      }
    }
  }, [makeApiCall, user?.businessId])

  // Function to create backup table
  const createBackupTable = useCallback(async () => {
    try {
      setIsCheckingTable(true)
      const response = await makeApiCall('/backup/create-table', {
        method: 'POST',
      })

      if (response.success) {
        setBackupTableExists(true)
        await fetchBackupHistory()
        setErrorMessage('✅ Backup table created successfully!')
        setShowSuccessModal(true)
      } else {
        throw new Error(response.message || 'Failed to create backup table')
      }
    } catch (error: any) {
      console.error('Error creating backup table:', error)
      setErrorMessage(`❌ Failed to create backup table: ${error.message}`)
      setShowErrorModal(true)
    } finally {
      setIsCheckingTable(false)
    }
  }, [makeApiCall, fetchBackupHistory])

  // Enhanced backup creation
  const handleBackup = useCallback(async () => {
    setIsLoading(true)
    setBackupProgress(0)
    
    try {
      const progressInterval = setInterval(() => {
        setBackupProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + 10
        })
      }, 200)

      const result = await makeApiCall(`/backup/create/${user?.businessId}`, {
        method: 'POST',
        body: JSON.stringify({
          type: selectedBackupType,
          includeData: {
            customers: selectedBackupType === 'full' || selectedBackupType === 'customers',
            products: selectedBackupType === 'full' || selectedBackupType === 'products',
            sales: selectedBackupType === 'full',
            purchases: selectedBackupType === 'full',
            transactions: selectedBackupType === 'full',
            settings: selectedBackupType === 'full'
          }
        }),
      })
      
      clearInterval(progressInterval)
      setBackupProgress(100)
      
      if (result.success && result.data) {
        downloadBackupFile(result.data, selectedBackupType)
        setBackupData(result.data)
        setTimeout(async () => {
          await fetchBackupHistory()
        }, 1000)
        setShowSuccessModal(true)
      } else {
        throw new Error(result.message || 'Backup creation failed')
      }
      
    } catch (error: any) {
      console.error('Backup error:', error)
      setErrorMessage(`Backup failed: ${error.message}`)
      setShowErrorModal(true)
    } finally {
      setIsLoading(false)
      setBackupProgress(0)
    }
  }, [selectedBackupType, makeApiCall, downloadBackupFile, fetchBackupHistory])

  // Confirm restore function
  const confirmRestore = useCallback(async () => {
    if (!selectedFileForRestore) return
    
    setShowConfirmModal(false)
    setIsLoading(true)
    setUploadProgress(0)
    
    const reader = new FileReader()
    
    reader.onload = async (event) => {
      try {
        setUploadProgress(25)
        
        const text = event.target?.result as string
        let backupData

        try {
          backupData = JSON.parse(text)
        } catch {
          throw new Error('Invalid JSON format in backup file')
        }

        // Validate backup data structure
        if (!backupData.version || !backupData.timestamp) {
          throw new Error('Invalid backup file format')
        }

        setUploadProgress(50)
        
        const result = await makeApiCall(`/backup/restore/${user?.businessId}`, {
          method: 'POST',
          body: JSON.stringify({ data: backupData }),
        })
        
        setUploadProgress(75)
        
        if (result.success) {
          const stats = result.restoredItems || {}
          setRestoreStatus(
            `✅ Backup restored successfully!\n\n📊 Restored Data:\n` +
            `• ${stats.customers || 0} customers\n` +
            `• ${stats.products || 0} products\n` +
            `• ${stats.sales || 0} sales\n` +
            `• ${stats.purchases || 0} purchases\n` +
            `• ${stats.transactions || 0} transactions`
          )
          
          setUploadProgress(100)
          setShowSuccessModal(true)
          await fetchBackupHistory()
        } else {
          throw new Error(result.message || 'Restore operation failed')
        }
        
      } catch (error: any) {
        setErrorMessage(`Restore failed: ${error.message}`)
        setShowErrorModal(true)
      } finally {
        setIsLoading(false)
        setUploadProgress(0)
      }
    }
    
    reader.onerror = () => {
      setErrorMessage('Failed to read the backup file')
      setShowErrorModal(true)
      setIsLoading(false)
    }
    
    reader.readAsText(selectedFileForRestore)
  }, [selectedFileForRestore, makeApiCall, fetchBackupHistory])

  // Delete backup function
  const handleDeleteBackup = useCallback(async (backupId: number, backupName: string) => {
    if (!confirm(`Delete "${backupName}"? This action cannot be undone.`)) return

    try {
      const result = await makeApiCall(`/backup/${user?.businessId}/${backupId}`, {
        method: 'DELETE'
      })
      
      if (result.success) {
        setBackupHistory(prev => prev.filter(backup => backup.id !== backupId))
      } else {
        throw new Error(result.message || 'Delete failed')
      }
    } catch (error: any) {
      setErrorMessage(`Failed to delete backup: ${error.message}`)
      setShowErrorModal(true)
    }
  }, [makeApiCall, user?.businessId])

  // Download backup function
  const handleDownloadBackup = useCallback(async (backupId: number, backupType: string) => {
    try {
      const result = await makeApiCall(`/backup/${user?.businessId}/${backupId}/download`)
      
      if (result.success && result.data) {
        downloadBackupFile(result.data, backupType.toLowerCase().replace(' ', '-'))
      } else {
        throw new Error('Download failed')
      }
    } catch (error: any) {
      setErrorMessage(`Download failed: ${error.message}`)
      setShowErrorModal(true)
    }
  }, [makeApiCall, downloadBackupFile])

  // Initialize component
  useEffect(() => {
    const initialize = async () => {
      setIsInitializing(true)
      
      await fetchBackupHistory()
      
      setIsInitializing(false)
    }

    initialize()
  }, [fetchBackupHistory])

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
          <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin absolute inset-0 m-auto animation-delay-300"></div>
          <p className="text-xl font-semibold text-gray-900 mt-8">Loading Vypar Backup System...</p>
          <p className="text-gray-600">Securing your business data...</p>
        </div>
      </div>
    )
  }

  const totalStorageUsed = backupHistory.reduce((acc, backup) => {
    const sizeInMB = parseFloat(backup.size.replace(' MB', '')) || 0
    return acc + sizeInMB
  }, 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
      {/* Enhanced animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-32 w-96 h-96 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute -bottom-40 -left-32 w-96 h-96 bg-gradient-to-tr from-green-400/20 to-blue-600/20 rounded-full blur-3xl animate-float-delayed"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-purple-400/10 to-pink-400/10 rounded-full blur-2xl animate-pulse"></div>
      </div>

      <div className="relative z-10">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-transparent"></div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-48 translate-x-48"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-32 -translate-x-32"></div>
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            {/* Navigation */}
            <div className="flex items-center justify-between mb-8">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex items-center space-x-2 text-white/80 hover:text-white transition-colors group"
              >
                <svg className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="font-medium">Back to Dashboard</span>
              </button>

              {user && (
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                  <div className="text-white text-sm">
                    <p className="font-semibold">{user.name}</p>
                    <p className="text-white/80">{user.email}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Hero Section */}
            <div className="flex items-center justify-between mb-12">
              <div className="flex items-center space-x-6">
                <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-5xl font-black text-white drop-shadow-lg mb-2">Backup & Restore</h1>
                  <p className="text-xl text-white/90 drop-shadow">Secure your business data with enterprise-grade protection</p>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/30 transition-all duration-300">
                <div className="flex items-center space-x-4">
                  <div className="bg-green-500/30 p-3 rounded-xl">
                    <svg className="w-6 h-6 text-green-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white/80 font-medium">Total Backups</p>
                    <p className="text-2xl font-bold text-white">{backupHistory.length}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/30 transition-all duration-300">
                <div className="flex items-center space-x-4">
                  <div className="bg-blue-500/30 p-3 rounded-xl">
                    <svg className="w-6 h-6 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white/80 font-medium">Last Backup</p>
                    <p className="text-lg font-bold text-white">
                      {backupHistory.length > 0 ? backupHistory[0].date : 'Never'}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/30 transition-all duration-300">
                <div className="flex items-center space-x-4">
                  <div className="bg-purple-500/30 p-3 rounded-xl">
                    <svg className="w-6 h-6 text-purple-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white/80 font-medium">Storage Used</p>
                    <p className="text-lg font-bold text-white">
                      {totalStorageUsed.toFixed(1)} MB
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/30 transition-all duration-300">
                <div className="flex items-center space-x-4">
                  <div className="bg-yellow-500/30 p-3 rounded-xl">
                    <svg className="w-6 h-6 text-yellow-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white/80 font-medium">Security Level</p>
                    <p className="text-lg font-bold text-white">Enterprise</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
          {/* Backup Creation Card */}
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/20">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-8">
              <div className="flex items-center space-x-4">
                <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-sm">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-white">Create New Backup</h2>
                  <p className="text-white/90 text-lg">Choose what data to backup and secure</p>
                </div>
              </div>
            </div>

            <div className="p-8 space-y-8">
              {/* Progress Bar */}
              {isLoading && backupProgress > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span className="font-bold text-blue-900 text-lg">Creating Backup...</span>
                    </div>
                    <span className="text-blue-700 font-bold text-xl">{backupProgress}%</span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-4">
                    <div 
                      className="bg-gradient-to-r from-blue-600 to-purple-600 h-4 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${backupProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Backup Type Selection */}
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-gray-900">Select Backup Type</h3>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {backupOptions.map((option) => (
                    <div
                      key={option.value}
                      className={`cursor-pointer transition-all duration-300 transform ${
                        selectedBackupType === option.value
                          ? 'scale-105 shadow-2xl'
                          : 'hover:scale-102 hover:shadow-xl'
                      }`}
                      onClick={() => setSelectedBackupType(option.value)}
                    >
                      <div className={`p-6 rounded-2xl border-2 ${
                        selectedBackupType === option.value
                          ? 'border-blue-500 bg-blue-50 shadow-xl'
                          : 'border-gray-200 bg-white hover:border-blue-300'
                      }`}>
                        <div className="flex items-center mb-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                            selectedBackupType === option.value ? 'bg-blue-500 text-white' : 'bg-gray-100'
                          }`}>
                            {option.icon}
                          </div>
                          <div className="ml-4">
                            <h4 className="text-lg font-bold text-gray-900">{option.label}</h4>
                            <p className="text-sm text-gray-600">{option.desc}</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {option.features.map((feature, index) => (
                            <div key={index} className="flex items-center text-sm text-gray-700">
                              <span className="text-green-500 mr-2">✓</span>
                              {feature}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Create Backup Button */}
              <button
                onClick={handleBackup}
                disabled={isLoading}
                className={`w-full py-6 px-8 rounded-2xl font-bold text-xl shadow-2xl transition-all duration-300 transform ${
                  isLoading 
                    ? 'bg-gray-400 cursor-not-allowed text-white' 
                    : 'bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 text-white hover:from-blue-700 hover:via-purple-700 hover:to-blue-700 hover:scale-105 hover:shadow-3xl'
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-white border-t-transparent"></div>
                    <span>Creating Backup...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-3">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>Create {backupOptions.find(opt => opt.value === selectedBackupType)?.label}</span>
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Restore Card */}
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/20">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-8">
              <div className="flex items-center space-x-4">
                <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-sm">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l4-4m-4 4V4" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-white">Restore from Backup</h2>
                  <p className="text-white/90 text-lg">Upload and restore your business data</p>
                </div>
              </div>
            </div>

            <div className="p-8 space-y-8">
              {/* Progress Bar for Restore */}
              {isLoading && uploadProgress > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                      <span className="font-bold text-green-900 text-lg">Restoring Data...</span>
                    </div>
                    <span className="text-green-700 font-bold text-xl">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-green-200 rounded-full h-4">
                    <div 
                      className="bg-gradient-to-r from-green-600 to-emerald-600 h-4 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* File Upload Area */}
              <input
                type="file"
                accept=".json"
                onChange={handleFileChange}
                ref={fileInputRef}
                className="hidden"
                autoComplete="off" 
                autoCorrect="off" 
                spellCheck={false}
              />

              <div 
                className={`border-4 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 transform hover:scale-105 ${
                  fileName 
                    ? 'border-green-400 bg-green-50 shadow-xl' 
                    : 'border-gray-300 hover:border-green-400 hover:bg-green-50 hover:shadow-xl'
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="space-y-6">
                  <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center ${
                    fileName ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    <svg className={`w-10 h-10 ${fileName ? 'text-green-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  
                  {fileName ? (
                    <div className="space-y-3">
                      <p className="text-2xl font-bold text-green-700">File Ready for Restore</p>
                      <p className="text-green-600 font-semibold bg-white p-4 rounded-xl border border-green-200 text-lg">
                        {fileName}
                      </p>
                      <p className="text-gray-500">Click to select a different file</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-2xl font-bold text-gray-700">Select Backup File</p>
                      <p className="text-gray-500 text-lg">Drop your .json backup file here or click to browse</p>
                      <div className="flex items-center justify-center space-x-2 text-sm text-gray-400">
                        <span>📄</span>
                        <span>JSON files only</span>
                        <span>•</span>
                        <span>Max 100MB</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Warning */}
              <div className="bg-amber-50 border-l-4 border-amber-500 p-6 rounded-r-2xl">
                <div className="flex items-start space-x-4">
                  <svg className="w-8 h-8 text-amber-600 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <h4 className="font-bold text-amber-800 mb-2 text-lg">Important Warning</h4>
                    <p className="text-amber-700">
                      Restoring will completely replace all current data. This action is irreversible.
                      We recommend creating a backup of your current data before proceeding.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Backup History */}
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/20">
            <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-sm">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-white">Backup History</h2>
                    <p className="text-gray-300 text-lg">
                      Manage your backup archives ({backupHistory.length} total)
                      {!backupTableExists && <span className="text-yellow-300"> - Table Missing</span>}
                    </p>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  {!backupTableExists && (
                    <button
                      onClick={createBackupTable}
                      disabled={isCheckingTable}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-xl transition-all hover:scale-105 disabled:opacity-50 font-semibold flex items-center space-x-2"
                    >
                      {isCheckingTable ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Creating...</span>
                        </>
                      ) : (
                        <>
                          <span>🔧</span>
                          <span>Create Table</span>
                        </>
                      )}
                    </button>
                  )}
                  
                  <button
                    onClick={fetchBackupHistory}
                    disabled={isLoading}
                    className="bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-xl backdrop-blur-sm transition-all hover:scale-105 disabled:opacity-50 font-semibold"
                  >
                    <svg className={`w-6 h-6 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <div className="p-8">
              {!backupTableExists ? (
                <div className="text-center py-16">
                  <div className="w-24 h-24 mx-auto bg-yellow-100 rounded-full flex items-center justify-center mb-6">
                    <svg className="w-12 h-12 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">Backup Table Missing</h3>
                  <p className="text-gray-500 mb-8 text-lg">
                    The backup table does not exist in your database. Create it to enable backup history tracking.
                  </p>
                  <button
                    onClick={createBackupTable}
                    disabled={isCheckingTable}
                    className="inline-flex items-center space-x-3 bg-gradient-to-r from-yellow-600 to-orange-600 text-white px-8 py-4 rounded-xl font-bold hover:from-yellow-700 hover:to-orange-700 transition-all transform hover:scale-105 shadow-xl text-lg disabled:opacity-50"
                  >
                    {isCheckingTable ? (
                      <>
                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Creating Table...</span>
                      </>
                    ) : (
                      <>
                        <span>🔧</span>
                        <span>Create Backup Table</span>
                      </>
                    )}
                  </button>
                </div>
              ) : backupHistory.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-24 h-24 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-6">
                    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">No Backups Found</h3>
                  <p className="text-gray-500 mb-8 text-lg">Create your first backup to secure your business data</p>
                  <button
                    onClick={handleBackup}
                    className="inline-flex items-center space-x-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl font-bold hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-xl text-lg"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>Create First Backup</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Found {backupHistory.length} backup{backupHistory.length !== 1 ? 's' : ''}
                    </h3>
                    <div className="text-sm text-gray-500">
                      Total size: {totalStorageUsed.toFixed(1)} MB
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-4 px-6 font-semibold text-gray-900">Backup Name</th>
                          <th className="text-left py-4 px-6 font-semibold text-gray-900">Type</th>
                          <th className="text-left py-4 px-6 font-semibold text-gray-900">Date</th>
                          <th className="text-left py-4 px-6 font-semibold text-gray-900">Size</th>
                          <th className="text-right py-4 px-6 font-semibold text-gray-900">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {backupHistory.map((backup) => (
                          <tr key={backup.id} className="hover:bg-gray-50">
                            <td className="py-4 px-6">
                              <div className="flex items-center">
                                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                                  <span className="text-blue-600 text-lg">💾</span>
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">{backup.name}</p>
                                  <p className="text-sm text-gray-500">ID: {backup.id}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                backup.type === 'full' ? 'bg-green-100 text-green-800' :
                                backup.type === 'customers' ? 'bg-blue-100 text-blue-800' :
                                'bg-purple-100 text-purple-800'
                              }`}>
                                {backup.type.charAt(0).toUpperCase() + backup.type.slice(1)}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-gray-900">{backup.date}</td>
                            <td className="py-4 px-6 text-gray-900">{backup.size}</td>
                            <td className="py-4 px-6">
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  onClick={() => handleDownloadBackup(backup.id, backup.type)}
                                  className="text-blue-600 hover:text-blue-700 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                                  title="Download"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l4-4m-4 4V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v12z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleDeleteBackup(backup.id, backup.name)}
                                  className="text-red-600 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                                  title="Delete"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <EnhancedModal
          title={restoreStatus ? 'Restore Complete!' : 'Backup Created Successfully!'}
          open={showSuccessModal}
          onClose={() => {
            setShowSuccessModal(false)
            setBackupData(null)
            setRestoreStatus(null)
            setFileName(null)
            setSelectedFileForRestore(null)
          }}
          type="success"
          size="lg"
        >
          <div className="text-center space-y-6">
            <div className="w-20 h-20 bg-gradient-to-r from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
              <span className="text-white text-3xl">✓</span>
            </div>
            <div className="text-gray-600 whitespace-pre-line bg-gray-50 p-6 rounded-2xl text-lg font-medium">
              {restoreStatus || `Your ${selectedBackupType} backup has been created and downloaded successfully. Your business data is now secure!`}
            </div>
            <button
              onClick={() => {
                setShowSuccessModal(false)
                setBackupData(null)
                setRestoreStatus(null)
                setFileName(null)
                setSelectedFileForRestore(null)
              }}
              className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-4 rounded-xl font-bold text-lg hover:from-green-700 hover:to-green-800 transition-all transform hover:scale-105"
            >
              Perfect, Thank You!
            </button>
          </div>
        </EnhancedModal>
      )}

      {/* Confirm Modal */}
      {showConfirmModal && (
        <EnhancedModal
          title="Confirm Data Restore"
          subtitle="This action cannot be undone"
          open={showConfirmModal}
          onClose={() => {
            setShowConfirmModal(false)
            setSelectedFileForRestore(null)
            setFileName(null)
          }}
          type="warning"
          size="lg"
        >
          <div className="text-center space-y-6">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-amber-100">
              <svg className="h-8 w-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p className="text-gray-600 text-lg mb-6">
                This will permanently replace all your current business data with the backup data. 
                This action cannot be undone.
              </p>
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                <p className="text-red-700 font-bold text-sm">Final Warning!</p>
                <p className="text-red-600 text-sm">Make sure you have a backup of your current data before proceeding.</p>
              </div>
            </div>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => {
                  setShowConfirmModal(false)
                  setSelectedFileForRestore(null)
                  setFileName(null)
                }}
                className="px-8 py-3 border border-gray-300 rounded-xl text-gray-700 font-bold hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmRestore}
                className="px-8 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-bold hover:from-red-700 hover:to-red-800 transition-all transform hover:scale-105"
              >
                Yes, Restore Now
              </button>
            </div>
          </div>
        </EnhancedModal>
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <EnhancedModal
          title="Operation Failed"
          open={showErrorModal}
          onClose={() => {
            setShowErrorModal(false)
            setErrorMessage('')
          }}
          type="error"
          size="lg"
        >
          <div className="text-center space-y-6">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100">
              <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div className="text-gray-600 bg-red-50 p-6 rounded-2xl border border-red-200 text-lg">
              {errorMessage}
            </div>
            <button
              onClick={() => {
                setShowErrorModal(false)
                setErrorMessage('')
              }}
              className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-4 rounded-xl font-bold text-lg hover:from-red-700 hover:to-red-800 transition-all transform hover:scale-105"
            >
              Try Again
            </button>
          </div>
        </EnhancedModal>
      )}

      {/* Global Styles */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translateY(-30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }

        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(20px); }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }
        
        .animate-modalSlideIn {
          animation: modalSlideIn 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        .animate-float {
          animation: float 6s ease-in-out infinite;
        }

        .animate-float-delayed {
          animation: float-delayed 6s ease-in-out infinite;
          animation-delay: 2s;
        }

        .animation-delay-300 {
          animation-delay: 300ms;
        }

        .hover\\:shadow-3xl:hover {
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }

        /* Smooth scrolling */
        html {
          scroll-behavior: smooth;
        }

        /* Focus styles for accessibility */
        *:focus {
          outline: 2px solid #3B82F6;
          outline-offset: 2px;
        }
      `}</style>
    </div>
  )
}
