'use client'

import React, { useState } from 'react'
import Toast from '../../components/Toast'

interface Expense {
  id: string
  category: string
  subcategory: string
  amount: number
  date: string
  paymentMode: string
  description: string
  vendor: string
  status: 'Paid' | 'Pending' | 'Overdue'
  receiptUrl?: string
}

interface ExpenseCategory {
  id: string
  name: string
  icon: string
  subcategories: string[]
  budgetLimit: number
  spent: number
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([
    {
      id: 'EXP001',
      category: 'Office & Admin',
      subcategory: 'Rent',
      amount: 25000,
      date: '2024-01-15',
      paymentMode: 'Bank Transfer',
      description: 'Monthly office rent payment',
      vendor: 'Property Manager',
      status: 'Paid'
    },
    {
      id: 'EXP002',
      category: 'Utilities',
      subcategory: 'Electricity',
      amount: 3500,
      date: '2024-01-14',
      paymentMode: 'UPI',
      description: 'Monthly electricity bill',
      vendor: 'Power Company',
      status: 'Paid'
    },
    {
      id: 'EXP003',
      category: 'Technology',
      subcategory: 'Internet',
      amount: 2800,
      date: '2024-01-13',
      paymentMode: 'Auto Debit',
      description: 'Broadband internet connection',
      vendor: 'Telecom Provider',
      status: 'Paid'
    },
    {
      id: 'EXP004',
      category: 'Human Resources',
      subcategory: 'Salaries',
      amount: 45000,
      date: '2024-01-12',
      paymentMode: 'Bank Transfer',
      description: 'Staff monthly salary',
      vendor: 'Employee',
      status: 'Pending'
    }
  ])

  const [categories] = useState<ExpenseCategory[]>([
    {
      id: '1',
      name: 'Office & Admin',
      icon: '🏢',
      subcategories: ['Rent', 'Insurance', 'Legal', 'Accounting'],
      budgetLimit: 30000,
      spent: 25000
    },
    {
      id: '2',
      name: 'Human Resources',
      icon: '👥',
      subcategories: ['Salaries', 'Benefits', 'Training', 'Recruitment'],
      budgetLimit: 50000,
      spent: 45000
    },
    {
      id: '3',
      name: 'Technology',
      icon: '💻',
      subcategories: ['Software', 'Hardware', 'Internet', 'Cloud Services'],
      budgetLimit: 15000,
      spent: 8500
    },
    {
      id: '4',
      name: 'Marketing',
      icon: '📢',
      subcategories: ['Advertising', 'Social Media', 'Content', 'Events'],
      budgetLimit: 20000,
      spent: 12000
    },
    {
      id: '5',
      name: 'Utilities',
      icon: '⚡',
      subcategories: ['Electricity', 'Water', 'Gas', 'Maintenance'],
      budgetLimit: 8000,
      spent: 6300
    },
    {
      id: '6',
      name: 'Travel',
      icon: '✈️',
      subcategories: ['Flight', 'Hotel', 'Local Transport', 'Meals'],
      budgetLimit: 10000,
      spent: 4200
    }
  ])

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [dateRange, setDateRange] = useState({ from: '', to: '' })
  const [isLoading, setIsLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const [newExpense, setNewExpense] = useState<Omit<Expense, 'id'>>({
    category: '',
    subcategory: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    paymentMode: '',
    description: '',
    vendor: '',
    status: 'Pending'
  })

  const paymentModes = ['Cash', 'UPI', 'Bank Transfer', 'Credit Card', 'Debit Card', 'Cheque', 'Auto Debit']

  const calculateStats = () => {
    const currentDate = new Date()
    const currentMonth = currentDate.getMonth()
    const currentYear = currentDate.getFullYear()
    const oneWeekAgo = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000)

    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0)
    
    const thisMonth = expenses
      .filter(expense => {
        const expenseDate = new Date(expense.date)
        return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear
      })
      .reduce((sum, expense) => sum + expense.amount, 0)

    const thisWeek = expenses
      .filter(expense => new Date(expense.date) >= oneWeekAgo)
      .reduce((sum, expense) => sum + expense.amount, 0)

    const pendingAmount = expenses
      .filter(expense => expense.status === 'Pending' || expense.status === 'Overdue')
      .reduce((sum, expense) => sum + expense.amount, 0)

