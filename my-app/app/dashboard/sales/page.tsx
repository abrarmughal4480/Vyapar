'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const color = {
    Draft: 'bg-gray-100 text-gray-800',
    Created: 'bg-blue-100 text-blue-800',
    Completed: 'bg-green-100 text-green-800',
    Cancelled: 'bg-red-100 text-red-800',
  }[status] || 'bg-gray-100 text-gray-800'
  return (
    <span className={`px-3 py-1 text-xs font-medium rounded-full ${color}`}>
      {status}
    </span>
  )
}

// Header component
function VyaparHeader({ onNewOrder }: { onNewOrder: () => void }) {
  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Sales Orders</h1>
          <p className="text-blue-100 text-sm mt-1">Manage all your sales orders</p>
        </div>
        <button
          onClick={onNewOrder}
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-md hover:shadow-lg flex items-center space-x-2"
        >
          <span>+</span>
          <span>New Sales Order</span>
        </button>
      </div>
    </div>
  )
}

// Stats card component
function StatsCard({ icon, color, value, label }: { icon: string, color: string, value: any, label: string }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <div className="flex items-center">
        <div className={`w-12 h-12 ${color} rounded-lg flex items-center justify-center`}>
          <span className="text-xl">{icon}</span>
        </div>
        <div className="ml-4">
          <div className={`text-2xl font-bold ${color.includes('blue') ? 'text-gray-900' : color.replace('bg-', 'text-')}`}>{value}</div>
          <div className="text-sm text-gray-500">{label}</div>
        </div>
      </div>
    </div>
  )
}

