'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  name: string
  email: string
  phone: string
  businessName: string
  businessType: string
  gstNumber: string
  address: string
  city: string
  state: string
  pincode: string
  country: string
}

interface SettingsSection {
  id: string
  title: string
  icon: string
  description: string
  items: SettingItem[]
}

interface SettingItem {
  id: string
  label: string
  description: string
  type: 'toggle' | 'select' | 'input' | 'button' | 'info'
  value?: any
  options?: { label: string; value: string }[]
  action?: () => void
}

export default function SettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<User>({
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+91 98765 43210',
    businessName: 'Devease Digital Business',
    businessType: 'Retail',
    gstNumber: '27AABCU9603R1ZX',
    address: '123 Business Street',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    country: 'India'
  })

  const [activeSection, setActiveSection] = useState('business')
  const [settings, setSettings] = useState<Record<string, any>>({
    // Business Settings
    autoBackup: true,
    backupFrequency: 'daily',
    lowStockAlert: true,
    stockThreshold: 10,
    
    // Invoice Settings
    autoInvoiceNumber: true,
    invoicePrefix: 'INV',
    invoiceStartNumber: 1,
    showDiscount: true,
    showTax: true,
    defaultPaymentTerms: '30',
    
    // Notification Settings
    emailNotifications: true,
    smsNotifications: false,
    whatsappNotifications: true,
    invoiceReminders: true,
    paymentReminders: true,
    
    // Display Settings
    currency: 'INR',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '12',
    language: 'en',
    theme: 'light',
    
    // Security Settings
    twoFactorAuth: false,
    sessionTimeout: '30',
    passwordExpiry: '90',
    
    // Printing Settings
    printerName: 'Default',
    paperSize: 'A4',
    margins: 'normal',
    showCompanyLogo: true,
    showWatermark: false,
    
    // Integration Settings
    gstFiling: false,
    eWayBill: false,
    bankSync: false,
    paymentGateway: 'none',

    // Advanced Features
    multiCurrency: false,
    autoSync: true,
    cloudBackup: true,
    dataEncryption: true,
    auditLog: true,
    customFields: false,
    advancedReporting: false,
    apiAccess: false,
    webhooks: false,
    bulkOperations: true,
    scheduledReports: false,
    
    // Performance Settings
    cacheEnabled: true,
    compressionLevel: 'medium',
    maxFileSize: '10',
    sessionStorage: 'local',
    
    // Compliance Settings
    gdprCompliance: true,
    dataRetention: '7years',
    consentTracking: true,
    rightsManagement: true
  })

  const [showEditProfile, setShowEditProfile] = useState(false)
  const [showExportData, setShowExportData] = useState(false)
  const [showAdvancedConfig, setShowAdvancedConfig] = useState(false)
  const [editedUser, setEditedUser] = useState<User>(user)
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

  // Simplified authentication check - no login redirect since login is on main page
  const checkAuth = useCallback(() => {
    try {
      // Always return demo credentials for dashboard access
      return {
        token: 'demo-token',
        user: { businessId: 'demo-business-1', name: 'Demo User' },
        headers: {
          'Authorization': `Bearer demo-token`,
          'Content-Type': 'application/json'
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      return {
        token: 'demo-token',
        user: { businessId: 'demo-business-1', name: 'Demo User' },
        headers: {
          'Authorization': `Bearer demo-token`,
          'Content-Type': 'application/json'
        }
      }
    }
  }, [])

  // API call wrapper with better error handling
  const makeApiCall = useCallback(async (endpoint: string, options: RequestInit = {}): Promise<any> => {
    const auth = checkAuth()
    const url = `${API_BASE_URL}${endpoint}`
    console.log('Making API call to:', url)
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...auth.headers,
          ...options.headers,
        },
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }))
        throw new Error(errorData.message || `Server Error: ${response.statusText}`)
      }

      const data = await response.json()
      return data
    } catch (error: any) {
      console.error('API call failed:', error)
      // Return fallback data instead of throwing error
      return { success: false, error: error.message }
    }
  }, [checkAuth, API_BASE_URL])

  // Load user profile and settings with fallback handling
  useEffect(() => {
    const loadData = async () => {
      try {
        const auth = checkAuth()
        
        // Load user profile with fallback
        try {
          const profileResult = await makeApiCall(`/settings/profile/${auth.user.businessId}`)
          if (profileResult.success) {
            setUser(profileResult.data)
            setEditedUser(profileResult.data)
          }
        } catch (error) {
          console.log('Using fallback user data')
          // Keep existing default user data
        }
        
        // Load settings with fallback
        try {
          const settingsResult = await makeApiCall(`/settings/${auth.user.businessId}`)
          if (settingsResult.success) {
            setSettings(settingsResult.data)
          }
        } catch (error) {
          console.log('Using fallback settings data')
          // Keep existing default settings
        }
      } catch (error) {
        console.error('Failed to load data:', error)
        // Continue with default data
      }
    }
    
    loadData()
  }, [checkAuth, makeApiCall])

  const handleSettingChange = (settingId: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [settingId]: value
    }))
    setHasUnsavedChanges(true)
  }

  const handleSaveSettings = async () => {
    try {
      const auth = checkAuth()
      const result = await makeApiCall(`/settings/${auth.user.businessId}`, {
        method: 'PUT',
        body: JSON.stringify(settings)
      })
      
      if (result.success) {
        setHasUnsavedChanges(false)
        setSettings(result.data)
      } else {
        // Save locally even if backend fails
        setHasUnsavedChanges(false)
        console.log('Settings saved locally')
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
      // Still mark as saved locally
      setHasUnsavedChanges(false)
    }
  }

  const handleSaveProfile = async () => {
    try {
      const auth = checkAuth()
      const result = await makeApiCall(`/settings/profile/${auth.user.businessId}`, {
        method: 'PUT',
        body: JSON.stringify(editedUser)
      })
      
      if (result.success) {
        setUser(result.data)
        setEditedUser(result.data)
      } else {
        // Update locally even if backend fails
        setUser(editedUser)
      }
      setShowEditProfile(false)
    } catch (error) {
      console.error('Failed to save profile:', error)
      // Update locally
      setUser(editedUser)
      setShowEditProfile(false)
    }
  }

  const handleExportData = async (format: string) => {
    try {
      const auth = checkAuth()
      const result = await makeApiCall(`/settings/export/${auth.user.businessId}`)
      
      let exportData;
      if (result.success) {
        exportData = result.data
      } else {
        // Create export data locally
        exportData = { user, settings, timestamp: new Date().toISOString() }
      }
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `vyparr-data-${Date.now()}.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed:', error)
      // Still allow local export
      const exportData = { user, settings, timestamp: new Date().toISOString() }
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `vyparr-data-${Date.now()}.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
    setShowExportData(false)
  }

  const handleRestoreData = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,.csv,.xlsx'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        try {
          const fileContent = await file.text()
          const importData = JSON.parse(fileContent)
          
          // Try backend import first
          try {
            const auth = checkAuth()
            const formData = new FormData()
            formData.append('file', file)
            
            const result = await fetch(`${API_BASE_URL}/settings/import/${auth.user.businessId}`, {
              method: 'POST',
              headers: {
                'Authorization': auth.headers.Authorization,
              },
              body: formData
            })
            
            if (result.ok) {
              window.location.reload()
              return
            }
          } catch (error) {
            console.log('Backend import failed, importing locally')
          }
          
          // Import locally if backend fails
          if (importData.user) {
            setUser(importData.user)
            setEditedUser(importData.user)
          }
          if (importData.settings) {
            setSettings(importData.settings)
          }
          
        } catch (error) {
          console.error('Import failed:', error)
          alert('Failed to import data. Please check file format.')
        }
      }
    }
    input.click()
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      try {
        // Create local URL for preview
        const localUrl = URL.createObjectURL(file)
        setUser(prev => ({ ...prev, businessLogo: localUrl }))
        
        // Try uploading to backend
        try {
          const auth = checkAuth()
          const formData = new FormData()
          formData.append('logo', file)
          
          const result = await fetch(`${API_BASE_URL}/settings/upload-logo/${auth.user.businessId}`, {
            method: 'POST',
            headers: {
              'Authorization': auth.headers.Authorization,
            },
            body: formData
          })
          
          if (result.ok) {
            const data = await result.json()
            if (data.success) {
              setUser(prev => ({ ...prev, businessLogo: data.data.logoUrl }))
            }
          }
        } catch (error) {
          console.log('Logo upload to backend failed, using local preview')
        }
      } catch (error) {
        console.error('Logo upload failed:', error)
      }
    }
  }

  const [filteredSections, setFilteredSections] = useState<SettingsSection[]>([])

  const settingsSections: SettingsSection[] = [
    {
      id: 'business',
      title: 'Business Information',
      icon: '🏢',
      description: 'Manage your business details and company information',
      items: [
        {
          id: 'businessName',
          label: 'Business Name',
          description: 'Your registered business name',
          type: 'info',
          value: user.businessName
        },
        {
          id: 'gstNumber',
          label: 'GST Number',
          description: 'Your GST registration number',
          type: 'info',
          value: user.gstNumber
        },
        {
          id: 'businessType',
          label: 'Business Type',
          description: 'Type of your business',
          type: 'info',
          value: user.businessType
        },
        {
          id: 'editProfile',
          label: 'Edit Business Profile',
          description: 'Update your business information',
          type: 'button',
          action: () => setShowEditProfile(true)
        },
        {
          id: 'businessHours',
          label: 'Business Hours',
          description: 'Set your working hours for better scheduling',
          type: 'button',
          action: () => setShowAdvancedConfig(true)
        },
        {
          id: 'businessLogo',
          label: 'Upload Business Logo',
          description: 'Add your company logo for documents',
          type: 'button',
          action: () => document.getElementById('logo-upload')?.click()
        },
        {
          id: 'multiLocation',
          label: 'Multiple Locations',
          description: 'Manage multiple business locations',
          type: 'toggle',
          value: settings.multiLocation
        }
      ]
    },
    {
      id: 'invoice',
      title: 'Invoice & Billing',
      icon: '📄',
      description: 'Configure invoice templates and billing preferences',
      items: [
        {
          id: 'autoInvoiceNumber',
          label: 'Auto Invoice Numbering',
          description: 'Automatically generate invoice numbers',
          type: 'toggle',
          value: settings.autoInvoiceNumber
        },
        {
          id: 'invoicePrefix',
          label: 'Invoice Prefix',
          description: 'Prefix for invoice numbers',
          type: 'input',
          value: settings.invoicePrefix
        },
        {
          id: 'showDiscount',
          label: 'Show Discount Column',
          description: 'Display discount column in invoices',
          type: 'toggle',
          value: settings.showDiscount
        },
        {
          id: 'showTax',
          label: 'Show Tax Details',
          description: 'Display tax breakdown in invoices',
          type: 'toggle',
          value: settings.showTax
        },
        {
          id: 'defaultPaymentTerms',
          label: 'Default Payment Terms (Days)',
          description: 'Default payment due period',
          type: 'select',
          value: settings.defaultPaymentTerms,
          options: [
            { label: '15 Days', value: '15' },
            { label: '30 Days', value: '30' },
            { label: '45 Days', value: '45' },
            { label: '60 Days', value: '60' },
            { label: '90 Days', value: '90' }
          ]
        }
      ]
    },
    {
      id: 'inventory',
      title: 'Inventory Management',
      icon: '📦',
      description: 'Configure stock management and alerts',
      items: [
        {
          id: 'lowStockAlert',
          label: 'Low Stock Alerts',
          description: 'Get notified when stock is running low',
          type: 'toggle',
          value: settings.lowStockAlert
        },
        {
          id: 'stockThreshold',
          label: 'Stock Threshold',
          description: 'Minimum stock level for alerts',
          type: 'input',
          value: settings.stockThreshold
        },
        {
          id: 'autoBackup',
          label: 'Auto Backup',
          description: 'Automatically backup inventory data',
          type: 'toggle',
          value: settings.autoBackup
        },
        {
          id: 'backupFrequency',
          label: 'Backup Frequency',
          description: 'How often to backup data',
          type: 'select',
          value: settings.backupFrequency,
          options: [
            { label: 'Daily', value: 'daily' },
            { label: 'Weekly', value: 'weekly' },
            { label: 'Monthly', value: 'monthly' }
          ]
        }
      ]
    },
    {
      id: 'notifications',
      title: 'Notifications',
      icon: '🔔',
      description: 'Manage notification preferences and alerts',
      items: [
        {
          id: 'emailNotifications',
          label: 'Email Notifications',
          description: 'Receive notifications via email',
          type: 'toggle',
          value: settings.emailNotifications
        },
        {
          id: 'smsNotifications',
          label: 'SMS Notifications',
          description: 'Receive notifications via SMS',
          type: 'toggle',
          value: settings.smsNotifications
        },
        {
          id: 'whatsappNotifications',
          label: 'WhatsApp Notifications',
          description: 'Receive notifications via WhatsApp',
          type: 'toggle',
          value: settings.whatsappNotifications
        },
        {
          id: 'invoiceReminders',
          label: 'Invoice Reminders',
          description: 'Send automatic invoice reminders',
          type: 'toggle',
          value: settings.invoiceReminders
        },
        {
          id: 'paymentReminders',
          label: 'Payment Reminders',
          description: 'Send automatic payment reminders',
          type: 'toggle',
          value: settings.paymentReminders
        }
      ]
    },
    {
      id: 'display',
      title: 'Display & Language',
      icon: '🎨',
      description: 'Customize appearance and regional settings',
      items: [
        {
          id: 'currency',
          label: 'Currency',
          description: 'Default currency for transactions',
          type: 'select',
          value: settings.currency,
          options: [
            { label: 'Indian Rupee (₹)', value: 'INR' },
            { label: 'US Dollar ($)', value: 'USD' },
            { label: 'Euro (€)', value: 'EUR' },
            { label: 'British Pound (£)', value: 'GBP' }
          ]
        },
        {
          id: 'dateFormat',
          label: 'Date Format',
          description: 'How dates are displayed',
          type: 'select',
          value: settings.dateFormat,
          options: [
            { label: 'DD/MM/YYYY', value: 'DD/MM/YYYY' },
            { label: 'MM/DD/YYYY', value: 'MM/DD/YYYY' },
            { label: 'YYYY-MM-DD', value: 'YYYY-MM-DD' }
          ]
        },
        {
          id: 'timeFormat',
          label: 'Time Format',
          description: 'How time is displayed',
          type: 'select',
          value: settings.timeFormat,
          options: [
            { label: '12 Hour (AM/PM)', value: '12' },
            { label: '24 Hour', value: '24' }
          ]
        },
        {
          id: 'language',
          label: 'Language',
          description: 'Interface language',
          type: 'select',
          value: settings.language,
          options: [
            { label: 'English', value: 'en' },
            { label: 'हिंदी', value: 'hi' },
            { label: 'தமிழ்', value: 'ta' },
            { label: 'বাংলা', value: 'bn' }
          ]
        },
        {
          id: 'theme',
          label: 'Theme',
          description: 'App appearance theme',
          type: 'select',
          value: settings.theme,
          options: [
            { label: 'Light', value: 'light' },
            { label: 'Dark', value: 'dark' },
            { label: 'Auto', value: 'auto' }
          ]
        }
      ]
    },
    {
      id: 'security',
      title: 'Security & Privacy',
      icon: '🔐',
      description: 'Manage account security and privacy settings',
      items: [
        {
          id: 'twoFactorAuth',
          label: 'Two-Factor Authentication',
          description: 'Add extra security to your account',
          type: 'toggle',
          value: settings.twoFactorAuth
        },
        {
          id: 'sessionTimeout',
          label: 'Session Timeout (Minutes)',
          description: 'Auto logout after inactivity',
          type: 'select',
          value: settings.sessionTimeout,
          options: [
            { label: '15 Minutes', value: '15' },
            { label: '30 Minutes', value: '30' },
            { label: '1 Hour', value: '60' },
            { label: '2 Hours', value: '120' }
          ]
        },
        {
          id: 'passwordExpiry',
          label: 'Password Expiry (Days)',
          description: 'Force password change period',
          type: 'select',
          value: settings.passwordExpiry,
          options: [
            { label: '30 Days', value: '30' },
            { label: '60 Days', value: '60' },
            { label: '90 Days', value: '90' },
            { label: 'Never', value: 'never' }
          ]
        }
      ]
    },
    {
      id: 'printing',
      title: 'Printing & Templates',
      icon: '🖨️',
      description: 'Configure printing preferences and document templates',
      items: [
        {
          id: 'paperSize',
          label: 'Default Paper Size',
          description: 'Paper size for printing documents',
          type: 'select',
          value: settings.paperSize,
          options: [
            { label: 'A4', value: 'A4' },
            { label: 'Letter', value: 'Letter' },
            { label: 'A5', value: 'A5' },
            { label: 'Legal', value: 'Legal' }
          ]
        },
        {
          id: 'showCompanyLogo',
          label: 'Show Company Logo',
          description: 'Include logo in printed documents',
          type: 'toggle',
          value: settings.showCompanyLogo
        },
        {
          id: 'showWatermark',
          label: 'Show Watermark',
          description: 'Add watermark to documents',
          type: 'toggle',
          value: settings.showWatermark
        }
      ]
    },
    {
      id: 'integrations',
      title: 'Integrations',
      icon: '🔗',
      description: 'Connect with external services and platforms',
      items: [
        {
          id: 'gstFiling',
          label: 'GST Filing Integration',
          description: 'Connect with GST portal for filing',
          type: 'toggle',
          value: settings.gstFiling
        },
        {
          id: 'eWayBill',
          label: 'E-Way Bill Integration',
          description: 'Generate e-way bills automatically',
          type: 'toggle',
          value: settings.eWayBill
        },
        {
          id: 'bankSync',
          label: 'Bank Synchronization',
          description: 'Sync with bank statements',
          type: 'toggle',
          value: settings.bankSync
        },
        {
          id: 'paymentGateway',
          label: 'Payment Gateway',
          description: 'Online payment integration',
          type: 'select',
          value: settings.paymentGateway,
          options: [
            { label: 'None', value: 'none' },
            { label: 'Razorpay', value: 'razorpay' },
            { label: 'PayU', value: 'payu' },
            { label: 'CCAvenue', value: 'ccavenue' }
          ]
        }
      ]
    },
    {
      id: 'advanced',
      title: 'Advanced Features',
      icon: '⚡',
      description: 'Powerful features for enhanced productivity',
      items: [
        {
          id: 'multiCurrency',
          label: 'Multi-Currency Support',
          description: 'Handle transactions in multiple currencies',
          type: 'toggle',
          value: settings.multiCurrency
        },
        {
          id: 'customFields',
          label: 'Custom Fields',
          description: 'Add custom fields to invoices and forms',
          type: 'toggle',
          value: settings.customFields
        },
        {
          id: 'advancedReporting',
          label: 'Advanced Analytics',
          description: 'Get detailed insights and custom reports',
          type: 'toggle',
          value: settings.advancedReporting
        },
        {
          id: 'apiAccess',
          label: 'API Access',
          description: 'Enable REST API for third-party integrations',
          type: 'toggle',
          value: settings.apiAccess
        },
        {
          id: 'webhooks',
          label: 'Webhooks',
          description: 'Real-time notifications to external systems',
          type: 'toggle',
          value: settings.webhooks
        },
        {
          id: 'bulkOperations',
          label: 'Bulk Operations',
          description: 'Process multiple records at once',
          type: 'toggle',
          value: settings.bulkOperations
        },
        {
          id: 'scheduledReports',
          label: 'Scheduled Reports',
          description: 'Automatically generate and send reports',
          type: 'toggle',
          value: settings.scheduledReports
        }
      ]
    },
    {
      id: 'performance',
      title: 'Performance & Storage',
      icon: '🚀',
      description: 'Optimize application performance and data management',
      items: [
        {
          id: 'cacheEnabled',
          label: 'Enable Caching',
          description: 'Improve performance with smart caching',
          type: 'toggle',
          value: settings.cacheEnabled
        },
        {
          id: 'compressionLevel',
          label: 'Data Compression',
          description: 'Reduce storage space and improve speed',
          type: 'select',
          value: settings.compressionLevel,
          options: [
            { label: 'None', value: 'none' },
            { label: 'Low', value: 'low' },
            { label: 'Medium', value: 'medium' },
            { label: 'High', value: 'high' }
          ]
        },
        {
          id: 'maxFileSize',
          label: 'Max File Upload Size (MB)',
          description: 'Maximum size for file uploads',
          type: 'select',
          value: settings.maxFileSize,
          options: [
            { label: '5 MB', value: '5' },
            { label: '10 MB', value: '10' },
            { label: '25 MB', value: '25' },
            { label: '50 MB', value: '50' },
            { label: '100 MB', value: '100' }
          ]
        },
        {
          id: 'sessionStorage',
          label: 'Session Storage',
          description: 'How to store user session data',
          type: 'select',
          value: settings.sessionStorage,
          options: [
            { label: 'Local Storage', value: 'local' },
            { label: 'Session Storage', value: 'session' },
            { label: 'Secure Cookies', value: 'cookies' }
          ]
        }
      ]
    },
    {
      id: 'compliance',
      title: 'Compliance & Privacy',
      icon: '🛡️',
      description: 'Data protection and regulatory compliance settings',
      items: [
        {
          id: 'gdprCompliance',
          label: 'GDPR Compliance',
          description: 'Enable EU General Data Protection Regulation compliance',
          type: 'toggle',
          value: settings.gdprCompliance
        },
        {
          id: 'dataRetention',
          label: 'Data Retention Period',
          description: 'How long to keep customer data',
          type: 'select',
          value: settings.dataRetention,
          options: [
            { label: '1 Year', value: '1year' },
            { label: '3 Years', value: '3years' },
            { label: '5 Years', value: '5years' },
            { label: '7 Years', value: '7years' },
            { label: 'Indefinite', value: 'indefinite' }
          ]
        },
        {
          id: 'consentTracking',
          label: 'Consent Tracking',
          description: 'Track user consent for data processing',
          type: 'toggle',
          value: settings.consentTracking
        },
        {
          id: 'rightsManagement',
          label: 'Data Rights Management',
          description: 'Handle data subject rights requests',
          type: 'toggle',
          value: settings.rightsManagement
        },
        {
          id: 'dataEncryption',
          label: 'Data Encryption',
          description: 'Encrypt sensitive data at rest',
          type: 'toggle',
          value: settings.dataEncryption
        },
        {
          id: 'auditLog',
          label: 'Audit Logging',
          description: 'Maintain detailed logs of all actions',
          type: 'toggle',
          value: settings.auditLog
        }
      ]
    },
    {
      id: 'backup',
      title: 'Backup & Recovery',
      icon: '💾',
      description: 'Data backup and disaster recovery options',
      items: [
        {
          id: 'cloudBackup',
          label: 'Cloud Backup',
          description: 'Automatic backup to cloud storage',
          type: 'toggle',
          value: settings.cloudBackup
        },
        {
          id: 'autoSync',
          label: 'Auto Sync',
          description: 'Automatically sync data across devices',
          type: 'toggle',
          value: settings.autoSync
        },
        {
          id: 'backupLocation',
          label: 'Backup Location',
          description: 'Choose where to store backups',
          type: 'select',
          value: settings.backupLocation || 'cloud',
          options: [
            { label: 'Cloud Storage', value: 'cloud' },
            { label: 'Local Storage', value: 'local' },
            { label: 'External Drive', value: 'external' },
            { label: 'Network Storage', value: 'network' }
          ]
        },
        {
          id: 'exportData',
          label: 'Export All Data',
          description: 'Download complete data backup',
          type: 'button',
          action: () => setShowExportData(true)
        },
        {
          id: 'restoreData',
          label: 'Restore from Backup',
          description: 'Restore data from previous backup',
          type: 'button',
          action: () => handleRestoreData()
        }
      ]
    },
    {
      id: 'developer',
      title: 'Developer Tools',
      icon: '👨‍💻',
      description: 'Advanced tools for developers and power users',
      items: [
        {
          id: 'debugMode',
          label: 'Debug Mode',
          description: 'Enable detailed logging and debug information',
          type: 'toggle',
          value: settings.debugMode
        },
        {
          id: 'apiDocs',
          label: 'API Documentation',
          description: 'View API documentation and endpoints',
          type: 'button',
          action: () => window.open('/api/docs', '_blank')
        },
        {
          id: 'webhookLogs',
          label: 'Webhook Logs',
          description: 'View webhook delivery logs and status',
          type: 'button',
          action: () => router.push('/dashboard/webhook-logs')
        },
        {
          id: 'testEnvironment',
          label: 'Test Environment',
          description: 'Switch to test/sandbox mode',
          type: 'toggle',
          value: settings.testEnvironment
        }
      ]
    }
  ]

  // Filter sections based on search
  useEffect(() => {
    const filtered = settingsSections.filter(section => {
      if (!searchTerm) return true
      return section.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
             section.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
             section.items.some(item => 
               item.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
               item.description.toLowerCase().includes(searchTerm.toLowerCase())
             )
    })
    setFilteredSections(filtered)
  }, [searchTerm, settingsSections])

  const renderSettingItem = (item: SettingItem) => {
    switch (item.type) {
      case 'toggle':
        return (
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">{item.label}</h4>
              <p className="text-sm text-gray-500">{item.description}</p>
            </div>
            <button
              onClick={() => handleSettingChange(item.id, !settings[item.id])}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings[item.id] ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings[item.id] ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        )

      case 'select':
        return (
          <div>
            <h4 className="font-medium text-gray-900 mb-1">{item.label}</h4>
            <p className="text-sm text-gray-500 mb-3">{item.description}</p>
            <select
              value={settings[item.id]}
              onChange={(e) => handleSettingChange(item.id, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {item.options?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )

      case 'input':
        return (
          <div>
            <h4 className="font-medium text-gray-900 mb-1">{item.label}</h4>
            <p className="text-sm text-gray-500 mb-3">{item.description}</p>
            <input
              type="text"
              value={settings[item.id]}
              onChange={(e) => handleSettingChange(item.id, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        )

      case 'button':
        return (
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">{item.label}</h4>
              <p className="text-sm text-gray-500">{item.description}</p>
            </div>
            <button
              onClick={item.action}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Edit
            </button>
          </div>
        )

      case 'info':
        return (
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">{item.label}</h4>
              <p className="text-sm text-gray-500">{item.description}</p>
            </div>
            <span className="text-sm font-medium text-gray-900">{item.value}</span>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Enhanced Header with Search and Actions */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
              <p className="text-gray-600 mt-1">Manage your account and application preferences</p>
            </div>
            <div className="flex items-center space-x-3">
              {hasUnsavedChanges && (
                <button
                  onClick={handleSaveSettings}
                  disabled={isLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
                >
                  {isLoading ? (
                    <>
                      <span className="animate-spin">⟳</span>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <span>💾</span>
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              )}
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold">
                  {user.name.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
              <div>
                <p className="font-medium text-gray-900">{user.name}</p>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
            </div>
          </div>
          
          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search settings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Enhanced Sidebar */}
          <div className="w-80 bg-white rounded-lg shadow-sm p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Settings Categories</h2>
            <nav className="space-y-1">
              {filteredSections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center px-3 py-2 text-left rounded-lg transition-colors ${
                    activeSection === section.id
                      ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-xl mr-3">{section.icon}</span>
                  <div>
                    <div className="font-medium">{section.title}</div>
                    <div className="text-xs text-gray-500 truncate">{section.description}</div>
                  </div>
                </button>
              ))}
            </nav>
            
            {/* Quick Actions */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="font-medium text-gray-900 mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <button
                  onClick={() => setShowExportData(true)}
                  className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded"
                >
                  📤 Export Data
                </button>
                <button
                  onClick={handleRestoreData}
                  className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded"
                >
                  📥 Import Data
                </button>
                <button
                  onClick={() => router.push('/dashboard/activity-log')}
                  className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded"
                >
                  📋 Activity Log
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 bg-white rounded-lg shadow-sm p-6">
            {filteredSections.map((section) => {
              if (section.id !== activeSection) return null
              
              return (
                <div key={section.id}>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                      <span className="text-3xl mr-3">{section.icon}</span>
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">{section.title}</h2>
                        <p className="text-gray-600">{section.description}</p>
                      </div>
                    </div>
                    {section.id === 'advanced' && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-1">
                        <span className="text-xs font-medium text-yellow-800">PRO FEATURES</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-6">
                    {section.items.map((item) => (
                      <div key={item.id} className="p-4 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
                        {renderSettingItem(item)}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Hidden file input for logo upload */}
      <input
        id="logo-upload"
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleLogoUpload}
      />

      {/* Export Data Modal */}
      {showExportData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Export Data</h2>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-gray-600">Choose the format for your data export:</p>
              <div className="space-y-3">
                <button
                  onClick={() => handleExportData('json')}
                  disabled={isLoading}
                  className="w-full flex items-center justify-between p-3 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  <span>📄 JSON Format</span>
                  <span className="text-sm text-gray-500">Complete data structure</span>
                </button>
                <button
                  onClick={() => handleExportData('csv')}
                  disabled={isLoading}
                  className="w-full flex items-center justify-between p-3 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  <span>📊 CSV Format</span>
                  <span className="text-sm text-gray-500">Spreadsheet compatible</span>
                </button>
                <button
                  onClick={() => handleExportData('xlsx')}
                  disabled={isLoading}
                  className="w-full flex items-center justify-between p-3 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  <span>📈 Excel Format</span>
                  <span className="text-sm text-gray-500">Microsoft Excel file</span>
                </button>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setShowExportData(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Edit Business Profile</h2>
                <button 
                  onClick={() => setShowEditProfile(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Business Name</label>
                  <input
                    type="text"
                    value={editedUser.businessName}
                    onChange={(e) => setEditedUser({...editedUser, businessName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Business Type</label>
                  <select
                    value={editedUser.businessType}
                    onChange={(e) => setEditedUser({...editedUser, businessType: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Retail">Retail</option>
                    <option value="Wholesale">Wholesale</option>
                    <option value="Manufacturing">Manufacturing</option>
                    <option value="Services">Services</option>
                    <option value="Trading">Trading</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Owner Name</label>
                  <input
                    type="text"
                    value={editedUser.name}
                    onChange={(e) => setEditedUser({...editedUser, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                  <input
                    type="tel"
                    value={editedUser.phone}
                    onChange={(e) => setEditedUser({...editedUser, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={editedUser.email}
                    onChange={(e) => setEditedUser({...editedUser, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">GST Number</label>
                  <input
                    type="text"
                    value={editedUser.gstNumber}
                    onChange={(e) => setEditedUser({...editedUser, gstNumber: e.target.value.toUpperCase()})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                <textarea
                  value={editedUser.address}
                  onChange={(e) => setEditedUser({...editedUser, address: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                  <input
                    type="text"
                    value={editedUser.city}
                    onChange={(e) => setEditedUser({...editedUser, city: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                  <input
                    type="text"
                    value={editedUser.state}
                    onChange={(e) => setEditedUser({...editedUser, state: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">PIN Code</label>
                  <input
                    type="text"
                    value={editedUser.pincode}
                    onChange={(e) => setEditedUser({...editedUser, pincode: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setShowEditProfile(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Configuration Modal */}
      {showAdvancedConfig && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Business Hours & Logo</h2>
                <button 
                  onClick={() => setShowAdvancedConfig(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Business Hours</label>
                <div className="grid grid-cols-7 gap-4">
                  {Array.from({ length: 7 }).map((_, index) => {
                    const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][index]
                    return (
                      <div key={day} className="flex flex-col">
                        <span className="text-center text-xs font-medium text-gray-700">{day}</span>
                        <input
                          type="text"
                          placeholder="9:00 AM"
                          className="mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <input
                          type="text"
                          placeholder="5:00 PM"
                          className="mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Business Logo</label>
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="text-gray-400">No Logo</span>
                  </div>
                  <button
                    onClick={() => document.getElementById('logo-upload')?.click()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Upload Logo
                  </button>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setShowAdvancedConfig(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowAdvancedConfig(false)
                    // Save business hours and logo logic
                  }}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
