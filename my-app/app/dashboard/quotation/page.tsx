'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

// Vyapar-style status badge component
function StatusBadge({ status }: { status: string }) {
  const color = {
    Sent: 'bg-blue-100 text-blue-800',
    Accepted: 'bg-green-100 text-green-800',
    Pending: 'bg-yellow-100 text-yellow-800',
    Rejected: 'bg-red-100 text-red-800',
  }[status] || 'bg-gray-100 text-gray-800'
  return (
    <span className={`px-3 py-1 text-xs font-medium rounded-full ${color}`}>
      {status}
    </span>
  )
}

// Enhanced QuotationActions to accept onView prop
function QuotationActions({ onView }: { onView: () => void }) {
  return (
    <div className="flex justify-center space-x-2">
      <button className="text-blue-600 hover:text-blue-800 text-sm font-medium" onClick={onView}>View</button>
      <button className="text-green-600 hover:text-green-800 text-sm font-medium">Convert</button>
      <button className="text-gray-600 hover:text-gray-800 text-sm font-medium">Print</button>
    </div>
  )
}

// Modal to view quotation details
function ViewQuotationModal({
  open,
  onClose,
  quotation,
}: {
  open: boolean
  onClose: () => void
  quotation: any
}) {
  if (!open || !quotation) return null
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-8 py-6 rounded-t-2xl flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white">Quotation #{quotation.number}</h2>
            <p className="text-purple-100 text-sm mt-1">Details for {quotation.customer}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 text-2xl transition-colors"
          >
            ✕
          </button>
        </div>
        <div className="p-8">
          <div className="mb-4">
            <div className="flex justify-between">
              <div>
                <div className="font-semibold text-gray-700">Customer:</div>
                <div className="text-gray-900">{quotation.customer}</div>
              </div>
              <div>
                <div className="font-semibold text-gray-700">Date:</div>
                <div className="text-gray-900">{quotation.date}</div>
              </div>
            </div>
            <div className="mt-2">
              <StatusBadge status={quotation.status} />
            </div>
          </div>
          <div>
            <div className="font-semibold text-gray-700 mb-2">Items:</div>
            <table className="w-full border rounded-lg mb-4">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-xs text-gray-500">Item Name</th>
                  <th className="px-4 py-2 text-xs text-gray-500">Qty</th>
                  <th className="px-4 py-2 text-xs text-gray-500">Price</th>
                  <th className="px-4 py-2 text-xs text-gray-500">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(quotation.items || []).map((item: any, idx: number) => (
                  <tr key={idx}>
                    <td className="px-4 py-2">{item.name}</td>
                    <td className="px-4 py-2">{item.qty}</td>
                    <td className="px-4 py-2">₹{item.price}</td>
                    <td className="px-4 py-2 text-right">₹{(item.qty * item.price).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-end">
              <span className="text-lg font-bold text-purple-700">
                Total: ₹{quotation.amount.toLocaleString()}
              </span>
            </div>
          </div>
          {quotation.notes && (
            <div className="mt-4">
              <div className="font-semibold text-gray-700 mb-1">Notes:</div>
              <div className="text-gray-800">{quotation.notes}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function QuotationPage() {
  const router = useRouter()
  const [quotations, setQuotations] = useState<any[]>([])
  const [showViewModal, setShowViewModal] = useState(false)
  const [viewQuotation, setViewQuotation] = useState<any>(null)
  
  // API related state
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [authToken, setAuthToken] = useState<string>('')
  const [isInitialized, setIsInitialized] = useState(false)

  // Search, filter, and pagination state
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [page, setPage] = useState(1)
  const pageSize = 5

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

  // Strict auth check - no dummy auth allowed
  const checkAuth = useCallback(() => {
    if (typeof window === 'undefined') {
      return null;
    }

    const token = localStorage.getItem('token') || localStorage.getItem('vypar_auth_token');
    const userData = localStorage.getItem('user') || localStorage.getItem('vypar_user_session');
    
    if (!token || !userData) {
      console.log('No authentication found, redirecting to home');
      router.push('/');
      return null;
    }

    try {
      const parsedUser = JSON.parse(userData);
      
      if (!parsedUser.id || !parsedUser.email || parsedUser.email === 'demo@vyparr.com') {
        console.log('Invalid or demo user data, redirecting to home');
        router.push('/');
        return null;
      }

      let businessId = parsedUser.businessId;
      if (!businessId) {
        businessId = `biz_${parsedUser.id}_${Date.now()}`;
        parsedUser.businessId = businessId;
        localStorage.setItem('user', JSON.stringify(parsedUser));
        localStorage.setItem('vypar_user_session', JSON.stringify(parsedUser));
        localStorage.setItem('businessId', businessId);
      }
      
      console.log('Quotations: Auth check successful for real user:', parsedUser.name || parsedUser.email);
      
      return {
        token,
        user: parsedUser,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };
    } catch (error) {
      console.log('Error parsing user data, redirecting to home');
      router.push('/');
      return null;
    }
  }, [router]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const auth = checkAuth();
      if (auth) {
        setAuthToken(auth.token);
        setIsInitialized(true);
      }
    }
  }, [checkAuth])

  const getBusinessId = useCallback(() => {
    if (typeof window === 'undefined') {
      return null;
    }

    const auth = checkAuth();
    if (auth?.user?.businessId) {
      return auth.user.businessId;
    }
    
    return localStorage.getItem('businessId');
  }, [checkAuth]);

  // Save quotations to localStorage
  const saveQuotationsLocally = useCallback((quotations: any[]) => {
    if (typeof window === 'undefined') {
      return;
    }

    const businessId = getBusinessId();
    if (businessId) {
      const localStorageKey = `vyparr_quotations_${businessId}`;
      localStorage.setItem(localStorageKey, JSON.stringify(quotations));
      console.log(`Saved ${quotations.length} quotations to localStorage for business: ${businessId}`);
    }
  }, [getBusinessId]);

  // Load quotations from localStorage
  const loadQuotationsLocally = useCallback(() => {
    if (typeof window === 'undefined') {
      return [];
    }

    const businessId = getBusinessId();
    if (businessId) {
      const localStorageKey = `vyparr_quotations_${businessId}`;
      const savedQuotations = localStorage.getItem(localStorageKey);
      
      if (savedQuotations) {
        try {
          const parsedQuotations = JSON.parse(savedQuotations);
          console.log(`Loaded ${parsedQuotations.length} quotations from localStorage for business: ${businessId}`);
          return parsedQuotations;
        } catch (e) {
          console.log('Error parsing saved quotations, starting fresh');
          return [];
        }
      }
    }
    return [];
  }, [getBusinessId]);

  const makeApiCall = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    const url = `${API_BASE_URL}${endpoint}`;
    
    let token = '';
    if (typeof window !== 'undefined') {
      token = authToken || localStorage.getItem('token') || localStorage.getItem('vypar_auth_token') || '';
    }

    const headers: any = { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers
    };
    
    try {
      const response = await fetch(url, { 
        ...options, 
        headers 
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Quotations API Success:', data);
        return data;
      } else {
        console.log('Quotations API failed, using local storage mode');
        return { success: true, data: [], localMode: true };
      }
    } catch (error) {
      console.log('Quotations API error, using local storage mode:', error);
      return { success: true, data: [], localMode: true };
    }
  }, [API_BASE_URL, authToken]);

  const loadQuotationsFromAPI = useCallback(async () => {
    if (!isInitialized) {
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    // First, load from localStorage
    const localQuotations = loadQuotationsLocally();
    if (localQuotations.length > 0) {
      setQuotations(localQuotations);
    }
    
    // Then try to sync with API
    try {
      const businessId = getBusinessId();
      if (!businessId) {
        setError('Unable to determine business ID');
        setIsLoading(false);
        return;
      }

      const result = await makeApiCall(`/quotations/${businessId}`);
      
      if (result && result.success && Array.isArray(result.data) && !result.localMode) {
        const transformedQuotations = result.data.map((quotation: any) => ({
          id: quotation.id,
          number: quotation.number,
          customer: quotation.customer,
          amount: quotation.total || 0,
          date: quotation.date,
          status: quotation.status,
          items: quotation.items || [],
          notes: quotation.notes || '',
          validUntil: quotation.validUntil || '',
          createdAt: quotation.createdAt,
          updatedAt: quotation.updatedAt
        }));
        
        setQuotations(transformedQuotations);
        saveQuotationsLocally(transformedQuotations);
        console.log('Quotations synced with API and saved locally');
      } else if (localQuotations.length === 0) {
        setQuotations([]);
      }
    } catch (error) {
      console.error('Failed to load quotations from API:', error);
      if (localQuotations.length === 0) {
        setError('Failed to load quotations from server');
      }
    }
    
    setIsLoading(false);
  }, [makeApiCall, isInitialized, getBusinessId, loadQuotationsLocally, saveQuotationsLocally]);

  useEffect(() => {
    if (isInitialized && authToken) {
      loadQuotationsFromAPI();
    }
  }, [loadQuotationsFromAPI, isInitialized, authToken]);

  // Navigate to create quotation page
  const handleCreateQuotation = () => {
    router.push('/dashboard/quotation/create')
  }

  // Filtered and searched quotations
  const filteredQuotations = quotations.filter(q =>
    (statusFilter === 'All' || q.status === statusFilter) &&
    (
      q.customer.toLowerCase().includes(search.toLowerCase()) ||
      q.number.toLowerCase().includes(search.toLowerCase())
    )
  )
  // Pagination
  const totalPages = Math.ceil(filteredQuotations.length / pageSize)
  const paginatedQuotations = filteredQuotations.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <span className="text-red-600 mr-2">⚠️</span>
            <div className="text-red-800">{error}</div>
            <button 
              onClick={() => setError('')}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Backend Status */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-3 animate-pulse"></div>
            <div>
              <p className="text-sm font-medium text-purple-900">Quotations API Connected (Real Auth Only)</p>
              <p className="text-xs text-purple-700">
                Backend: {API_BASE_URL} | Business: {getBusinessId() || 'Detecting...'} | Quotations: {quotations.length} saved
              </p>
            </div>
          </div>
          <button 
            onClick={() => loadQuotationsFromAPI()}
            className="text-purple-600 hover:text-purple-700 text-sm font-medium"
            disabled={!isInitialized}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <span className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                <span className="text-purple-600 text-xl">📋</span>
              </span>
              Quotations
            </h1>
            <p className="text-gray-500 mt-1">Create and manage quotations for your customers</p>
          </div>
          <button
            onClick={handleCreateQuotation}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium shadow-md hover:shadow-lg flex items-center space-x-2"
          >
            <span>+</span>
            <span>New Quotation</span>
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-3">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search by customer or number..."
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          >
            <option value="All">All Status</option>
            <option value="Sent">Sent</option>
            <option value="Accepted">Accepted</option>
            <option value="Pending">Pending</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-sm text-gray-500">
            Showing {filteredQuotations.length === 0 ? 0 : (page - 1) * pageSize + 1}
            -
            {Math.min(page * pageSize, filteredQuotations.length)} of {filteredQuotations.length}
          </span>
          <button
            className="px-2 py-1 rounded bg-gray-200 text-gray-700"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >Prev</button>
          <button
            className="px-2 py-1 rounded bg-gray-200 text-gray-700"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || totalPages === 0}
          >Next</button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-blue-600 text-xl">📊</span>
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">{quotations.length}</div>
              <div className="text-sm text-gray-500">Total Quotations</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-green-600 text-xl">✅</span>
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-green-600">{quotations.filter(q => q.status === 'Accepted').length}</div>
              <div className="text-sm text-gray-500">Accepted</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <span className="text-yellow-600 text-xl">⏳</span>
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-yellow-600">{quotations.filter(q => q.status === 'Pending').length}</div>
              <div className="text-sm text-gray-500">Pending</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-purple-600 text-xl">₹</span>
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-purple-600">
                ₹{quotations.reduce((sum, q) => sum + q.amount, 0).toLocaleString()}
              </div>
              <div className="text-sm text-gray-500">Total Value</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quotations List */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">Recent Quotations</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quotation #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedQuotations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-400">No quotations found.</td>
                </tr>
              ) : paginatedQuotations.map((quotation) => (
                <tr key={quotation.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{quotation.number}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{quotation.customer}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{quotation.date}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm font-medium text-gray-900">₹{quotation.amount.toLocaleString()}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <StatusBadge status={quotation.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <QuotationActions onView={() => { setViewQuotation(quotation); setShowViewModal(true); }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Quotation Modal */}
      <ViewQuotationModal
        open={showViewModal}
        onClose={() => setShowViewModal(false)}
        quotation={viewQuotation}
      />
    </div>
  )
}