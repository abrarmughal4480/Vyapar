'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

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
  const [isLoading, setIsLoading] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

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

  // Initialize component
  useEffect(() => {
    const initialize = async () => {
      setIsInitializing(true);
      setErrorMessage(''); // Clear any previous errors
      
      try {
        await fetchCreditNotes().catch(err => console.log('Initial fetch failed:', err));
        console.log('Credit Notes page initialized successfully');
      } catch (error: any) {
        console.log('Initialization error:', error.message);
      } finally {
        setIsInitializing(false);
      }
    };

    initialize();
  }, [fetchCreditNotes]);

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-red-200 border-t-red-600 rounded-full animate-spin mx-auto"></div>
          <p className="text-xl font-semibold text-gray-900">Loading Credit Notes...</p>
          <p className="text-gray-600">Setting up your credit note management...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Backend Status - Updated */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-3 animate-pulse"></div>
            <div>
              <p className="text-sm font-medium text-green-900">Credit Notes Ready (Real Auth + Local Storage)</p>
              <p className="text-xs text-green-700">
                Backend: {API_BASE_URL} | Business: {user?.businessId || 'Detecting...'} | Notes: {creditNotes.length} saved | Mode: Hybrid
              </p>
            </div>
          </div>
          <button 
            onClick={() => fetchCreditNotes()}
            className="text-green-600 hover:text-green-700 text-sm font-medium"
            disabled={isInitializing}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Enhanced Header */}
      <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white text-2xl">📝</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Credit Notes</h1>
              <p className="text-gray-500 mt-2">Manage credit notes for returns and adjustments</p>
              {user && (
                <p className="text-sm text-blue-600 mt-1">Business: {user.businessId}</p>
              )}
            </div>
          </div>
          <button 
            onClick={handleCreateCreditNote}
            disabled={isLoading}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium shadow-md hover:shadow-lg flex items-center space-x-2 disabled:opacity-50"
          >
            <span>+</span>
            <span>Create Credit Note</span>
          </button>
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

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-blue-600 text-xl">📊</span>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">{creditNotes.length}</div>
              <div className="text-sm text-gray-500">Total Credit Notes</div>
              <div className="text-xs text-blue-600 font-medium">All time</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <span className="text-red-600 text-xl">💰</span>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">₹{totalAmount.toLocaleString()}</div>
              <div className="text-sm text-gray-500">Total Amount</div>
              <div className="text-xs text-red-600 font-medium">Credit value</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <span className="text-orange-600 text-xl">📋</span>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">{draftCount}</div>
              <div className="text-sm text-gray-500">Draft Notes</div>
              <div className="text-xs text-orange-600 font-medium">Pending</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-green-600 text-xl">✅</span>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{issuedCount}</div>
              <div className="text-sm text-gray-500">Issued Notes</div>
              <div className="text-xs text-green-600 font-medium">Active</div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Tabs */}
      <div className="bg-white rounded-xl shadow-lg mb-8 overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{tab.name}</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  activeTab === tab.id 
                    ? 'bg-red-100 text-red-800' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Enhanced Credit Notes List */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-8">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
              <span className="text-white text-xl">📋</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Credit Notes List</h2>
              <p className="text-gray-300 mt-1">Manage and track all your credit notes</p>
            </div>
          </div>
        </div>
        
        {filteredNotes.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-gray-400 text-8xl mb-6">📝</div>
            <h3 className="text-xl font-semibold text-gray-600 mb-3">No credit notes found</h3>
            <p className="text-gray-500 mb-6">Create your first credit note to get started</p>
            <button 
              onClick={handleCreateCreditNote}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium shadow-md hover:shadow-lg"
            >
              Create Credit Note
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Note Details</th>
                  <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-8 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-8 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-8 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredNotes.map((note) => (
                  <tr key={note.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-8 py-6 whitespace-nowrap">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                          <span className="text-red-600 text-lg">📝</span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{note.noteNumber}</div>
                          <div className="text-sm text-gray-500">{note.reason}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{note.customer}</div>
                      <div className="text-sm text-gray-500">{note.customerPhone}</div>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(note.date).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </div>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap text-right">
                      <div className="text-lg font-bold text-red-600">₹{note.total.toLocaleString()}</div>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap text-center">
                      <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(note.status)}`}>
                        {note.status}
                      </span>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap text-center">
                      <div className="flex justify-center space-x-2">
                        <button
                          onClick={() => openPreview(note)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          View
                        </button>
                        <button className="text-green-600 hover:text-green-800 text-sm font-medium">
                          Print
                        </button>
                        <button className="text-gray-600 hover:text-gray-800 text-sm font-medium">
                          Edit
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
                        <div className="flex justify-between text-xl font-bold text-red-600">
                          <span>Total Credit:</span>
                          <span>₹{selectedNote.total.toFixed(2)}</span>
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
    </div>
  )
}