"use client";
import React, { useState, useEffect } from 'react';
import { Printer, Share2, ChevronDown } from 'lucide-react';
import TableActionMenu from '../../../components/TableActionMenu';

const dummyAllTransactionsData = [
  {
    id: 1,
    date: '2024-06-19',
    ref: 'INV-123',
    partyName: 'ABC Traders',
    type: 'Sale',
    paymentType: 'Cash',
    amount: 5000,
    paid: 5000,
    balance: 0,
    status: 'Paid',
    firm: 'Vyapar Pvt Ltd',
  },
  {
    id: 2,
    date: '2024-06-19',
    ref: 'BILL-456',
    partyName: 'XYZ Suppliers',
    type: 'Purchase',
    paymentType: 'Credit',
    amount: 3000,
    paid: 1000,
    balance: 2000,
    status: 'Partial',
    firm: 'Vyapar Pvt Ltd',
  },
  {
    id: 3,
    date: '2024-06-19',
    ref: 'PAY-789',
    partyName: 'ABC Traders',
    type: 'Payment In',
    paymentType: 'Cash',
    amount: 2000,
    paid: 2000,
    balance: 0,
    status: 'Paid',
    firm: 'Vyapar Associates',
  },
  {
    id: 4,
    date: '2024-06-19',
    ref: 'PMT-101',
    partyName: 'XYZ Suppliers',
    type: 'Payment Out',
    paymentType: 'Bank',
    amount: 1000,
    paid: '-',
    balance: '-',
    status: '-',
    firm: 'Vyapar Associates',
  },
];

