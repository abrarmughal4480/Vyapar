'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface DeliveryChallanItem {
  id: string
  name: string
  quantity: number
  unit: string
  price: number
  amount: number
}

interface DeliveryChallan {
  id: string
  challanNumber: string
  date: string
  customer: string
  customerPhone: string
  customerAddress: string
  vehicleNumber: string
  driverName: string
  transportMode: string
  items: DeliveryChallanItem[]
  subtotal: number
  taxAmount: number
  total: number
  description: string
  status: 'Pending' | 'In Transit' | 'Delivered' | 'Cancelled'
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

export default function DeliveryChallanPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [deliveryChallans, setDeliveryChallans] = useState<DeliveryChallan[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [selectedChallan, setSelectedChallan] = useState<DeliveryChallan | null>(null)
  const [activeTab, setActiveTab] = useState('all')
  const [isLoading, setIsLoading] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

  // Real authentication check - no demo mode
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
      
      console.log('Delivery Challans: Auth check successful for real user:', parsedUser.name || parsedUser.email);
      
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

  // API call wrapper - with better error handling
  const makeApiCall = useCallback(async (endpoint: string, options: RequestInit = {}): Promise<any> => {
    const auth = checkAuth();
    if (!auth) throw new Error('Authentication required');

    const url = `${API_BASE_URL}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...auth.headers,
          ...options.headers,
        },
      });
      
      // Handle different response statuses gracefully
      if (response.status === 404) {
        console.log('API endpoint not found, using local storage mode');
        return await simulateLocalApiCall(endpoint, options);
      }
      
      if (response.status === 401) {
        console.log('Authentication failed, using local storage mode');
        return await simulateLocalApiCall(endpoint, options);
      }
      
      if (response.status >= 500) {
        console.log('Server error, using local storage mode');
        return await simulateLocalApiCall(endpoint, options);
      }
      
      if (!response.ok) {
        console.log('API request failed, using local storage mode');
        return await simulateLocalApiCall(endpoint, options);
      }

      return await response.json();
    } catch (error: any) {
      console.log('Network error, using local storage mode:', error.message);
      return await simulateLocalApiCall(endpoint, options);
    }
  }, [checkAuth, router, API_BASE_URL]);

  // Enhanced local storage fallback
  const simulateLocalApiCall = useCallback(async (endpoint: string, options: RequestInit = {}): Promise<any> => {
    const auth = checkAuth();
    if (!auth) throw new Error('Authentication required');

    const businessId = auth.user.businessId;
    const localKey = `vyparr_delivery_challans_${businessId}`;

    console.log('Using local storage for endpoint:', endpoint);

    if (endpoint.includes('/delivery-challan')) {
      if (options.method === 'POST') {
        const formData = JSON.parse(options.body as string);
        const newChallan = {
          id: Date.now().toString(),
          ...formData,
          status: 'Pending',
          businessId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        const existingChallans = JSON.parse(localStorage.getItem(localKey) || '[]');
        existingChallans.unshift(newChallan);
        localStorage.setItem(localKey, JSON.stringify(existingChallans));
        
        console.log('Delivery challan saved to localStorage:', newChallan.id);
        
        return { success: true, data: newChallan };
      }
      
      const savedChallans = JSON.parse(localStorage.getItem(localKey) || '[]');
      console.log(`Loaded ${savedChallans.length} delivery challans from localStorage`);
      
      return {
        success: true,
        data: savedChallans
      };
    }

    return { success: false, message: 'Local API endpoint not implemented' };
  }, [checkAuth]);

  // Fetch delivery challans with better error handling
  const fetchDeliveryChallans = useCallback(async () => {
    try {
      const auth = checkAuth();
      if (!auth) return;

      setErrorMessage(''); // Clear any previous errors
      
      const result = await makeApiCall(`/delivery-challan/${auth.user.businessId}`);
      
      if (result.success && Array.isArray(result.data)) {
        setDeliveryChallans(result.data);
        console.log(`Loaded ${result.data.length} delivery challans successfully`);
      } else {
        console.log('No delivery challans data received');
        setDeliveryChallans([]);
      }
    } catch (error: any) {
      console.log('Delivery challans fetch error:', error.message);
      // Don't show error to user since local storage handles the fallback
      setDeliveryChallans([]);
    }
  }, [makeApiCall, checkAuth]);

  // Navigate to create delivery challan page
  const handleCreateDeliveryChallan = () => {
    router.push('/dashboard/delivery-challan/create')
  }

  const openPreview = (challan: DeliveryChallan) => {
    setSelectedChallan(challan)
    setShowPreview(true)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'In Transit': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'Delivered': return 'bg-green-100 text-green-800 border-green-200'
      case 'Cancelled': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const filteredChallans = deliveryChallans.filter(challan => 
    activeTab === 'all' || challan.status.toLowerCase().replace(' ', '-') === activeTab
  )

  const totalAmount = deliveryChallans.reduce((sum, challan) => sum + challan.total, 0)
  const pendingCount = deliveryChallans.filter(c => c.status === 'Pending').length
  const inTransitCount = deliveryChallans.filter(c => c.status === 'In Transit').length
  const deliveredCount = deliveryChallans.filter(c => c.status === 'Delivered').length

  const tabs = [
    { id: 'all', name: 'All Challans', count: deliveryChallans.length },
    { id: 'pending', name: 'Pending', count: pendingCount },
    { id: 'in-transit', name: 'In Transit', count: inTransitCount },
    { id: 'delivered', name: 'Delivered', count: deliveredCount }
  ]

  // Initialize component
  useEffect(() => {
    const initialize = async () => {
      setIsInitializing(true);
      setErrorMessage(''); // Clear any previous errors
      
      try {
        const auth = checkAuth();
        if (auth) {
          setUser(auth.user);
          await fetchDeliveryChallans().catch(err => console.log('Initial fetch failed:', err));
          console.log('Delivery Challans page initialized successfully');
        }
      } catch (error: any) {
        console.log('Initialization error:', error.message);
      } finally {
        setIsInitializing(false);
      }
    };

    initialize();
  }, [checkAuth, fetchDeliveryChallans]);

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto"></div>
          <p className="text-xl font-semibold text-gray-900">Loading Delivery Challans...</p>
          <p className="text-gray-600">Setting up your delivery challan management...</p>
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
              <p className="text-sm font-medium text-green-900">Delivery Challans Ready (Real Auth + Local Storage)</p>
              <p className="text-xs text-green-700">
                Backend: {API_BASE_URL} | Business: {user?.businessId || 'Detecting...'} | Challans: {deliveryChallans.length} saved | Mode: Hybrid
              </p>
            </div>
          </div>
          <button 
            onClick={() => fetchDeliveryChallans()}
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
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white text-2xl">🚚</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Delivery Challans</h1>
              <p className="text-gray-500 mt-2">Manage delivery notes and shipping documents</p>
              {user && (
                <p className="text-sm text-blue-600 mt-1">Business: {user.businessId}</p>
              )}
            </div>
          </div>
          <button 
            onClick={handleCreateDeliveryChallan}
            disabled={isLoading}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-md hover:shadow-lg flex items-center space-x-2 disabled:opacity-50"
          >
            <span>+</span>
            <span>Create Delivery Challan</span>
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
              <div className="text-2xl font-bold text-blue-600">{deliveryChallans.length}</div>
              <div className="text-sm text-gray-500">Total Challans</div>
              <div className="text-xs text-blue-600 font-medium">All time</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-green-600 text-xl">💰</span>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">₹{totalAmount.toLocaleString()}</div>
              <div className="text-sm text-gray-500">Total Value</div>
              <div className="text-xs text-green-600 font-medium">Goods value</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <span className="text-yellow-600 text-xl">📋</span>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
              <div className="text-sm text-gray-500">Pending</div>
              <div className="text-xs text-yellow-600 font-medium">Awaiting dispatch</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-green-600 text-xl">✅</span>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{deliveredCount}</div>
              <div className="text-sm text-gray-500">Delivered</div>
              <div className="text-xs text-green-600 font-medium">Completed</div>
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
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{tab.name}</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  activeTab === tab.id 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Enhanced Delivery Challans List */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-8">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
              <span className="text-white text-xl">📋</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Delivery Challans List</h2>
              <p className="text-gray-300 mt-1">Manage and track all your delivery challans</p>
            </div>
          </div>
        </div>
        
        {filteredChallans.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-gray-400 text-8xl mb-6">🚚</div>
            <h3 className="text-xl font-semibold text-gray-600 mb-3">No delivery challans found</h3>
            <p className="text-gray-500 mb-6">Create your first delivery challan to get started</p>
            <button 
              onClick={handleCreateDeliveryChallan}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-md hover:shadow-lg"
            >
              Create Delivery Challan
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Challan Details</th>
                  <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle</th>
                  <th className="px-8 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-8 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-8 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredChallans.map((challan) => (
                  <tr key={challan.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-8 py-6 whitespace-nowrap">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <span className="text-green-600 text-lg">🚚</span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{challan.challanNumber}</div>
                          <div className="text-sm text-gray-500">{challan.transportMode}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{challan.customer}</div>
                      <div className="text-sm text-gray-500">{challan.customerPhone}</div>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(challan.date).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </div>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{challan.vehicleNumber || 'N/A'}</div>
                      <div className="text-sm text-gray-500">{challan.driverName || 'N/A'}</div>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap text-right">
                      <div className="text-lg font-bold text-green-600">₹{challan.total.toLocaleString()}</div>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap text-center">
                      <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(challan.status)}`}>
                        {challan.status}
                      </span>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap text-center">
                      <div className="flex justify-center space-x-2">
                        <button
                          onClick={() => openPreview(challan)}
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
      {showPreview && selectedChallan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-8 rounded-t-2xl">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-white">Delivery Challan Preview</h2>
                  <p className="text-gray-300 text-sm mt-1">Professional delivery document</p>
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
              {/* Delivery Challan Preview Content */}
              <div className="border-2 border-gray-200 rounded-xl p-8 bg-white">
                <div className="text-center mb-8">
                  <div className="bg-green-600 text-white px-6 py-3 rounded-lg text-lg font-bold inline-block mb-4">
                    DELIVERY CHALLAN
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900">{selectedChallan.challanNumber}</h2>
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
                      <p className="font-semibold text-gray-900">{selectedChallan.customer}</p>
                      <p>{selectedChallan.customerAddress}</p>
                      <p>{selectedChallan.customerPhone}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6 mb-8 p-6 bg-yellow-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">Date:</p>
                    <p className="font-semibold text-gray-900">{new Date(selectedChallan.date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Vehicle Number:</p>
                    <p className="font-semibold text-gray-900">{selectedChallan.vehicleNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Transport Mode:</p>
                    <p className="font-semibold text-gray-900">{selectedChallan.transportMode || 'N/A'}</p>
                  </div>
                </div>

                <div className="overflow-hidden rounded-lg border border-gray-200 mb-8">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Description</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedChallan.items.map((item, index) => (
                        <tr key={item.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{item.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">{item.quantity}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">{item.unit}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">₹{item.price.toFixed(2)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">₹{item.amount.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end mb-8">
                  <div className="w-80 bg-green-50 p-6 rounded-lg border border-green-200">
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="font-medium">₹{selectedChallan.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Tax Amount:</span>
                        <span className="font-medium">₹{selectedChallan.taxAmount.toFixed(2)}</span>
                      </div>
                      <div className="border-t border-green-200 pt-3">
                        <div className="flex justify-between text-xl font-bold text-green-600">
                          <span>Total Value:</span>
                          <span>₹{selectedChallan.total.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {selectedChallan.description && (
                  <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-600 mb-2"><strong>Description:</strong></p>
                    <p className="text-gray-800">{selectedChallan.description}</p>
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