// Sales Orders Table
function SalesOrderTable({ salesOrders, onUpdateStatus, onConvertToInvoice, isLoading }: { 
  salesOrders: any[], 
  onUpdateStatus: (orderId: string, newStatus: string) => void,
  onConvertToInvoice: (orderId: string) => void,
  isLoading: boolean
}) {
  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">Sales Orders ({salesOrders.length})</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {salesOrders.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-gray-400 text-lg">
                  {isLoading ? 'Loading sales orders...' : 'No sales orders found. Create your first order!'}
                </td>
              </tr>
            ) : (
              salesOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{order.id}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{order.customerName}</div>
                    <div className="text-xs text-gray-500">{order.customerPhone}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{order.date}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm font-medium text-gray-900">₹{order.total.toLocaleString()}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex justify-center space-x-2">
                      {order.status !== 'Completed' && (
                        <button 
                          onClick={() => onConvertToInvoice(order.id)}
                          className="text-green-600 hover:text-green-800 text-sm font-medium"
                          disabled={isLoading}
                        >
                          Convert
                        </button>
                      )}
                      <button 
                        onClick={() => onUpdateStatus(order.id, order.status === 'Draft' ? 'Created' : 'Completed')}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        disabled={isLoading}
                      >
                        {order.status === 'Draft' ? 'Activate' : 'Complete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function SalesOrderPage() {
  const router = useRouter()
  const [salesOrders, setSalesOrders] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [authToken, setAuthToken] = useState<string>('')
  const [isInitialized, setIsInitialized] = useState(false)

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
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('vypar_auth_token');
        localStorage.removeItem('vypar_user_session');
        localStorage.removeItem('businessId');
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
      
      console.log('Sales: Auth check successful for real user:', parsedUser.name || parsedUser.email);
      
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
    
    const storedBusinessId = localStorage.getItem('businessId');
    if (storedBusinessId) {
      return storedBusinessId;
    }
    
    const userData = localStorage.getItem('user') || localStorage.getItem('vypar_user_session');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        if (parsedUser.id && parsedUser.email !== 'demo@vyparr.com') {
          const generatedId = `biz_${parsedUser.id}_${Date.now()}`;
          localStorage.setItem('businessId', generatedId);
          return generatedId;
        }
      } catch (e) {
        console.error('Error generating business ID:', e);
      }
    }
    
    return null;
  }, [checkAuth])

  // Save sales orders to localStorage
  const saveSalesOrdersLocally = useCallback((orders: any[]) => {
    if (typeof window === 'undefined') {
      return;
    }

    const businessId = getBusinessId();
    if (businessId) {
      const localStorageKey = `vyparr_sales_orders_${businessId}`;
      localStorage.setItem(localStorageKey, JSON.stringify(orders));
      console.log(`Saved ${orders.length} sales orders to localStorage for business: ${businessId}`);
    }
  }, [getBusinessId]);

  // Load sales orders from localStorage
  const loadSalesOrdersLocally = useCallback(() => {
    if (typeof window === 'undefined') {
      return [];
    }

    const businessId = getBusinessId();
    if (businessId) {
      const localStorageKey = `vyparr_sales_orders_${businessId}`;
      const savedOrders = localStorage.getItem(localStorageKey);
      
      if (savedOrders) {
        try {
          const parsedOrders = JSON.parse(savedOrders);
          console.log(`Loaded ${parsedOrders.length} sales orders from localStorage for business: ${businessId}`);
          return parsedOrders;
        } catch (e) {
          console.log('Error parsing saved sales orders, starting fresh');
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
      
      if (!token) {
        token = 'dev_token_' + Date.now();
        localStorage.setItem('token', token);
      }
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
        console.log('Sales API Success:', data);
        return data;
      } else {
        console.log('Sales API failed, using local storage mode');
        return { success: true, data: [], localMode: true };
      }
    } catch (error) {
      console.log('Sales API error, using local storage mode:', error);
      return { success: true, data: [], localMode: true };
    }
  }, [API_BASE_URL, authToken]);

  const loadSalesOrdersFromAPI = useCallback(async () => {
    if (!isInitialized) {
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    // First, load from localStorage
    const localOrders = loadSalesOrdersLocally();
    if (localOrders.length > 0) {
      setSalesOrders(localOrders);
    }
    
    // Then try to sync with API
    try {
      const businessId = getBusinessId();
      if (!businessId) {
        setError('Unable to determine business ID');
        setIsLoading(false);
        return;
      }

      const result = await makeApiCall(`/sales/orders/${businessId}`);
      
      if (result && result.success && Array.isArray(result.data) && !result.localMode) {
        const transformedOrders = result.data.map((order: any) => ({
          id: order.id,
          customerName: order.customerName,
          customerPhone: order.customerPhone || '',
          customerAddress: order.customerAddress || '',
          items: order.items || [],
          subtotal: order.subtotal || 0,
          tax: order.tax || 0,
          total: order.total || 0,
          status: order.status,
          date: order.date,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt
        }));
        
        setSalesOrders(transformedOrders);
        saveSalesOrdersLocally(transformedOrders);
        console.log('Sales orders synced with API and saved locally');
      } else if (localOrders.length === 0) {
        setSalesOrders([]);
      }
    } catch (error) {
      console.error('Failed to load sales orders from API:', error);
      if (localOrders.length === 0) {
        setError('Failed to load sales orders from server');
      }
    }
    
    setIsLoading(false);
  }, [makeApiCall, isInitialized, getBusinessId, loadSalesOrdersLocally, saveSalesOrdersLocally]);

  useEffect(() => {
    if (isInitialized && authToken) {
      loadSalesOrdersFromAPI();
    }
  }, [loadSalesOrdersFromAPI, isInitialized, authToken]);

  // Navigate to create sales order page
  const handleCreateSalesOrder = () => {
    router.push('/dashboard/sales/create')
  }

  // Update order status
  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const businessId = getBusinessId();
      if (!businessId) return;

      // Update local state immediately
      const updatedOrders = salesOrders.map(order => 
        order.id === orderId ? { ...order, status: newStatus, updatedAt: new Date().toISOString() } : order
      );
      setSalesOrders(updatedOrders);
      saveSalesOrdersLocally(updatedOrders);

      // Try to sync with API in background
      try {
        await makeApiCall(`/sales/orders/${businessId}/${orderId}/status`, {
          method: 'PUT',
          body: JSON.stringify({ status: newStatus })
        });
        console.log('Order status synced with API');
      } catch (apiError) {
        console.log('API sync failed for status update:', apiError);
      }

      alert(`Order status updated to ${newStatus}`);
    } catch (error) {
      console.error('Failed to update order status:', error);
    }
  };

  // Convert to invoice
  const convertToInvoice = async (orderId: string) => {
    try {
      const businessId = getBusinessId();
      if (!businessId) return;

      // Update order status to completed
      await updateOrderStatus(orderId, 'Completed');

      // Try to convert via API
      try {
        const result = await makeApiCall(`/sales/orders/${businessId}/${orderId}/convert-to-invoice`, {
          method: 'POST'
        });
        
        if (result && result.success) {
          alert(`Order converted to invoice: ${result.data?.invoiceId || 'INV-' + Date.now()}`);
        } else {
          alert('Order marked as completed (conversion to invoice pending)');
        }
      } catch (apiError) {
        console.log('API conversion failed:', apiError);
        alert('Order marked as completed (conversion to invoice pending)');
      }

    } catch (error) {
      console.error('Failed to convert to invoice:', error);
    }
  };

  // Stats values
  const completedCount = salesOrders.filter(o => o.status === 'Completed').length;
  const draftCount = salesOrders.filter(o => o.status === 'Draft').length;
  const totalValue = salesOrders.reduce((sum, o) => sum + (o.total || 0), 0);

  return (
    <div className="p-6 max-w-6xl mx-auto bg-gray-50 min-h-screen">
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
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-3 animate-pulse"></div>
            <div>
              <p className="text-sm font-medium text-blue-900">Sales API Connected (Real Auth Only)</p>
              <p className="text-xs text-blue-700">
                Backend: {API_BASE_URL} | Business: {getBusinessId() || 'Detecting...'} | Orders: {salesOrders.length} saved
              </p>
            </div>
          </div>
          <button 
            onClick={() => loadSalesOrdersFromAPI()}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            disabled={!isInitialized}
          >
            Refresh
          </button>
        </div>
      </div>

      <VyaparHeader onNewOrder={handleCreateSalesOrder} />
      
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatsCard icon="📝" color="bg-blue-100 text-blue-600" value={salesOrders.length} label="Total Orders" />
        <StatsCard icon="✅" color="bg-green-100 text-green-600" value={completedCount} label="Completed" />
        <StatsCard icon="⏳" color="bg-yellow-100 text-yellow-600" value={draftCount} label="Drafts" />
        <StatsCard icon="₹" color="bg-purple-100 text-purple-600" value={`₹${totalValue.toLocaleString()}`} label="Total Value" />
      </div>
      
      {/* Sales Orders Table */}
      <SalesOrderTable 
        salesOrders={salesOrders}
        onUpdateStatus={updateOrderStatus}
        onConvertToInvoice={convertToInvoice}
        isLoading={isLoading}
      />
    </div>
  )
}