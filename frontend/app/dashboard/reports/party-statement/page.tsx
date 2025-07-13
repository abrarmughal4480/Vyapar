"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, BarChart3, Printer, Settings, ChevronDown, Eye, Edit, MoreHorizontal, Trash2, Download, Filter, Calendar, Share2 } from 'lucide-react';
import { jwtDecode } from 'jwt-decode';
import { fetchPartiesByUserId } from '@/http/parties';
import { getSalesByUser } from '@/http/sales';
import { getPurchasesByUser, getPayments, getPaymentOutsByUser } from '@/http/purchases';
import Toast from '../../../components/Toast';
import ConfirmDialog from '../../../components/ConfirmDialog';
import KeyboardDropdown from '../../../components/KeyboardDropdown';
import { useRouter } from 'next/navigation';

interface Transaction {
  id: string;
  date: string;
  txnType: 'Sale Invoice' | 'Purchase Bill' | 'Payment In' | 'Payment Out';
  refNo: string;
  paymentType: string;
  total: number;
  received: number;
  paid: number;
  balance: number;
  partyName: string;
  description?: string;
}

const PartyStatementPage = () => {
  const [selectedParty, setSelectedParty] = useState('');
  const [parties, setParties] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [filterType, setFilterType] = useState('All');
  const [summaryTotals, setSummaryTotals] = useState({
    totalSale: 0,
    totalPurchase: 0,
    totalMoneyIn: 0,
    totalMoneyOut: 0,
    totalReceivable: 0
  });

  const router = useRouter();

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



  // Load transactions when party changes
  useEffect(() => {
    if (selectedParty) {
      loadTransactions();
    } else {
      setTransactions([]);
      setFilteredTransactions([]);
    }
  }, [selectedParty]);

  // Filter transactions when search or date filters change
  useEffect(() => {
    filterTransactions();
  }, [transactions, searchTerm, dateFrom, dateTo]);



  const loadParties = async () => {
    try {
      const token = (typeof window !== 'undefined' && (localStorage.getItem('token') || localStorage.getItem('vypar_auth_token'))) || '';
      if (!token) {
        setParties([]);
        return;
      }
      const result = await fetchPartiesByUserId(token);
      if (result && result.success && Array.isArray(result.data)) {
        setParties(result.data);
      } else {
        setParties([]);
      }
    } catch (error) {
      console.error('Error loading parties:', error);
      setParties([]);
    }
  };

  const loadTransactions = async () => {
    if (!selectedParty) return;

    setLoading(true);
    try {
      const token = (typeof window !== 'undefined' && (localStorage.getItem('token') || localStorage.getItem('vypar_auth_token'))) || '';
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

      // Get sales transactions
      const salesResult = await getSalesByUser(userId, token);
      const sales = salesResult?.success && Array.isArray(salesResult.sales) 
        ? salesResult.sales.filter((sale: any) => sale.partyName === selectedParty)
        : [];

                    // Get purchase transactions
       const purchasesResult = await getPurchasesByUser(userId, token);
       const purchases = purchasesResult?.success && Array.isArray(purchasesResult.purchases) 
         ? purchasesResult.purchases.filter((purchase: any) => purchase.supplierName === selectedParty)
         : [];

       // Get payment transactions
       const paymentsResult = await getPayments(token);
       const payments = paymentsResult?.success && Array.isArray(paymentsResult.payments) 
         ? paymentsResult.payments.filter((payment: any) => payment.supplierName === selectedParty)
         : [];

      // Get payment out transactions
      const paymentOutsResult = await getPaymentOutsByUser(userId, token);
      const paymentOuts = paymentOutsResult?.success && Array.isArray(paymentOutsResult.paymentOuts)
        ? paymentOutsResult.paymentOuts.filter((out: any) => out.supplierName === selectedParty)
        : [];

       // Combine and format transactions
       const allTransactions: Transaction[] = [];

      // Add sales transactions
      sales.forEach((sale: any) => {
        allTransactions.push({
          id: sale._id || sale.id,
          date: sale.date || sale.createdAt,
          txnType: 'Sale Invoice',
          refNo: sale.invoiceNo || `INV-${sale._id}`,
          paymentType: sale.paymentType || 'Credit',
          total: sale.grandTotal || 0,
          received: 0,
          paid: 0,
          balance: (sale.grandTotal || 0) - (sale.received || 0),
          partyName: sale.partyName,
          description: sale.description
        });

        // If there's a received amount, also add it as a Payment In transaction
        if (sale.received && sale.received > 0) {
          allTransactions.push({
            id: `payment-in-${sale._id}`,
            date: sale.date || sale.createdAt,
            txnType: 'Payment In',
            refNo: `PAY-IN-${sale.invoiceNo || sale._id}`,
            paymentType: sale.paymentType || 'Cash',
            total: 0,
            received: sale.received,
            paid: 0,
            balance: sale.received,
            partyName: sale.partyName,
            description: `Payment received for ${sale.invoiceNo || 'Invoice'}`
          });
        }
      });

             // Add purchase transactions
       purchases.forEach((purchase: any) => {
         allTransactions.push({
           id: purchase._id || purchase.id,
           date: purchase.date || purchase.createdAt,
           txnType: 'Purchase Bill',
           refNo: purchase.billNo || `PUR-${purchase._id}`,
           paymentType: purchase.paymentType || 'Credit',
           total: purchase.grandTotal || 0,
           received: 0,
           paid: 0,
           balance: (purchase.grandTotal || 0) - (purchase.paid || 0),
           partyName: purchase.supplierName,
           description: purchase.description
         });
       });

       // Add payment transactions
       payments.forEach((payment: any) => {
         allTransactions.push({
           id: payment._id || payment.id,
           date: payment.paymentDate || payment.createdAt,
           txnType: 'Payment Out',
           refNo: payment.billNo || `PAY-${payment._id}`,
           paymentType: payment.paymentType || 'Cash',
           total: 0,
           received: 0,
           paid: payment.amount || 0,
           balance: -(payment.amount || 0),
           partyName: payment.supplierName,
           description: payment.description
         });
       });
      // Add payment out transactions
      paymentOuts.forEach((out: any) => {
        allTransactions.push({
          id: out._id || out.id,
          date: out.paymentDate || out.createdAt,
          txnType: 'Payment Out',
          refNo: out.billNo || `PAY-OUT-${out._id}`,
          paymentType: out.paymentType || 'Cash',
          total: 0,
          received: 0,
          paid: out.amount || 0,
          balance: out.amount || 0,
          partyName: out.supplierName,
          description: out.description
        });
      });

      // Sort by date (newest first)
      allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setTransactions(allTransactions);

      // Calculate opening balance and current balance
      const selectedPartyData = parties.find(p => p.name === selectedParty);
      const openingBal = selectedPartyData?.openingBalance || 0;
      setOpeningBalance(openingBal);

      // Calculate current balance
      let currentBal = openingBal;
      allTransactions.forEach(txn => {
        if (txn.txnType === 'Sale Invoice') {
          currentBal += txn.total - txn.received;
        } else if (txn.txnType === 'Purchase Bill') {
          currentBal -= txn.total - txn.paid;
        } else if (txn.txnType === 'Payment In') {
          currentBal += txn.received;
        } else if (txn.txnType === 'Payment Out') {
          currentBal -= txn.paid;
        }
      });
      setCurrentBalance(currentBal);

    } catch (error) {
      console.error('Error loading transactions:', error);
      setTransactions([]);
    }
    setLoading(false);
  };

  const filterTransactions = () => {
    let filtered = [...transactions];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(txn => 
        txn.refNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        txn.txnType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        txn.paymentType.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Date filter
    if (dateFrom || dateTo) {
      filtered = filtered.filter(txn => {
        const txnDate = new Date(txn.date);
        const fromDate = dateFrom ? new Date(dateFrom) : null;
        const toDate = dateTo ? new Date(dateTo) : null;

        if (fromDate && toDate) {
          return txnDate >= fromDate && txnDate <= toDate;
        } else if (fromDate) {
          return txnDate >= fromDate;
        } else if (toDate) {
          return txnDate <= toDate;
        }
        return true;
      });
    }

    setFilteredTransactions(filtered);
    
    // Calculate summary totals
    calculateSummaryTotals(filtered);
  };

  const calculateSummaryTotals = (transactions: Transaction[]) => {
    let totalSale = 0;
    let totalPurchase = 0;
    let totalMoneyIn = 0;
    let totalMoneyOut = 0;
    let totalReceivable = 0;

    transactions.forEach(txn => {
      switch (txn.txnType) {
        case 'Sale Invoice':
          totalSale += txn.total;
          totalReceivable += txn.total - txn.received; // Outstanding amount
          break;
        case 'Purchase Bill':
          totalPurchase += txn.total;
          break;
        case 'Payment In':
          totalMoneyIn += txn.received;
          totalReceivable -= txn.received; // Reduce receivable when payment received
          break;
        case 'Payment Out':
          totalMoneyOut += txn.paid;
          break;
      }
    });

    // Also add received amounts from Sale Invoices to total money in
    transactions.forEach(txn => {
      if (txn.txnType === 'Sale Invoice' && txn.received > 0) {
        totalMoneyIn += txn.received;
      }
    });

    setSummaryTotals({
      totalSale,
      totalPurchase,
      totalMoneyIn,
      totalMoneyOut,
      totalReceivable
    });
  };



  const handleFilterTypeChange = (newFilterType: string) => {
    setFilterType(newFilterType);
    if (newFilterType === 'Custom') {
      // Keep current date range
      return;
    }
    
    const today = new Date();
    let fromDate = '';
    let toDate = '';
    
    switch (newFilterType) {
      case 'Today':
        fromDate = today.toISOString().split('T')[0];
        toDate = today.toISOString().split('T')[0];
        break;
      case 'Yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        fromDate = yesterday.toISOString().split('T')[0];
        toDate = yesterday.toISOString().split('T')[0];
        break;
      case 'This Week':
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        fromDate = startOfWeek.toISOString().split('T')[0];
        toDate = today.toISOString().split('T')[0];
        break;
      case 'This Month':
        fromDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        toDate = today.toISOString().split('T')[0];
        break;
      case 'Last Month':
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        fromDate = lastMonth.toISOString().split('T')[0];
        toDate = new Date(today.getFullYear(), today.getMonth(), 0).toISOString().split('T')[0];
        break;
      case 'This Year':
        fromDate = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
        toDate = today.toISOString().split('T')[0];
        break;
      case 'All':
        fromDate = '';
        toDate = '';
        break;
    }
    
    setDateFrom(fromDate);
    setDateTo(toDate);
  };

  const handlePrintStatement = () => {
    if (!selectedParty) {
      setToast({ message: 'Please select a party first', type: 'error' });
      return;
    }
    // Implement print functionality
    window.print();
  };

  const handleExportStatement = () => {
    if (!selectedParty) {
      setToast({ message: 'Please select a party first', type: 'error' });
      return;
    }
    // Implement export functionality
    setToast({ message: 'Export functionality coming soon', type: 'success' });
  };

  const handleShareStatement = () => {
    if (!selectedParty) {
      setToast({ message: 'Please select a party first', type: 'error' });
      return;
    }
    // Implement share functionality
    setToast({ message: 'Share functionality coming soon', type: 'success' });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const getTxnTypeColor = (type: string) => {
    switch (type) {
      case 'Sale Invoice':
        return 'bg-green-100 text-green-800';
      case 'Purchase Bill':
        return 'bg-red-100 text-red-800';
      case 'Payment In':
        return 'bg-blue-100 text-blue-800';
      case 'Payment Out':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-4 md:p-6 mb-6 sticky top-0 z-30 border border-gray-100">
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div className="text-center md:text-left">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Party Statement</h1>
            <p className="text-sm text-gray-500 mt-1">View detailed transaction history for any party</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintStatement}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            >
              <Printer size={16} />
              Print
            </button>
            <button
              onClick={handleExportStatement}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            >
              <Download size={16} />
              Export
            </button>
            <button
              onClick={handleShareStatement}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            >
              <Share2 size={16} />
              Share
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow p-4 md:p-6 mb-6 border border-gray-100 z-[1]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          {/* Party Selection */}
          <div className="w-full md:w-80">
            <KeyboardDropdown
              options={parties.map(party => ({ value: party.name, label: party.name, phone: party.phone }))}
              value={selectedParty}
              onChange={setSelectedParty}
              placeholder="Search party..."
              label="Select Party"
              searchable={true}
              onOpen={() => {
                if (parties.length === 0) {
                  loadParties();
                }
              }}
              renderOption={(option, isSelected, isFocused) => (
                <div>
                  <div className="font-medium text-sm">{option.label}</div>
                  <div className="text-xs text-gray-500">{option.phone}</div>
                </div>
              )}
            />
          </div>

          {/* Date Range - Right Aligned */}
          <div className="flex flex-col md:flex-row gap-2 items-end ml-auto">
            <div className="w-full md:w-56">
              <KeyboardDropdown
                options={dateRanges}
                value={filterType}
                onChange={(value) => {
                  handleFilterTypeChange(value);
                  // Auto-fill date pickers for quick ranges
                  const today = new Date();
                  let from = '', to = '';
                  if (value === 'Today') {
                    from = to = today.toISOString().slice(0, 10);
                  } else if (value === 'Yesterday') {
                    const yest = new Date(today);
                    yest.setDate(today.getDate() - 1);
                    from = to = yest.toISOString().slice(0, 10);
                  } else if (value === 'This Week') {
                    const first = new Date(today);
                    first.setDate(today.getDate() - today.getDay());
                    from = first.toISOString().slice(0, 10);
                    to = today.toISOString().slice(0, 10);
                  } else if (value === 'This Month') {
                    const first = new Date(today.getFullYear(), today.getMonth(), 1);
                    from = first.toISOString().slice(0, 10);
                    to = today.toISOString().slice(0, 10);
                  } else if (value === 'Last Month') {
                    const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                    const last = new Date(today.getFullYear(), today.getMonth(), 0);
                    from = first.toISOString().slice(0, 10);
                    to = last.toISOString().slice(0, 10);
                  } else if (value === 'This Year') {
                    const first = new Date(today.getFullYear(), 0, 1);
                    from = first.toISOString().slice(0, 10);
                    to = today.toISOString().slice(0, 10);
                  } else if (value === 'All') {
                    from = '';
                    to = '';
                  }
                  if (value !== 'Custom') {
                    setDateFrom(from);
                    setDateTo(to);
                  }
                }}
                placeholder="Select date range"
                label="Date Range"
              />
            </div>

            {/* Custom Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
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
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
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
      </div>

      {/* Balance Summary */}
      {selectedParty && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-gradient-to-br from-blue-100 to-blue-50 p-6 rounded-2xl shadow group hover:shadow-lg transition-all flex flex-col items-start">
            <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-blue-500 text-white mb-3 text-xl">💰</div>
            <div className="text-2xl font-bold text-blue-700">
              {formatCurrency(openingBalance)}
            </div>
            <div className="text-sm text-gray-500">Opening Balance</div>
          </div>
          <div className="bg-gradient-to-br from-green-100 to-green-50 p-6 rounded-2xl shadow group hover:shadow-lg transition-all flex flex-col items-start">
            <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-green-500 text-white mb-3 text-xl">
              {currentBalance >= 0 ? '📈' : '📉'}
            </div>
            <div className={`text-2xl font-bold ${currentBalance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {formatCurrency(currentBalance)}
            </div>
            <div className="text-sm text-gray-500">Current Balance</div>
          </div>
          <div className="bg-gradient-to-br from-purple-100 to-purple-50 p-6 rounded-2xl shadow group hover:shadow-lg transition-all flex flex-col items-start">
            <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-purple-500 text-white mb-3 text-xl">📊</div>
            <div className="text-2xl font-bold text-purple-700">
              {filteredTransactions.length}
            </div>
            <div className="text-sm text-gray-500">Total Transactions</div>
          </div>
        </div>
      )}



      {/* Transactions Table */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : selectedParty ? (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 border-b border-gray-200 gap-4">
            <h2 className="text-lg font-semibold text-gray-900">Transactions</h2>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-full text-sm w-full md:w-64 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>
              <button
                onClick={handlePrintStatement}
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
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Txn Type</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Ref No</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Payment Type</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Total</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Received/Paid</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Txn Balance</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Payable Balance</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-8 text-center text-gray-500 text-lg font-medium">
                      {searchTerm
                        ? `No transactions found matching "${searchTerm}".`
                        : "No transactions found."}
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((transaction, index) => {
                    let runningBalance = openingBalance;
                    for (let i = 0; i <= index; i++) {
                      const txn = filteredTransactions[i];
                      if (txn.txnType === 'Sale Invoice') {
                        runningBalance += txn.total - txn.received;
                      } else if (txn.txnType === 'Purchase Bill') {
                        runningBalance -= txn.total - txn.paid;
                      } else if (txn.txnType === 'Payment In') {
                        runningBalance += txn.received;
                      } else if (txn.txnType === 'Payment Out') {
                        runningBalance -= txn.paid;
                      }
                    }

                    return (
                      <tr key={transaction.id} className={`hover:bg-blue-50/40 transition-all ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                        <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap text-center">
                          {formatDate(transaction.date)}
                        </td>
                        <td className="px-6 py-4 text-sm whitespace-nowrap text-center">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getTxnTypeColor(transaction.txnType)}`}>
                            {transaction.txnType}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-blue-700 font-bold whitespace-nowrap text-center">
                          {transaction.refNo}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap text-center">
                          {transaction.paymentType}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-blue-700 whitespace-nowrap text-center">
                          {formatCurrency(transaction.total)}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-green-600 whitespace-nowrap text-center">
                          {transaction.txnType === 'Sale Invoice' || transaction.txnType === 'Payment In' 
                            ? formatCurrency(transaction.received)
                            : formatCurrency(transaction.paid)
                          }
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-orange-600 whitespace-nowrap text-center">
                          {(transaction.txnType === 'Payment In' || transaction.txnType === 'Payment Out') ? '' : formatCurrency(transaction.balance)}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-center">
                          <span className={runningBalance >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {formatCurrency(runningBalance)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium whitespace-nowrap text-center">
                          <div className="flex justify-center gap-2">
                            <button className="text-blue-600 hover:text-blue-800">
                              <Eye size={16} />
                            </button>
                            <button className="text-gray-600 hover:text-gray-800">
                              <Printer size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="text-gray-500">Please select a party to view their statement</div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Party Statement Summary */}
      {selectedParty && (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow p-6 mb-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Party Statement Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 text-center">
            <div>
              <div className="text-sm text-gray-600 mb-1">Total Sale</div>
              <div className="text-lg font-bold text-green-600">{formatCurrency(summaryTotals.totalSale)}</div>
              <div className="text-xs text-gray-500">(Sale - Sale Return)</div>
            </div>
            
            <div>
              <div className="text-sm text-gray-600 mb-1">Total Purchase</div>
              <div className="text-lg font-bold text-red-600">{formatCurrency(summaryTotals.totalPurchase)}</div>
              <div className="text-xs text-gray-500">(Purchase - Purchase Return)</div>
            </div>
            
            <div>
              <div className="text-sm text-gray-600 mb-1">Total Receivable</div>
              <div className="text-lg font-bold text-indigo-600">{formatCurrency(summaryTotals.totalReceivable)}</div>
              <div className="text-xs text-gray-500">Outstanding amount</div>
            </div>
            
            <div>
              <div className="text-sm text-gray-600 mb-1">Total Payment In</div>
              <div className="text-lg font-bold text-blue-600">{formatCurrency(summaryTotals.totalMoneyIn)}</div>
              <div className="text-xs text-gray-500">Payments received</div>
            </div>
            
            <div>
              <div className="text-sm text-gray-600 mb-1">Total Payment Out</div>
              <div className="text-lg font-bold text-purple-600">{formatCurrency(summaryTotals.totalMoneyOut)}</div>
              <div className="text-xs text-gray-500">Payments made</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartyStatementPage;
