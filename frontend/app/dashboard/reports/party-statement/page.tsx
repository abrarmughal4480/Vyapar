"use client";
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Search, BarChart3, Printer, Settings, ChevronDown, Eye, Edit, MoreHorizontal, Trash2, Download, Filter, Calendar, Share2, AlertCircle, RefreshCw } from 'lucide-react';
import { jwtDecode } from 'jwt-decode';
import { fetchPartiesByUserId } from '@/http/parties';
import { getSalesByUser } from '@/http/sales';
import { getPurchasesByUser, getPayments, getPaymentOutsByUser } from '@/http/purchases';
import { getQuotationsForUser } from '@/http/quotations';
import { getSaleOrders } from '@/http/saleOrders';
import { getPurchaseOrders } from '@/http/purchaseOrders';
import { getCreditNotesByUser } from '@/http/credit-notes';
import { getDeliveryChallans } from '@/http/deliveryChallan';
import { getExpenses } from '@/http/expenses';
import Toast from '../../../components/Toast';
import ConfirmDialog from '../../../components/ConfirmDialog';
import KeyboardDropdown from '../../../components/KeyboardDropdown';
import { useRouter } from 'next/navigation';

interface Transaction {
  id: string;
  date: string;
  txnType: 'Sale Invoice' | 'Purchase Bill' | 'Payment In' | 'Payment Out' | 'Quotation' | 'Sale Order' | 'Purchase Order' | 'Credit Note' | 'Delivery Challan' | 'Expense';
  refNo: string;
  paymentType: string;
  total: number;
  received: number;
  paid: number;
  balance: number;
  partyName: string;
  description?: string;
  partyBalanceAfterTransaction?: number;
  isExpense?: boolean;
  receivedAmount?: number;
  creditAmount?: number;
}

