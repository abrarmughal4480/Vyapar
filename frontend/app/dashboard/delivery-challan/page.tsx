'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getToken } from '../../lib/auth'
import { getDeliveryChallans, updateDeliveryChallanStatus, deleteDeliveryChallan } from '../../../http/deliveryChallan'
import TableActionMenu from '../../components/TableActionMenu'
import ConfirmDialog from '../../components/ConfirmDialog'
import { getCurrentUserInfo, canAddData, canEditData, canDeleteData, canEditSalesData, canDeleteSalesData } from '../../../lib/roleAccessControl'

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
  date?: string
  challanDate?: string
  dueDate?: string
  customer: string
  customerName?: string
  customerPhone: string
  customerAddress: string
  vehicleNumber: string
  driverName: string
  transportMode: string
  items: DeliveryChallanItem[]
  subtotal: number
  taxAmount: number
  total: number
  balance?: number
  description: string
  status: 'Open' | 'Close' | 'Draft' | 'Created' | 'Completed' | 'Cancelled'
  invoiceNumber?: string
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

  const [errorMessage, setErrorMessage] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showDateDropdown, setShowDateDropdown] = useState(false)
  const [filterType, setFilterType] = useState('All')
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const [challanToDelete, setChallanToDelete] = useState<DeliveryChallan | null>(null)
  
  // Role-based access control
  const [userInfo, setUserInfo] = useState<any>(null)
  const [isClient, setIsClient] = useState(false)

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

  // Fetch delivery challans with better error handling
  const fetchDeliveryChallans = useCallback(async () => {
    try {
      const token = getToken();
      if (!token) {
        setErrorMessage('User not authenticated');
        setDeliveryChallans([]);
        return;
      }
      const result = await getDeliveryChallans(token);
      
      if (result.success && Array.isArray(result.data)) {
        const mapped = result.data.map((challan: any) => ({
          ...challan,
          id: challan._id || challan.id,
        }));
        setDeliveryChallans(mapped);
        console.log(`Loaded ${mapped.length} delivery challans successfully`);
        console.log('Delivery challans data:', mapped);
        // Log each challan's status and invoice number
        mapped.forEach((challan: any, index: number) => {
          console.log(`Challan ${index + 1}:`, {
            id: challan.id,
            challanNumber: challan.challanNumber,
            status: challan.status,
            invoiceNumber: challan.invoiceNumber,
            effectiveStatus: getEffectiveStatus(challan)
          });
        });
      } else {
        console.log('No delivery challans data received');
        setDeliveryChallans([]);
      }
    } catch (error: any) {
      console.log('Delivery challans fetch error:', error.message);
      setErrorMessage('Failed to load delivery challans');
      setDeliveryChallans([]);
    }
  }, []);

  // Navigate to create delivery challan page
  const handleCreateDeliveryChallan = () => {
    router.push('/dashboard/delivery-challan/create')
  }

  // Handle filter type change
  const handleFilterTypeChange = (newFilterType: string) => {
    setFilterType(newFilterType);
  }

  // Handle convert to sale
  // Test function to verify delivery challan status update
  const testDeliveryChallanStatusUpdate = async () => {
    if (deliveryChallans.length === 0) {
      setErrorMessage('No delivery challans available for testing');
      return;
    }

    const testChallan = deliveryChallans[0];
    const challanId = testChallan.id;
    
    console.log('=== TESTING DELIVERY CHALLAN STATUS UPDATE ===');
    console.log('Test challan:', testChallan);
    console.log('Test challan ID:', challanId);
    console.log('Test challan id:', testChallan.id);
    console.log('Test challan id:', testChallan.id);
    
    try {
      const token = getToken();
      if (!token) {
        setErrorMessage('No authentication token found');
        return;
      }

      console.log('Testing with token:', token ? 'Present' : 'Missing');
      console.log('Testing with challanId:', challanId);
      console.log('Testing with status: Completed');
      console.log('Testing with invoiceNumber: TEST-INV-001');

      const result = await updateDeliveryChallanStatus(challanId, 'Completed', token, 'TEST-INV-001');
      console.log('Test result:', result);
      
      if (result.success) {
        setErrorMessage('Test successful! Status updated to Completed');
        // Refresh data after 2 seconds
        setTimeout(() => fetchDeliveryChallans(), 2000);
      } else {
        setErrorMessage('Test failed: ' + (result.message || 'Unknown error'));
      }
    } catch (error: any) {
      console.error('Test error:', error);
      console.error('Test error response:', error.response?.data);
      setErrorMessage('Test failed: ' + (error.message || 'Unknown error'));
    }
  };

  const handleConvertToSale = (challanId: string) => {
    const challan = deliveryChallans.find(c => c.id === challanId);
    if (!challan) {
      setErrorMessage('Challan not found');
      return;
    }

    console.log('=== CONVERTING DELIVERY CHALLAN TO SALE ===');
    console.log('Challan ID:', challanId);
    console.log('Challan:', challan);
    console.log('Challan id:', challan.id);
    console.log('Challan id:', challan.id);

    // Prepare sale data from challan
    const saleData = {
      partyName: challan.customerName || challan.customer || '',
      phoneNo: challan.customerPhone || '',
      items: challan.items?.map((item: any, index: number) => ({
        id: index + 1,
        item: item.name || item.item || '',
        qty: item.quantity?.toString() || item.qty?.toString() || '',
        unit: item.unit || 'NONE',
        customUnit: '',
        price: item.price?.toString() || item.salePrice?.toString() || '',
        amount: item.amount || (parseFloat(item.quantity || 0) * parseFloat(item.price || 0))
      })) || [
        { id: 1, item: '', qty: '', unit: 'NONE', customUnit: '', price: '', amount: 0 },
        { id: 2, item: '', qty: '', unit: 'NONE', customUnit: '', price: '', amount: 0 }
      ],
      discount: '0',
      discountType: '%',
      tax: '0',
      taxType: '%',
      paymentType: 'Credit',
      description: challan.description || '',
      sourceChallanId: challan.id,
      sourceChallanNumber: challan.challanNumber
    };

    console.log('Converting challan to sale:', challan);
    console.log('Challan customer field:', challan.customer);
    console.log('Challan customerName field:', challan.customerName);
    console.log('Prepared sale data:', saleData);

    // Navigate to sale add page with data
    const queryParams = new URLSearchParams();
    queryParams.set('convertFromChallan', 'true');
    queryParams.set('challanData', JSON.stringify(saleData));
    
    router.push(`/dashboard/sale/add?${queryParams.toString()}`);
  }

  const openPreview = (challan: DeliveryChallan) => {
    setSelectedChallan(challan)
    setShowPreview(true)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'Close': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-blue-100 text-blue-800 border-blue-200'
    }
  }

  const getEffectiveStatus = (challan: DeliveryChallan) => {
    // Map backend status to frontend status
    if (challan.status === 'Completed' || challan.status === 'Cancelled' || challan.status === 'Close') {
      return 'Close';
    }
    
    // Check if due date has passed
    const challanDate = challan.challanDate || challan.date;
    const dueDate = challan.dueDate ? new Date(challan.dueDate) : (challanDate ? new Date(challanDate) : new Date());
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day for comparison
    
    if (dueDate < today) {
      return 'Close';
    }
    
    return 'Open';
  }

  const filteredChallans = deliveryChallans.filter(challan => {
    // Status filter - use effective status
    const effectiveStatus = getEffectiveStatus(challan);
    const matchesStatus = activeTab === 'all' || effectiveStatus.toLowerCase() === activeTab;
    
    // Search filter - by customer name, challan number, or vehicle number
    const matchesSearch = !searchTerm || 
      (challan.customerName || challan.customer)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      challan.challanNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      challan.vehicleNumber?.toLowerCase().includes(searchTerm.toLowerCase());

    // Date filter
    let matchesDate = true;
    if (dateFrom || dateTo) {
      const challanDateValue = challan.challanDate || challan.date;
      if (challanDateValue) {
        const challanDate = new Date(challanDateValue);
        if (dateFrom) {
          const fromDate = new Date(dateFrom);
          matchesDate = matchesDate && challanDate >= fromDate;
        }
        if (dateTo) {
          const toDate = new Date(dateTo);
          toDate.setHours(23, 59, 59); // Include the entire day
          matchesDate = matchesDate && challanDate <= toDate;
        }
      }
    }

    return matchesStatus && matchesSearch && matchesDate;
  })

  const totalAmount = deliveryChallans.reduce((sum, challan) => sum + challan.total, 0)
  const openCount = deliveryChallans.filter(c => getEffectiveStatus(c) === 'Open').length
  const closeCount = deliveryChallans.filter(c => getEffectiveStatus(c) === 'Close').length

  const tabs = [
    { id: 'all', name: 'All Challans', count: deliveryChallans.length },
    { id: 'open', name: 'Open', count: openCount },
    { id: 'close', name: 'Close', count: closeCount }
  ]

  // Initialize component
  useEffect(() => {
    // Set client-side flag for hydration safety
    setIsClient(true);
    
    // Get current user info for role-based access
    const currentUserInfo = getCurrentUserInfo();
    setUserInfo(currentUserInfo);
    
    const initialize = async () => {
      setErrorMessage(''); // Clear any previous errors
      
      try {
        await fetchDeliveryChallans().catch(err => console.log('Initial fetch failed:', err));
        console.log('Delivery Challans page initialized successfully');
      } catch (error: any) {
        console.log('Initialization error:', error.message);
      }
    };

    initialize();
  }, [fetchDeliveryChallans]);

  // Refresh data when page becomes visible (after returning from sale page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('Page became visible, refreshing data...');
        fetchDeliveryChallans();
      }
    };

    const handleFocus = () => {
      console.log('Window focused, refreshing data...');
      fetchDeliveryChallans();
    };

    // Check for conversion success in URL parameters
    const checkConversionSuccess = () => {
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const conversionSuccess = urlParams.get('conversionSuccess');
        const challanId = urlParams.get('challanId');
        
        if (conversionSuccess === 'true' && challanId) {
          console.log('Conversion success detected for challan:', challanId);
          // Remove the URL parameters
          const newUrl = window.location.pathname;
          window.history.replaceState({}, '', newUrl);
          // Refresh data
          fetchDeliveryChallans();
        }
      }
    };

    checkConversionSuccess();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchDeliveryChallans]);

  // Delete handler
  const handleDeleteChallan = (challan: DeliveryChallan) => {
    setChallanToDelete(challan);
    setShowDeleteDialog(true);
  };

  const confirmDeleteChallan = async () => {
    if (!challanToDelete) return;
    try {
      const token = getToken();
      if (!token) {
        setErrorMessage('User not authenticated');
        return;
      }
      await deleteDeliveryChallan(challanToDelete.id, token);
      setDeliveryChallans((prev) => prev.filter((c) => c.id !== challanToDelete.id));
      setShowDeleteDialog(false);
      setChallanToDelete(null);
      fetchDeliveryChallans();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete delivery challan');
    }
  };



  return (
    <div className="p-6 bg-gray-50 min-h-screen">


      {/* Header component matching sales page */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-4 md:p-6 mb-6 sticky top-0 z-30 border border-gray-100">
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div className="text-center md:text-left">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Delivery Challans</h1>
            <p className="text-sm text-gray-500 mt-1">Manage delivery notes and shipping documents</p>
          </div>
          <div className="flex flex-col md:flex-row gap-2 md:gap-4">
            {isClient && canAddData() ? (
              <button
                onClick={handleCreateDeliveryChallan}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow"
              >
                + New Delivery Challan
              </button>
            ) : (
              <div className="bg-gray-100 text-gray-500 px-6 py-2 rounded-lg font-medium flex items-center gap-2">
                + New Delivery Challan (Restricted)
              </div>
            )}
            <button 
              onClick={() => fetchDeliveryChallans()}
              className="p-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
              title="Refresh"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button 
              onClick={() => testDeliveryChallanStatusUpdate()}
              className="p-3 border border-red-300 rounded-xl hover:bg-red-50 transition-colors"
              title="Test Status Update"
            >
              🧪
            </button>
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

      {/* Stats Grid (full width, responsive) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6">
        <div className="bg-gradient-to-br from-blue-100 to-blue-50 p-6 rounded-2xl shadow group hover:shadow-lg transition-all flex flex-col items-start">
          <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-blue-500 text-white mb-3 text-xl">🚚</div>
          <div className="text-2xl font-bold text-blue-700">
            {deliveryChallans.length}
          </div>
          <div className="text-sm text-gray-500">Total Challans</div>
        </div>
        <div className="bg-gradient-to-br from-blue-100 to-blue-50 p-6 rounded-2xl shadow group hover:shadow-lg transition-all flex flex-col items-start">
          <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-blue-500 text-white mb-3 text-xl">✅</div>
          <div className="text-2xl font-bold text-blue-700">
            {closeCount}
          </div>
          <div className="text-sm text-gray-500">Closed</div>
        </div>
        <div className="bg-gradient-to-br from-orange-100 to-orange-50 p-6 rounded-2xl shadow group hover:shadow-lg transition-all flex flex-col items-start">
          <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-orange-500 text-white mb-3 text-xl">💰</div>
          <div className="text-2xl font-bold text-orange-700">
            PKR {totalAmount.toLocaleString()}
          </div>
          <div className="text-sm text-gray-500">Total Value</div>
        </div>
      </div>

      {/* Search & Filters Section */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow p-4 md:p-6 mb-6 border border-gray-100 z-[1]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          {/* Modern Search Bar */}
          <div className="relative w-full md:w-80">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-lg">🔍</span>
            <input
              type="text"
              placeholder="Search challans..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white/80 shadow focus:ring-2 focus:ring-green-500 focus:border-green-500 border border-gray-200 transition-all placeholder-gray-400 text-gray-900"
            />
          </div>
          {/* Filter Tabs/Pills */}
          <div className="flex gap-2 md:gap-4">
            {['All', 'Open', 'Close'].map((tab) => (
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
            <div className="relative w-full sm:w-56">
              <button
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
                        // Auto-fill date pickers for quick ranges
                        const today = new Date();
                        let from = '', to = '';
                        if (range.value === 'Today') {
                          from = to = today.toISOString().slice(0, 10);
                        } else if (range.value === 'Yesterday') {
                          const yest = new Date(today);
                          yest.setDate(today.getDate() - 1);
                          from = to = yest.toISOString().slice(0, 10);
                        } else if (range.value === 'This Week') {
                          const first = new Date(today);
                          first.setDate(today.getDate() - today.getDay());
                          from = first.toISOString().slice(0, 10);
                          to = today.toISOString().slice(0, 10);
                        } else if (range.value === 'This Month') {
                          const first = new Date(today.getFullYear(), today.getMonth(), 1);
                          from = first.toISOString().slice(0, 10);
                          to = today.toISOString().slice(0, 10);
                        } else if (range.value === 'Last Month') {
                          const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                          const last = new Date(today.getFullYear(), today.getMonth(), 0);
                          from = first.toISOString().slice(0, 10);
                          to = last.toISOString().slice(0, 10);
                        } else if (range.value === 'This Year') {
                          const first = new Date(today.getFullYear(), 0, 1);
                          from = first.toISOString().slice(0, 10);
                          to = today.toISOString().slice(0, 10);
                        } else if (range.value === 'All') {
                          from = '';
                          to = '';
                        }
                        if (range.value !== 'Custom') {
                          setDateFrom(from);
                          setDateTo(to);
                        }
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

      {/* Delivery Challans Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 border-b border-gray-200 gap-4">
          <h2 className="text-lg font-semibold text-gray-900">Transactions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Challan #</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Customer</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Challan Date</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Due Date</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Amount</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Status</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Actions</th>
                <th className="px-4 py-4 text-center text-sm font-semibold text-gray-700"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredChallans.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500 text-lg font-medium">
                    No delivery challans found. Create your first challan!
                  </td>
                </tr>
              ) : (
                filteredChallans.map((challan, idx) => (
                  <tr key={challan.id} className={`hover:bg-blue-50/40 transition-all ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="px-6 py-4 text-sm text-blue-700 font-bold whitespace-nowrap text-center">
                      {challan.challanNumber}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap text-left">
                      <div className="text-sm text-gray-900">{challan.customerName || challan.customer}</div>
                      <div className="text-xs text-gray-500">{challan.customerPhone}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap text-center">
                      {(challan.challanDate || challan.date) ? new Date(challan.challanDate || challan.date || '').toLocaleDateString('en-IN') : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap text-center">
                      {challan.dueDate ? new Date(challan.dueDate).toLocaleDateString('en-IN') : ((challan.challanDate || challan.date) ? new Date(challan.challanDate || challan.date || '').toLocaleDateString('en-IN') : 'N/A')}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-blue-700 whitespace-nowrap text-center">
                      PKR {challan.total?.toLocaleString() || '0'}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-center">
                      <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(getEffectiveStatus(challan))}`}>
                        {getEffectiveStatus(challan)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium whitespace-nowrap text-center">
                      <div className="flex justify-center gap-2 relative">
                        {isClient && canAddData() && getEffectiveStatus(challan) === 'Open' ? (
                          <button 
                            onClick={() => handleConvertToSale(challan.id)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            Convert to Sale
                          </button>
                        ) : challan.invoiceNumber ? (
                          <span className="text-green-600 text-sm font-medium">
                            Converted to {challan.invoiceNumber}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      {isClient && (canEditSalesData() || canDeleteSalesData()) ? (
                        <TableActionMenu
                          onEdit={canEditSalesData() ? () => router.push(`/dashboard/delivery-challan/create?id=${challan.id}`) : undefined}
                          onDelete={canDeleteSalesData() ? () => handleDeleteChallan(challan) : undefined}
                          onView={() => openPreview(challan)}
                        />
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
                      <p className="font-semibold text-gray-900">{selectedChallan.customerName || selectedChallan.customer}</p>
                      <p>{selectedChallan.customerAddress}</p>
                      <p>{selectedChallan.customerPhone}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6 mb-8 p-6 bg-yellow-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">Date:</p>
                    <p className="font-semibold text-gray-900">{(selectedChallan.challanDate || selectedChallan.date) ? new Date(selectedChallan.challanDate || selectedChallan.date || '').toLocaleDateString() : 'N/A'}</p>
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
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">PKR {item.price.toFixed(2)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">PKR {item.amount.toFixed(2)}</td>
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
                        <span className="font-medium">PKR {selectedChallan.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Tax Amount:</span>
                        <span className="font-medium">PKR {selectedChallan.taxAmount.toFixed(2)}</span>
                      </div>
                      <div className="border-t border-green-200 pt-3">
                        <div className="flex justify-between text-xl font-bold text-green-600">
                          <span>Total Value:</span>
                          <span>PKR {selectedChallan.total.toFixed(2)}</span>
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

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        title="Delete Delivery Challan?"
        description={challanToDelete ? `Are you sure you want to delete delivery challan ${challanToDelete.challanNumber}? This action cannot be undone.` : ''}
        onCancel={() => setShowDeleteDialog(false)}
        onConfirm={confirmDeleteChallan}

        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  )
}