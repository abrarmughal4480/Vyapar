'use client'

import React, { useState, useEffect } from 'react'
import { bankAccountAPI, bankTransactionAPI } from '@/http/cash-bank'
import { getToken } from '../../lib/auth'
import BankAccountModal from '../../components/BankAccountModal'

function CashBankPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [hasAccount, setHasAccount] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [accounts, setAccounts] = useState<any[]>([])
  const [contextMenu, setContextMenu] = useState<{visible: boolean, x: number, y: number, accountIndex: number}>({
    visible: false,
    x: 0,
    y: 0,
    accountIndex: -1
  })
  const [transactionContextMenu, setTransactionContextMenu] = useState<{visible: boolean, x: number, y: number, transactionIndex: number}>({
    visible: false,
    x: 0,
    y: 0,
    transactionIndex: -1
  })
  const [editingTransaction, setEditingTransaction] = useState<any>(null)
  const [editingIndex, setEditingIndex] = useState<number>(-1)
  const [showDepositDropdown, setShowDepositDropdown] = useState(false)
  const [showBankToCashModal, setShowBankToCashModal] = useState(false)
  const [showCashToBankModal, setShowCashToBankModal] = useState(false)
  const [showAdjustBalanceModal, setShowAdjustBalanceModal] = useState(false)
  const [transferType, setTransferType] = useState<'bank-to-cash' | 'cash-to-bank'>('bank-to-cash')
  const [bankToCashData, setBankToCashData] = useState({
    from: '',
    amount: '',
    description: '',
    to: 'Cash',
    adjustmentDate: new Date().toISOString().split('T')[0],
    image: null
  })
  const [cashToBankData, setCashToBankData] = useState({
    from: 'Cash',
    amount: '',
    description: '',
    to: '',
    adjustmentDate: new Date().toISOString().split('T')[0],
    image: null
  })
  const [adjustBalanceData, setAdjustBalanceData] = useState({
    accountName: '',
    amount: '',
    description: '',
    type: 'Increase balance',
    adjustmentDate: new Date().toISOString().split('T')[0],
    image: null
  })
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Load bank accounts on component mount
  useEffect(() => {
    loadBankAccounts()
  }, [])

  // Load transactions when account is selected
  useEffect(() => {
    if (selectedAccount) {
      loadAccountTransactions(selectedAccount)
    }
  }, [selectedAccount])

  const loadBankAccounts = async () => {
    try {
      setLoading(true)
      const token = getToken()
      if (!token) {
        setError('Please login to continue')
        return
      }

      const response = await bankAccountAPI.getAll(token)
      if (response.success) {
        const accountsData = response.data.map((account: any) => ({
          name: account.accountDisplayName,
          amount: `Rs ${account.currentBalance.toLocaleString()}.00`,
          openingBalance: account.openingBalance,
          asOfDate: account.asOfDate,
          bankName: account.bankName,
          accountNumber: account.accountNumber,
          _id: account._id
        }))
        
        setAccounts(accountsData)
        setHasAccount(accountsData.length > 0)
        
        if (accountsData.length > 0 && !selectedAccount) {
          setSelectedAccount(accountsData[0].name)
        }
      }
    } catch (err) {
      console.error('Error loading bank accounts:', err)
      setError('Failed to load bank accounts')
    } finally {
      setLoading(false)
    }
  }

  const loadAccountTransactions = async (accountName: string) => {
    try {
      const token = getToken()
      if (!token) return

      const response = await bankTransactionAPI.getByAccount(token, accountName)
      
      if (response.success) {
        const transactionsData = (response.data || []).map((transaction: any) => ({
          type: transaction.type,
          name: transaction.description || transaction.type,
          date: new Date(transaction.transactionDate).toLocaleDateString('en-GB'),
          amount: `Rs ${transaction.amount.toLocaleString()}.00`,
          from: transaction.fromAccount,
          to: transaction.toAccount,
          _id: transaction._id
        }))
        
        setTransactions(transactionsData)
      } else {
        setError(response.message || 'Failed to load transactions')
      }
    } catch (err) {
      console.error('Error loading transactions:', err)
      setError('Failed to load transactions: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  const getTransactions = () => {
    if (!selectedAccount) return []
    const account = accounts.find(acc => acc.name === selectedAccount)
    if (!account) return []
    
    // Get transactions for the selected account (both from and to this account)
    const accountTransactions = transactions.filter(t => 
      t.from === selectedAccount || t.to === selectedAccount
    )
    
    // Always show opening balance at the top (not saved as transaction)
    const openingBalanceEntry = {
      type: 'Opening Balance',
      name: 'Opening Balance',
      date: new Date(account.asOfDate || new Date()).toLocaleDateString('en-GB'),
      amount: `Rs ${account.openingBalance?.toLocaleString() || '0'}.00`,
      from: selectedAccount,
      to: selectedAccount,
      _id: 'opening-balance' // Unique ID for the opening balance entry
    }
    
    // Return opening balance first, then other transactions
    return [openingBalanceEntry, ...accountTransactions]
  }

  const getTransactionColor = (transaction: any) => {
    if (transaction.type === 'Opening Balance') return 'text-gray-600'
    
    // If money is coming TO this account, it's "in" (green)
    if (transaction.to === selectedAccount) return 'text-green-600'
    
    // If money is going FROM this account, it's "out" (red)
    if (transaction.from === selectedAccount) return 'text-red-600'
    
    return 'text-gray-600'
  }


  const handleSubmit = async (formData: any) => {
    setLoading(true)
    setError('')
    
    try {
      const token = getToken()
      if (!token) {
        setError('Please login to continue')
        return
      }

      const accountData = {
        accountDisplayName: formData.accountDisplayName,
        openingBalance: parseFloat(formData.openingBalance) || 0,
        asOfDate: formData.asOfDate,
        accountNumber: formData.accountNumber,
        ifscCode: formData.ifscCode,
        upiId: formData.upiId,
        bankName: formData.bankName,
        accountHolderName: formData.accountHolderName,
        printBankDetails: formData.printBankDetails
      }

      if (editingIndex >= 0) {
        // Update existing account
        const accountToUpdate = accounts[editingIndex]
        const oldOpeningBalance = accountToUpdate.openingBalance || 0
        const newOpeningBalance = parseFloat(formData.openingBalance) || 0
        
        const response = await bankAccountAPI.update(token, accountToUpdate._id, accountData)
        
        if (response.success) {
          await loadBankAccounts() // Reload accounts
          await loadAccountTransactions(formData.accountDisplayName) // Reload transactions
          setSelectedAccount(formData.accountDisplayName)
        }
      } else {
        // Create new account
        const response = await bankAccountAPI.create(token, accountData)
        
        if (response.success) {
          await loadBankAccounts() // Reload accounts
          setSelectedAccount(formData.accountDisplayName)
        }
      }
    
      setIsModalOpen(false)
      setEditingIndex(-1)
    } catch (err) {
      console.error('Error saving account:', err)
      setError('Failed to save account')
    } finally {
      setLoading(false)
    }
  }

  const handleRightClick = (e: React.MouseEvent, accountIndex: number) => {
    e.preventDefault()
    
    // Get viewport dimensions
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    
    // Dropdown dimensions (approximate)
    const dropdownWidth = 120
    const dropdownHeight = 80
    
    // Calculate position - open to the left and below the click point
    let x = e.clientX - dropdownWidth
    let y = e.clientY + 10 // Add small offset below the button
    
    // If opening to the left would go off screen, open to the right instead
    if (x < 10) {
      x = e.clientX
    }
    
    // Adjust if dropdown would go off right edge
    if (x + dropdownWidth > viewportWidth) {
      x = viewportWidth - dropdownWidth - 10
    }
    
    // Adjust if dropdown would go off bottom edge, open above instead
    if (y + dropdownHeight > viewportHeight) {
      y = e.clientY - dropdownHeight - 10
    }
    
    // Ensure minimum distance from edges
    x = Math.max(10, x)
    y = Math.max(10, y)
    
    setContextMenu({
      visible: true,
      x,
      y,
      accountIndex
    })
  }

  const handleContextMenuAction = async (action: 'view' | 'delete') => {
    const account = accounts[contextMenu.accountIndex]
    if (!account) return

    switch (action) {
      case 'view':
        // Pre-fill form with existing data for editing
        setEditingIndex(contextMenu.accountIndex)
        setIsModalOpen(true)
        setSelectedAccount(account.name)
        break
      case 'delete':
        if (confirm(`Are you sure you want to delete "${account.name}"?`)) {
          try {
            setLoading(true)
            const token = getToken()
            if (!token) {
              setError('Please login to continue')
              return
            }

            const response = await bankAccountAPI.delete(token, account._id)
            if (response.success) {
              await loadBankAccounts() // Reload accounts
              if (selectedAccount === account.name) {
                setSelectedAccount('')
              }
            }
          } catch (err) {
            console.error('Error deleting account:', err)
            setError('Failed to delete account')
          } finally {
            setLoading(false)
          }
        }
        break
    }
    setContextMenu({ visible: false, x: 0, y: 0, accountIndex: -1 })
  }

  const closeContextMenu = () => {
    setContextMenu({ visible: false, x: 0, y: 0, accountIndex: -1 })
  }

  const handleTransactionRightClick = (e: React.MouseEvent, transactionIndex: number) => {
    e.preventDefault()
    
    // Get viewport dimensions
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    
    // Dropdown dimensions (approximate)
    const dropdownWidth = 120
    const dropdownHeight = 80
    
    // Calculate position - open to the left and below the click point
    let x = e.clientX - dropdownWidth
    let y = e.clientY + 10 // Add small offset below the button
    
    // If opening to the left would go off screen, open to the right instead
    if (x < 10) {
      x = e.clientX
    }
    
    // Adjust if dropdown would go off right edge
    if (x + dropdownWidth > viewportWidth) {
      x = viewportWidth - dropdownWidth - 10
    }
    
    // Adjust if dropdown would go off bottom edge, open above instead
    if (y + dropdownHeight > viewportHeight) {
      y = e.clientY - dropdownHeight - 10
    }
    
    // Ensure minimum distance from edges
    x = Math.max(10, x)
    y = Math.max(10, y)
    
    setTransactionContextMenu({
      visible: true,
      x,
      y,
      transactionIndex
    })
  }

  const handleTransactionContextMenuAction = async (action: 'view' | 'delete') => {
    const transaction = getTransactions()[transactionContextMenu.transactionIndex]
    if (!transaction) return

    // Don't allow editing/deleting opening balance (it's not a real transaction)
    if (transaction.type === 'Opening Balance') {
      setTransactionContextMenu({ visible: false, x: 0, y: 0, transactionIndex: -1 })
      return
    }

    switch (action) {
      case 'view':
        // Set the transaction being edited
        setEditingTransaction(transaction)
        
        // Open appropriate modal based on transaction type
        if (transaction.type === 'Bank to Cash Transfer') {
          setBankToCashData({
            from: transaction.from || '',
            amount: transaction.amount.replace(/[^\d.-]/g, ''),
            description: transaction.name || '',
            to: 'Cash',
            adjustmentDate: transaction.date.split('/').reverse().join('-'),
            image: null
          })
          setShowBankToCashModal(true)
        } else if (transaction.type === 'Cash to Bank Transfer') {
          setCashToBankData({
            from: 'Cash',
            amount: transaction.amount.replace(/[^\d.-]/g, ''),
            description: transaction.name || '',
            to: transaction.to || '',
            adjustmentDate: transaction.date.split('/').reverse().join('-'),
            image: null
          })
          setShowCashToBankModal(true)
        } else if (transaction.type === 'Bank Adjustment Entry') {
          setAdjustBalanceData({
            accountName: transaction.from || '',
            amount: transaction.amount.replace(/[^\d.-]/g, ''),
            description: transaction.name || '',
            type: 'Increase balance',
            adjustmentDate: transaction.date.split('/').reverse().join('-'),
            image: null
          })
          setShowAdjustBalanceModal(true)
        }
        break
      case 'delete':
        if (confirm(`Are you sure you want to delete this transaction?`)) {
          try {
            setLoading(true)
            const token = getToken()
            if (!token) {
              setError('Please login to continue')
              return
            }

            const response = await bankTransactionAPI.delete(token, transaction._id)
            if (response.success) {
              await loadBankAccounts() // Reload accounts to update balances
              await loadAccountTransactions(selectedAccount) // Reload transactions
            }
          } catch (err) {
            console.error('Error deleting transaction:', err)
            setError('Failed to delete transaction')
          } finally {
            setLoading(false)
          }
        }
        break
    }
    setTransactionContextMenu({ visible: false, x: 0, y: 0, transactionIndex: -1 })
  }

  const closeTransactionContextMenu = () => {
    setTransactionContextMenu({ visible: false, x: 0, y: 0, transactionIndex: -1 })
  }

  const handleDepositAction = (action: string) => {
    console.log('Deposit action:', action)
    setShowDepositDropdown(false)
    
    switch (action) {
      case 'bank-to-cash':
        setTransferType('bank-to-cash')
        setShowBankToCashModal(true)
        setBankToCashData(prev => ({
          ...prev,
          from: selectedAccount || ''
        }))
        break
      case 'cash-to-bank':
        setTransferType('cash-to-bank')
        setShowCashToBankModal(true)
        setCashToBankData(prev => ({
          ...prev,
          to: selectedAccount || ''
        }))
        break
      case 'bank-to-bank':
        // Add bank to bank modal logic here
        break
      case 'adjust-balance':
        setShowAdjustBalanceModal(true)
        setAdjustBalanceData(prev => ({
          ...prev,
          accountName: selectedAccount || ''
        }))
        break
    }
  }

  const handleBankToCashInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setBankToCashData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleCashToBankInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setCashToBankData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleAdjustBalanceInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setAdjustBalanceData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleBankToCashSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      const token = getToken()
      if (!token) {
        setError('Please login to continue')
        return
      }

      const transactionData = {
        type: 'Bank to Cash Transfer' as const,
        fromAccount: bankToCashData.from,
        toAccount: 'Cash',
        amount: parseFloat(bankToCashData.amount),
        description: bankToCashData.description,
        transactionDate: bankToCashData.adjustmentDate
      }

      let response
      if (editingTransaction) {
        // Update existing transaction
        response = await bankTransactionAPI.update(token, editingTransaction._id, transactionData)
      } else {
        // Create new transaction
        response = await bankTransactionAPI.create(token, transactionData)
      }
      
      if (response.success) {
        await loadBankAccounts() // Reload accounts to update balances
        await loadAccountTransactions(bankToCashData.from) // Reload transactions
        setShowBankToCashModal(false)
        setEditingTransaction(null) // Clear editing state
        
        // Reset form
        setBankToCashData({
          from: '',
          amount: '',
          description: '',
          to: 'Cash',
          adjustmentDate: new Date().toISOString().split('T')[0],
          image: null
        })
      }
    } catch (err) {
      console.error('Error creating bank to cash transfer:', err)
      setError('Failed to create transfer')
    } finally {
      setLoading(false)
    }
  }

  const handleCashToBankSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      const token = getToken()
      if (!token) {
        setError('Please login to continue')
        return
      }

      const transactionData = {
        type: 'Cash to Bank Transfer' as const,
        fromAccount: 'Cash',
        toAccount: cashToBankData.to,
        amount: parseFloat(cashToBankData.amount),
        description: cashToBankData.description,
        transactionDate: cashToBankData.adjustmentDate
      }

      let response
      if (editingTransaction) {
        // Update existing transaction
        response = await bankTransactionAPI.update(token, editingTransaction._id, transactionData)
      } else {
        // Create new transaction
        response = await bankTransactionAPI.create(token, transactionData)
      }
      
      if (response.success) {
        await loadBankAccounts() // Reload accounts to update balances
        await loadAccountTransactions(cashToBankData.to) // Reload transactions
        setShowCashToBankModal(false)
        setEditingTransaction(null) // Clear editing state
        
        // Reset form
        setCashToBankData({
          from: 'Cash',
          amount: '',
          description: '',
          to: '',
          adjustmentDate: new Date().toISOString().split('T')[0],
          image: null
        })
      }
    } catch (err) {
      console.error('Error creating cash to bank transfer:', err)
      setError('Failed to create transfer')
    } finally {
      setLoading(false)
    }
  }

  const handleAdjustBalanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      const token = getToken()
      if (!token) {
        setError('Please login to continue')
        return
      }

      const transactionData = {
        type: 'Bank Adjustment Entry' as const,
        fromAccount: adjustBalanceData.accountName,
        toAccount: adjustBalanceData.accountName,
        amount: parseFloat(adjustBalanceData.amount),
        description: adjustBalanceData.description,
        transactionDate: adjustBalanceData.adjustmentDate,
        adjustmentType: adjustBalanceData.type as 'Increase balance' | 'Decrease balance'
      }

      let response
      if (editingTransaction) {
        // Update existing transaction
        response = await bankTransactionAPI.update(token, editingTransaction._id, transactionData)
      } else {
        // Create new transaction
        response = await bankTransactionAPI.create(token, transactionData)
      }
      
      if (response.success) {
        await loadBankAccounts() // Reload accounts to update balances
        await loadAccountTransactions(adjustBalanceData.accountName) // Reload transactions
        setShowAdjustBalanceModal(false)
        setEditingTransaction(null) // Clear editing state
        
        // Reset form
        setAdjustBalanceData({
          accountName: '',
          amount: '',
          description: '',
          type: 'Increase balance',
          adjustmentDate: new Date().toISOString().split('T')[0],
          image: null
        })
      }
    } catch (err) {
      console.error('Error creating bank adjustment:', err)
      setError('Failed to create adjustment')
    } finally {
      setLoading(false)
    }
  }

  if (loading && accounts.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading bank accounts...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => {
              setError('')
              loadBankAccounts()
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!hasAccount) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
      <div className="max-w-6xl mx-auto text-center">
        {/* Main Title Section */}
        <div className="mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Manage Multiple Bank Accounts
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            With Devease you can manage multiple banks and payment types like UPI, Net Banking and Credit Card
          </p>
        </div>

        {/* Central Illustration */}
        <div className="flex justify-center mb-16">
          <div className="relative">
            {/* Bank Building */}
            <div className="w-48 h-32 bg-gray-200 rounded-lg relative overflow-hidden">
              {/* Bank Columns */}
              <div className="absolute bottom-0 left-0 right-0 h-24 bg-white flex">
                <div className="w-1/4 border-r border-gray-300"></div>
                <div className="w-1/4 border-r border-gray-300"></div>
                <div className="w-1/4 border-r border-gray-300"></div>
                <div className="w-1/4"></div>
              </div>
              {/* Bank Entrance */}
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-8 bg-gray-800 rounded-t-lg"></div>
            </div>
            
            {/* Floating Coins */}
            <div className="absolute -top-4 -left-4 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-yellow-800 font-bold text-sm">$</span>
            </div>
            <div className="absolute -top-2 -right-6 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-yellow-800 font-bold text-xs">$</span>
            </div>
            <div className="absolute -bottom-2 -left-2 w-7 h-7 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-yellow-800 font-bold text-sm">$</span>
            </div>
            <div className="absolute -bottom-4 -right-4 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-yellow-800 font-bold text-xs">$</span>
            </div>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-10">
          {/* Print Bank Details Card */}
          <div className="bg-white rounded-lg p-4 shadow-md border border-gray-100 hover:shadow-lg transition-shadow">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Print Bank Details on Invoices</h3>
            <p className="text-sm text-gray-600">Print account details on invoices and get payments via NEFT/RTGS/IMPS.</p>
          </div>

          {/* Unlimited Payment Types Card */}
          <div className="bg-white rounded-lg p-4 shadow-md border border-gray-100 hover:shadow-lg transition-shadow">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Unlimited Payment Types</h3>
            <p className="text-sm text-gray-600">Record transactions by methods like Banks, UPI, Net Banking and Cards.</p>
          </div>

          {/* Print UPI QR Code Card */}
          <div className="bg-white rounded-lg p-4 shadow-md border border-gray-100 hover:shadow-lg transition-shadow">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Print UPI QR Code on Invoices</h3>
            <p className="text-sm text-gray-600">Print QR code on your invoices or send payment links to your customers.</p>
          </div>
        </div>

        {/* Call to Action Button */}
        <div className="text-center">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-full font-semibold text-base shadow-lg hover:shadow-xl transition-all duration-200 flex items-center mx-auto"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Bank Account
          </button>
        </div>
        </div>
    </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="w-full">
        {/* Banking Dashboard */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="flex h-screen">
            {/* Left Panel - Account List */}
            <div className="w-1/3 border-r border-gray-200 bg-gray-50 overflow-y-auto">
              <div className="p-4">
                {/* Search Bar */}
                <div className="relative mb-4">
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search by Account/Amount"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Account List Header */}
                <div className="flex justify-between items-center mb-3 text-sm font-medium text-gray-600">
                  <span className="flex items-center">
                    Account Name
                    <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                    </svg>
                  </span>
                  <span className="flex items-center">
                    Amount
                    <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                    </svg>
                  </span>
                </div>

                {/* Account List */}
                <div className="space-y-2">
                  {accounts.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>No accounts added yet</p>
                      <p className="text-sm">Click "Add Bank Account" to get started</p>
                    </div>
                  ) : (
                    accounts.map((account, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedAccount === account.name
                            ? 'bg-blue-100 border border-blue-200'
                            : 'hover:bg-gray-100'
                        }`}
                        onClick={() => setSelectedAccount(account.name)}
                        onContextMenu={(e) => handleRightClick(e, index)}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-gray-900">{account.name}</span>
                          <span className="text-gray-600">{account.amount}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right Panel - Account Details & Transactions */}
            <div className="flex-1 bg-white overflow-y-auto">
              <div className="p-6">
                {/* Account Header */}
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      {selectedAccount || 'Select an Account'}
                    </h2>
                    {selectedAccount && accounts.find(acc => acc.name === selectedAccount) && (
                      <div className="grid grid-cols-2 gap-6">
                        {accounts.find(acc => acc.name === selectedAccount)?.bankName && (
                        <div>
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Bank Name</span>
                            <div className="text-lg font-semibold text-gray-900 mt-1">
                            {accounts.find(acc => acc.name === selectedAccount)?.bankName}
                          </div>
                        </div>
                        )}
                        {accounts.find(acc => acc.name === selectedAccount)?.accountNumber && (
                        <div>
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Account Number</span>
                            <div className="text-lg font-semibold text-gray-900 mt-1">
                            {accounts.find(acc => acc.name === selectedAccount)?.accountNumber}
                          </div>
                        </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex space-x-3">
                    <button 
                      onClick={() => setIsModalOpen(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full flex items-center text-sm font-medium"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Add Bank Account
                    </button>
                    <div className="relative">
                      <button 
                        onClick={() => setShowDepositDropdown(!showDepositDropdown)}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-full flex items-center text-sm font-medium"
                      >
                      Deposit / Withdraw
                      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                      </button>
                      
                      {/* Deposit Dropdown */}
                      {showDepositDropdown && (
                        <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                          <div className="py-1">
                            <button
                              onClick={() => handleDepositAction('bank-to-cash')}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                            >
                              Bank to Cash Transfer
                            </button>
                            <button
                              onClick={() => handleDepositAction('cash-to-bank')}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                            >
                              Cash to Bank Transfer
                            </button>
                            <button
                              onClick={() => handleDepositAction('bank-to-bank')}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                            >
                              Bank to Bank Transfer
                            </button>
                            <button
                              onClick={() => handleDepositAction('adjust-balance')}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                            >
                              Adjust Bank Balance
                    </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Transactions Section */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Transactions</h3>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>

                  {/* Transactions Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                            <div className="flex items-center">
                              Type
                              <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                              </svg>
                              <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                              </svg>
                            </div>
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                            <div className="flex items-center">
                              Name
                              <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                              </svg>
                              <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                              </svg>
                            </div>
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                            <div className="flex items-center">
                              Date
                              <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                              </svg>
                              <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                              </svg>
                            </div>
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                            <div className="flex items-center">
                              Amount
                              <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                              </svg>
                              <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                              </svg>
                            </div>
                          </th>
                          <th className="w-8"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {getTransactions().map((transaction, index) => (
                          <tr key={index} className="border-b border-gray-100 hover:bg-blue-50" onContextMenu={(e) => handleTransactionRightClick(e, index)}>
                            <td className={`py-3 px-4 text-sm font-medium ${getTransactionColor(transaction)}`}>{transaction.type}</td>
                            <td className={`py-3 px-4 text-sm ${getTransactionColor(transaction)}`}>{transaction.name}</td>
                            <td className="py-3 px-4 text-sm text-gray-900">{transaction.date}</td>
                            <td className={`py-3 px-4 text-sm font-medium ${getTransactionColor(transaction)}`}>{transaction.amount}</td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={(e) => handleTransactionRightClick(e, index)}
                                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                              >
                                <svg className="w-4 h-4 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                              </svg>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bank Account Modal */}
      <BankAccountModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingIndex(-1)
        }}
        onSubmit={handleSubmit}
        editingIndex={editingIndex}
        initialData={editingIndex >= 0 ? accounts[editingIndex] : {}}
        loading={loading}
        error={error}
      />

      {/* Context Menu */}
      {contextMenu.visible && (
        <div
          className="fixed bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1 min-w-[120px]"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
          onClick={closeContextMenu}
        >
          <button
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
            onClick={(e) => {
              e.stopPropagation()
              handleContextMenuAction('view')
            }}
          >
            View/Edit
          </button>
          <button
            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
            onClick={(e) => {
              e.stopPropagation()
              handleContextMenuAction('delete')
            }}
          >
            Delete
          </button>
        </div>
      )}

      {/* Click outside to close context menu */}
      {contextMenu.visible && (
        <div
          className="fixed inset-0 z-40"
          onClick={closeContextMenu}
        />
      )}

      {/* Transaction Context Menu */}
      {transactionContextMenu.visible && (
        <div
          className="fixed bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1 min-w-[120px]"
          style={{
            left: transactionContextMenu.x,
            top: transactionContextMenu.y,
          }}
          onClick={closeTransactionContextMenu}
        >
          <button
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
            onClick={(e) => {
              e.stopPropagation()
              handleTransactionContextMenuAction('view')
            }}
          >
            View/Edit
          </button>
          <button
            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
            onClick={(e) => {
              e.stopPropagation()
              handleTransactionContextMenuAction('delete')
            }}
          >
            Delete
          </button>
        </div>
      )}

      {/* Click outside to close transaction context menu */}
      {transactionContextMenu.visible && (
        <div
          className="fixed inset-0 z-40"
          onClick={closeTransactionContextMenu}
        />
      )}

      {/* Click outside to close deposit dropdown */}
      {showDepositDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowDepositDropdown(false)}
        />
      )}

      {/* Bank to Cash Transfer Modal */}
      {showBankToCashModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingTransaction ? 'Edit Bank To Cash Transfer' : 'Bank To Cash Transfer'}
                </h2>
                <button 
                  onClick={() => setShowBankToCashModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-xl"
                >
                  ✕
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                  {error}
                </div>
              )}

              <form onSubmit={handleBankToCashSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        From:
                      </label>
                      <select
                        name="from"
                        value={bankToCashData.from}
                        onChange={handleBankToCashInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      >
                        <option value="">Select Account</option>
                        {accounts.map((account, index) => (
                          <option key={index} value={account.name}>
                            {account.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Amount
                      </label>
                      <input
                        type="number"
                        name="amount"
                        value={bankToCashData.amount}
                        onChange={handleBankToCashInputChange}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        name="description"
                        value={bankToCashData.description}
                        onChange={handleBankToCashInputChange}
                        placeholder="Add description"
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        To:
                      </label>
                      <input
                        type="text"
                        name="to"
                        value={bankToCashData.to}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Adjustment Date
                      </label>
                      <div className="relative">
                        <input
                          type="date"
                          name="adjustmentDate"
                          value={bankToCashData.adjustmentDate}
                          onChange={handleBankToCashInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Image
                      </label>
                      <button
                        type="button"
                        className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-600 hover:border-gray-400"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Add Image
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowBankToCashModal(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      editingTransaction ? 'Update' : 'Save'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Cash to Bank Transfer Modal */}
      {showCashToBankModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingTransaction ? 'Edit Cash To Bank Transfer' : 'Cash To Bank Transfer'}
                </h2>
                <button 
                  onClick={() => setShowCashToBankModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-xl"
                >
                  ✕
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                  {error}
                </div>
              )}

              <form onSubmit={handleCashToBankSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        From:
                      </label>
                      <input
                        type="text"
                        name="from"
                        value={cashToBankData.from}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Amount
                      </label>
                      <input
                        type="number"
                        name="amount"
                        value={cashToBankData.amount}
                        onChange={handleCashToBankInputChange}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        name="description"
                        value={cashToBankData.description}
                        onChange={handleCashToBankInputChange}
                        placeholder="Add description"
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        To:
                      </label>
                      <select
                        name="to"
                        value={cashToBankData.to}
                        onChange={handleCashToBankInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      >
                        <option value="">Select Account</option>
                        {accounts.map((account, index) => (
                          <option key={index} value={account.name}>
                            {account.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Adjustment Date
                      </label>
                      <div className="relative">
                        <input
                          type="date"
                          name="adjustmentDate"
                          value={cashToBankData.adjustmentDate}
                          onChange={handleCashToBankInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Image
                      </label>
                      <button
                        type="button"
                        className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-600 hover:border-gray-400"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Add Image
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCashToBankModal(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      editingTransaction ? 'Update' : 'Save'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Bank Adjustment Entry Modal */}
      {showAdjustBalanceModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingTransaction ? 'Edit Bank Adjustment Entry' : 'Bank Adjustment Entry'}
                </h2>
                <button 
                  onClick={() => setShowAdjustBalanceModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-xl"
                >
                  ✕
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                  {error}
                </div>
              )}

              <form onSubmit={handleAdjustBalanceSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Account Name
                      </label>
                      <select
                        name="accountName"
                        value={adjustBalanceData.accountName}
                        onChange={handleAdjustBalanceInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      >
                        <option value="">Select Account</option>
                        {accounts.map((account, index) => (
                          <option key={index} value={account.name}>
                            {account.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Amount
                      </label>
                      <input
                        type="number"
                        name="amount"
                        value={adjustBalanceData.amount}
                        onChange={handleAdjustBalanceInputChange}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        name="description"
                        value={adjustBalanceData.description}
                        onChange={handleAdjustBalanceInputChange}
                        placeholder="Add description"
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Type
                      </label>
                      <select
                        name="type"
                        value={adjustBalanceData.type}
                        onChange={handleAdjustBalanceInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      >
                        <option value="Increase balance">Increase balance</option>
                        <option value="Decrease balance">Decrease balance</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Adjustment Date
                      </label>
                      <div className="relative">
                        <input
                          type="date"
                          name="adjustmentDate"
                          value={adjustBalanceData.adjustmentDate}
                          onChange={handleAdjustBalanceInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Image
                      </label>
                      <button
                        type="button"
                        className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-600 hover:border-gray-400"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Add Image
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAdjustBalanceModal(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      editingTransaction ? 'Update' : 'Save'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Animation styles */}
      <style jsx global>{`
        @keyframes scalein {
          0% { opacity: 0; transform: scale(0.95); }
          100% { opacity: 1; transform: scale(1); }
        }
        .animate-scalein {
          animation: scalein 0.3s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
      `}</style>
    </div>
  )
}

export default CashBankPage