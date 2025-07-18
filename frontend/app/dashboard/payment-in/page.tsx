"use client";
import React, { useState, useEffect, useRef } from "react";
import { getSalesByUser, getSaleById } from "@/http/sales";
import { jwtDecode } from "jwt-decode";
import Toast from "../../components/Toast";
import PaymentInModal from "../../components/PaymentInModal";
import { useRouter } from "next/navigation";
import TableActionMenu from "../../components/TableActionMenu";

const dateRanges = [
  { value: 'All', label: 'All Time' },
  { value: 'Today', label: 'Today' },
  { value: 'Yesterday', label: 'Yesterday' },
  { value: 'This Week', label: 'This Week' },
  { value: 'This Month', label: 'This Month' },
  { value: 'Last Month', label: 'Last Month' },
  { value: 'This Year', label: 'This Year' },
  { value: 'Custom', label: 'Custom Range' },
];

function PaymentStatusBadge({ status }: { status: string }) {
  let color = '';
  if (status === 'Paid') color = 'bg-green-100 text-green-800';
  else if (status === 'Partial') color = 'bg-orange-100 text-orange-800';
  else color = 'bg-red-100 text-red-800';
  return <span className={`px-3 py-1 text-xs font-semibold rounded-full ${color}`}>{status}</span>;
}

