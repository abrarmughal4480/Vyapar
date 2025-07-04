'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

type Account = {
  id: number
  name: string
  balance: number
 type: 'Cash' | 'Bank' | 'Loan';
  accountNumber: string
  color: string
  businessId?: string
  createdAt?: string
  updatedAt?: string
}

type Transaction = {
  id: string
  type: string
  party: string
  amount: number
  mode: string
  date: string
  account: string
  accountId: number
  status: 'Completed' | 'Pending' | 'Failed'
  description?: string
  referenceNumber?: string
  businessId?: string
  createdAt?: string
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
    xl: 'max-w-3xl' // changed for better modal width
  }

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={`bg-white rounded-3xl shadow-2xl w-full ${sizeClasses[size]} max-h-[90vh] overflow-y-auto transform animate-modalSlideIn`}>
        {/* Modal Header */}
        <div className={`bg-gradient-to-r ${typeColors[type]} px-10 py-7 rounded-t-3xl relative overflow-hidden`}>
          <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"></div>
          <div className="flex justify-between items-center relative z-10">
            <div>
              <h2 className="text-3xl font-bold text-white">{title}</h2>
              {subtitle && <p className="text-white/80 text-base mt-2">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-3xl transition-all duration-200 hover:rotate-90 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-white/50 rounded-lg p-2"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>
        {/* Modal Content */}
        <div className="p-10 bg-white rounded-b-3xl">
          {children}
        </div>
      </div>
    </div>
  )
}