const PartyStatementPage = () => {
  const [selectedParty, setSelectedParty] = useState('');
  const [parties, setParties] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [filterType, setFilterType] = useState('All');
  const [showDateDropdown, setShowDateDropdown] = useState(false);

  // Enhanced state management
  const [loadingStates, setLoadingStates] = useState({
    parties: false,
    transactions: false
  });
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [isClient, setIsClient] = useState(false);

  const router = useRouter();
  const dateDropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Ensure component is mounted on client side
  useEffect(() => {
    setIsClient(true);
  }, []);

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



  // Debounced search functionality
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      setSearchTerm(searchInput);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchInput]);

  // Load transactions when party changes
  useEffect(() => {
    if (selectedParty && isClient) {
      loadTransactions();
    } else if (!selectedParty) {
      setTransactions([]);
    }
  }, [selectedParty, isClient]);

  // Filter transactions when search or date filters change
  useEffect(() => {
    // This is now handled by useMemo, no need for manual filtering
  }, [transactions, searchTerm, dateFrom, dateTo]);

  // Date dropdown outside click handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dateDropdownRef.current &&
        !dateDropdownRef.current.contains(event.target as Node)
      ) {
        setShowDateDropdown(false);
      }
    }
    if (showDateDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDateDropdown]);

  const loadParties = async () => {
    if (!isClient || loadingStates.parties) return;
    
    try {
      setLoadingStates(prev => ({ ...prev, parties: true }));
      setError(null);
      
      const token = localStorage.getItem('token') || localStorage.getItem('vypar_auth_token') || '';
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
      setError('Failed to load parties. Please try again.');
      setParties([]);
    } finally {
      setLoadingStates(prev => ({ ...prev, parties: false }));
    }
  };

  const loadTransactions = useCallback(async () => {
    if (!selectedParty || !isClient || loadingStates.transactions) return;

    setLoadingStates(prev => ({ ...prev, transactions: true }));
    setError(null);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('vypar_auth_token') || '';
      if (!token) {
        setTransactions([]);
        setLoadingStates(prev => ({ ...prev, transactions: false }));
        return;
      }

      const decoded: any = jwtDecode(token);
      const userId = decoded._id || decoded.id;
      if (!userId) {
        setTransactions([]);
        setLoadingStates(prev => ({ ...prev, transactions: false }));
        return;
      }

      // Make all API calls in parallel for better performance
      const [
        salesResult,
        purchasesResult,
        paymentsResult,
        paymentOutsResult,
        quotationsResult,
        saleOrdersResult,
        purchaseOrdersResult,
        creditNotesResult,
        deliveryChallansResult,
        expensesResult
      ] = await Promise.all([
        getSalesByUser(userId, token),
        getPurchasesByUser(userId, token),
        getPayments(token),
        getPaymentOutsByUser(userId, token),
        getQuotationsForUser(token),
        getSaleOrders(token),
        getPurchaseOrders(token),
        getCreditNotesByUser(userId, token),
        getDeliveryChallans(token),
        getExpenses(token)
      ]);

      // Process sales transactions
      const sales = salesResult?.success && Array.isArray(salesResult.sales) 
        ? salesResult.sales.filter((sale: any) => sale.partyName === selectedParty)
        : [];

      // Process purchase transactions
      const purchases = purchasesResult?.success && Array.isArray(purchasesResult.purchases) 
        ? purchasesResult.purchases.filter((purchase: any) => purchase.supplierName === selectedParty)
        : [];

      // Process payment transactions
      const payments = paymentsResult?.success && Array.isArray(paymentsResult.payments) 
        ? paymentsResult.payments.filter((payment: any) => payment.supplierName === selectedParty)
        : [];

      // Process payment out transactions
      const paymentOuts = paymentOutsResult?.success && Array.isArray(paymentOutsResult.paymentOuts)
        ? paymentOutsResult.paymentOuts.filter((out: any) => out.supplierName === selectedParty)
        : [];

      // Process quotation transactions
      const quotations = quotationsResult?.success && Array.isArray(quotationsResult.data)
        ? quotationsResult.data.filter((quotation: any) => quotation.customerName === selectedParty)
        : [];

      // Process sale order transactions
      const saleOrders = saleOrdersResult?.success && Array.isArray(saleOrdersResult.data)
        ? saleOrdersResult.data.filter((order: any) => order.customerName === selectedParty)
        : [];

      // Process purchase order transactions
      const purchaseOrders = purchaseOrdersResult?.success && Array.isArray(purchaseOrdersResult.data)
        ? purchaseOrdersResult.data.filter((order: any) => order.supplierName === selectedParty)
        : [];

      // Process credit note transactions
      const creditNotes = creditNotesResult?.success && Array.isArray(creditNotesResult.creditNotes)
        ? creditNotesResult.creditNotes.filter((note: any) => note.partyName === selectedParty)
        : [];

      // Process delivery challan transactions
      const deliveryChallans = deliveryChallansResult?.success && Array.isArray(deliveryChallansResult.data)
        ? deliveryChallansResult.data.filter((challan: any) => challan.customerName === selectedParty)
        : [];

      // Process expense transactions
      const expenses = expensesResult?.success && Array.isArray(expensesResult.data)
        ? expensesResult.data.filter((expense: any) => expense.party === selectedParty)
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
          description: sale.description,
          partyBalanceAfterTransaction: sale.partyBalanceAfterTransaction || 0
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
            description: `Payment received for ${sale.invoiceNo || 'Invoice'}`,
            partyBalanceAfterTransaction: sale.partyBalanceAfterTransaction || 0
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
          description: purchase.description,
          partyBalanceAfterTransaction: purchase.partyBalanceAfterTransaction || 0
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
          description: payment.description,
          partyBalanceAfterTransaction: payment.partyBalanceAfterTransaction || 0
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
          description: out.description,
          partyBalanceAfterTransaction: out.partyBalanceAfterTransaction || 0
        });
      });

      // Add quotation transactions
      quotations.forEach((quotation: any) => {
        allTransactions.push({
          id: quotation._id || quotation.id,
          date: quotation.date || quotation.createdAt,
          txnType: 'Quotation',
          refNo: quotation.quotationNo || `QT-${quotation._id}`,
          paymentType: 'Credit',
          total: quotation.totalAmount || 0,
          received: 0,
          paid: 0,
          balance: quotation.totalAmount || 0,
          partyName: quotation.customerName,
          description: quotation.description,
          partyBalanceAfterTransaction: quotation.partyBalanceAfterTransaction || 0
        });
      });

      // Add sale order transactions
      saleOrders.forEach((order: any) => {
        allTransactions.push({
          id: order._id || order.id,
          date: order.orderDate || order.createdAt,
          txnType: 'Sale Order',
          refNo: order.orderNumber || `SO-${order._id}`,
          paymentType: 'Credit',
          total: order.total || 0,
          received: 0,
          paid: 0,
          balance: order.total || 0,
          partyName: order.customerName,
          description: order.description,
          partyBalanceAfterTransaction: order.partyBalanceAfterTransaction || 0
        });
      });

      // Add purchase order transactions
      purchaseOrders.forEach((order: any) => {
        allTransactions.push({
          id: order._id || order.id,
          date: order.orderDate || order.createdAt,
          txnType: 'Purchase Order',
          refNo: order.orderNumber || `PO-${order._id}`,
          paymentType: 'Credit',
          total: order.total || 0,
          received: 0,
          paid: 0,
          balance: order.total || 0,
          partyName: order.supplierName,
          description: order.description,
          partyBalanceAfterTransaction: order.partyBalanceAfterTransaction || 0
        });
      });

      // Add credit note transactions
      creditNotes.forEach((note: any) => {
        allTransactions.push({
          id: note._id || note.id,
          date: note.createdAt,
          txnType: 'Credit Note',
          refNo: note.creditNoteNo || `CN-${note._id}`,
          paymentType: 'Credit',
          total: note.grandTotal || 0,
          received: 0,
          paid: 0,
          balance: -(note.grandTotal || 0),
          partyName: note.partyName,
          description: note.description,
          partyBalanceAfterTransaction: note.partyBalanceAfterTransaction || 0
        });
      });

      // Add delivery challan transactions
      deliveryChallans.forEach((challan: any) => {
        allTransactions.push({
          id: challan._id || challan.id,
          date: challan.challanDate || challan.createdAt,
          txnType: 'Delivery Challan',
          refNo: challan.challanNumber || `DC-${challan._id}`,
          paymentType: 'Credit',
          total: 0,
          received: 0,
          paid: 0,
          balance: 0,
          partyName: challan.customerName,
          description: challan.description,
          partyBalanceAfterTransaction: challan.partyBalanceAfterTransaction || 0
        });
      });

      // Add expense transactions
      expenses.forEach((expense: any) => {
        const receivedAmount = expense.receivedAmount || 0;
        const creditAmount = expense.totalAmount - receivedAmount;
        
        allTransactions.push({
          id: expense._id || expense.id,
          date: expense.expenseDate || expense.createdAt,
          txnType: 'Expense',
          refNo: expense.expenseNumber || `EXP-${expense._id}`,
          paymentType: expense.paymentType || 'Cash',
          total: expense.totalAmount || 0,
          received: receivedAmount,
          paid: 0,
          balance: creditAmount, // For expenses: total - received = credit amount
          partyName: expense.party,
          description: expense.description,
          partyBalanceAfterTransaction: expense.partyBalanceAfterTransaction || 0,
          isExpense: true,
          receivedAmount: receivedAmount,
          creditAmount: creditAmount
        });
      });

      // Sort by date (newest first)
      allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Debug: Log transactions for verification
      console.log('All Transactions:', allTransactions);
      console.log('Selected Party:', selectedParty);
      console.log('Parties:', parties);

      setTransactions(allTransactions);

      // Calculate opening balance and current balance
      const selectedPartyData = parties.find(p => p.name === selectedParty);
      
      // Use currentBalance/balance as opening balance (what user wants)
      const openingBal = selectedPartyData?.currentBalance || selectedPartyData?.balance || 0;
      
      // Try to get current balance from database first, fallback to calculation
      let currentBal = selectedPartyData?.currentBalance || selectedPartyData?.balance;
      
      if (currentBal === undefined || currentBal === null) {
        // Fallback: Calculate current balance manually
        currentBal = openingBal;
        allTransactions.forEach(txn => {
          switch (txn.txnType) {
            case 'Sale Invoice':
              currentBal += txn.total - txn.received;
              break;
            case 'Purchase Bill':
              currentBal -= txn.total - txn.paid;
              break;
            case 'Payment In':
              currentBal += txn.received;
              break;
            case 'Payment Out':
              currentBal -= txn.paid;
              break;
            case 'Credit Note':
              currentBal += txn.balance;
              break;
            case 'Expense':
              if (txn.paymentType === 'Credit' && txn.balance > 0) {
                currentBal += txn.balance;
              }
              break;
          }
        });
      }
      
      setOpeningBalance(openingBal);
      setCurrentBalance(currentBal);

      // Debug: Log balance information
      console.log('Balance Info:', {
        partyName: selectedParty,
        openingBalance: openingBal,
        currentBalance: currentBal,
        partyData: selectedPartyData,
        calculatedBalance: currentBal,
        hasDatabaseBalance: selectedPartyData?.currentBalance !== undefined,
        note: 'Opening Balance now shows Current Balance from DB'
      });

    } catch (error) {
      console.error('Error loading transactions:', error);
      setError('Failed to load transactions. Please try again.');
      setTransactions([]);
    } finally {
      setLoadingStates(prev => ({ ...prev, transactions: false }));
    }
  }, [selectedParty, parties, isClient]);

  // Memoized filtered transactions for better performance
  const filteredTransactions = useMemo(() => {
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

    return filtered;
  }, [transactions, searchTerm, dateFrom, dateTo]);

  // Memoized summary totals calculation
  const summaryTotals = useMemo(() => {
    let totalSale = 0;
    let totalPurchase = 0;
    let totalMoneyIn = 0;
    let totalMoneyOut = 0;
    let totalReceivable = 0;
    let totalExpenses = 0;

    filteredTransactions.forEach(txn => {
      switch (txn.txnType) {
        case 'Sale Invoice':
          totalSale += txn.total;
          // For sales: outstanding amount = total - received
          totalReceivable += txn.total - txn.received;
          break;
        case 'Purchase Bill':
          totalPurchase += txn.total;
          // For purchases: outstanding amount = total - paid (this is what we owe)
          totalReceivable -= txn.total - txn.paid;
          break;
        case 'Payment In':
          totalMoneyIn += txn.received;
          // Payment received reduces receivable
          totalReceivable -= txn.received;
          break;
        case 'Payment Out':
          totalMoneyOut += txn.paid;
          // Payment made reduces payable (increases receivable)
          totalReceivable += txn.paid;
          break;
        case 'Credit Note':
          // Credit notes reduce receivable (they're like refunds)
          totalReceivable += txn.balance; // balance is already negative
          break;
        case 'Expense':
          totalExpenses += txn.total;
          // For credit expenses: add to receivable (what we're owed)
          if (txn.paymentType === 'Credit' && txn.balance > 0) {
            totalReceivable += txn.balance;
          }
          break;
        case 'Quotation':
        case 'Sale Order':
        case 'Purchase Order':
        case 'Delivery Challan':
          // These don't affect receivable/payable until converted to actual transactions
          break;
      }
    });

    // Also add received amounts from Sale Invoices to total money in
    filteredTransactions.forEach(txn => {
      if (txn.txnType === 'Sale Invoice' && txn.received > 0) {
        totalMoneyIn += txn.received;
      }
    });

    // Debug: Log summary calculations
    console.log('Summary Totals Calculation:', {
      totalSale,
      totalPurchase,
      totalMoneyIn,
      totalMoneyOut,
      totalReceivable,
      totalExpenses,
      transactionCount: filteredTransactions.length
    });

    return {
      totalSale,
      totalPurchase,
      totalMoneyIn,
      totalMoneyOut,
      totalReceivable,
      totalExpenses
    };
  }, [filteredTransactions]);

  const filterTransactions = () => {
    // This function is now simplified since filtering is handled by useMemo
    // We just need to trigger a re-render when filters change
  };

  const calculateSummaryTotals = (transactions: Transaction[]) => {
    // This function is now replaced by useMemo above
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

  const handleRefresh = useCallback(async () => {
    if (selectedParty && !loadingStates.transactions && isClient) {
      await loadTransactions();
      setLastRefresh(new Date());
      setToast({ message: 'Data refreshed successfully', type: 'success' });
    }
  }, [selectedParty, loadingStates.transactions, isClient]);

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
      case 'Quotation':
        return 'bg-purple-100 text-purple-800';
      case 'Sale Order':
        return 'bg-indigo-100 text-indigo-800';
      case 'Purchase Order':
        return 'bg-pink-100 text-pink-800';
      case 'Credit Note':
        return 'bg-yellow-100 text-yellow-800';
      case 'Delivery Challan':
        return 'bg-teal-100 text-teal-800';
      case 'Expense':
        return 'bg-amber-100 text-amber-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-3 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-md p-3 mb-4 sticky top-0 z-30 border border-gray-100">
        <div className="flex flex-col space-y-3 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div className="text-center md:text-left">
            <h1 className="text-lg md:text-xl font-bold text-gray-900">Party Statement</h1>
            <p className="text-xs text-gray-500 mt-1">View detailed transaction history for any party</p>
            {lastRefresh && isClient && (
              <p className="text-xs text-gray-400 mt-1">
                Last updated: {lastRefresh.toLocaleTimeString()}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={loadingStates.transactions || !selectedParty}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw size={12} className={loadingStates.transactions ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              onClick={handlePrintStatement}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            >
              <Printer size={12} />
              Print
            </button>
            <button
              onClick={handleExportStatement}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            >
              <Download size={12} />
              Export
            </button>
            <button
              onClick={handleShareStatement}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            >
              <Share2 size={12} />
              Share
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-red-500" />
            <span className="text-sm text-red-700">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-600"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Search & Filters Section (full width) */}
      <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow p-3 mb-4 border border-gray-100 z-[1]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
          {/* Party Selection */}
          <div className="w-full md:w-72">
            {!isClient ? (
              <div className="w-full h-10 bg-gray-100 rounded-full animate-pulse"></div>
            ) : (
              <KeyboardDropdown
                options={(parties || []).map(party => ({ value: party.name, label: party.name, phone: party.phone }))}
                value={selectedParty}
                onChange={setSelectedParty}
                placeholder="Search party..."
                label="Select Party"
                searchable={true}
                onOpen={() => {
                  if ((!parties || parties.length === 0) && isClient) {
                    loadParties();
                  }
                }}
                renderOption={(option, isSelected, isFocused) => (
                  <div>
                    <div className="font-medium text-xs">{option.label}</div>
                    <div className="text-xs text-gray-500">{option.phone}</div>
                  </div>
                )}
              />
            )}
            {loadingStates.parties && (
              <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                Loading parties...
              </div>
            )}
          </div>
          {/* Enhanced Date Range & Quick Filter Dropdown */}
          <div className="flex flex-col sm:flex-row gap-2 items-center mt-2">
            {/* Modern Dropdown for Date Range */}
            <div ref={dateDropdownRef} className="relative w-full sm:w-40">
              <button
                type="button"
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white/80 shadow border border-gray-200 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all group text-xs"
                onClick={() => setShowDateDropdown(!showDateDropdown)}
                aria-haspopup="listbox"
                aria-expanded={showDateDropdown ? 'true' : 'false'}
              >
                <span className="truncate">{dateRanges.find(r => r.value === filterType)?.label || 'All Time'}</span>
                <svg className={`w-3 h-3 ml-1.5 transition-transform ${showDateDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
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
                      className={`px-2.5 py-1 cursor-pointer rounded-md transition-all hover:bg-blue-50 text-xs ${filterType === range.value ? 'font-semibold text-blue-600 bg-blue-100' : 'text-gray-700'}`}
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
              className="px-2.5 py-1.5 rounded-lg bg-white border-2 border-gray-200 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm min-w-[120px] text-xs"
              placeholder="From Date"
              disabled={filterType !== 'Custom' && filterType !== 'All'}
            />
            <span className="text-gray-500 text-xs">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                if (filterType !== 'Custom') handleFilterTypeChange('Custom');
              }}
              className="px-2.5 py-1.5 rounded-lg bg-white border-2 border-gray-200 text-gray-700 focus:outline-none focus:ring-blue-500 shadow-sm min-w-[120px] text-xs"
              placeholder="To Date"
              disabled={filterType !== 'Custom' && filterType !== 'All'}
            />
          </div>
        </div>
      </div>

      {/* Balance Summary */}
      {selectedParty && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div className="bg-gradient-to-br from-orange-100 to-orange-50 p-4 rounded-xl shadow group hover:shadow-md transition-all flex flex-col items-start">
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-orange-500 text-white mb-2 text-lg">📋</div>
            <div className={`text-lg font-bold ${summaryTotals.totalReceivable >= 0 ? 'text-orange-700' : 'text-red-700'}`}>
              {formatCurrency(summaryTotals.totalReceivable)}
            </div>
            <div className="text-xs text-gray-500">Total Outstanding</div>
            <div className="text-xs text-gray-400 mt-1">
              {summaryTotals.totalReceivable >= 0 ? 'You are owed' : 'You owe'}
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-100 to-green-50 p-4 rounded-xl shadow group hover:shadow-md transition-all flex flex-col items-start">
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-green-500 text-white mb-2 text-lg">
              {currentBalance >= 0 ? '📈' : '📉'}
            </div>
            <div className={`text-lg font-bold ${currentBalance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {formatCurrency(currentBalance)}
            </div>
            <div className="text-xs text-gray-500">Current Balance</div>
          </div>
          <div className="bg-gradient-to-br from-purple-100 to-purple-50 p-4 rounded-xl shadow group hover:shadow-md transition-all flex flex-col items-start">
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-purple-500 text-white mb-2 text-lg">📊</div>
            <div className="text-lg font-bold text-purple-700">
              {filteredTransactions.length}
            </div>
            <div className="text-xs text-gray-500">Total Transactions</div>
          </div>
        </div>
      )}



      {/* Transactions Table */}
      {loadingStates.transactions ? (
        <div className="flex items-center justify-center py-6">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      ) : selectedParty ? (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-3 border-b border-gray-200 gap-2">
            <h2 className="text-sm font-semibold text-gray-900">Transactions</h2>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="w-3 h-3 absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-7 pr-2 py-1 border border-gray-300 rounded-md text-xs w-full md:w-44 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>
              <button
                onClick={handlePrintStatement}
                className="p-1 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                title="Print"
              >
                <Printer className="w-3 h-3 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-gray-50">
                <tr>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Date</th>
        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Txn Type</th>
        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Ref No</th>
        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Payment Type</th>
        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Total</th>
        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Received/Paid</th>
        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Txn Balance</th>
        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Party Balance</th>
        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-6 text-center text-gray-500 text-sm font-medium">
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
                      } else if (txn.txnType === 'Credit Note') {
                        runningBalance += txn.balance; // Credit note reduces balance
                      } else if (txn.txnType === 'Expense') {
                        // For expenses: if it's a credit expense, it increases receivable balance
                        if (txn.paymentType === 'Credit' && txn.balance > 0) {
                          runningBalance += txn.balance; // Add credit amount to receivable
                        }
                      }
                      // Other transaction types (Quotation, Orders, Delivery Challan) don't affect running balance
                    }

                    return (
                      <tr key={transaction.id} className={`hover:bg-blue-50/40 transition-all ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                        <td className="px-4 py-3 text-xs text-gray-900 whitespace-nowrap text-center">
                          {formatDate(transaction.date)}
                        </td>
                        <td className="px-4 py-3 text-xs whitespace-nowrap text-center">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getTxnTypeColor(transaction.txnType)}`}>
                            {transaction.txnType}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-blue-700 font-bold whitespace-nowrap text-center">
                          {transaction.refNo}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-900 whitespace-nowrap text-center">
                          {transaction.paymentType}
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold text-blue-700 whitespace-nowrap text-center">
                          {formatCurrency(transaction.total)}
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold text-green-600 whitespace-nowrap text-center">
                          {transaction.txnType === 'Sale Invoice' || transaction.txnType === 'Payment In' 
                            ? formatCurrency(transaction.received)
                            : transaction.txnType === 'Expense' 
                              ? formatCurrency(transaction.receivedAmount || 0)
                              : formatCurrency(transaction.paid)
                          }
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold text-orange-600 whitespace-nowrap text-center">
                          {transaction.txnType === 'Payment In' || transaction.txnType === 'Payment Out' || transaction.txnType === 'Delivery Challan' ? '' : 
                           transaction.txnType === 'Expense' ? 
                             (transaction.paymentType === 'Credit' ? formatCurrency(transaction.balance) : 'PKR 0.00') : 
                           formatCurrency(transaction.balance)
                          }
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold text-center">
                          <span className={(transaction.partyBalanceAfterTransaction || 0) >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {formatCurrency(transaction.partyBalanceAfterTransaction || 0)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs font-medium whitespace-nowrap text-center">
                          <div className="flex justify-center gap-2">
                            <button className="text-blue-600 hover:text-blue-800">
                              <Eye size={14} />
                            </button>
                            <button className="text-gray-600 hover:text-gray-800">
                              <Printer size={14} />
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
        <div className="text-center py-6">
          <div className="text-gray-500 text-sm">Please select a party to view their statement</div>
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
        <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-md p-4 mb-4 border border-gray-100">
          <h3 className="text-base font-semibold text-gray-900 mb-2">Party Statement Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4 text-center">
            <div>
              <div className="text-xs text-gray-600 mb-1">Total Sale</div>
              <div className="text-sm font-bold text-green-600">{formatCurrency(summaryTotals.totalSale)}</div>
              <div className="text-xs text-gray-500">(Sale - Sale Return)</div>
            </div>
            
            <div>
              <div className="text-xs text-gray-600 mb-1">Total Purchase</div>
              <div className="text-sm font-bold text-red-600">{formatCurrency(summaryTotals.totalPurchase)}</div>
              <div className="text-xs text-gray-500">(Purchase - Purchase Return)</div>
            </div>
            
            <div>
              <div className="text-xs text-gray-600 mb-1">Total Receivable</div>
              <div className="text-sm font-bold text-indigo-600">{formatCurrency(summaryTotals.totalReceivable)}</div>
              <div className="text-xs text-gray-500">Outstanding amount</div>
            </div>
            
            <div>
              <div className="text-xs text-gray-600 mb-1">Total Payment In</div>
              <div className="text-sm font-bold text-blue-600">{formatCurrency(summaryTotals.totalMoneyIn)}</div>
              <div className="text-xs text-gray-500">Payments received</div>
            </div>
            
            <div>
              <div className="text-xs text-gray-600 mb-1">Total Payment Out</div>
              <div className="text-sm font-bold text-purple-600">{formatCurrency(summaryTotals.totalMoneyOut)}</div>
              <div className="text-xs text-gray-500">Payments made</div>
            </div>
            
            <div>
              <div className="text-xs text-gray-600 mb-1">Total Expenses</div>
              <div className="text-sm font-bold text-orange-600">{formatCurrency(summaryTotals.totalExpenses)}</div>
              <div className="text-xs text-gray-500">Business expenses</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartyStatementPage;