const PaymentInPage = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showPaymentIn, setShowPaymentIn] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [filterType, setFilterType] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [statusTab, setStatusTab] = useState('All');
  const dateDropdownRef = useRef<HTMLDivElement>(null);
  const dateDropdownButtonRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchPayments = async () => {
      setLoading(true);
      try {
        const token = (typeof window !== "undefined" && (localStorage.getItem("token") || localStorage.getItem("vypar_auth_token"))) || "";
        if (!token) {
          setTransactions([]);
          setLoading(false);
          return;
        }
        const decoded: any = jwtDecode(token);
        const userId = decoded._id || decoded.id;
        if (!userId) {
          setTransactions([]);
          setLoading(false);
          return;
        }
        const result = await getSalesByUser(userId, token);
        if (result && result.success && Array.isArray(result.sales)) {
          setTransactions(result.sales.filter((sale: any) => sale.received && sale.received > 0));
        } else {
          setTransactions([]);
        }
      } catch (err) {
        setTransactions([]);
      }
      setLoading(false);
    };
    fetchPayments();
  }, []);

  // Filtering logic
  const filteredTransactions = transactions.filter((transaction: any) => {
    // Search
    const matchesSearch =
      !searchTerm ||
      transaction.partyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.invoiceNo?.includes(searchTerm);
    // Status
    let paymentStatus = 'Unpaid';
    if (typeof transaction.balance === 'number' && typeof transaction.received === 'number') {
      if (transaction.balance === 0 && transaction.received > 0) paymentStatus = 'Paid';
      else if (transaction.received === 0) paymentStatus = 'Unpaid';
      else if (transaction.balance > 0 && transaction.received > 0) paymentStatus = 'Partial';
    }
    const matchesStatus = statusTab === 'All' || paymentStatus === statusTab;
    // Date
    let matchesDate = true;
    if (dateFrom || dateTo) {
      const transactionDate = new Date(transaction.date || transaction.createdAt);
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        matchesDate = matchesDate && transactionDate >= fromDate;
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        matchesDate = matchesDate && transactionDate <= toDate;
      }
    }
    return matchesSearch && matchesStatus && matchesDate;
  });

  // Stats
  const filteredStats = {
    totalReceived: filteredTransactions.reduce((sum: number, t: any) => sum + (typeof t.received === 'number' ? t.received : 0), 0),
    totalGrandTotal: filteredTransactions.reduce((sum: number, t: any) => sum + (typeof t.grandTotal === 'number' ? t.grandTotal : (t.amount || 0)), 0),
    totalBalance: filteredTransactions.reduce((sum: number, t: any) => sum + (typeof t.balance === 'number' ? t.balance : 0), 0),
  };

  // Date dropdown outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dateDropdownRef.current &&
        !dateDropdownRef.current.contains(event.target as Node) &&
        dateDropdownButtonRef.current &&
        !dateDropdownButtonRef.current.contains(event.target as Node)
      ) {
        setShowDateDropdown(false);
      }
    }
    if (showDateDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDateDropdown]);

  // Date range logic
  const getDateRange = (filterType: string) => {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    switch (filterType) {
      case 'Today':
        return { from: startOfDay, to: endOfDay };
      case 'Yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        return {
          from: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate()),
          to: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59)
        };
      case 'This Week':
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        return {
          from: new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate()),
          to: endOfDay
        };
      case 'This Month':
        return {
          from: new Date(today.getFullYear(), today.getMonth(), 1),
          to: endOfDay
        };
      case 'Last Month':
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59);
        return { from: lastMonth, to: lastMonthEnd };
      case 'This Year':
        return {
          from: new Date(today.getFullYear(), 0, 1),
          to: endOfDay
        };
      default:
        return null;
    }
  };

  const handleFilterTypeChange = (newFilterType: string) => {
    setFilterType(newFilterType);
    if (newFilterType === 'Custom') return;
    const dateRange = getDateRange(newFilterType);
    if (dateRange) {
      setDateFrom(dateRange.from.toISOString().split('T')[0]);
      setDateTo(dateRange.to.toISOString().split('T')[0]);
    } else {
      setDateFrom('');
      setDateTo('');
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-4 md:p-6 mb-6 sticky top-0 z-30 border border-gray-100">
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div className="text-center md:text-left">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Payment In</h1>
            <p className="text-sm text-gray-500 mt-1">All payments received from customers</p>
          </div>
          {/* Add Payment In Button */}
          <button
            className="px-6 py-2 rounded-full bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 transition-all text-sm"
            onClick={() => { setSelectedTransaction(null); setShowPaymentIn(true); }}
          >
            + Add Payment In
          </button>
        </div>
      </div>
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6">
        <div className="bg-gradient-to-br from-green-100 to-green-50 p-6 rounded-2xl shadow group hover:shadow-lg transition-all flex flex-col items-start">
          <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-green-500 text-white mb-3 text-xl">⬆️</div>
          <div className="text-2xl font-bold text-green-700">
            PKR {Number(filteredStats.totalReceived || 0).toLocaleString()}
          </div>
          <div className="text-sm text-gray-500">Total Received</div>
        </div>
        <div className="bg-gradient-to-br from-blue-100 to-blue-50 p-6 rounded-2xl shadow group hover:shadow-lg transition-all flex flex-col items-start">
          <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-blue-500 text-white mb-3 text-xl">💰</div>
          <div className="text-2xl font-bold text-blue-700">
            PKR {Number(filteredStats.totalGrandTotal || 0).toLocaleString()}
          </div>
          <div className="text-sm text-gray-500">Total Invoices</div>
        </div>
        <div className="bg-gradient-to-br from-orange-100 to-orange-50 p-6 rounded-2xl shadow group hover:shadow-lg transition-all flex flex-col items-start">
          <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-orange-500 text-white mb-3 text-xl">🧾</div>
          <div className="text-2xl font-bold text-orange-700">
            PKR {Number(filteredStats.totalBalance || 0).toLocaleString()}
          </div>
          <div className="text-sm text-gray-500">Total Balance</div>
        </div>
      </div>
      {/* Filters */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow p-4 md:p-6 mb-6 border border-gray-100 z-[1]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          {/* Search Bar */}
          <div className="relative w-full md:w-80">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-lg">🔍</span>
            <input
              type="text"
              placeholder="Search payments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white/80 shadow focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border border-gray-200 transition-all placeholder-gray-400 text-gray-900"
            />
          </div>
          {/* Status Tabs */}
          <div className="flex gap-2 md:gap-4">
            {['All', 'Paid', 'Partial', 'Unpaid'].map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusTab(tab)}
                className={`px-4 py-2 rounded-full font-medium transition-colors text-sm border-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  statusTab === tab
                    ? 'bg-blue-600 text-white border-blue-600 shadow scale-105'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-blue-50'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          {/* Date Range Dropdown */}
          <div className="flex flex-col sm:flex-row gap-2 items-center mt-2">
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
      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 border-b border-gray-200 gap-4">
          <h2 className="text-lg font-semibold text-gray-900">Received Payments</h2>
          <div className="flex gap-2"></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Date</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Number</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Party Name</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Category</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Type</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Total</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Received/Paid</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Balance</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Status</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Print/Share</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-6 py-8 text-center text-gray-500 text-lg font-medium">
                    {searchTerm
                      ? `No payments found matching "${searchTerm}".`
                      : "No payments found."}
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((transaction, idx) => {
                  let paymentStatus = 'Unpaid';
                  if (typeof transaction.balance === 'number' && typeof transaction.received === 'number') {
                    if (transaction.balance === 0 && transaction.received > 0) paymentStatus = 'Paid';
                    else if (transaction.received === 0) paymentStatus = 'Unpaid';
                    else if (transaction.balance > 0 && transaction.received > 0) paymentStatus = 'Partial';
                  }
                  return (
                    <tr key={transaction._id || transaction.id || idx} className={`hover:bg-blue-50/40 transition-all ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap text-center">
                        {transaction.date
                          ? new Date(transaction.date).toLocaleDateString('en-GB')
                          : transaction.createdAt
                            ? new Date(transaction.createdAt).toLocaleDateString('en-GB')
                            : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-blue-700 font-bold whitespace-nowrap text-center">
                        {transaction.invoiceNo || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap text-center">{transaction.partyName}</td>
                      <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap text-center">{transaction.category || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap text-center">{transaction.paymentType || '-'}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-blue-700 whitespace-nowrap text-center">
                        PKR {typeof transaction.grandTotal === 'number' ? transaction.grandTotal.toLocaleString() : (transaction.amount ? transaction.amount.toLocaleString() : '0')}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-green-700 whitespace-nowrap text-center">
                        PKR {typeof transaction.received === 'number' ? transaction.received.toLocaleString() : '0'}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-orange-600 whitespace-nowrap text-center">
                        PKR {typeof transaction.balance === 'number' ? transaction.balance.toLocaleString() : '0'}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-center">
                        <PaymentStatusBadge status={paymentStatus} />
                      </td>
                      <td className="px-6 py-4 text-sm whitespace-nowrap text-center">
                        <button
                          className="px-2 py-1 text-sm text-blue-700 underline mr-2"
                          onClick={() => window.open(`/dashboard/sale/invoice/${transaction._id}`, '_blank')}
                        >
                          Print
                        </button>
                        <button
                          className="px-2 py-1 text-sm text-blue-700 underline"
                          onClick={() => {
                            const url = `${window.location.origin}/dashboard/sale/invoice/${transaction._id}`;
                            navigator.clipboard.writeText(url);
                            setToast({ message: 'Link copied!', type: 'success' });
                          }}
                        >
                          Share
                        </button>
                      </td>
                      <td className="px-6 py-4 text-sm whitespace-nowrap text-center">
                        <TableActionMenu
                          onView={() => window.open(`/dashboard/sale/invoice/${transaction._id}`, '_blank')}
                          extraActions={[
                            {
                              label: 'Add Payment',
                              onClick: () => { setSelectedTransaction(transaction); setShowPaymentIn(true); }
                            }
                          ]}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* PaymentInModal integration */}
      <PaymentInModal
        isOpen={showPaymentIn}
        onClose={() => setShowPaymentIn(false)}
        onSave={async (data) => {
          // Fetch updated sale from API
          try {
            const token = (typeof window !== 'undefined' && (localStorage.getItem('token') || localStorage.getItem('vypar_auth_token'))) || '';
            const saleId = selectedTransaction?._id || selectedTransaction?.id;
            if (!saleId) return;
            const result = await getSaleById(saleId, token);
            if (result && result.success && result.sale) {
              setTransactions((prev) => prev.map((t) => (t._id === saleId || t.id === saleId) ? { ...t, ...result.sale } : t));
            }
          } catch (err) {
            // fallback: just reload all
            setShowPaymentIn(false);
          }
          setShowPaymentIn(false);
          setToast({ message: 'Payment received successfully!', type: 'success' });
        }}
        partyName={selectedTransaction?.partyName || ''}
        total={typeof selectedTransaction?.grandTotal === 'number' ? selectedTransaction.grandTotal : 0}
        dueBalance={typeof selectedTransaction?.balance === 'number' ? selectedTransaction.balance : 0}
        saleId={selectedTransaction?._id || selectedTransaction?.id || ''}
      />
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
};

export default PaymentInPage;