export default function AllTransactionsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filteredData, setFilteredData] = useState(dummyAllTransactionsData);
  const [statusFilter, setStatusFilter] = useState('All');
  const [firmFilter, setFirmFilter] = useState('All Firms');

  // Calculate stats
  const totalIn = filteredData.reduce((sum, entry) => {
    if (entry.type === 'Sale' || entry.type === 'Payment In') {
      return sum + (typeof entry.amount === 'number' ? entry.amount : 0);
    }
    return sum;
  }, 0);
  const totalOut = filteredData.reduce((sum, entry) => {
    if (entry.type === 'Purchase' || entry.type === 'Payment Out') {
      return sum + (typeof entry.amount === 'number' ? entry.amount : 0);
    }
    return sum;
  }, 0);
  const balance = totalIn - totalOut;

  useEffect(() => {
    let data = dummyAllTransactionsData;
    if (searchTerm) {
      data = data.filter(entry =>
        entry.partyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (entry.ref && entry.ref.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    if (firmFilter !== 'All Firms') {
      data = data.filter(entry => entry.firm === firmFilter);
    }
    if (dateFrom) {
      data = data.filter(entry => entry.date >= dateFrom);
    }
    if (dateTo) {
      data = data.filter(entry => entry.date <= dateTo);
    }
    if (statusFilter !== 'All') {
      data = data.filter(entry => entry.type === statusFilter);
    }
    setFilteredData(data);
  }, [searchTerm, firmFilter, dateFrom, dateTo, statusFilter]);

  const statusTabs = ['All', 'Sale', 'Purchase', 'Payment In', 'Payment Out'];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-4 md:p-6 mb-6 sticky top-0 z-30 border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between md:space-y-0 md:space-y-0">
          <div className="text-center md:text-left">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">All Transactions</h1>
            <p className="text-sm text-gray-500 mt-1">View all transactions in one place</p>
          </div>
          <div className="mt-4 md:mt-0 md:text-right relative inline-block" style={{ minWidth: 160 }}>
            <select
              value={firmFilter}
              onChange={e => setFirmFilter(e.target.value)}
              className="px-3 py-2 pr-8 border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white rounded-full appearance-none w-full"
            >
              <option value="All Firms">All Firms</option>
              <option value="Devease Digital Pvt Ltd">Devease Digital Pvt Ltd</option>
              <option value="Devease Digital Associates">Devease Digital Associates</option>
            </select>
            <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6">
        <div className="bg-gradient-to-br from-blue-100 to-blue-50 p-6 rounded-2xl shadow group hover:shadow-lg transition-all flex flex-col items-start">
          <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-blue-500 text-white mb-3 text-xl">⬆️</div>
          <div className="text-2xl font-bold text-blue-700">PKR {totalIn.toLocaleString()}</div>
          <div className="text-sm text-gray-500">Total In</div>
        </div>
        <div className="bg-gradient-to-br from-red-100 to-red-50 p-6 rounded-2xl shadow group hover:shadow-lg transition-all flex flex-col items-start">
          <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-500 text-white mb-3 text-xl">⬇️</div>
          <div className="text-2xl font-bold text-red-700">PKR {totalOut.toLocaleString()}</div>
          <div className="text-sm text-gray-500">Total Out</div>
        </div>
        <div className="bg-gradient-to-br from-green-100 to-green-50 p-6 rounded-2xl shadow group hover:shadow-lg transition-all flex flex-col items-start">
          <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-green-500 text-white mb-3 text-xl">💰</div>
          <div className="text-2xl font-bold text-green-700">PKR {balance.toLocaleString()}</div>
          <div className="text-sm text-gray-500">Balance</div>
        </div>
      </div>
      {/* Search & Filters */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow p-4 md:p-6 mb-6 border border-gray-100 z-[1]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div className="relative w-full md:w-80">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-lg">🔍</span>
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white/80 shadow focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border border-gray-200 transition-all placeholder-gray-400 text-gray-900"
            />
          </div>
          <div className="flex gap-2 md:gap-4 items-center">
            {statusTabs.map(tab => (
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
          <div className="flex gap-2 items-center">
            <label className="text-xs text-gray-500">From</label>
            <input
              type="date"
              className="pl-3 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
            />
            <label className="text-xs text-gray-500">To</label>
            <input
              type="date"
              className="pl-3 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
            />
          </div>
        </div>
      </div>
      {/* Table Section */}
      <div className="overflow-x-auto bg-white rounded-2xl shadow-lg border border-gray-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 border-b border-gray-200 gap-4">
          <h2 className="text-lg font-semibold text-gray-900">Transactions</h2>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ref</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Party Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-1 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center py-8 text-gray-400">No records found.</td>
              </tr>
            ) : (
              filteredData.map(entry => (
                <tr key={entry.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{entry.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{entry.ref}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{entry.partyName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-indigo-700 font-semibold">{entry.type}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{entry.paymentType}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-700 font-bold">{typeof entry.amount === 'number' ? `PKR ${entry.amount.toLocaleString()}` : '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-700 font-bold">{typeof entry.paid === 'number' ? `PKR ${entry.paid.toLocaleString()}` : entry.paid}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-700 font-bold">{typeof entry.balance === 'number' ? `PKR ${entry.balance.toLocaleString()}` : entry.balance}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {entry.status === 'Paid' && <span className="px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Paid</span>}
                    {entry.status === 'Partial' && <span className="px-3 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">Partial</span>}
                    {entry.status === 'Unpaid' && <span className="px-3 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">Unpaid</span>}
                    {entry.status === '-' && <span className="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-500">-</span>}
                  </td>
                  <td className="px-1 py-4 whitespace-nowrap text-sm w-24">
                    <div className="flex items-center gap-1">
                      <button className="p-1 text-blue-700 hover:text-blue-900 transition-all" title="Print">
                        <Printer className="w-4 h-4" />
                      </button>
                      <button className="p-1 text-green-700 hover:text-green-900 transition-all" title="Share">
                        <Share2 className="w-4 h-4" />
                      </button>
                      <TableActionMenu
                        onView={() => alert(`View ${entry.ref}`)}
                        onEdit={() => alert(`Edit ${entry.ref}`)}
                        onDelete={() => alert(`Delete ${entry.ref}`)}
                      />
                    </div>
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
