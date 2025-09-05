'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getToken } from '../../lib/auth'
import { getSaleOrders, updateSaleOrderStatus, convertSaleOrderToInvoice, deleteSaleOrder } from '../../../http/saleOrders'
import TableActionMenu from '@/components/TableActionMenu'
import ConfirmDialog from '@/components/ConfirmDialog'
import { deleteSale } from '@/http/sales'
import { getCurrentUserInfo, canEditData, canDeleteData, canAddData, canEditSalesData, canDeleteSalesData, canShareSalesData } from '../../../lib/roleAccessControl'

// Status badge component
function StatusBadge({ status, dueDate }: { status: string, dueDate?: string }) {
  let displayStatus = status;
  let color = 'bg-gray-100 text-gray-800';
  if (status !== 'Completed' && status !== 'Cancelled') {
    if (dueDate) {
      const today = new Date().toISOString().split('T')[0];
      if (dueDate < today) {
        displayStatus = 'Order Overdue';
        color = 'bg-red-100 text-red-800';
      } else {
        displayStatus = 'Order Open';
        color = 'bg-blue-100 text-blue-800';
      }
    } else {
      displayStatus = 'Order Open';
      color = 'bg-blue-100 text-blue-800';
    }
  } else if (status === 'Completed') {
    displayStatus = 'Completed';
    color = 'bg-green-100 text-green-800';
  } else if (status === 'Cancelled') {
    displayStatus = 'Cancelled';
    color = 'bg-red-100 text-red-800';
  }
  return (
    <span className={`px-3 py-1 text-xs font-medium rounded-full ${color}`}>
      {displayStatus}
    </span>
  )
}

// Header component
function DeveaseDigitalHeader({ onNewOrder, isClient, canAddData }: { onNewOrder: () => void; isClient: boolean; canAddData: () => boolean }) {
  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-4 md:p-6 mb-6 sticky top-0 z-30 border border-gray-100">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div className="text-center md:text-left">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Sales Orders</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your sales orders and pending invoices</p>
        </div>
        <div className="flex flex-col md:flex-row gap-2 md:gap-4">
          {!isClient ? (
            // Show loading state during SSR to prevent hydration mismatch
            <div className="bg-gray-100 text-gray-500 px-6 py-2 rounded-lg font-medium flex items-center gap-2">
              + New Sales Order
            </div>
          ) : canAddData() ? (
          <button
            onClick={onNewOrder}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow"
          >
            + New Sales Order
          </button>
          ) : (
            <div className="bg-gray-100 text-gray-500 px-6 py-2 rounded-lg font-medium flex items-center gap-2">
              + New Sales Order (Restricted)
            </div>
          )}
        </div>
      </div>
    </div>
  )
}



// Helper function to format dates consistently
function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('en-IN');
  } catch {
    return '-';
  }
}

