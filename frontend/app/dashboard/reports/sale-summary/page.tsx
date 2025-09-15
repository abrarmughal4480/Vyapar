"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Printer, Share2 } from 'lucide-react';
import TableActionMenu from '../../../components/TableActionMenu';
import { getToken, getUserIdFromToken } from '../../../lib/auth';
import { getSalesByUser } from '../../../../http/sales';

interface SaleEntry {
  id: string;
  partyName: string;
  invoiceNo: string;
  total: number;
  received: number;
  balance: number;
  date: string;
  paymentType: string;
  items: any[];
  discount?: number;
  tax?: number;
}

export default function SaleSummaryPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  });
  const [filteredData, setFilteredData] = useState<SaleEntry[]>([]);
  const [paymentFilter, setPaymentFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [allData, setAllData] = useState<SaleEntry[]>([]);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const token = getToken();
        const userId = getUserIdFromToken();
        if (!token || !userId) throw new Error('Not authenticated');
        
        // Fetch sales data only
        const salesRes = await getSalesByUser(userId, token);
        
        // Check if the response is successful
        if (!salesRes.success) {
          throw new Error(salesRes.message || 'Failed to fetch sales data');
        }
        
        // Map to sale summary format
        const sales = (salesRes.sales || []).map((s: any) => {
          const paymentType = s.paymentType || (s.received === s.actualSaleAmount ? 'Cash' : 'Credit');
          const total = s.actualSaleAmount || s.grandTotal || 0;
          const received = s.received || 0;
          const balance = total - received;
          
          return {
            id: s._id,
            partyName: s.partyName || 'Unknown Party',
            invoiceNo: s.invoiceNo || s._id,
            total: total,
            received: received,
            balance: balance,
            date: s.createdAt?.slice(0, 10) || '',
            paymentType: paymentType,
            items: s.items || [],
            discount: s.discount || 0,
            tax: s.tax || 0,
          };
        });
        
        // Debug logging
        console.log('Sale Summary Data:', {
          apiResponse: salesRes,
          totalSales: sales.length,
          totalAmount: sales.reduce((sum: number, sale: SaleEntry) => sum + sale.total, 0),
          totalReceived: sales.reduce((sum: number, sale: SaleEntry) => sum + sale.received, 0),
          totalBalance: sales.reduce((sum: number, sale: SaleEntry) => sum + sale.balance, 0),
          sampleSales: sales.slice(0, 2),
        });
        
        // Debug item structure
        if (sales.length > 0 && sales[0].items && sales[0].items.length > 0) {
          console.log('Sample item structure:', sales[0].items[0]);
          console.log('Item keys:', Object.keys(sales[0].items[0]));
        }
        
        // Sort by date descending
        const sortedSales = sales.sort((a: SaleEntry, b: SaleEntry) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setAllData(sortedSales);
        setFilteredData(sortedSales);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to fetch sales data');
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
      data = data.filter(sale =>
        sale.partyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Filter by date (only if date is selected)
    if (dateFilter) {
      data = data.filter(sale => sale.date === dateFilter);
    }
    
    // Filter by payment type
    if (paymentFilter !== 'All') {
      data = data.filter(sale => sale.paymentType === paymentFilter);
    }
    
    setFilteredData(data);
  }, [searchTerm, dateFilter, paymentFilter, allData]);


  const paymentTabs = ['All', 'Cash', 'Credit'];

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
    
    // Group sales by party
    const salesByParty = filteredData.reduce((acc, sale) => {
      if (!acc[sale.partyName]) {
        acc[sale.partyName] = [];
      }
      acc[sale.partyName].push(sale);
      return acc;
    }, {} as Record<string, SaleEntry[]>);

    const printContent = `
      <div style="padding: 20px;">
        ${Object.entries(salesByParty).map(([partyName, sales]) => `
          <div style="font-weight: bold; font-size: 16px; margin: 20px 0 10px 0;">${partyName}</div>
          ${sales.map(sale => `
            <div style="font-size: 12px; color: #666; margin: 5px 0;">Invoice: ${sale.invoiceNo}</div>
            <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
              <thead>
                <tr>
                  <th style="border: 1px solid #333; padding: 8px; text-align: left; background-color: #f0f0f0; font-weight: bold;">Item Name</th>
                  <th style="border: 1px solid #333; padding: 8px; text-align: center; background-color: #f0f0f0; font-weight: bold;">Qty</th>
                  <th style="border: 1px solid #333; padding: 8px; text-align: center; background-color: #f0f0f0; font-weight: bold;">Unit</th>
                  <th style="border: 1px solid #333; padding: 8px; text-align: right; background-color: #f0f0f0; font-weight: bold;">Rate</th>
                  <th style="border: 1px solid #333; padding: 8px; text-align: right; background-color: #f0f0f0; font-weight: bold;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${sale.items && sale.items.length > 0 ? sale.items.map((item: any) => {
                  const itemName = item.itemName || item.name || item.item || item.itemName || item.productName || 'Unknown Item';
                  return `
                  <tr>
                    <td style="border: 1px solid #333; padding: 8px; text-align: left;">${itemName}</td>
                    <td style="border: 1px solid #333; padding: 8px; text-align: center;">${item.qty || 0}</td>
                    <td style="border: 1px solid #333; padding: 8px; text-align: center;">${item.unit || 'N/A'}</td>
                    <td style="border: 1px solid #333; padding: 8px; text-align: right;">PKR ${(item.price || 0).toLocaleString()}</td>
                    <td style="border: 1px solid #333; padding: 8px; text-align: right;">PKR ${((item.qty || 0) * (item.price || 0)).toLocaleString()}</td>
                  </tr>
                `;
                }).join('') : `
                  <tr>
                    <td colspan="5" style="border: 1px solid #333; padding: 8px; text-align: center;">No items details available</td>
                  </tr>
                `}
              </tbody>
            </table>
          `).join('')}
        `).join('')}
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
      
      // Group sales by party
      const salesByParty = filteredData.reduce((acc, sale) => {
        if (!acc[sale.partyName]) {
          acc[sale.partyName] = [];
        }
        acc[sale.partyName].push(sale);
        return acc;
      }, {} as Record<string, SaleEntry[]>);

      // Generate HTML content for printing
      const printContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Daily Sales List - ${currentDate}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; font-size: 14px; }
              .party-name { font-weight: bold; font-size: 16px; margin: 20px 0 10px 0; }
              .invoice { font-size: 12px; color: #666; margin: 5px 0; }
              table { width: 100%; border-collapse: collapse; margin: 10px 0; }
              th, td { border: 1px solid #333; padding: 8px; text-align: left; }
              th { background-color: #f0f0f0; font-weight: bold; }
              .text-center { text-align: center; }
              .text-right { text-align: right; }
            </style>
          </head>
          <body>
            ${Object.entries(salesByParty).map(([partyName, sales]) => `
              <div class="party-name">${partyName}</div>
              ${sales.map(sale => `
                <div class="invoice">Invoice: ${sale.invoiceNo}</div>
                <table>
                  <thead>
                    <tr>
                      <th>Item Name</th>
                      <th class="text-center">Qty</th>
                      <th class="text-center">Unit</th>
                      <th class="text-right">Rate</th>
                      <th class="text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${sale.items && sale.items.length > 0 ? sale.items.map((item: any) => {
                      const itemName = item.itemName || item.name || item.item || item.itemName || item.productName || 'Unknown Item';
                      return `
                      <tr>
                        <td>${itemName}</td>
                        <td class="text-center">${item.qty || 0}</td>
                        <td class="text-center">${item.unit || 'N/A'}</td>
                        <td class="text-right">PKR ${(item.price || 0).toLocaleString()}</td>
                        <td class="text-right">PKR ${((item.qty || 0) * (item.price || 0)).toLocaleString()}</td>
                      </tr>
                    `;
                    }).join('') : `
                      <tr>
                        <td colspan="5" class="text-center">No items details available</td>
                      </tr>
                    `}
                  </tbody>
                </table>
              `).join('')}
            `).join('')}
          </body>
        </html>
      `;

      // Create a blob and download the file
      const blob = new Blob([printContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `sales-list-${currentDate.replace(/\//g, '-')}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      alert('Sales list downloaded successfully! You can now open and print it from your downloads folder.');
    } catch (error) {
      console.error('Tauri print error:', error);
      // Fallback to web print if Tauri fails
      handleWebPrint();
    }
  };

  if (loading) {
    return <div className="text-center py-6 text-gray-400 text-sm">Loading sales data...</div>;
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
            <h1 className="text-lg md:text-xl font-bold text-gray-900">Sale Summary</h1>
            <p className="text-xs text-gray-500 mt-1">Daily sales summary by party</p>
            <p className="text-xs text-blue-600 mt-1">
              📊 View all sales transactions with payment status and balances
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
              placeholder="Search by party name or invoice..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-lg bg-white/80 shadow focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border border-gray-200 transition-all placeholder-gray-400 text-gray-900 text-sm"
            />
          </div>
          <div className="flex gap-2 md:gap-3">
            {paymentTabs.map(tab => (
              <button
                key={tab}
                onClick={() => setPaymentFilter(tab)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors text-xs border-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  paymentFilter === tab
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
              placeholder="Select date (optional)"
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
          <h2 className="text-base font-semibold text-gray-900">Sales Summary</h2>
          <div className="text-sm text-gray-500">
            Showing {filteredData.length} of {allData.length} sales
          </div>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Party Name</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice No</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Received</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
              <th className="px-1 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">Print/Share</th>
              <th className="px-1 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-8"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-6 text-gray-400 text-sm">No sales found for the selected criteria.</td>
              </tr>
            ) : (
              filteredData.map(sale => (
                <tr key={sale.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900 font-medium">{sale.partyName}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">{sale.invoiceNo}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">{sale.date}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      sale.paymentType === 'Cash' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-orange-100 text-orange-800'
                    }`}>
                      {sale.paymentType}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900 font-bold">PKR {sale.total.toLocaleString()}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-emerald-700 font-bold">PKR {sale.received.toLocaleString()}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs">
                    <span className={`font-bold ${
                      sale.balance > 0 ? 'text-red-700' : 'text-green-700'
                    }`}>
                      PKR {sale.balance.toLocaleString()}
                    </span>
                  </td>
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
                      onView={() => alert(`View ${sale.invoiceNo}`)}
                      onEdit={() => alert(`Edit ${sale.invoiceNo}`)}
                      onDelete={() => alert(`Delete ${sale.invoiceNo}`)}
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