    return { totalExpenses, thisMonth, thisWeek, pendingAmount }
  }

  const stats = calculateStats()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setNewExpense(prev => ({
      ...prev,
      [name]: name === 'amount' ? parseFloat(value) || 0 : value
    }))
  }

  const validateExpense = (): boolean => {
    if (!newExpense.category) return false
    if (!newExpense.subcategory) return false
    if (!newExpense.amount || newExpense.amount <= 0) return false
    if (!newExpense.date) return false
    if (!newExpense.paymentMode) return false
    if (!newExpense.description.trim()) return false
    return true
  }

  const handleAddExpense = async () => {
    if (!validateExpense()) {
      setToast({ message: 'Please fill in all required fields', type: 'error' })
      return
    }

    setIsLoading(true)

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))

      const expense: Expense = {
        ...newExpense,
        id: `EXP${String(expenses.length + 1).padStart(3, '0')}`,
        description: newExpense.description.trim(),
        vendor: newExpense.vendor.trim() || 'Unknown Vendor'
      }

      setExpenses(prev => [expense, ...prev])
      setIsModalOpen(false)
      resetForm()
      setToast({ message: 'Expense added successfully!', type: 'success' })
    } catch (error) {
      setToast({ message: 'Failed to add expense. Please try again.', type: 'error' })
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setNewExpense({
      category: '',
      subcategory: '',
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      paymentMode: '',
      description: '',
      vendor: '',
      status: 'Pending'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Paid': return 'bg-green-100 text-green-800'
      case 'Pending': return 'bg-yellow-100 text-yellow-800'
      case 'Overdue': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getCategoryIcon = (categoryName: string) => {
    const category = categories.find(cat => cat.name === categoryName)
    return category?.icon || '📝'
  }

  const getSubcategories = (categoryName: string) => {
    const category = categories.find(cat => cat.name === categoryName)
    return category?.subcategories || []
  }

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expense.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expense.category.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = !selectedCategory || expense.category === selectedCategory
    
    const matchesStatus = activeTab === 'all' || expense.status.toLowerCase() === activeTab
    
    const matchesDateRange = (!dateRange.from || expense.date >= dateRange.from) &&
                            (!dateRange.to || expense.date <= dateRange.to)

    return matchesSearch && matchesCategory && matchesStatus && matchesDateRange
  })

  const exportExpenses = () => {
    setToast({ message: 'Export functionality would be implemented here', type: 'success' })
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Expense Management</h1>
            <p className="text-sm text-gray-500 mt-1">Track and manage your business expenses efficiently</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={exportExpenses}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center space-x-2 transition-colors"
            >
              <span>📊</span>
              <span>Export</span>
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2 transition-colors"
            >
              <span>+</span>
              <span>Add Expense</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-red-600">₹{stats.totalExpenses.toLocaleString()}</div>
          <div className="text-sm text-gray-500">Total Expenses</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-orange-600">₹{stats.thisMonth.toLocaleString()}</div>
          <div className="text-sm text-gray-500">This Month</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-blue-600">₹{stats.thisWeek.toLocaleString()}</div>
          <div className="text-sm text-gray-500">This Week</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-purple-600">₹{stats.pendingAmount.toLocaleString()}</div>
          <div className="text-sm text-gray-500">Pending Payments</div>
        </div>
      </div>

      {/* Expense Categories */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Expense Categories & Budget</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category) => {
            const percentage = (category.spent / category.budgetLimit) * 100
            const isOverBudget = percentage > 100
            
            return (
              <div key={category.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-xl">{category.icon}</span>
                    <span className="font-medium text-gray-900">{category.name}</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {Math.min(percentage, 100).toFixed(0)}%
                  </span>
                </div>
                <div className="mb-2">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>₹{category.spent.toLocaleString()}</span>
                    <span>₹{category.budgetLimit.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        isOverBudget ? 'bg-red-500' : percentage > 80 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>
                </div>
                {isOverBudget && (
                  <p className="text-xs text-red-600 mt-1">
                    Over budget by ₹{(category.spent - category.budgetLimit).toLocaleString()}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Filters and Tabs */}
      <div className="bg-white rounded-lg shadow-sm mb-6">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex space-x-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search expenses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex space-x-2">
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              {
                id: 'all',
                name: 'All Expenses',
                count: expenses.length
              },
              {
                id: 'paid',
                name: 'Paid',
                count: expenses.filter(e => e.status === 'Paid').length
              },
              {
                id: 'pending',
                name: 'Pending',
                count: expenses.filter(e => e.status === 'Pending').length
              },
              {
                id: 'overdue',
                name: 'Overdue',
                count: expenses.filter(e => e.status === 'Overdue').length
              }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <span>{tab.name}</span>
                <span className="bg-gray-200 text-gray-600 px-2 py-1 rounded-full text-xs">
                  {tab.count}
                </span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Expenses List */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Expenses ({filteredExpenses.length})
          </h2>
        </div>
        
        {filteredExpenses.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">💰</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No expenses found</h3>
            <p className="text-gray-500 mb-4">
              {activeTab === 'all' 
                ? 'Add your first expense to get started'
                : `No ${activeTab} expenses found`
              }
            </p>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Expense
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expense</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredExpenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-xl mr-3">{getCategoryIcon(expense.category)}</span>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{expense.description}</div>
                          <div className="text-sm text-gray-500">{expense.id} • {expense.vendor}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{expense.category}</div>
                      <div className="text-sm text-gray-500">{expense.subcategory}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">₹{expense.amount.toLocaleString()}</div>
                      <div className="text-sm text-gray-500">{expense.paymentMode}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(expense.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(expense.status)}`}>
                        {expense.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex justify-center space-x-2">
                        <button className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors">
                          Edit
                        </button>
                        <button className="text-green-600 hover:text-green-800 text-sm font-medium transition-colors">
                          Receipt
                        </button>
                        <button className="text-red-600 hover:text-red-800 text-sm font-medium transition-colors">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-0 overflow-hidden">
            <div className="flex flex-col items-center justify-center py-10 px-8">
              {/* SVG illustration similar to screenshot */}
              <svg width={110} height={90} viewBox="0 0 110 90" fill="none" className="mb-6">
                <ellipse cx="55" cy="45" rx="50" ry="40" fill="#F8FAFC" />
                <rect x="30" y="35" width="50" height="35" rx="8" fill="#F3F6FB" />
                <rect x="40" y="45" width="30" height="6" rx="3" fill="#B3C6E6" />
                <rect x="40" y="55" width="18" height="5" rx="2.5" fill="#B3C6E6" />
                <rect x="40" y="63" width="24" height="4" rx="2" fill="#B3C6E6" />
                <rect x="60" y="38" width="12" height="12" rx="3" fill="#E3F0FF" />
                <text x="66" y="48" fontSize="12" fill="#2196F3" fontWeight="bold" textAnchor="middle">₹</text>
                <rect x="55" y="75" width="20" height="4" rx="2" fill="#E3F0FF" />
                <rect x="35" y="30" width="8" height="18" rx="3" fill="#E3F0FF" />
              </svg>
              <div className="text-gray-700 text-lg font-semibold mb-2 text-center">
                Add your 1st Expense
              </div>
              <div className="text-gray-400 text-sm mb-8 text-center max-w-xs">
                Record your business expenses &amp; know your real profits.
              </div>
              <button
                type="button"
                className="w-full max-w-xs bg-[#F51B3F] hover:bg-[#d91436] text-white font-semibold rounded-full py-3 flex items-center justify-center gap-2 text-base shadow transition"
                onClick={() => {
                  setIsModalOpen(false)
                  setTimeout(() => setIsModalOpen(true), 10) // Open real form modal after animation if needed
                }}
              >
                <span className="text-lg font-bold">＋</span>
                Add Expenses
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Add Expense</h2>
              <button
                onClick={() => {
                  setIsModalOpen(false)
                  resetForm()
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>
            <form
              onSubmit={e => {
                e.preventDefault()
                handleAddExpense()
              }}
              className="p-6 space-y-8"
            >
              {/* Expense Category and Date */}
              <div className="flex flex-wrap gap-6 items-center mb-2">
                <div className="flex-1 min-w-[220px]">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expense Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="category"
                    value={newExpense.category}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.name}>
                        {category.icon} {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1"></div>
                <div className="min-w-[180px]">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expense No</label>
                  <input
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100"
                    value={`EXP${String(expenses.length + 1).padStart(3, '0')}`}
                    disabled
                  />
                </div>
                <div className="min-w-[180px]">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    name="date"
                    value={newExpense.date}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    required
                  />
                </div>
              </div>

              {/* Items Table */}
              <ExpenseItemsTable />

              {/* Payment Type, Round Off, Total */}
              <div className="flex flex-wrap gap-8 mt-8 items-end">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Type</label>
                  <select
                    name="paymentMode"
                    value={newExpense.paymentMode}
                    onChange={handleInputChange}
                    className="border border-gray-300 rounded px-3 py-2 min-w-[120px]"
                    required
                  >
                    <option value="">Select</option>
                    {paymentModes.map((mode) => (
                      <option key={mode} value={mode}>{mode}</option>
                    ))}
                  </select>
                  <div>
                    <button
                      type="button"
                      className="text-blue-600 text-xs mt-2 hover:underline"
                      // Add logic for multiple payment types if needed
                    >
                      + Add Payment type
                    </button>
                  </div>
                </div>
                <div className="flex-1"></div>
                <div className="flex flex-col gap-2 min-w-[320px]">
                  <div className="flex gap-2 items-center">
                    <label className="text-sm text-gray-700 w-20">Round Off</label>
                    <input
                      type="number"
                      className="w-20 border border-gray-300 rounded px-2 py-1"
                      value={0}
                      readOnly
                    />
                    <label className="flex items-center ml-2 text-xs text-gray-600">
                      <input
                        type="checkbox"
                        className="mr-1"
                        checked={false}
                        readOnly
                      />
                      Round Off
                    </label>
                  </div>
                  <div className="flex gap-2 items-center mt-2">
                    <label className="text-sm text-gray-700 w-20 font-semibold">Total</label>
                    <input
                      type="text"
                      className="w-32 border border-gray-300 rounded px-2 py-1 font-bold text-lg text-right bg-gray-100"
                      value={newExpense.amount || 0}
                      readOnly
                    />
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end gap-2 mt-8">
                <button
                  type="button"
                  className="px-6 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 font-semibold"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-8 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                  disabled={isLoading}
                >
                  {isLoading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}

// Add this component inside the same file, outside the main ExpensesPage component
function ExpenseItemsTable() {
  const [rows, setRows] = useState([
    { id: 1, item: '', qty: '', price: '', amount: '' },
    { id: 2, item: '', qty: '', price: '', amount: '' }
  ])

  const handleRowChange = (idx: number, field: string, value: string) => {
    setRows(rows =>
      rows.map((row, i) =>
        i === idx
          ? {
              ...row,
              [field]: value,
              amount:
                field === 'qty'
                  ? String(Number(value) * Number(row.price || 0))
                  : field === 'price'
                  ? String(Number(row.qty || 0) * Number(value))
                  : String(Number(row.qty || 0) * Number(row.price || 0))
            }
          : row
      )
    )
  }

  const handleAddRow = () => {
    setRows(rows => [
      ...rows,
      { id: rows.length + 1, item: '', qty: '', price: '', amount: '' }
    ])
  }

  const total = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0)

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-3 py-2 font-semibold text-left border-b">#</th>
            <th className="px-3 py-2 font-semibold text-left border-b">ITEM</th>
            <th className="px-3 py-2 font-semibold text-left border-b">QTY</th>
            <th className="px-3 py-2 font-semibold text-left border-b">PRICE/UNIT</th>
            <th className="px-3 py-2 font-semibold text-left border-b">AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={row.id} className="hover:bg-gray-50">
              <td className="px-3 py-2">{idx + 1}</td>
              <td className="px-3 py-2">
                <input
                  type="text"
                  className="w-full border border-gray-200 rounded px-2 py-1"
                  value={row.item}
                  onChange={e => handleRowChange(idx, 'item', e.target.value)}
                  placeholder="Item"
                />
              </td>
              <td className="px-3 py-2">
                <input
                  type="number"
                  className="w-20 border border-gray-200 rounded px-2 py-1"
                  value={row.qty}
                  min={0}
                  onChange={e => handleRowChange(idx, 'qty', e.target.value)}
                  placeholder="Qty"
                />
              </td>
              <td className="px-3 py-2">
                <input
                  type="number"
                  className="w-24 border border-gray-200 rounded px-2 py-1"
                  value={row.price}
                  min={0}
                  onChange={e => handleRowChange(idx, 'price', e.target.value)}
                  placeholder="Price"
                />
              </td>
              <td className="px-3 py-2">{row.amount || 0}</td>
            </tr>
          ))}
          <tr>
            <td colSpan={5} className="px-3 py-2 text-left">
              <button
                type="button"
                className="px-3 py-1 border border-blue-400 text-blue-600 rounded hover:bg-blue-50 text-xs"
                onClick={handleAddRow}
              >
                ADD ROW
              </button>
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={4} className="text-right font-semibold px-3 py-2">TOTAL</td>
            <td className="px-3 py-2">{total}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}