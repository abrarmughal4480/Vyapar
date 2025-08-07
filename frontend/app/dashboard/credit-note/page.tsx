'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, BarChart3, Printer, Settings, ChevronDown, Eye, Edit, MoreHorizontal, Trash2 } from 'lucide-react'
import { getCreditNotesByUser } from '../../../http/credit-notes';
import { getToken, getUserIdFromToken } from '../../lib/auth';
import { getCurrentUserInfo, canAddData, canEditData, canDeleteData, canEditSalesData, canDeleteSalesData } from '../../../lib/roleAccessControl';

interface CreditNoteItem {
  id: string
  name: string
  quantity: number
  price: number
  amount: number
  tax: number
}

interface CreditNote {
  id: string
  noteNumber: string
  date: string
  customer: string
  customerPhone: string
  customerAddress: string
  customerGST: string
  items: CreditNoteItem[]
  subtotal: number
  taxAmount: number
  total: number
  received: number
  paid: number
  balance: number
  reason: string
  notes: string
  status: 'Draft' | 'Issued' | 'Applied'
  businessId?: string
  createdAt?: string
  updatedAt?: string
}

interface User {
  id: string
  email: string
  name: string
  role: string
  businessId: string
}

export default function CreditNotePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [selectedNote, setSelectedNote] = useState<CreditNote | null>(null)
  const [activeTab, setActiveTab] = useState('all')

  const [errorMessage, setErrorMessage] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('All')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' } | null>(null)
  const [showDateDropdown, setShowDateDropdown] = useState(false)
  const dateDropdownRef = useRef<HTMLDivElement>(null)
  const dateDropdownButtonRef = useRef<HTMLButtonElement>(null)
  
  // Role-based access control
  const [userInfo, setUserInfo] = useState<any>(null)
  const [isClient, setIsClient] = useState(false)

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

  const dateRanges = [
    { value: 'All', label: 'All Time' },
    { value: 'Today', label: 'Today' },
    { value: 'Yesterday', label: 'Yesterday' },
    { value: 'This Week', label: 'This Week' },
    { value: 'This Month', label: 'This Month' },
    { value: 'Last Month', label: 'Last Month' },
    { value: 'This Year', label: 'This Year' },
    { value: 'Custom', label: 'Custom Range' },
  ]

  // Fetch credit notes with better error handling
  const fetchCreditNotes = useCallback(async () => {
    try {
      setErrorMessage(''); // Clear any previous errors
      
      const result = await fetch(`${API_BASE_URL}/credit-note/${user?.businessId}`);
      
      if (result.ok) {
        const data = await result.json();
        setCreditNotes(data);
        console.log(`Loaded ${data.length} credit notes successfully`);
      } else {
        console.log('No credit notes data received');
        setCreditNotes([]);
      }
    } catch (error: any) {
      console.log('Credit notes fetch error:', error.message);
      // Don't show error to user since local storage handles the fallback
      setCreditNotes([]);
    }
  }, [user?.businessId, API_BASE_URL]);

  // Navigate to create credit note page
  const handleCreateCreditNote = () => {
    router.push('/dashboard/credit-note/create')
  }

  const openPreview = (note: CreditNote) => {
    setSelectedNote(note)
    setShowPreview(true)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft': return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'Issued': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'Applied': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const filteredNotes = creditNotes.filter(note => 
    activeTab === 'all' || note.status.toLowerCase() === activeTab
  )

  const totalAmount = creditNotes.reduce((sum, note) => sum + note.total, 0)
  const draftCount = creditNotes.filter(n => n.status === 'Draft').length
  const issuedCount = creditNotes.filter(n => n.status === 'Issued').length
  const appliedCount = creditNotes.filter(n => n.status === 'Applied').length

  const tabs = [
    { id: 'all', name: 'All Notes', count: creditNotes.length },
    { id: 'draft', name: 'Draft', count: draftCount },
    { id: 'issued', name: 'Issued', count: issuedCount },
    { id: 'applied', name: 'Applied', count: appliedCount }
  ]

  // Filter functions
  const handleFilterTypeChange = (newFilterType: string) => {
    setFilterType(newFilterType)
    if (newFilterType !== 'Custom') {
      const today = new Date()
      let from = '', to = ''
      
      if (newFilterType === 'Today') {
        from = to = today.toISOString().slice(0, 10)
      } else if (newFilterType === 'Yesterday') {
        const yest = new Date(today)
        yest.setDate(today.getDate() - 1)
        from = to = yest.toISOString().slice(0, 10)
      } else if (newFilterType === 'This Week') {
        const first = new Date(today)
        first.setDate(today.getDate() - today.getDay())
        from = first.toISOString().slice(0, 10)
        to = today.toISOString().slice(0, 10)
      } else if (newFilterType === 'This Month') {
        const first = new Date(today.getFullYear(), today.getMonth(), 1)
        from = first.toISOString().slice(0, 10)
        to = today.toISOString().slice(0, 10)
      } else if (newFilterType === 'Last Month') {
        const first = new Date(today.getFullYear(), today.getMonth() - 1, 1)
        const last = new Date(today.getFullYear(), today.getMonth(), 0)
        from = first.toISOString().slice(0, 10)
        to = last.toISOString().slice(0, 10)
      } else if (newFilterType === 'This Year') {
        const first = new Date(today.getFullYear(), 0, 1)
        from = first.toISOString().slice(0, 10)
        to = today.toISOString().slice(0, 10)
      } else if (newFilterType === 'All') {
        from = ''
        to = ''
      }
      
      setDateFrom(from)
      setDateTo(to)
    }
  }

  // Initialize component
  useEffect(() => {
    // Set client-side flag for hydration safety
    setIsClient(true);
    
    // Get current user info for role-based access
    const currentUserInfo = getCurrentUserInfo();
    setUserInfo(currentUserInfo);
    
    const fetchNotes = async () => {
      setErrorMessage('');
      try {
        const token = getToken();
        const userId = getUserIdFromToken();
        if (!userId || !token) return;
        const result = await getCreditNotesByUser(userId, token);
        if (result && result.success && Array.isArray(result.creditNotes)) {
          setCreditNotes(result.creditNotes.map((note: any) => ({
            id: note._id,
            noteNumber: note.creditNoteNo,
            date: note.createdAt,
            customer: note.partyName,
            customerPhone: note.phoneNo || '',
            customerAddress: note.address || '',
            customerGST: note.gstNumber || '',
            items: note.items || [],
            subtotal: note.subTotal || 0,
            taxAmount: note.taxValue || 0,
            total: note.grandTotal || 0,
            received: note.paid || note.received || 0,
            paid: note.paid || 0,
            balance: note.balance || 0,
            reason: note.reason || 'Credit Note',
            notes: note.description || '',
            status: note.status || 'Issued',
            businessId: note.userId,
            createdAt: note.createdAt,
            updatedAt: note.updatedAt,
          })));
        } else {
          setCreditNotes([]);
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to fetch credit notes');
        setCreditNotes([]);
      }
    };
    fetchNotes();
  }, []);

  // Always load user from localStorage if not set
  useEffect(() => {
    if (!user) {
      const userData = localStorage.getItem('user');
      if (userData) setUser(JSON.parse(userData));
    }
  }, [user]);


  return (
    <div className="p-6 bg-gray-50 min-h-screen">

        {/* Header - sticky, card-like, shadow, rounded (copied from sale page) */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-4 md:p-6 mb-6 sticky top-0 z-30 border border-gray-100">
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
            <div className="text-center md:text-left">
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">Credit Notes</h1>
              <p className="text-sm text-gray-500 mt-1">Manage credit notes for returns and adjustments</p>
            </div>
            <div className="flex flex-col md:flex-row gap-2 md:gap-4">
              {isClient && canAddData() ? (
                <button
                  onClick={handleCreateCreditNote}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow"
                >
                  + Create Credit Note
                </button>
              ) : (
                <div className="bg-gray-100 text-gray-500 px-6 py-2 rounded-lg font-medium flex items-center gap-2">
                  + Create Credit Note (Restricted)
                </div>
              )}
              <button className="p-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors">
                <span className="text-gray-600">⚙️</span>
              </button>
            </div>
          </div>
        </div>

        {/* Stats Grid (full width, responsive) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6">
          <div className="bg-gradient-to-br from-blue-100 to-blue-50 p-6 rounded-2xl shadow group hover:shadow-lg transition-all flex flex-col items-start">
            <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-blue-500 text-white mb-3 text-xl">📝</div>
            <div className="text-2xl font-bold text-blue-700">
              {creditNotes.length}
            </div>
            <div className="text-sm text-gray-500">Total Credit Notes</div>
          </div>
          <div className="bg-gradient-to-br from-green-100 to-green-50 p-6 rounded-2xl shadow group hover:shadow-lg transition-all flex flex-col items-start">
            <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-green-500 text-white mb-3 text-xl">💰</div>
            <div className="text-2xl font-bold text-green-700">
              PKR {Number(totalAmount || 0).toLocaleString()}
            </div>
            <div className="text-sm text-gray-500">Total Amount</div>
          </div>
          <div className="bg-gradient-to-br from-orange-100 to-orange-50 p-6 rounded-2xl shadow group hover:shadow-lg transition-all flex flex-col items-start">
            <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-orange-500 text-white mb-3 text-xl">✅</div>
            <div className="text-2xl font-bold text-orange-700">
              {appliedCount}
            </div>
            <div className="text-sm text-gray-500">Applied Notes</div>
          </div>
        </div>

        {/* Search & Filters Section (full width) */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow p-4 md:p-6 mb-6 border border-gray-100 z-[1]">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            {/* Modern Search Bar */}
            <div className="relative w-full md:w-80">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-lg">🔍</span>
              <input
                type="text"
                placeholder="Search credit notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white/80 shadow focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border border-gray-200 transition-all placeholder-gray-400 text-gray-900"
              />
            </div>
            {/* Filter Tabs/Pills */}
            <div className="flex gap-2 md:gap-4">
              {['All', 'Draft', 'Issued', 'Applied'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab.toLowerCase())}
                  className={`px-4 py-2 rounded-full font-medium transition-colors text-sm border-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    activeTab === tab.toLowerCase()
                      ? 'bg-blue-600 text-white border-blue-600 shadow scale-105'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-blue-50'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            {/* Enhanced Date Range & Quick Filter Dropdown */}
            <div className="flex flex-col sm:flex-row gap-2 items-center mt-2">
              {/* Modern Dropdown for Date Range */}
              <div ref={dateDropdownRef} className="relative w-full sm:w-56">
                <button
                  ref={dateDropdownButtonRef}
                  type="button"
                  className="w-full flex items-center justify-between px-4 py-2.5 rounded-full bg-white/80 shadow border border-gray-200 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all group"
                  onClick={() => setShowDateDropdown((v) => !v)}
                  aria-haspopup="listbox"
                  aria-expanded={showDateDropdown ? 'true' : 'false'}
                >
                  <span className="truncate">{dateRanges.find(r => r.value === filterType)?.label || 'All Time'}</span>
                  <svg className={`w-5 h-5 ml-2 transition-transform ${showDateDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                </button>
                {showDateDropdown && (
                  <ul
                    className="absolute z-[100] bg-white rounded-xl shadow-lg border border-gray-100 py-1 max-h-60 overflow-auto animate-fadeinup w-full"
                    style={{ top: '110%', left: 0 }}
                    tabIndex={-1}
                    role="listbox"
                  >
                    {dateRanges.map((range) => (
                      <li
                        key={range.value}
                        className={`px-4 py-2 cursor-pointer rounded-lg transition-all hover:bg-blue-50 ${filterType === range.value ? 'font-semibold text-blue-600 bg-blue-100' : 'text-gray-700'}`}
                        onClick={() => {
                          handleFilterTypeChange(range.value);
                          setShowDateDropdown(false);
                        }}
                        role="option"
                        aria-selected={filterType === range.value}
                      >
                        {range.label}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {/* Date Pickers */}
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  if (filterType !== 'Custom') handleFilterTypeChange('Custom');
                }}
                className="px-4 py-2 rounded-full bg-white border-2 border-gray-200 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm min-w-[140px]"
                placeholder="From Date"
                disabled={filterType !== 'Custom' && filterType !== 'All'}
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  if (filterType !== 'Custom') handleFilterTypeChange('Custom');
                }}
                className="px-4 py-2 rounded-full bg-white border-2 border-gray-200 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm min-w-[140px]"
                placeholder="To Date"
                disabled={filterType !== 'Custom' && filterType !== 'All'}
              />
            </div>
          </div>
        </div>

      {/* Error Display */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <div className="flex items-center space-x-3">
            <span className="text-red-600 text-xl">⚠️</span>
            <div>
              <p className="text-red-800 font-medium">{errorMessage}</p>
              <button 
                onClick={() => setErrorMessage('')}
                className="text-red-600 text-sm hover:text-red-800 mt-1"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Credit Notes Section (full width, enhanced) */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 border-b border-gray-200 gap-4">
          <h2 className="text-lg font-semibold text-gray-900">Credit Notes</h2>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search credit notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-full text-sm w-full md:w-64 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>
            <button
              onClick={() => setToast({ message: 'Print feature coming soon!', type: 'success' })}
              className="p-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
              title="Print"
            >
              <Printer className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Date</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Number</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Party Name</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Category Type</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Total</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Received/Paid</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Balance</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Status</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Print/Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredNotes.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-500 text-lg font-medium">
                    {searchTerm
                      ? `No credit notes found matching "${searchTerm}".`
                      : "No credit notes found."}
                  </td>
                </tr>
              ) : (
                filteredNotes.map((note, idx) => (
                  <tr key={note.id} className={`hover:bg-blue-50/40 transition-all ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap text-center">
                      {note.date
                        ? new Date(note.date).toLocaleDateString('en-GB')
                        : note.createdAt
                          ? new Date(note.createdAt).toLocaleDateString('en-GB')
                          : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-blue-700 font-bold whitespace-nowrap text-center">
                      {note.noteNumber ? (
                        <span className="underline hover:text-blue-900 cursor-pointer">{note.noteNumber}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap text-center">{note.customer}</td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap text-center">
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        {note.reason || 'Credit Note'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-blue-700 whitespace-nowrap text-center">
                      PKR {Number(note.total || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-green-600 whitespace-nowrap text-center">
                      PKR {Number((note as any).received || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-orange-600 whitespace-nowrap text-center">
                      PKR {Number((note as any).balance || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(note.status)}`}>
                        {note.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium whitespace-nowrap text-center">
                      {isClient && canEditData() ? (
                        <div className="flex justify-center gap-2 relative">
                          <button
                            onClick={() => setToast({ message: 'Print feature coming soon!', type: 'success' })}
                            className="p-1 text-gray-600 hover:text-blue-600 transition-colors"
                            title="Print"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setToast({ message: 'Share feature coming soon!', type: 'success' })}
                            className="p-1 text-gray-600 hover:text-green-600 transition-colors"
                            title="Share"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <div className="text-gray-400 text-sm">No actions</div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Enhanced Preview Modal */}
      {showPreview && selectedNote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-8 rounded-t-2xl">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-white">Credit Note Preview</h2>
                  <p className="text-gray-300 text-sm mt-1">Professional credit note document</p>
                </div>
                <button 
                  onClick={() => setShowPreview(false)}
                  className="text-white hover:text-gray-200 text-2xl transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-8">
              {/* Credit Note Preview Content */}
              <div className="border-2 border-gray-200 rounded-xl p-8 bg-white">
                <div className="text-center mb-8">
                  <div className="bg-red-600 text-white px-6 py-3 rounded-lg text-lg font-bold inline-block mb-4">
                    CREDIT NOTE
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900">{selectedNote.noteNumber}</h2>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-8">
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="font-bold text-gray-900 mb-3 text-lg">From:</h3>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p className="font-semibold text-gray-900">Your Business Name</p>
                      <p>Your Business Address</p>
                      <p>Phone: +91 98765 43210</p>
                      <p>Email: contact@yourbusiness.com</p>
                    </div>
                  </div>
                  <div className="bg-blue-50 p-6 rounded-lg">
                    <h3 className="font-bold text-gray-900 mb-3 text-lg">To:</h3>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p className="font-semibold text-gray-900">{selectedNote.customer}</p>
                      <p>{selectedNote.customerAddress}</p>
                      <p>{selectedNote.customerPhone}</p>
                      <p>GST: {selectedNote.customerGST}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-8 p-6 bg-yellow-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">Date:</p>
                    <p className="font-semibold text-gray-900">{new Date(selectedNote.date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Reason:</p>
                    <p className="font-semibold text-gray-900">{selectedNote.reason}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Paid Amount:</p>
                    <p className="font-semibold text-green-600">₹{selectedNote.paid.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Balance:</p>
                    <p className="font-semibold text-orange-600">₹{selectedNote.balance.toFixed(2)}</p>
                  </div>
                </div>

                <div className="overflow-hidden rounded-lg border border-gray-200 mb-8">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Description</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedNote.items.map((item, index) => (
                        <tr key={item.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{item.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">{item.quantity}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">₹{item.price.toFixed(2)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">₹{item.amount.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end mb-8">
                  <div className="w-80 bg-red-50 p-6 rounded-lg border border-red-200">
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="font-medium">₹{selectedNote.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Tax Amount:</span>
                        <span className="font-medium">₹{selectedNote.taxAmount.toFixed(2)}</span>
                      </div>
                      <div className="border-t border-red-200 pt-3">
                        <div className="flex justify-between text-lg font-bold text-red-600">
                          <span>Total Credit:</span>
                          <span>₹{selectedNote.total.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Paid Amount:</span>
                          <span className="font-medium text-green-600">₹{selectedNote.paid.toFixed(2)}</span>
                        </div>
                        <div className="border-t border-red-200 pt-3">
                          <div className="flex justify-between text-lg font-bold text-orange-600">
                            <span>Balance:</span>
                            <span>₹{selectedNote.balance.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {selectedNote.notes && (
                  <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-600 mb-2"><strong>Notes:</strong></p>
                    <p className="text-gray-800">{selectedNote.notes}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-4 mt-8">
                <button className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium flex items-center space-x-2">
                  <span>📄</span>
                  <span>Download PDF</span>
                </button>
                <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center space-x-2">
                  <span>🖨️</span>
                  <span>Print</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Toast Component */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 ${
          toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
        }`}>
          <div className="flex items-center space-x-2">
            <span>{toast.type === 'error' ? '❌' : '✅'}</span>
            <span>{toast.message}</span>
            <button 
              onClick={() => setToast(null)}
              className="ml-2 text-white hover:text-gray-200"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  )
}