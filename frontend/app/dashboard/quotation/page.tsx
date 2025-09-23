'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import ReactDOM from 'react-dom'
import { getQuotationsForUser, deleteQuotation } from '../../../http/quotations'
import { getToken } from '../../lib/auth'
import TableActionMenu from '@/components/TableActionMenu'
import ConfirmDialog from '@/components/ConfirmDialog'
import { getCurrentUserInfo, canAddData, canEditData, canDeleteData, canEditSalesData, canDeleteSalesData } from '../../../lib/roleAccessControl'

// Devease Digital-style status badge component
function StatusBadge({ status }: { status: string }) {
  const color = {
    Sent: 'bg-blue-100 text-blue-800',
    Accepted: 'bg-green-100 text-green-800',
    Pending: 'bg-yellow-100 text-yellow-800',
    Rejected: 'bg-red-100 text-red-800',
    'Converted to Sale': 'bg-green-100 text-green-800',
    'Converted to Sale Order': 'bg-purple-100 text-purple-800',
    'Quotation Open': 'bg-gray-100 text-gray-800',
  }[status] || 'bg-gray-100 text-gray-800'
  return (
    <span className={`px-3 py-1 text-xs font-medium rounded-full ${color}`}>
      {status}
    </span>
  )
}

// Enhanced QuotationActions with convert dropdown that renders outside table
function QuotationActions({ quotation, onConvertToSale, onConvertToSaleOrder, router }: { 
  quotation: any;
  onConvertToSale: (quotation: any) => void;
  onConvertToSaleOrder: (quotation: any) => void;
  router: any;
}) {
  const [showConvertDropdown, setShowConvertDropdown] = useState(false);
  const convertRef = useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (convertRef.current && !convertRef.current.contains(event.target as Node)) {
        setShowConvertDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleConvert = (type: string) => {
    console.log('Handle convert called with type:', type);
    setShowConvertDropdown(false);
    if (type === 'sale') {
      console.log('Calling onConvertToSale');
      onConvertToSale(quotation);
    } else if (type === 'saleOrder') {
      console.log('Calling onConvertToSaleOrder');
      onConvertToSaleOrder(quotation);
    }
  };

  const handleConvertClick = () => {
    console.log('Convert button clicked');
    if (convertRef.current) {
      const rect = convertRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX - 120 // Better alignment with button
      });
    }
    setShowConvertDropdown(!showConvertDropdown);
    console.log('Dropdown state:', !showConvertDropdown);
  };

  // If quotation is already converted, show the converted info
  if (quotation.convertedToSale) {
    return (
      <div className="flex justify-center">
        <span className="text-blue-600 text-sm font-medium">
          Invoice: {quotation.convertedToSale}
        </span>
      </div>
    );
  }

  if (quotation.convertedToSaleOrder) {
    return (
      <div className="flex justify-center">
        <span className="text-green-600 text-sm font-medium">
          Order: {quotation.convertedToSaleOrder}
        </span>
      </div>
    );
  }

  return (
    <div className="flex justify-center gap-2 relative">
      {/* Convert dropdown */}
      <div className="relative" ref={convertRef}>
        <button 
          className="text-green-600 hover:text-green-800 text-sm font-medium px-3 py-1 rounded-md hover:bg-green-50 transition-colors"
          onClick={handleConvertClick}
        >
          Convert
        </button>
        {showConvertDropdown && typeof window !== 'undefined' && ReactDOM.createPortal(
          <div 
            className="absolute w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-[9999] animate-fadeinup"
            style={{
              top: dropdownPosition.top,
              left: dropdownPosition.left
            }}
            onClick={(e) => {
              e.stopPropagation();
              console.log('Dropdown container clicked');
            }}
          >
            <button
              type="button"
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors border-b border-gray-100"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Convert to Sale button clicked');
                handleConvert('sale');
              }}
            >
              Convert to Sale
            </button>
            <button
              type="button"
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Convert to Sale Order button clicked');
                handleConvert('saleOrder');
              }}
            >
              Convert to Sale Order
            </button>
          </div>,
          document.body
        )}
      </div>
    </div>
  )
}