export default function CashBankPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [paymentType, setPaymentType] = useState<'in' | 'out' | null>(null)
  const [showAccountModal, setShowAccountModal] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [filterType, setFilterType] = useState('all')
  const [isLoading, setIsLoading] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  
  // Form states
  const [formData, setFormData] = useState({
    party: '',
    amount: '',
    mode: '',
    accountId: '',
    date: new Date().toISOString().split('T')[0],
    referenceNumber: '',
    description: ''
  })
  
  const [accountFormData, setAccountFormData] = useState({
    name: '',
    type: '',
    accountNumber: '',
    openingBalance: ''
  })

  // Data states
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

  // Authentication check - Fixed to prevent unnecessary redirects
  const checkAuth = useCallback(() => {
    try {
      const token = localStorage.getItem('token')
      const userData = localStorage.getItem('user')
      const isAuthenticated = localStorage.getItem('isAuthenticated')

      console.log('Auth check:', { token: !!token, userData: !!userData, isAuthenticated })

      // More lenient authentication check - don't redirect immediately
      if (!token || !userData) {
        console.log('Missing token or userData')
        // Use fallback instead of redirecting
        return {
          token: 'demo-token',
          user: { businessId: 'demo-business-1', name: 'Demo User' },
          headers: {
            'Authorization': `Bearer demo-token`,
            'Content-Type': 'application/json'
          }
        }
      }

      const parsedUser = JSON.parse(userData)
      console.log('Parsed user:', parsedUser)
      
      // Don't redirect if businessId is missing, just use fallback
      if (!parsedUser.businessId) {
        console.warn('Business ID not found, using fallback')
        return {
          token,
          user: { ...parsedUser, businessId: 'demo-business-1' },
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      }

      return {
        token,
        user: parsedUser,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      // Don't redirect on parse errors, use fallback
      return {
        token: 'fallback-token',
        user: { businessId: 'demo-business-1', name: 'Demo User' },
        headers: {
          'Authorization': `Bearer fallback-token`,
          'Content-Type': 'application/json'
        }
      }
    }
  }, []) // Remove router dependency

  // API call wrapper - Updated to handle errors gracefully without redirects
  const makeApiCall = useCallback(async (endpoint: string, options: RequestInit = {}): Promise<any> => {
    const auth = checkAuth()
    if (!auth) throw new Error('Authentication required')

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
      
      console.log('API Response status:', response.status)
      
      if (!response.ok) {
        if (response.status === 401) {
          console.warn('401 Unauthorized - API authentication failed')
          // Don't redirect, just throw error for UI to handle
          throw new Error('API authentication failed. Please check your credentials.')
        }
        
        const errorData = await response.json().catch(() => ({ message: response.statusText }))
        throw new Error(errorData.message || `Server Error: ${response.statusText}`)
      }

      const data = await response.json()
      console.log('API Response data:', data)
      return data
    } catch (error: any) {
      console.error('API call failed:', error)
      if (error.message.includes('Failed to fetch')) {
        throw new Error('Cannot connect to server. Please ensure the backend is running on port 3001.')
      }
      throw error
    }
  }, [checkAuth, API_BASE_URL]) // Remove router dependency

  // Fetch accounts
  const fetchAccounts = useCallback(async () => {
    try {
      const auth = checkAuth()
      if (!auth) return

      const result = await makeApiCall(`/cash-bank/accounts/${auth.user.businessId}`)
      
      if (result.success && Array.isArray(result.data)) {
        setAccounts(result.data)
      }
    } catch (error: any) {
      console.error('Error fetching accounts:', error)
      setErrorMessage(`Failed to fetch accounts: ${error.message}`)
      setShowErrorModal(true)
    }
  }, [makeApiCall, checkAuth])

  // Fetch transactions
  const fetchTransactions = useCallback(async () => {
    try {
      const auth = checkAuth()
      if (!auth) return

      const result = await makeApiCall(`/cash-bank/transactions/${auth.user.businessId}`)
      
      if (result.success && Array.isArray(result.data)) {
        setTransactions(result.data)
      }
    } catch (error: any) {
      console.error('Error fetching transactions:', error)
      setErrorMessage(`Failed to fetch transactions: ${error.message}`)
      setShowErrorModal(true)
    }
  }, [makeApiCall, checkAuth])

  // Create account
  const handleCreateAccount = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!accountFormData.name || !accountFormData.type) {
      setErrorMessage('Please fill in all required fields')
      setShowErrorModal(true)
      return
    }

    setIsLoading(true)
    
    try {
      const auth = checkAuth()
      if (!auth) return

      const result = await makeApiCall(`/cash-bank/accounts/${auth.user.businessId}`, {
        method: 'POST',
        body: JSON.stringify({
          name: accountFormData.name,
          type: accountFormData.type,
          accountNumber: accountFormData.accountNumber || `${accountFormData.type.toUpperCase()}-${Date.now()}`,
          openingBalance: parseFloat(accountFormData.openingBalance) || 0
        }),
      })
      
      if (result.success) {
        setSuccessMessage('Account created successfully!')
        setShowSuccessModal(true)
        setShowAccountModal(false)
        setAccountFormData({ name: '', type: '', accountNumber: '', openingBalance: '' })
        await fetchAccounts()
      } else {
        throw new Error(result.message || 'Failed to create account')
      }
    } catch (error: any) {
      setErrorMessage(`Failed to create account: ${error.message}`)
      setShowErrorModal(true)
    } finally {
      setIsLoading(false)
    }
  }, [accountFormData, checkAuth, makeApiCall, fetchAccounts])

  // Create transaction
  const handleCreateTransaction = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.party || !formData.amount || !formData.mode || !formData.accountId) {
      setErrorMessage('Please fill in all required fields')
      setShowErrorModal(true)
      return
    }

    setIsLoading(true)
    
    try {
      const auth = checkAuth()
      if (!auth) return

      const selectedAccountData = accounts.find(acc => acc.id === parseInt(formData.accountId))
      
      const result = await makeApiCall(`/cash-bank/transactions/${auth.user.businessId}`, {
        method: 'POST',
        body: JSON.stringify({
          type: paymentType === 'in' ? 'Payment In' : 'Payment Out',
          party: formData.party,
          amount: parseFloat(formData.amount),
          mode: formData.mode,
          accountId: parseInt(formData.accountId),
          account: selectedAccountData?.name || '',
          date: formData.date,
          referenceNumber: formData.referenceNumber,
          description: formData.description
        }),
      })
      
      if (result.success) {
        setSuccessMessage(`${paymentType === 'in' ? 'Payment In' : 'Payment Out'} created successfully!`)
        setShowSuccessModal(true)
        setShowModal(false)
        setFormData({
          party: '',
          amount: '',
          mode: '',
          accountId: '',
          date: new Date().toISOString().split('T')[0],
          referenceNumber: '',
          description: ''
        })
        await fetchTransactions()
        await fetchAccounts() // Refresh accounts to update balances
      } else {
        throw new Error(result.message || 'Failed to create transaction')
      }
    } catch (error: any) {
      setErrorMessage(`Failed to create transaction: ${error.message}`)
      setShowErrorModal(true)
    } finally {
      setIsLoading(false)
    }
  }, [formData, paymentType, accounts, checkAuth, makeApiCall, fetchTransactions, fetchAccounts])

  const openModal = (type: 'in' | 'out') => {
    setPaymentType(type)
    setShowModal(true)
  }

  const getStatusColor = (status: Transaction['status']) => {
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-800 border-green-200'
      case 'Pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'Failed': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const filteredTransactions = filterType === 'all' 
    ? transactions 
    : transactions.filter(t => t.type.toLowerCase().includes(filterType))

  const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0)
  const bankBalance = accounts.filter(a => a.type === 'Bank').reduce((sum, account) => sum + account.balance, 0)
  const cashBalance = accounts.filter(a => a.type === 'Cash').reduce((sum, account) => sum + account.balance, 0)

  const getAccountColorClasses = (account: Account) => {
    const colorMap = {
      green: { bg: 'bg-green-100', text: 'text-green-600', border: 'border-green-200' },
      blue: { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200' },
      indigo: { bg: 'bg-indigo-100', text: 'text-indigo-600', border: 'border-indigo-200' },
      orange: { bg: 'bg-orange-100', text: 'text-orange-600', border: 'border-orange-200' }
    }
    return colorMap[account.color as keyof typeof colorMap] || colorMap.green
  }

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleAccountInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setAccountFormData(prev => ({ ...prev, [name]: value }))
  }

  // Initialize component - Completely remove redirect logic
  useEffect(() => {
    const initialize = async () => {
      console.log('Initializing Cash & Bank page...')
      setIsInitializing(true)
      
      try {
        const auth = checkAuth()
        console.log('Auth result:', auth)
        
        if (auth?.user) {
          setUser(auth.user)
          
          // Try to fetch data, but don't fail the page if it fails
          try {
            await Promise.all([fetchAccounts(), fetchTransactions()])
            console.log('Data fetched successfully')
          } catch (error) {
            console.error('Failed to fetch initial data:', error)
            // Show error message but don't block the page
            setErrorMessage('Failed to load data. You can still use the page to create new entries.')
          }
        } else {
          console.log('No auth found, using demo mode')
          setUser({ id: 'demo', name: 'Demo User', email: 'demo@example.com', role: 'user', businessId: 'demo-business-1' })
        }
      } catch (error) {
        console.error('Initialization error:', error)
        // Don't redirect, just set demo user
        setUser({ id: 'demo', name: 'Demo User', email: 'demo@example.com', role: 'user', businessId: 'demo-business-1' })
      }
      
      setIsInitializing(false)
    }

    initialize()
  }, []) // Keep empty dependency array

  // Menu item and modal state management
  type CashBankMenuItem = {
    label: string
    icon?: React.ReactNode
    active?: boolean
    onClick?: () => void
    showPlus?: boolean
  }

  const [activeMenu, setActiveMenu] = useState('Bank Accounts')
  const cashBankMenu: CashBankMenuItem[] = [
    {
      label: 'Bank Accounts',
      icon: '🏦',
      active: activeMenu === 'Bank Accounts',
      onClick: () => setActiveMenu('Bank Accounts'),
      showPlus: true
    },
    {
      label: 'Cash In Hand',
      icon: '💵',
      active: activeMenu === 'Cash In Hand',
      onClick: () => setActiveMenu('Cash In Hand'),
      showPlus: true
    },
    {
      label: 'Cheques',
      icon: '🧾',
      active: activeMenu === 'Cheques',
      onClick: () => setActiveMenu('Cheques'),
      showPlus: false
    },
    {
      label: 'Loan Accounts',
      icon: '💳',
      active: activeMenu === 'Loan Accounts',
      onClick: () => setActiveMenu('Loan Accounts'),
      showPlus: true
    }
  ]

  // Modal states
  const [showBankInfoModal, setShowBankInfoModal] = useState(false);
  const [showCashInHandModal, setShowCashInHandModal] = useState(false);
  const [showAdjustCashModal, setShowAdjustCashModal] = useState(false);
  const [adjustCashForm, setAdjustCashForm] = useState({
    adjustment: 'Add Cash',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: ''
  });
  const [showLoanAccountsModal, setShowLoanAccountsModal] = useState(false);
  const [showAddLoanModal, setShowAddLoanModal] = useState(false);
  const [loanForm, setLoanForm] = useState({
    accountName: '',
    lenderBank: '',
    accountNumber: '',
    description: '',
    currentBalance: '',
    balanceDate: new Date().toISOString().split('T')[0],
    loanReceivedIn: 'Cash',
    interestRate: '',
    termDuration: '',
    processingFee: '',
    processingFeePaidFrom: 'Cash'
  });
  const [showChequesModal, setShowChequesModal] = useState(false);

  // Modal handlers
  const handleLoanInput = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setLoanForm(prev => ({ ...prev, [name]: value }));
  };

  const handleLoanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowAddLoanModal(false);
    setLoanForm({
      accountName: '',
      lenderBank: '',
      accountNumber: '',
      description: '',
      currentBalance: '',
      balanceDate: new Date().toISOString().split('T')[0],
      loanReceivedIn: 'Cash',
      interestRate: '',
      termDuration: '',
      processingFee: '',
      processingFeePaidFrom: 'Cash'
    });
  };

  const handleAdjustCashInput = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setAdjustCashForm(prev => ({ ...prev, [name]: value }));
  };

  const handleAdjustCashSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowAdjustCashModal(false);
    setAdjustCashForm({
      adjustment: 'Add Cash',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      description: ''
    });
  };

  // Modal visibility effects
  useEffect(() => {
    if (activeMenu === 'Bank Accounts') {
      setShowBankInfoModal(true);
      setShowCashInHandModal(false);
      setShowLoanAccountsModal(false);
      setShowChequesModal(false);
    } else if (activeMenu === 'Cash In Hand') {
      setShowBankInfoModal(false);
      setShowCashInHandModal(true);
      setShowLoanAccountsModal(false);
      setShowChequesModal(false);
    } else if (activeMenu === 'Loan Accounts') {
      setShowBankInfoModal(false);
      setShowCashInHandModal(false);
      setShowLoanAccountsModal(true);
      setShowChequesModal(false);
    } else if (activeMenu === 'Cheques') {
      setShowBankInfoModal(false);
      setShowCashInHandModal(false);
      setShowLoanAccountsModal(false);
      setShowChequesModal(true);
    } else {
      setShowBankInfoModal(false);
      setShowCashInHandModal(false);
      setShowLoanAccountsModal(false);
      setShowChequesModal(false);
    }
  }, [activeMenu]);

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
          <p className="text-xl font-semibold text-gray-900">Loading Cash & Bank Management...</p>
          <p className="text-gray-600">Setting up your financial data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
      <div className="relative z-10 p-6">
        {/* Enhanced Header */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 mb-8 border border-white/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-3xl flex items-center justify-center shadow-2xl">
                <span className="text-white text-3xl">💰</span>
              </div>
              <div>
                <h1 className="text-4xl font-black text-gray-900 mb-2">Cash & Bank Management</h1>
                <p className="text-gray-600 text-lg">Track payments, manage accounts, and monitor cash flow</p>
                {user && (
                  <p className="text-sm text-blue-600 mt-1">Business: {user.businessId}</p>
                )}
              </div>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => openModal('out')}
                disabled={isLoading}
                className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition-all duration-300 font-medium shadow-lg hover:shadow-xl flex items-center space-x-2 transform hover:scale-105 disabled:opacity-50"
              >
                <span>💸</span>
                <span>Payment Out</span>
              </button>
              <button
                onClick={() => openModal('in')}
                disabled={isLoading}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-300 font-medium shadow-lg hover:shadow-xl flex items-center space-x-2 transform hover:scale-105 disabled:opacity-50"
              >
                <span>💵</span>
                <span>Payment In</span>
              </button>
            </div>
          </div>
        </div>

        {/* Menu and Content Sections - Enhanced with smoother transitions and improved layout */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-6 mb-8 border border-white/20">
          {/* Menu Items */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {cashBankMenu.map((item) => (
              <div
                key={item.label}
                onClick={item.onClick}
                className={`flex items-center justify-center p-4 rounded-3xl cursor-pointer transition-all duration-300 
                ${item.active ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg' : 'bg-white text-gray-900 hover:bg-gray-100'}`}
              >
                <div className="text-2xl mr-2">{item.icon}</div>
                <div className="flex-1 text-left">
                  <div className="font-medium">{item.label}</div>
                  {item.showPlus && (
                    <div className="text-xs text-blue-500">+ Add New</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Content Sections - Wrapped in a div with overflow-hidden to prevent scrollbar flashing */}
          <div className="overflow-hidden">
            {/* Bank Accounts Section */}
            {activeMenu === 'Bank Accounts' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {accounts.filter(acc => acc.type === 'Bank').map(account => (
                    <div key={account.id} className={`p-4 rounded-3xl border transition-all duration-300 ${getAccountColorClasses(account).border}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1 pr-4">
                          <div className="text-lg font-semibold">{account.name}</div>
                          <div className="text-sm text-gray-500">{account.accountNumber}</div>
                        </div>
                        <div className="text-3xl font-bold text-gray-900">
                          {account.balance.toFixed(2)} {account.type === 'Bank' ? '₹' : '$'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowAccountModal(true)}
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full shadow-md hover:shadow-lg transition-all duration-300 flex items-center space-x-2"
                  >
                    <span>➕</span>
                    <span>Add New Account</span>
                  </button>
                </div>
              </div>
            )}

            {/* Cash In Hand Section */}
            {activeMenu === 'Cash In Hand' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {accounts.filter(acc => acc.type === 'Cash').map(account => (
                    <div key={account.id} className={`p-4 rounded-3xl border transition-all duration-300 ${getAccountColorClasses(account).border}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1 pr-4">
                          <div className="text-lg font-semibold">{account.name}</div>
                          <div className="text-sm text-gray-500">{account.accountNumber}</div>
                        </div>
                        <div className="text-3xl font-bold text-gray-900">
                          {account.balance.toFixed(2)} {account.type === 'Bank' ? '₹' : '$'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowAccountModal(true)}
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full shadow-md hover:shadow-lg transition-all duration-300 flex items-center space-x-2"
                  >
                    <span>➕</span>
                    <span>Add New Account</span>
                  </button>
                </div>
              </div>
            )}

            {/* Loan Accounts Section */}
            {activeMenu === 'Loan Accounts' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  {accounts.filter(acc => acc.type === 'Loan').map(account => (
                    <div key={account.id} className={`p-4 rounded-3xl border transition-all duration-300 ${getAccountColorClasses(account).border}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1 pr-4">
                          <div className="text-lg font-semibold">{account.name}</div>
                          <div className="text-sm text-gray-500">{account.accountNumber}</div>
                        </div>
                        <div className="text-3xl font-bold text-gray-900">
                          {account.balance.toFixed(2)} {account.type === 'Bank' ? '₹' : '$'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowAccountModal(true)}
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full shadow-md hover:shadow-lg transition-all duration-300 flex items-center space-x-2"
                  >
                    <span>➕</span>
                    <span>Add New Account</span>
                  </button>
                </div>
              </div>
            )}

            {/* Cheques Section */}
            {activeMenu === 'Cheques' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  {/* Cheque items will be listed here */}
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowChequesModal(true)}
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full shadow-md hover:shadow-lg transition-all duration-300 flex items-center space-x-2"
                  >
                    <span>➕</span>
                    <span>Add New Cheque</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Modals with animations and improved UX */}
        <EnhancedModal
          title={paymentType === 'in' ? 'New Payment In' : 'New Payment Out'}
          subtitle={paymentType === 'in' ? 'Receive money' : 'Send money'}
          open={showModal}
          onClose={() => setShowModal(false)}
          type={paymentType === 'in' ? 'success' : 'error'}
          size="md"
        >
          <form onSubmit={handleCreateTransaction} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Party</label>
                <input
                  type="text"
                  name="party"
                  value={formData.party}
                  onChange={handleInputChange}
                  className="mt-1 block w-full p-3 border rounded-lg shadow-sm focus:ring focus:ring-blue-500 focus:outline-none"
                  placeholder="Enter party name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Amount</label>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  className="mt-1 block w-full p-3 border rounded-lg shadow-sm focus:ring focus:ring-blue-500 focus:outline-none"
                  placeholder="Enter amount"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Mode</label>
                <select
                  name="mode"
                  value={formData.mode}
                  onChange={handleInputChange}
                  className="mt-1 block w-full p-3 border rounded-lg shadow-sm focus:ring focus:ring-blue-500 focus:outline-none"
                  required
                >
                  <option value="">Select mode</option>
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Account</label>
                <select
                  name="accountId"
                  value={formData.accountId}
                  onChange={handleInputChange}
                  className="mt-1 block w-full p-3 border rounded-lg shadow-sm focus:ring focus:ring-blue-500 focus:outline-none"
                  required
                >
                  <option value="">Select account</option>
                  {accounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.name} ({account.type})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Date</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  className="mt-1 block w-full p-3 border rounded-lg shadow-sm focus:ring focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Reference Number</label>
                <input
                  type="text"
                  name="referenceNumber"
                  value={formData.referenceNumber}
                  onChange={handleInputChange}
                  className="mt-1 block w-full p-3 border rounded-lg shadow-sm focus:ring focus:ring-blue-500 focus:outline-none"
                  placeholder="Enter reference number"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="mt-1 block w-full p-3 border rounded-lg shadow-sm focus:ring focus:ring-blue-500 focus:outline-none"
                placeholder="Enter description"
                rows={3}
              ></textarea>
            </div>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg shadow-md hover:bg-gray-400 transition-all duration-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 flex items-center space-x-2"
              >
                {isLoading && <span className="loader"></span>}
                <span>{paymentType === 'in' ? 'Receive Payment' : 'Send Payment'}</span>
              </button>
            </div>
          </form>
        </EnhancedModal>

        {/* Account Modal - For creating and managing accounts */}
        <EnhancedModal
          title="Manage Account"
          subtitle="Create or edit account details"
          open={showAccountModal}
          onClose={() => setShowAccountModal(false)}
          type="default"
          size="md"
        >
          <form onSubmit={handleCreateAccount} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Account Name</label>
              <input
                type="text"
                name="name"
                value={accountFormData.name}
                onChange={handleAccountInputChange}
                className="mt-1 block w-full p-3 border rounded-lg shadow-sm focus:ring focus:ring-blue-500 focus:outline-none"
                placeholder="Enter account name"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Account Type</label>
                <select
                  name="type"
                  value={accountFormData.type}
                  onChange={handleAccountInputChange}
                  className="mt-1 block w-full p-3 border rounded-lg shadow-sm focus:ring focus:ring-blue-500 focus:outline-none"
                  required
                >
                  <option value="">Select account type</option>
                  <option value="Cash">Cash</option>
                  <option value="Bank">Bank</option>
                  <option value="Loan">Loan</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Account Number</label>
                <input
                  type="text"
                  name="accountNumber"
                  value={accountFormData.accountNumber}
                  onChange={handleAccountInputChange}
                  className="mt-1 block w-full p-3 border rounded-lg shadow-sm focus:ring focus:ring-blue-500 focus:outline-none"
                  placeholder="Enter account number"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Opening Balance</label>
              <input
                type="number"
                name="openingBalance"
                value={accountFormData.openingBalance}
                onChange={handleAccountInputChange}
                className="mt-1 block w-full p-3 border rounded-lg shadow-sm focus:ring focus:ring-blue-500 focus:outline-none"
                placeholder="Enter opening balance"
                required
              />
            </div>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowAccountModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg shadow-md hover:bg-gray-400 transition-all duration-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 flex items-center space-x-2"
              >
                {isLoading && <span className="loader"></span>}
                <span>Create Account</span>
              </button>
            </div>
          </form>
        </EnhancedModal>

        {/* Success and Error Modals - For displaying operation results */}
        <EnhancedModal
          title="Success"
          open={showSuccessModal}
          onClose={() => setShowSuccessModal(false)}
          type="success"
          size="sm"
        >
          <div className="text-center">
            <div className="text-4xl text-green-600 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Success!</h3>
            <p className="text-gray-600">{successMessage}</p>
          </div>
        </EnhancedModal>

        <EnhancedModal
          title="Error"
          open={showErrorModal}
          onClose={() => setShowErrorModal(false)}
          type="error"
          size="sm"
        >
          <div className="text-center">
            <div className="text-4xl text-red-600 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Error!</h3>
            <p className="text-gray-600">{errorMessage}</p>
          </div>
        </EnhancedModal>
      </div>
    </div>
  )
}