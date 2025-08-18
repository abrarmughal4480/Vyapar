"use client";
import React, { useState, useEffect } from 'react';
import { Plus, X, AlertCircle } from 'lucide-react';
import { cashBankAPI, CashAdjustment } from '../../../http/cash-bank';

interface CashSummary {
  cashInHand: number;
  summary: {
    totalSales: number;
    totalReceived: number;
    totalSalesBalance: number;
    totalPurchases: number;
    totalPaid: number;
    totalPurchaseBalance: number;
    totalExpenses: number;
    totalCreditNotes: number;
    netCashFlow: number;
  };
  recentTransactions: {
    sales: any[];
    purchases: any[];
    creditNotes: any[];
    expenses: any[];
  };
}

interface Transaction {
  id: string;
  type: string;
  reference: string;
  party: string;
  amount: number;
  received?: number;
  paid?: number;
  balance?: number;
  paymentType?: string;
  date: string;
  category: string;
  description?: string;
}

export default function CashBankPage() {
  const [cashSummary, setCashSummary] = useState<CashSummary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentDate, setAdjustmentDate] = useState('');
  const [adjustmentType, setAdjustmentType] = useState<'Income' | 'Expense'>('Income');
  const [adjustmentDescription, setAdjustmentDescription] = useState('');
  const [savingAdjustment, setSavingAdjustment] = useState(false);

  // Get authentication token
  const getAuthToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token') || localStorage.getItem('devease_auth_token');
    }
    return null;
  };

  // Fetch cash summary data
  const fetchCashSummary = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        setError('Authentication token not found');
        return;
      }

      const response = await cashBankAPI.getSummary(token);
      if (response.success) {
        setCashSummary(response.data);
      } else {
        setError(response.message || 'Failed to fetch cash summary');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch cash summary');
    }
  };

  // Fetch transactions
  const fetchTransactions = async (page = 1) => {
    try {
      const token = getAuthToken();
      if (!token) {
        setError('Authentication token not found');
        return;
      }

      const response = await cashBankAPI.getTransactions(token, { page, limit: 20 });
      if (response.success) {
        setTransactions(response.data);
      } else {
        setError(response.message || 'Failed to fetch transactions');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch transactions');
    }
  };

  // Fetch all data
  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        fetchCashSummary(),
        fetchTransactions(1)
      ]);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };



  // Handle opening adjust cash modal
  const handleAdjustCash = () => {
    setShowAdjustModal(true);
    // Set default date to today
    setAdjustmentDate(new Date().toISOString().slice(0, 10));
  };

  // Handle cash adjustment
  const handleSaveAdjustment = async () => {
    if (!adjustmentAmount || !adjustmentDate || !adjustmentDescription) {
      alert('Please fill in all fields');
      return;
    }

    const amount = parseFloat(adjustmentAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    setSavingAdjustment(true);
    try {
      const token = getAuthToken();
      if (!token) {
        alert('Authentication token not found');
        return;
      }

      const adjustment: CashAdjustment = {
        type: adjustmentType,
        amount,
        description: adjustmentDescription,
        date: adjustmentDate
      };

      const response = await cashBankAPI.addAdjustment(token, adjustment);
      if (response.success) {
        // Refresh data to show updated balance and new transaction
        await fetchAllData();
        
        // Reset form and close modal
        setAdjustmentAmount('');
        setAdjustmentDate('');
        setAdjustmentType('Income');
        setAdjustmentDescription('');
        setShowAdjustModal(false);
        
        alert(`Cash adjustment added successfully! New balance: PKR ${response.data.newBalance.toLocaleString()}`);
      } else {
        alert(response.message || 'Failed to add cash adjustment');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to add cash adjustment');
    } finally {
      setSavingAdjustment(false);
    }
  };



  // Close modal
  const closeModal = () => {
    setShowAdjustModal(false);
    setAdjustmentAmount('');
    setAdjustmentDate('');
    setAdjustmentType('Income');
    setAdjustmentDescription('');
  };

  // Format amount with proper sign
  const formatAmount = (amount: number, type: string) => {
    const sign = type === 'Income' || type === 'Sale' ? '+' : '-';
    return `${sign} PKR ${Math.abs(amount).toLocaleString()}`;
  };

  // Get amount color
  const getAmountColor = (type: string) => {
    return type === 'Income' || type === 'Sale' ? 'text-green-600' : 'text-red-600';
  };

  // Get type badge styling
  const getTypeBadgeStyle = (type: string) => {
    if (type === 'Income' || type === 'Sale') {
      return 'bg-green-100 text-green-800';
    } else if (type === 'Expense' || type === 'Purchase') {
      return 'bg-red-100 text-red-800';
    } else if (type === 'Credit Note') {
      return 'bg-blue-100 text-blue-800';
    }
    return 'bg-gray-100 text-gray-800';
  };

  // Load data on component mount
  useEffect(() => {
    fetchAllData();
  }, []);



  if (error) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Data</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchAllData}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-4 md:p-6 mb-6 sticky top-0 z-30 border border-gray-100">
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div className="text-center md:text-left flex items-center gap-4">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Cash in Hand</h1>
            {cashSummary && (
              <div className={`text-3xl font-bold ${cashSummary.cashInHand >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                PKR {cashSummary.cashInHand.toLocaleString()}
              </div>
            )}
          </div>
          <div className="flex flex-col md:flex-row gap-2 md:gap-4">
            <button
              onClick={() => setShowAdjustModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow"
            >
              <Plus className="w-4 h-4" />
              Adjust Cash
            </button>
          </div>
        </div>
        
        {/* Summary Cards */}
        {cashSummary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-green-800">Total Sales</h3>
              <p className="text-2xl font-bold text-green-600">PKR {cashSummary.summary.totalSales.toLocaleString()}</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-800">Total Received</h3>
              <p className="text-2xl font-bold text-blue-600">PKR {cashSummary.summary.totalReceived.toLocaleString()}</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-red-800">Total Expenses</h3>
              <p className="text-2xl font-bold text-red-600">PKR {cashSummary.summary.totalExpenses.toLocaleString()}</p>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-purple-800">Net Cash Flow</h3>
              <p className={`text-2xl font-bold ${cashSummary.summary.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                PKR {cashSummary.summary.netCashFlow.toLocaleString()}
              </p>
            </div>
          </div>
        )}
        
        <p className="text-sm text-gray-500 mt-4 text-center md:text-left">Manage your cash flow and transactions</p>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 border-b border-gray-200 gap-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Category</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Reference</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Date</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500 text-lg font-medium">
                    No transactions found.
                  </td>
                </tr>
              ) : (
                transactions.map((transaction, idx) => (
                  <tr key={transaction.id} className={`hover:bg-blue-50/40 transition-all ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="px-6 py-4 text-sm text-gray-600">{transaction.category}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">{transaction.reference}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {new Date(transaction.date).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold">
                      <span className={getAmountColor(transaction.type)}>
                        {formatAmount(transaction.amount, transaction.type)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>


      </div>

      {/* Adjust Cash Modal */}
      {showAdjustModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Adjust Cash</h3>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="space-y-4">
              {/* Adjustment Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Adjustment Type
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setAdjustmentType('Income')}
                    className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
                      adjustmentType === 'Income'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-300 text-gray-700 hover:border-green-300'
                    }`}
                  >
                    Add Cash
                  </button>
                  <button
                    onClick={() => setAdjustmentType('Expense')}
                    className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
                      adjustmentType === 'Expense'
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-gray-300 text-gray-700 hover:border-red-300'
                    }`}
                  >
                    Subtract Cash
                  </button>
                </div>
              </div>

              {/* Amount Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (PKR)
                </label>
                <input
                  type="number"
                  value={adjustmentAmount}
                  onChange={(e) => setAdjustmentAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  min="0"
                  step="0.01"
                />
              </div>

              {/* Description Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={adjustmentDescription}
                  onChange={(e) => setAdjustmentDescription(e.target.value)}
                  placeholder="Enter description"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>

              {/* Date Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Adjustment Date
                </label>
                <input
                  type="date"
                  value={adjustmentDate}
                  onChange={(e) => setAdjustmentDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={closeModal}
                disabled={savingAdjustment}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAdjustment}
                disabled={savingAdjustment}
                className={`flex-1 py-2 px-4 rounded-lg text-white font-medium transition-colors disabled:opacity-50 ${
                  adjustmentType === 'Income'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {savingAdjustment ? 'Saving...' : 'Save Adjustment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}