"use client";
import React, { useState, useEffect } from 'react';
import { Search, Calendar, ChevronDown, Printer, Share2 } from 'lucide-react';
import TableActionMenu from '../../../components/TableActionMenu';

const dummyDayBookData = [
  { id: 1, name: 'ABC Traders', ref: 'INV-123', type: 'Sale', total: 5000, totalIn: 5000, out: 0, date: '2024-06-19' },
  { id: 2, name: 'XYZ Suppliers', ref: 'BILL-456', type: 'Purchase', total: 3000, totalIn: 0, out: 3000, date: '2024-06-19' },
  { id: 3, name: 'ABC Traders', ref: 'PAY-789', type: 'Payment In', total: 2000, totalIn: 2000, out: 0, date: '2024-06-19' },
  { id: 4, name: 'XYZ Suppliers', ref: 'PMT-101', type: 'Payment Out', total: 1000, totalIn: 0, out: 1000, date: '2024-06-19' },
];

export default function DayBookPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [filteredData, setFilteredData] = useState(dummyDayBookData);
  const [statusFilter, setStatusFilter] = useState('All');

  // Calculate stats
  const totalIn = filteredData.reduce((sum, entry) => sum + (entry.totalIn || 0), 0);
  const totalOut = filteredData.reduce((sum, entry) => sum + (entry.out || 0), 0);
  const balance = totalIn - totalOut;

  useEffect(() => {
    let data = dummyDayBookData;
    if (searchTerm) {
      data = data.filter(entry =>
        entry.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (entry.ref && entry.ref.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    if (dateFilter) {
      data = data.filter(entry => entry.date === dateFilter);
    }
    if (statusFilter !== 'All') {
      data = data.filter(entry => entry.type === statusFilter);
    }
    setFilteredData(data);
  }, [searchTerm, dateFilter, statusFilter]);

  const statusTabs = ['All', 'Sale', 'Purchase', 'Payment In', 'Payment Out'];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-4 md:p-6 mb-6 sticky top-0 z-30 border border-gray-100">
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div className="text-center md:text-left">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Day Book</h1>
            <p className="text-sm text-gray-500 mt-1">View all daily transactions in one place</p>
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
          <div className="flex gap-2 md:gap-4">
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
          <div>
            <input
              type="date"
              className="pl-3 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
            />
          </div>
        </div>
      </div>
      {/* Table */}
      <div className="overflow-x-auto bg-white rounded-2xl shadow-lg border border-gray-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 border-b border-gray-200 gap-4">
          <h2 className="text-lg font-semibold text-gray-900">Transactions</h2>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ref</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Money In</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Money Out</th>
              <th className="px-1 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">Print/Share</th>
              <th className="px-1 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-8"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-gray-400">No records found.</td>
              </tr>
            ) : (
              filteredData.map(entry => (
                <tr key={entry.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{entry.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{entry.ref}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-indigo-700 font-semibold">{entry.type}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">{entry.total ? entry.total.toLocaleString() : '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-emerald-700 font-bold">{entry.totalIn ? entry.totalIn.toLocaleString() : '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-700 font-bold">{entry.out ? entry.out.toLocaleString() : '-'}</td>
                  <td className="px-1 py-4 whitespace-nowrap text-sm w-16">
                    <div className="flex items-center gap-1">
                      <button className="p-1 text-blue-700 hover:text-blue-900 transition-all" title="Print">
                        <Printer className="w-4 h-4" />
                      </button>
                      <button className="p-1 text-green-700 hover:text-green-900 transition-all" title="Share">
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                  <td className="px-1 py-4 whitespace-nowrap text-sm w-8">
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