// Sales Orders Table
function SalesOrderTable({ salesOrders, onUpdateStatus, onConvertToInvoice, isLoading, handleEditSale, handleViewSale, loadSalesOrdersFromAPI, isClient, canEditData, canDeleteData }: { 
  salesOrders: any[], 
  onUpdateStatus: (orderId: string, newStatus: string) => void,
  onConvertToInvoice: (orderId: string) => void,
  isLoading: boolean,
  handleEditSale: (order: any) => void,
  handleViewSale: (order: any) => void,
  loadSalesOrdersFromAPI: () => Promise<void>,
  isClient: boolean,
  canEditData: () => boolean,
  canDeleteData: () => boolean,
}) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<any>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 mb-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 border-b border-gray-200 gap-4">
        <h2 className="text-lg font-semibold text-gray-900">Transactions</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Order #</th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Customer</th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Order Date</th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Due Date</th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Amount</th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Balance</th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Type</th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Status</th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {salesOrders.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-8 text-center text-gray-500 text-lg font-medium">
                  {isLoading ? 'Loading sales orders...' : 'No sales orders found. Create your first order!'}
                </td>
              </tr>
            ) : (
              salesOrders.map((order, idx) => (
                <tr key={order._id || order.id || `order-${idx}`} className={`hover:bg-blue-50/40 transition-all ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <td className="px-6 py-4 text-sm text-blue-700 font-bold whitespace-nowrap text-center">
                    {order.orderNumber || `SO-${String(idx + 1).padStart(4, '0')}`}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap text-left">
                    <div className="text-sm text-gray-900">{order.customerName}</div>
                    <div className="text-xs text-gray-500">{order.customerPhone}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap text-center">
                    {formatDate(order.orderDate)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap text-center">
                    {formatDate(order.dueDate)}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-blue-700 whitespace-nowrap text-center">
                    PKR {order.total?.toLocaleString() || '0'}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-orange-600 whitespace-nowrap text-center">
                    PKR {(order.balance ?? order.total)?.toLocaleString() || '0'}
                  </td>
                  <td className="px-6 py-4 text-sm whitespace-nowrap text-center">
                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">Sale Order</span>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-center">
                    <StatusBadge status={order.status} dueDate={order.dueDate} />
                  </td>
                  <td className="px-6 py-4 text-sm font-medium whitespace-nowrap text-center">
                    <div className="flex justify-center gap-2 relative">
                      {order.status === 'Completed' && order.invoiceNumber ? (
                        <span className="text-blue-600 text-sm font-medium">
                          Invoice: {order.invoiceNumber}
                        </span>
                      ) : (order.status !== 'Completed' && order.status !== 'Cancelled') ? (
                        isClient && canAddData() ? (
                        <button 
                          onClick={() => onConvertToInvoice(order._id || order.id)}
                          className="text-green-600 hover:text-green-800 text-sm font-medium"
                          disabled={isLoading}
                        >
                          Convert to Sale
                        </button>
                        ) : (
                          <span className="text-gray-400 text-sm">Convert (Restricted)</span>
                        )
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium whitespace-nowrap text-center">
                    {isClient && (canEditSalesData() || canDeleteSalesData() || canAddData()) ? (
                    <TableActionMenu
                        onEdit={canEditSalesData() ? () => handleEditSale(order) : undefined}
                        onDelete={canDeleteSalesData() ? () => { setSaleToDelete(order); setDeleteDialogOpen(true); } : undefined}
                      onView={() => handleViewSale(order)}
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
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Sale Order?"
        description={`Are you sure you want to delete sale order ${saleToDelete?.orderNumber || saleToDelete?.invoiceNo || saleToDelete?.id || saleToDelete?._id}? This action cannot be undone.`}
        onCancel={() => { setDeleteDialogOpen(false); setSaleToDelete(null); }}
        onConfirm={async () => {
          setDeleteLoading(true);
          try {
            console.log('Deleting sale order:', saleToDelete);
            const orderId = saleToDelete?._id || saleToDelete?.id;
            if (!orderId) throw new Error('No sale order ID found');
            const token = getToken();
            if (!token) return;
            await deleteSaleOrder(orderId, token);
            await loadSalesOrdersFromAPI();
            setDeleteDialogOpen(false);
            setSaleToDelete(null);
          } finally {
            setDeleteLoading(false);
          }
        }}
        loading={deleteLoading}
      />
    </div>
  )
}

export default function SalesOrderPage() {
  const router = useRouter()
  const [salesOrders, setSalesOrders] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [saleStatus, setSaleStatus] = useState('All')
  const [showDateDropdown, setShowDateDropdown] = useState(false)
  const [filterType, setFilterType] = useState('All')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [saleToDelete, setSaleToDelete] = useState<any>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
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

  // Get current user info for role-based access
  useEffect(() => {
    const currentUserInfo = getCurrentUserInfo();
    setUserInfo(currentUserInfo);
  }, []);

  // Add loading state to prevent hydration mismatch
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Load sales orders from API
  const loadSalesOrdersFromAPI = useCallback(async () => {
    setError('');
    const token = getToken();
    if (!token) {
      setError('User not authenticated');
      return;
    }
    try {
      const result = await getSaleOrders(token);
      if (result && result.success && Array.isArray(result.data)) {
        setSalesOrders(result.data);
      } else {
        setSalesOrders([]);
        setError('No sales orders found');
      }
    } catch (error: any) {
      setError('Failed to load sales orders');
      setSalesOrders([]);
    }
  }, []);

  useEffect(() => {
    loadSalesOrdersFromAPI();
  }, [loadSalesOrdersFromAPI]);

  // Navigate to create sales order page
  const handleCreateSalesOrder = () => {
    // Check if user can add data
    if (!isClient || !canAddData()) {
      console.log('❌ User cannot create sales orders');
      return;
    }
    router.push('/dashboard/sales/create')
  }

  // Update order status
  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    const token = getToken();
    if (!token) return setError('User not authenticated');
    try {
      await updateSaleOrderStatus(orderId, newStatus, token);
      await loadSalesOrdersFromAPI();
    } catch (error: any) {
      setError('Failed to update order status');
    }
  }

  // Convert to invoice
  const convertToInvoice = async (orderId: string) => {
    const order = salesOrders.find(o => o._id === orderId || o.id === orderId);
    if (!order) {
      setError('Order not found');
      return;
    }

    // Prepare sale data from order
    const saleData = {
      partyName: order.customerName || '',
      phoneNo: order.customerPhone || '',
      items: order.items?.map((item: any, index: number) => ({
        id: index + 1,
        item: item.itemName || item.item || '',
        qty: item.quantity?.toString() || item.qty?.toString() || '',
        unit: item.unit || 'NONE',
        customUnit: '',
        price: item.price?.toString() || item.salePrice?.toString() || '',
        amount: item.amount || (parseFloat(item.quantity || 0) * parseFloat(item.price || 0))
      })) || [
        { id: 1, item: '', qty: '', unit: 'NONE', customUnit: '', price: '', amount: 0 },
        { id: 2, item: '', qty: '', unit: 'NONE', customUnit: '', price: '', amount: 0 }
      ],
      discount: order.discount?.toString() || '',
      discountType: order.discountType || '%',
      tax: order.tax?.toString() || '',
      taxType: order.taxType || '%',
      paymentType: order.paymentType || 'Credit',
      description: order.description || '',
      sourceOrderId: orderId, // Track the original order
      sourceOrderNumber: order.orderNumber
    };

    // Navigate to sale add page with data
    const queryParams = new URLSearchParams({
      convertFromOrder: 'true',
      orderData: JSON.stringify(saleData)
    });
    
    router.push(`/dashboard/sale/add?${queryParams.toString()}`);
  }

  // Handle filter type change
  const handleFilterTypeChange = (newFilterType: string) => {
    setFilterType(newFilterType);
  }

  // Filter sales orders based on search term and status
  const filteredSalesOrders = salesOrders.filter((order) => {
    // Search filter - by customer name or order number
    const matchesSearch = !searchTerm || 
      order.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.orderNumber?.includes(searchTerm) ||
      `SO-${String(order.id || '').padStart(4, '0')}`.includes(searchTerm);

    // Status filter
    const matchesStatus = saleStatus === 'All' || 
      (saleStatus === 'Open' && order.status !== 'Completed' && order.status !== 'Cancelled') ||
      (saleStatus === 'Completed' && order.status === 'Completed') ||
      (saleStatus === 'Cancelled' && order.status === 'Cancelled');

    // Date filter
    let matchesDate = true;
    if (dateFrom || dateTo) {
      const orderDate = new Date(order.orderDate || order.createdAt);
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        matchesDate = matchesDate && orderDate >= fromDate;
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59); // Include the entire day
        matchesDate = matchesDate && orderDate <= toDate;
      }
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  // Stats values based on filtered results
  const completedCount = filteredSalesOrders.filter(o => o.status === 'Completed').length;
  const draftCount = filteredSalesOrders.filter(o => o.status === 'Draft').length;
  const totalValue = filteredSalesOrders.reduce((sum, o) => sum + (o.total || 0), 0);

  function handleEditSale(order: any) {
    // Implement navigation to edit page or open modal
    alert('Edit Sale: ' + (order?.id || order?._id));
  }
  function handleViewSale(order: any) {
    // Implement navigation to view page or open modal
    alert('View Sale: ' + (order?.id || order?._id));
  }

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

      <DeveaseDigitalHeader 
        onNewOrder={handleCreateSalesOrder} 
        isClient={isClient}
        canAddData={canAddData}
      />
      
      {/* Stats Grid (full width, responsive) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6">
        <div className="bg-gradient-to-br from-blue-100 to-blue-50 p-6 rounded-2xl shadow group hover:shadow-lg transition-all flex flex-col items-start">
          <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-blue-500 text-white mb-3 text-xl">📝</div>
          <div className="text-2xl font-bold text-blue-700">
            {filteredSalesOrders.length}
          </div>
          <div className="text-sm text-gray-500">Total Orders</div>
        </div>
        <div className="bg-gradient-to-br from-green-100 to-green-50 p-6 rounded-2xl shadow group hover:shadow-lg transition-all flex flex-col items-start">
          <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-green-500 text-white mb-3 text-xl">✅</div>
          <div className="text-2xl font-bold text-green-700">
            {completedCount}
          </div>
          <div className="text-sm text-gray-500">Completed</div>
        </div>
        <div className="bg-gradient-to-br from-orange-100 to-orange-50 p-6 rounded-2xl shadow group hover:shadow-lg transition-all flex flex-col items-start">
          <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-orange-500 text-white mb-3 text-xl">🧾</div>
          <div className="text-2xl font-bold text-orange-700">
            PKR {totalValue.toLocaleString()}
          </div>
          <div className="text-sm text-gray-500">Total Value</div>
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
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white/80 shadow focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border border-gray-200 transition-all placeholder-gray-400 text-gray-900"
            />
          </div>
          {/* Filter Tabs/Pills */}
          <div className="flex gap-2 md:gap-4">
            {['All', 'Open', 'Completed', 'Cancelled'].map((tab) => (
              <button
                key={tab}
                onClick={() => setSaleStatus(tab)}
                className={`px-4 py-2 rounded-full font-medium transition-colors text-sm border-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  saleStatus === tab
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

      {/* Sales Orders Table */}
      <SalesOrderTable 
        salesOrders={filteredSalesOrders}
        onUpdateStatus={updateOrderStatus}
        onConvertToInvoice={convertToInvoice}
        isLoading={isLoading}
        handleEditSale={handleEditSale}
        handleViewSale={handleViewSale}
        loadSalesOrdersFromAPI={loadSalesOrdersFromAPI}
        isClient={isClient}
        canEditData={canEditData}
        canDeleteData={canDeleteData}
      />
    </div>
  )
}