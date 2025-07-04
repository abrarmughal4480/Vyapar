"use client";
import React, { useState, useEffect } from 'react';
import { Search, FileSpreadsheet, Printer, MoreVertical, Calendar, ChevronDown } from 'lucide-react';
import Toast from '../../components/Toast';

const CashoutPage = () => {
  const [businessName, setBusinessName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFirm, setSelectedFirm] = useState('ALL FIRMS');
  const [selectedType, setSelectedType] = useState('Payment-Out');
  const [dateRange, setDateRange] = useState({
    from: '2025-06-01',
    to: '2025-06-30'
  });
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedParty, setSelectedParty] = useState('');
  const [receiptNo, setReceiptNo] = useState('');
  const [paymentDate, setPaymentDate] = useState('2025-06-19');
  const [paidAmount, setPaidAmount] = useState('');
  const [description, setDescription] = useState('');
  const [showDescription, setShowDescription] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Sample data for dropdowns
  const firms = ['ALL FIRMS', 'Firm 1', 'Firm 2', 'Firm 3'];
  const types = ['Payment-Out', 'Payment-In', 'Cash Sale', 'Credit Sale'];
  const parties = [
    { id: 'manaN', name: 'manaN', number: '2343078', balance: '4556864' },
    { id: 'party2', name: 'Party 2', number: '2343079', balance: '125000' },
    { id: 'party3', name: 'Party 3', number: '2343080', balance: '75000' }
  ];

  const handleSave = () => {
    const paymentData = {
      party: selectedParty,
      receiptNo,
      date: paymentDate,
      amount: paidAmount,
      description
    };
    console.log('Saving payment:', paymentData);
    setToast({ message: 'Payment saved successfully!', type: 'success' });
    setShowPaymentModal(false);
    // Reset form
    setSelectedParty('');
    setReceiptNo('');
    setPaidAmount('');
    setDescription('');
    setShowDescription(false);
  };

  const handleShare = () => {
    setToast({ message: 'Share functionality would be implemented here', type: 'success' });
  };

  const exportToExcel = () => {
    setToast({ message: 'Excel export functionality would be implemented here', type: 'success' });
  };

  const handlePrint = () => {
    window.print();
  };

  const selectedPartyData = parties.find(p => p.id === selectedParty);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-5">
        {/* Header Section */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-5">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <span className="text-red-500 text-xs">●</span>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Enter Business Name"
                className="border-none outline-none text-gray-600 bg-transparent min-w-[200px]"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <button 
                onClick={() => window.location.href = '/dashboard/sales'}
                className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-md hover:shadow-md transition-all"
              >
                + Add Sale
              </button>
              <button 
                onClick={() => window.location.href = '/dahobard/purchase'}
                className="px-4 py-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-md hover:shadow-md transition-all"
              >
                + Add Purchase
              </button>
              <button className="px-4 py-2 bg-white text-gray-600 border border-gray-300 rounded-md hover:shadow-md transition-all">
                +
              </button>
              <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-md">
                <MoreVertical size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Filter Section */}
        <div className="bg-white rounded-lg shadow-sm p-5 mb-5">
          <div className="flex justify-between items-center flex-wrap gap-4 mb-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50">
                <span className="font-medium">This Month</span>
                <ChevronDown size={16} />
              </div>
              <div className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-md text-sm text-gray-600">
                <span>Between</span>
                <input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange(prev => ({...prev, from: e.target.value}))}
                  className="bg-transparent border-none outline-none"
                />
                <span>To</span>
                <input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange(prev => ({...prev, to: e.target.value}))}
                  className="bg-transparent border-none outline-none"
                />
              </div>
              <select
                value={selectedFirm}
                onChange={(e) => setSelectedFirm(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md bg-white min-w-[120px]"
              >
                {firms.map(firm => (
                  <option key={firm} value={firm}>{firm}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-5">
              <button 
                onClick={exportToExcel}
                className="flex flex-col items-center gap-1 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center">
                  <FileSpreadsheet size={14} />
                </div>
                <span className="text-xs whitespace-nowrap">Excel Report</span>
              </button>
              <button 
                onClick={handlePrint}
                className="flex flex-col items-center gap-1 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center">
                  <Printer size={14} />
                </div>
                <span className="text-xs">Print</span>
              </button>
            </div>
          </div>
          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md bg-white min-w-[150px] font-medium"
            >
              {types.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center flex-wrap gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md outline-none focus:border-blue-500"
              />
            </div>
            <button
              onClick={() => setShowPaymentModal(true)}
              className="px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              + Add Payment-Out
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-10">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    DATE <span className="text-gray-400">▼</span>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    REF NO. <span className="text-gray-400">▼</span>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    PARTY NAME <span className="text-gray-400">▼</span>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    CATEGORY N... <span className="text-gray-400">▼</span>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    TYPE <span className="text-gray-400">▼</span>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    TOTAL <span className="text-gray-400">▼</span>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    RECEIVED/... <span className="text-gray-400">▼</span>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    BALANCE <span className="text-gray-400">▼</span>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    PRINT / S...
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* Empty state - no data */}
              </tbody>
            </table>
          </div>

          {/* Empty State */}
          <div className="py-20 text-center text-gray-500">
            <div className="w-30 h-20 mx-auto mb-5 opacity-30">
              <svg viewBox="0 0 120 80" className="w-full h-full">
                <rect x="10" y="10" width="100" height="60" rx="5" fill="none" stroke="#ccc" strokeWidth="2"/>
                <rect x="20" y="20" width="80" height="8" fill="#ddd"/>
                <rect x="20" y="35" width="60" height="6" fill="#ddd"/>
                <rect x="20" y="48" width="70" height="6" fill="#ddd"/>
                <circle cx="85" cy="45" r="8" fill="#64b5f6"/>
              </svg>
            </div>
            <div className="text-gray-600 text-base mb-2">No data is available for Payment-Out.</div>
            <div className="text-gray-500 text-sm">Please try again after making relevant changes.</div>
          </div>

          {/* Footer */}
          <div className="px-5 py-4 bg-gray-50 border-t border-gray-200 font-semibold">
            Total Amount: <span className="text-cyan-600">Rs 0.00</span>
          </div>
        </div>
      </div>

      {/* Payment-Out Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-xl font-semibold text-gray-800">Payment-Out</h3>
              <div className="flex gap-2">
                <button className="w-9 h-9 bg-gray-100 rounded-md flex items-center justify-center text-gray-600 hover:bg-gray-200">
                  📊
                </button>
                <button className="w-9 h-9 bg-gray-100 rounded-md flex items-center justify-center text-gray-600 hover:bg-gray-200">
                  ⚙️
                </button>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-200"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Party <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedParty}
                    onChange={(e) => setSelectedParty(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-blue-500 rounded-lg focus:outline-none focus:border-blue-600"
                  >
                    <option value="">Select Party</option>
                    {parties.map(party => (
                      <option key={party.id} value={party.id}>{party.name}</option>
                    ))}
                  </select>
                  <button className="text-blue-600 text-sm mt-2 hover:underline">
                    + Add Party
                  </button>
                  {selectedPartyData && (
                    <div className="bg-gray-50 p-4 rounded-lg mt-3">
                      <div className="flex justify-between items-center mb-2">
                        <div>
                          <div className="font-semibold text-gray-800">{selectedPartyData.name}</div>
                          <div className="text-gray-500 text-xs">{selectedPartyData.number}</div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 text-sm">Party Balance</span>
                        <span className="font-semibold text-red-600 flex items-center gap-1">
                          {selectedPartyData.balance} 🔴
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Receipt No</label>
                  <input
                    type="text"
                    value={receiptNo}
                    onChange={(e) => setReceiptNo(e.target.value)}
                    placeholder="Auto-generated"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
                <div className="md:col-span-2">
                  <button className="text-blue-600 text-sm hover:underline">
                    + Add Payment type
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {!showDescription ? (
                <button
                  onClick={() => setShowDescription(true)}
                  className="w-64 p-4 border-2 border-dashed border-gray-300 rounded-lg flex items-center gap-3 text-gray-600 hover:border-blue-500 hover:bg-gray-50 transition-all mb-5"
                >
                  📝 ADD DESCRIPTION
                </button>
              ) : (
                <div className="mb-5">
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter description..."
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              <button
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.onchange = (e: Event) => {
                    const target = e.target as HTMLInputElement;
                    if (target && target.files && target.files.length > 0) {
                      setToast({ message: 'File attached: ' + target.files[0].name, type: 'success' });
                    }
                  };
                  input.click();
                }}
                className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors mb-5"
              >
                📷
              </button>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="md:col-span-2"></div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Paid</label>
                  <input
                    type="number"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-4">
              <button
                onClick={handleShare}
                className="px-5 py-2 bg-gray-100 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-200 transition-colors flex items-center gap-2"
              >
                📤 Share
              </button>
              <button
                onClick={handleSave}
                className="px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
};

export default CashoutPage;