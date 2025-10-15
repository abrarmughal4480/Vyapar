"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Printer } from 'lucide-react';
import { getToken, getUserIdFromToken } from '../../../lib/auth';
import { fetchPartiesByUserId, getPartyBalance } from '../../../../http/parties';

interface PartyData {
  _id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  gstNumber?: string;
  openingBalance?: number;
  firstOpeningBalance?: number;
  pan?: string;
  city?: string;
  state?: string;
  pincode?: string;
  tags?: string[];
  status?: string;
  note?: string;
  createdAt: string;
}

interface PartyWithBalances extends PartyData {
  receivableBalance: number;
  payableBalance: number;
  creditLimit: number;
}

export default function AllPartiesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [balanceFilter, setBalanceFilter] = useState('All');
  const [filteredData, setFilteredData] = useState<PartyWithBalances[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [allData, setAllData] = useState<PartyWithBalances[]>([]);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const token = getToken();
        const userId = getUserIdFromToken();
        if (!token || !userId) throw new Error('Not authenticated');
        
        // Fetch parties data
        const partiesRes = await fetchPartiesByUserId(token);
        
        if (!partiesRes.success) {
          throw new Error(partiesRes.message || 'Failed to fetch parties data');
        }
        
        const parties = partiesRes.data || [];
        
        // Calculate balances for each party using openingBalance
        const partiesWithBalances = parties.map((party: PartyData) => {
          const openingBalance = party.openingBalance || 0;
          
          // If positive balance = receivable, if negative balance = payable
          const receivableBalance = openingBalance > 0 ? openingBalance : 0;
          const payableBalance = openingBalance < 0 ? Math.abs(openingBalance) : 0;
          
          return {
            ...party,
            receivableBalance,
            payableBalance,
            creditLimit: 0, // Default credit limit - can be enhanced later
          };
        });
        
        // Sort by creation date - latest at bottom
        const sortedParties = partiesWithBalances.sort((a: PartyWithBalances, b: PartyWithBalances) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        setAllData(sortedParties);
        setFilteredData(sortedParties);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to fetch parties data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    let data = allData;
    
    // Filter by search term
    if (searchTerm) {
      data = data.filter(party =>
        party.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (party.email && party.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (party.phone && party.phone.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    // Filter by balance type
    if (balanceFilter !== 'All') {
      if (balanceFilter === 'Receivable') {
        data = data.filter(party => party.receivableBalance > 0);
      } else if (balanceFilter === 'Payable') {
        data = data.filter(party => party.payableBalance > 0);
      }
    }
    
    setFilteredData(data);
  }, [searchTerm, balanceFilter, allData]);

  const balanceTabs = ['All', 'Receivable', 'Payable'];

  const handlePrint = () => {
    // Check if running in Tauri environment
    const isTauri = typeof window !== 'undefined' && (window as any).__TAURI__;
    
    if (isTauri) {
      // Tauri print functionality
      handleTauriPrint();
    } else {
      // Web browser print functionality
      handleWebPrint();
    }
  };

  const handleWebPrint = () => {
    // Create a hidden div with print content
    const printDiv = document.createElement('div');
    printDiv.style.position = 'absolute';
    printDiv.style.left = '-9999px';
    printDiv.style.top = '-9999px';
    printDiv.style.width = '210mm'; // A4 width
    printDiv.style.fontSize = '12px';
    printDiv.style.fontFamily = 'Arial, sans-serif';
    
    const currentDate = new Date().toLocaleDateString();
    
    const printContent = `
      <div style="padding: 20px;">
        <h2 style="text-align: center; margin-bottom: 20px;">All Parties Report - ${currentDate}</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr>
              <th style="border: 1px solid #333; padding: 8px; text-align: left; background-color: #f0f0f0; font-weight: bold;">Party Name</th>
              <th style="border: 1px solid #333; padding: 8px; text-align: left; background-color: #f0f0f0; font-weight: bold;">Email</th>
              <th style="border: 1px solid #333; padding: 8px; text-align: left; background-color: #f0f0f0; font-weight: bold;">Phone No.</th>
              <th style="border: 1px solid #333; padding: 8px; text-align: right; background-color: #f0f0f0; font-weight: bold;">Receivable Balance</th>
              <th style="border: 1px solid #333; padding: 8px; text-align: right; background-color: #f0f0f0; font-weight: bold;">Payable Balance</th>
              <th style="border: 1px solid #333; padding: 8px; text-align: right; background-color: #f0f0f0; font-weight: bold;">Credit Limit</th>
            </tr>
          </thead>
          <tbody>
            ${filteredData.map(party => `
              <tr>
                <td style="border: 1px solid #333; padding: 8px; text-align: left;">${party.name}</td>
                <td style="border: 1px solid #333; padding: 8px; text-align: left;">${party.email || '---'}</td>
                <td style="border: 1px solid #333; padding: 8px; text-align: left;">${party.phone || '---'}</td>
                <td style="border: 1px solid #333; padding: 8px; text-align: right; color: ${party.receivableBalance > 0 ? 'green' : 'black'};">Rs ${party.receivableBalance.toLocaleString()}</td>
                <td style="border: 1px solid #333; padding: 8px; text-align: right;">${party.payableBalance > 0 ? `Rs ${party.payableBalance.toLocaleString()}` : '---'}</td>
                <td style="border: 1px solid #333; padding: 8px; text-align: right;">${party.creditLimit > 0 ? `Rs ${party.creditLimit.toLocaleString()}` : '---'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    
    printDiv.innerHTML = printContent;
    document.body.appendChild(printDiv);
    
    // Print the content
    window.print();
    
    // Remove the print div after printing
    setTimeout(() => {
      document.body.removeChild(printDiv);
    }, 1000);
  };

  const handleTauriPrint = async () => {
    try {
      const currentDate = new Date().toLocaleDateString();
      
      // Generate HTML content for printing
      const printContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>All Parties Report - ${currentDate}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; font-size: 14px; }
              table { width: 100%; border-collapse: collapse; margin: 10px 0; }
              th, td { border: 1px solid #333; padding: 8px; text-align: left; }
              th { background-color: #f0f0f0; font-weight: bold; }
              .text-right { text-align: right; }
              .text-center { text-align: center; }
            </style>
          </head>
          <body>
            <h2 class="text-center">All Parties Report - ${currentDate}</h2>
            <table>
              <thead>
                <tr>
                  <th>Party Name</th>
                  <th>Email</th>
                  <th>Phone No.</th>
                  <th class="text-right">Receivable Balance</th>
                  <th class="text-right">Payable Balance</th>
                  <th class="text-right">Credit Limit</th>
                </tr>
              </thead>
              <tbody>
                ${filteredData.map(party => `
                  <tr>
                    <td>${party.name}</td>
                    <td>${party.email || '---'}</td>
                    <td>${party.phone || '---'}</td>
                    <td class="text-right" style="color: ${party.receivableBalance > 0 ? 'green' : 'black'};">Rs ${party.receivableBalance.toLocaleString()}</td>
                    <td class="text-right">${party.payableBalance > 0 ? `Rs ${party.payableBalance.toLocaleString()}` : '---'}</td>
                    <td class="text-right">${party.creditLimit > 0 ? `Rs ${party.creditLimit.toLocaleString()}` : '---'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </body>
        </html>
      `;

      // Create a blob and download the file
      const blob = new Blob([printContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `all-parties-report-${currentDate.replace(/\//g, '-')}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      alert('All Parties report downloaded successfully! You can now open and print it from your downloads folder.');
    } catch (error) {
      console.error('Tauri print error:', error);
      // Fallback to web print if Tauri fails
      handleWebPrint();
    }
  };

  if (loading) {
    return <div className="text-center py-6 text-gray-400 text-sm">Loading parties data...</div>;
  }

  if (error) {
    return <div className="text-center py-6 text-red-500 text-sm">{error}</div>;
  }

  return (
    <div ref={printRef} className="p-3 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-md p-3 mb-4 sticky top-0 z-30 border border-gray-100">
        <div className="flex flex-col space-y-3 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div className="text-center md:text-left">
            <h1 className="text-lg md:text-xl font-bold text-gray-900">All Parties</h1>
            <p className="text-xs text-gray-500 mt-1">Complete list of all parties with balances</p>
            <p className="text-xs text-blue-600 mt-1">
              📊 View all parties with receivable and payable balances
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow p-3 mb-4 border border-gray-100 z-[1]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
          <div className="relative w-full md:w-72">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-sm">🔍</span>
            <input
              type="text"
              placeholder="Search by party name, email, or phone..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-lg bg-white/80 shadow focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border border-gray-200 transition-all placeholder-gray-400 text-gray-900 text-sm"
            />
          </div>
          <div className="flex gap-2 md:gap-3">
            {balanceTabs.map(tab => (
              <button
                key={tab}
                onClick={() => setBalanceFilter(tab)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors text-xs border-2 focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  balanceFilter === tab
                    ? 'bg-green-600 text-white border-green-600 shadow scale-105'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-green-50'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white rounded-xl shadow-md border border-gray-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 border-b border-gray-200 gap-3">
          <h2 className="text-base font-semibold text-gray-900">All Parties</h2>
          <div className="text-sm text-gray-500">
            Showing {filteredData.length} of {allData.length} parties
          </div>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                PARTY NAME
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                EMAIL
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                PHONE NO.
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                RECEIVABLE BALANCE
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                PAYABLE BALANCE
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                CREDIT LIMIT
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-6 text-gray-400 text-sm">No parties found for the selected criteria.</td>
              </tr>
            ) : (
              filteredData.map(party => (
                <tr key={party._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900 font-medium">{party.name}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">{party.email || '---'}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">{party.phone || '---'}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs">
                    <span className={`font-bold ${
                      party.receivableBalance > 0 ? 'text-green-700' : 'text-gray-500'
                    }`}>
                      Rs {party.receivableBalance.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs">
                    <span className={`font-bold ${
                      party.payableBalance > 0 ? 'text-red-700' : 'text-gray-500'
                    }`}>
                      {party.payableBalance > 0 ? `Rs ${party.payableBalance.toLocaleString()}` : '---'}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs">
                    <span className={`font-bold ${
                      party.creditLimit > 0 ? 'text-blue-700' : 'text-gray-500'
                    }`}>
                      {party.creditLimit > 0 ? `Rs ${party.creditLimit.toLocaleString()}` : '---'}
                    </span>
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