export default function QuotationPage() {
  const router = useRouter()
  const [quotations, setQuotations] = useState<any[]>([])
  
  // API related state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Search and filter state
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [showDateDropdown, setShowDateDropdown] = useState(false)
  const [filterType, setFilterType] = useState('All')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  
  // Role-based access control
  const [userInfo, setUserInfo] = useState<any>(null)
  const [isClient, setIsClient] = useState(false)

  // Conversion functions
  const handleConvertToSale = (quotation: any) => {
    console.log('Converting to sale:', quotation);
    // Navigate to sale create page with quotation data
    const quotationData = encodeURIComponent(JSON.stringify({
      customerName: quotation.customer,
      customerPhone: quotation.customerPhone || '',
      items: quotation.items || [],
      totalAmount: quotation.amount,
      description: quotation.notes || '',
      quotationId: quotation.id
    }));
    console.log('Navigating to:', `/dashboard/sale/add?quotation=${quotationData}`);
    router.push(`/dashboard/sale/add?quotation=${quotationData}`);
  };

  const handleConvertToSaleOrder = (quotation: any) => {
    console.log('Converting to sale order:', quotation);
    // Navigate to sale order create page with quotation data
    const quotationData = encodeURIComponent(JSON.stringify({
      customerName: quotation.customer,
      customerPhone: quotation.customerPhone || '',
      items: quotation.items || [],
      totalAmount: quotation.amount,
      description: quotation.notes || '',
      quotationId: quotation.id
    }));
    console.log('Navigating to:', `/dashboard/sales/create?quotation=${quotationData}`);
    router.push(`/dashboard/sales/create?quotation=${quotationData}`);
  };
  
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

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

  const makeApiCall = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    const url = `${API_BASE_URL}${endpoint}`;
    
    let token = '';
    if (typeof window !== 'undefined') {
      token = getToken() || '';
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
  }, []);

  const loadQuotationsFromAPI = useCallback(async () => {
    setError('');
    
    try {
      const result = await getQuotationsForUser(String(getToken() || ''));
      
      if (result && result.success && Array.isArray(result.data) && !result.localMode) {
        const transformedQuotations = result.data.map((quotation: any) => ({
          id: quotation._id || quotation.id,
          number: quotation.quotationNo || quotation.quotationNumber || quotation.number,
          customer: quotation.customerName || quotation.customer,
          customerPhone: quotation.customerPhone || '',
          amount: quotation.totalAmount || quotation.total || 0,
          subTotal: quotation.subTotal || quotation.amount || 0,
          date: quotation.date,
          status: quotation.status,
          items: quotation.items || [],
          notes: quotation.notes || '',
          validUntil: quotation.validUntil || '',
          createdAt: quotation.createdAt,
          updatedAt: quotation.updatedAt,
          customerBalance: quotation.customerBalance || 0,
          convertedToSale: quotation.convertedToSale || null,
          convertedToSaleOrder: quotation.convertedToSaleOrder || null,
          // Discount fields
          discount: quotation.discount || '',
          discountType: quotation.discountType || '%',
          discountAmount: quotation.discountAmount || '',
          // Tax fields
          tax: quotation.tax || '',
          taxType: quotation.taxType || '%',
          taxAmount: quotation.taxAmount || ''
        }));
        
        setQuotations(transformedQuotations);
        console.log('Quotations synced with API and saved locally');
      } else if (quotations.length === 0) {
        setQuotations([]);
      }
    } catch (error) {
      console.error('Failed to load quotations from API:', error);
      if (quotations.length === 0) {
        setError('Failed to load quotations from server');
      }
    }
  }, []);

  useEffect(() => {
    // Set client-side flag for hydration safety
    setIsClient(true);
    
    // Get current user info for role-based access
    const currentUserInfo = getCurrentUserInfo();
    setUserInfo(currentUserInfo);
    
    loadQuotationsFromAPI();
  }, [loadQuotationsFromAPI]);

  // Navigate to create quotation page
  const handleCreateQuotation = () => {
    router.push('/dashboard/quotation/create')
  }

  // Handle filter type change
  const handleFilterTypeChange = (newFilterType: string) => {
    setFilterType(newFilterType);
  }

  // Filtered and searched quotations
  const filteredQuotations = quotations.filter((q) => {
    // Search filter - by customer name or quotation number
    const matchesSearch = !search || 
      q.customer?.toLowerCase().includes(search.toLowerCase()) ||
      q.number?.toLowerCase().includes(search.toLowerCase());

    // Status filter
    const matchesStatus = statusFilter === 'All' || q.status === statusFilter;

    // Date filter
    let matchesDate = true;
    if (dateFrom || dateTo) {
      const quotationDate = new Date(q.date || q.createdAt);
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        matchesDate = matchesDate && quotationDate >= fromDate;
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59); // Include the entire day
        matchesDate = matchesDate && quotationDate <= toDate;
      }
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [quotationToDelete, setQuotationToDelete] = useState<any>(null);

  const handleDeleteQuotation = (quotation: any) => {
    setQuotationToDelete(quotation);
    setDeleteDialogOpen(true);
  };

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

      {/* Header - sticky, card-like, shadow, rounded (matching sale/sales order) */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-4 md:p-6 mb-6 sticky top-0 z-30 border border-gray-100">
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div className="text-center md:text-left">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Quotations</h1>
            <p className="text-sm text-gray-500 mt-1">Manage your quotations and customer proposals</p>
          </div>
          <div className="flex flex-col md:flex-row gap-2 md:gap-4">
            {isClient && canAddData() ? (
              <button
                onClick={handleCreateQuotation}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow"
              >
                + New Quotation
              </button>
            ) : (
              <div className="bg-gray-100 text-gray-500 px-6 py-2 rounded-lg font-medium flex items-center gap-2">
                + New Quotation (Restricted)
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid (full width, responsive) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6">
        <div className="bg-gradient-to-br from-blue-100 to-blue-50 p-6 rounded-2xl shadow group hover:shadow-lg transition-all flex flex-col items-start">
          <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-blue-500 text-white mb-3 text-xl">📋</div>
          <div className="text-2xl font-bold text-blue-700">
            {filteredQuotations.length}
          </div>
          <div className="text-sm text-gray-500">Total Quotations</div>
        </div>
        <div className="bg-gradient-to-br from-green-100 to-green-50 p-6 rounded-2xl shadow group hover:shadow-lg transition-all flex flex-col items-start">
          <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-green-500 text-white mb-3 text-xl">✅</div>
          <div className="text-2xl font-bold text-green-700">
            {filteredQuotations.filter(q => q.status === 'Accepted').length}
          </div>
          <div className="text-sm text-gray-500">Accepted</div>
        </div>
        <div className="bg-gradient-to-br from-orange-100 to-orange-50 p-6 rounded-2xl shadow group hover:shadow-lg transition-all flex flex-col items-start">
          <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-orange-500 text-white mb-3 text-xl">🧾</div>
          <div className="text-2xl font-bold text-orange-700">
            PKR {filteredQuotations.reduce((sum, q) => sum + (q.amount || 0), 0).toLocaleString()}
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
              placeholder="Search quotations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white/80 shadow focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border border-gray-200 transition-all placeholder-gray-400 text-gray-900"
            />
          </div>
          {/* Filter Tabs/Pills */}
          <div className="flex gap-2 md:gap-4">
            {['All', 'Sent', 'Accepted', 'Pending', 'Rejected'].map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-4 py-2 rounded-full font-medium transition-colors text-sm border-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  statusFilter === tab
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

      {/* Quotations Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 border-b border-gray-200 gap-4">
          <h2 className="text-lg font-semibold text-gray-900">Transactions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Date</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Quotation #</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Customer</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Amount</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Balance</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Status</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredQuotations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500 text-lg font-medium">
                    {search
                      ? `No quotations found matching "${search}".`
                      : "No quotations found."}
                  </td>
                </tr>
              ) : filteredQuotations.map((quotation, idx) => (
                <tr key={quotation.id} className={`hover:bg-blue-50/40 transition-all ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap text-center">
                    {quotation.date ? new Date(quotation.date).toLocaleDateString('en-GB') : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-blue-700 font-bold whitespace-nowrap text-center">
                    {quotation.number}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap text-center">{quotation.customer}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-blue-700 whitespace-nowrap text-center">
                    PKR {quotation.amount?.toLocaleString() || '0'}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-orange-600 whitespace-nowrap text-center">
                    PKR {Math.abs(quotation.customerBalance || 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-center">
                    <StatusBadge status={quotation.status} />
                  </td>
                  <td className="px-6 py-4 text-sm font-medium whitespace-nowrap text-center">
                    <div className="flex justify-between items-center w-full max-w-[220px] mx-auto">
                      {isClient && canAddData() ? (
                        <QuotationActions
                          quotation={quotation}
                          onConvertToSale={handleConvertToSale}
                          onConvertToSaleOrder={handleConvertToSaleOrder}
                          router={router}
                        />
                      ) : (
                        <div className="text-gray-400 text-sm">Convert (Restricted)</div>
                      )}
                      <div className="ml-auto">
                        {isClient && (canEditSalesData() || canDeleteSalesData()) ? (
                          <TableActionMenu
                            onEdit={canEditSalesData() ? () => router.push(`/dashboard/quotation/create?id=${quotation.id}`) : undefined}
                            onDelete={canDeleteSalesData() ? () => handleDeleteQuotation(quotation) : undefined}
                            onView={() => router.push(`/dashboard/invoices?saleId=${quotation.id}&invoiceNo=${quotation.number}`)}
                            extraActions={[
                              {
                                label: 'Open PDF',
                                onClick: () => router.push(`/dashboard/invoices?saleId=${quotation.id}&invoiceNo=${quotation.number}`)
                              }
                            ]}
                          />
                        ) : (
                          <div className="text-gray-400 text-sm">No actions</div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>


      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Quotation?"
        description={`Are you sure you want to delete quotation ${quotationToDelete?.number || quotationToDelete?.id}? This action cannot be undone.`}
        onCancel={() => { setDeleteDialogOpen(false); setQuotationToDelete(null); }}
        onConfirm={async () => {
          if (!quotationToDelete || !quotationToDelete.id) return;
          try {
            setLoading(true);
            const token = getToken();
            await deleteQuotation(quotationToDelete.id, String(token || ''));
            setQuotations(prev => prev.filter(q => q.id !== quotationToDelete.id));
            setDeleteDialogOpen(false);
            setQuotationToDelete(null);
            await loadQuotationsFromAPI(); // For consistency
          } catch (error) {
            setDeleteDialogOpen(false);
            setQuotationToDelete(null);
          } finally {
            setLoading(false);
          }
        }}
        loading={loading}
      />
    </div>
  )
}