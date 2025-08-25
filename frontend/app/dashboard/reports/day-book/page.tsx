"use client";
import React, { useState, useEffect } from 'react';
import { Printer, Share2 } from 'lucide-react';
import TableActionMenu from '../../../components/TableActionMenu';
import { getToken, getUserIdFromToken } from '../../../lib/auth';
import { getSalesByUser } from '../../../../http/sales';
import { getPurchasesByUser, getPayments, getPaymentOutsByUser } from '../../../../http/purchases';

interface TransactionEntry {
  id: string;
  name: string;
  ref: string;
  type: string;
  total: number;
  totalIn: number;
  out: number;
  date: string;
  paymentType?: string;
}

export default function DayBookPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  });
  const [filteredData, setFilteredData] = useState<TransactionEntry[]>([]);
  const [statusFilter, setStatusFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [allData, setAllData] = useState<TransactionEntry[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const token = getToken();
        const userId = getUserIdFromToken();
        if (!token || !userId) throw new Error('Not authenticated');
        // Fetch all data
        const [salesRes, purchasesRes, paymentsRes, paymentOutsRes] = await Promise.all([
          getSalesByUser(userId, token),
          getPurchasesByUser(userId, token),
          getPayments(token),
          getPaymentOutsByUser(userId, token)
        ]);
        // Map to unified format with proper payment in/out calculation
        const sales = (salesRes.sales || []).map((s: any) => {
          const paymentType = s.paymentType || (s.received === s.grandTotal ? 'Cash' : 'Credit');
          const moneyIn = s.received || 0;
          const moneyOut = 0;
          
          return {
            id: s._id,
            name: s.partyName,
            ref: s.invoiceNo || s._id,
            type: 'Sale',
            total: s.grandTotal,
            totalIn: moneyIn,
            out: moneyOut,
            date: s.createdAt?.slice(0, 10) || '',
            paymentType: paymentType,
          };
        });
        
        const purchases = (purchasesRes.purchases || []).map((p: any) => {
          const paymentType = p.paymentType || (p.paid === p.grandTotal ? 'Cash' : 'Credit');
          const moneyIn = 0;
          const moneyOut = p.paid || 0;
          
          return {
            id: p._id,
            name: p.supplierName,
            ref: p.billNo || p._id,
            type: 'Purchase',
            total: p.grandTotal,
            totalIn: moneyIn,
            out: moneyOut,
            date: p.createdAt?.slice(0, 10) || '',
            paymentType: paymentType,
          };
        });
        
        // Only include separate payment entries for NON-cash transactions to avoid duplicates
        const paymentIns: TransactionEntry[] = (paymentsRes.payments || [])
          .filter((p: any) => p.paymentType !== 'Cash')
          .map((p: any) => ({
            id: p._id,
            name: p.partyName || 'Payment Received',
            ref: p.paymentRef || p._id,
            type: 'Payment In',
            total: p.amount,
            totalIn: p.amount,
            out: 0,
            date: p.paymentDate?.slice(0, 10) || p.createdAt?.slice(0, 10) || '',
            paymentType: p.paymentType || 'Credit',
          }));
        
        // Only include separate payment out entries for NON-cash transactions to avoid duplicates
        const paymentOuts: TransactionEntry[] = (paymentOutsRes.paymentOuts || [])
          .filter((p: any) => p.paymentType !== 'Cash')
          .map((p: any) => ({
            id: p._id,
            name: p.supplierName || 'Payment Made',
            ref: p.paymentRef || p._id,
            type: 'Payment Out',
            total: p.amount,
            totalIn: 0,
            out: p.amount,
            date: p.paymentDate?.slice(0, 10) || p.createdAt?.slice(0, 10) || '',
            paymentType: p.paymentType || 'Credit',
          }));
        
        let all: TransactionEntry[] = [...sales, ...purchases, ...paymentIns, ...paymentOuts];
        
        // Debug logging
        console.log('Day Book Data:', {
          sales: sales.length,
          purchases: purchases.length,
          paymentIns: paymentIns.length,
          paymentOuts: paymentOuts.length,
          totalIn: all.reduce((sum, entry) => sum + (entry.totalIn || 0), 0),
          totalOut: all.reduce((sum, entry) => sum + (entry.out || 0), 0),
          sampleSales: sales.slice(0, 2),
          samplePayments: paymentIns.slice(0, 2),
          note: 'Cash transactions show only main entry, Credit transactions show both main entry and payment entry'
        });
        
        // Sort by date descending
        all = all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setAllData(all);
        setFilteredData(all);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    let data = allData;
    if (searchTerm) {
      data = data.filter(entry =>
        entry.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.ref.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    // Always filter by date (selected or today)
    if (dateFilter) {
      data = data.filter(entry => entry.date === dateFilter);
    }
    if (statusFilter !== 'All') {
      data = data.filter(entry => entry.type === statusFilter);
    }
    setFilteredData(data);
  }, [searchTerm, dateFilter, statusFilter, allData]);

  // Calculate stats
  const totalIn = filteredData.reduce((sum, entry) => sum + (entry.totalIn || 0), 0);
  const totalOut = filteredData.reduce((sum, entry) => sum + (entry.out || 0), 0);
  const balance = totalIn - totalOut;

  const statusTabs = ['All', 'Sale', 'Purchase', 'Payment In', 'Payment Out'];

  if (loading) {
    return <div className="text-center py-6 text-gray-400 text-sm">Loading...</div>;
  }

  if (error) {
    return <div className="text-center py-6 text-red-500 text-sm">{error}</div>;
  }

  return (
    <div className="p-3 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-md p-3 mb-4 sticky top-0 z-30 border border-gray-100">
        <div className="flex flex-col space-y-3 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div className="text-center md:text-left">
            <h1 className="text-lg md:text-xl font-bold text-gray-900">Day Book</h1>
            <p className="text-xs text-gray-500 mt-1">View all daily transactions in one place</p>
            <p className="text-xs text-blue-600 mt-1">
              💡 Cash transactions show only main entry, Credit transactions show both main entry and payment entry
            </p>
          </div>
        </div>
      </div>
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        <div className="bg-gradient-to-br from-blue-100 to-blue-50 p-4 rounded-xl shadow group hover:shadow-md transition-all flex flex-col items-start">
          <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-500 text-white mb-2 text-lg">⬆️</div>
          <div className="text-lg font-bold text-blue-700">PKR {totalIn.toLocaleString()}</div>
          <div className="text-xs text-gray-500">Total In</div>
        </div>
        <div className="bg-gradient-to-br from-red-100 to-red-50 p-4 rounded-xl shadow group hover:shadow-md transition-all flex flex-col items-start">
          <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-500 text-white mb-2 text-lg">⬇️</div>
          <div className="text-lg font-bold text-red-700">PKR {totalOut.toLocaleString()}</div>
          <div className="text-xs text-gray-500">Total Out</div>
        </div>
        <div className="bg-gradient-to-br from-green-100 to-green-50 p-4 rounded-xl shadow group hover:shadow-md transition-all flex flex-col items-start">
          <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-green-500 text-white mb-2 text-lg">💰</div>
          <div className="text-lg font-bold text-green-700">PKR {balance.toLocaleString()}</div>
          <div className="text-xs text-gray-500">Balance</div>
        </div>
      </div>
      {/* Search & Filters */}
      <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow p-3 mb-4 border border-gray-100 z-[1]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
          <div className="relative w-full md:w-72">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-sm">🔍</span>
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-lg bg-white/80 shadow focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border border-gray-200 transition-all placeholder-gray-400 text-gray-900 text-sm"
            />
          </div>
          <div className="flex gap-2 md:gap-3">
            {statusTabs.map(tab => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors text-xs border-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  statusFilter === tab
                    ? 'bg-blue-600 text-white border-blue-600 shadow scale-105'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-blue-50'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div>
            <input
              type="date"
              className="pl-2 pr-3 py-1.5 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-xs"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
            />
          </div>
        </div>
      </div>
      {/* Table */}
      <div className="overflow-x-auto bg-white rounded-xl shadow-md border border-gray-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 border-b border-gray-200 gap-3">
          <h2 className="text-base font-semibold text-gray-900">Transactions</h2>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ref</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Money In</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Money Out</th>
              <th className="px-1 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">Print/Share</th>
              <th className="px-1 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-8"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-6 text-gray-400 text-sm">No records found.</td>
              </tr>
            ) : (
              filteredData.map(entry => (
                <tr key={entry.id}>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900">{entry.name}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">{entry.ref}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-indigo-700 font-semibold">{entry.type}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">
                    {entry.paymentType ? (
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        entry.paymentType === 'Cash' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {entry.paymentType}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900 font-bold">{entry.total ? entry.total.toLocaleString() : '-'}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-emerald-700 font-bold">{entry.totalIn ? entry.totalIn.toLocaleString() : '-'}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-red-700 font-bold">{entry.out ? entry.out.toLocaleString() : '-'}</td>
                  <td className="px-1 py-3 whitespace-nowrap text-xs w-16">
                    <div className="flex items-center gap-1">
                      <button className="p-1 text-blue-700 hover:text-blue-900 transition-all" title="Print">
                        <Printer className="w-3 h-3" />
                      </button>
                      <button className="p-1 text-green-700 hover:text-green-900 transition-all" title="Share">
                        <Share2 className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                  <td className="px-1 py-3 whitespace-nowrap text-xs w-8">
                    <TableActionMenu
                      onView={() => alert(`View ${entry.ref}`)}
                      onEdit={() => alert(`Edit ${entry.ref}`)}
                      onDelete={() => alert(`Delete ${entry.ref}`)}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
