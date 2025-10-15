"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Printer, Share2 } from 'lucide-react';
import TableActionMenu from '../../../components/TableActionMenu';
import { getToken, getUserIdFromToken } from '../../../lib/auth';
import { getStockSummary } from '../../../../http/items';

interface StockItem {
  id: string;
  itemName: string;
  salePrice: number;
  purchasePrice: number;
  stockQty: number;
  stockValue: number;
}

export default function StockSummaryPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredData, setFilteredData] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [allData, setAllData] = useState<StockItem[]>([]);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const token = getToken();
        if (!token) throw new Error('Not authenticated');
        
        console.log('Token from localStorage:', token ? 'Token present' : 'No token');
        console.log('Token length:', token ? token.length : 0);
        
        // Fetch real stock summary data from API
        const response = await getStockSummary();
        
        if (!response.success) {
          throw new Error(response.message || 'Failed to fetch stock summary data');
        }
        
        const stockData = response.data.items || [];
        
        console.log('Stock Summary Data:', {
          apiResponse: response,
          totalItems: stockData.length,
          totalStockQty: response.data.totals?.totalStockQty || 0,
          totalStockValue: response.data.totals?.totalStockValue || 0,
          sampleItems: stockData.slice(0, 2),
        });
        
        setAllData(stockData);
        setFilteredData(stockData);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to fetch stock summary data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!searchTerm) {
      setFilteredData(allData);
      return;
    }

    const filtered = allData.filter(item =>
      item.itemName.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredData(filtered);
  }, [searchTerm, allData]);

  const handlePrint = () => {
    const printContent = `
      <div style="font-family: Arial, sans-serif; margin: 20px;">
        <h2 style="text-align: center; margin-bottom: 20px;">STOCK SUMMARY</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #f5f5f5;">
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Item Name</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Sale Price</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Purchase Price</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Stock Qty</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Stock Value</th>
            </tr>
          </thead>
          <tbody>
            ${filteredData.map(item => `
              <tr>
                <td style="border: 1px solid #ddd; padding: 8px;">${item.itemName}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">₨ ${item.salePrice.toFixed(2)}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">₨ ${item.purchasePrice.toFixed(2)}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${item.stockQty}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">₨ ${item.stockValue.toFixed(2)}</td>
              </tr>
            `).join('')}
            <tr style="background-color: #f5f5f5; font-weight: bold;">
              <td style="border: 1px solid #ddd; padding: 8px;">Total</td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: right;"></td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: right;"></td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${filteredData.reduce((sum, item) => sum + item.stockQty, 0)}</td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">₨ ${filteredData.reduce((sum, item) => sum + item.stockValue, 0).toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
    
    const printDiv = document.createElement('div');
    printDiv.innerHTML = printContent;
    document.body.appendChild(printDiv);
    
    window.print();
    
    setTimeout(() => {
      document.body.removeChild(printDiv);
    }, 1000);
  };

  const handleTauriPrint = async () => {
    try {
      const currentDate = new Date().toLocaleDateString();
      
      const printContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Stock Summary - ${currentDate}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; font-size: 14px; }
              table { width: 100%; border-collapse: collapse; margin: 10px 0; }
              th, td { border: 1px solid #333; padding: 8px; text-align: left; }
              th { background-color: #f0f0f0; font-weight: bold; }
              .text-right { text-align: right; }
              .total-row { background-color: #f5f5f5; font-weight: bold; }
            </style>
          </head>
          <body>
            <h2 style="text-align: center;">STOCK SUMMARY</h2>
            <table>
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th class="text-right">Sale Price</th>
                  <th class="text-right">Purchase Price</th>
                  <th class="text-right">Stock Qty</th>
                  <th class="text-right">Stock Value</th>
                </tr>
              </thead>
              <tbody>
                ${filteredData.map(item => `
                  <tr>
                    <td>${item.itemName}</td>
                    <td class="text-right">₨ ${item.salePrice.toFixed(2)}</td>
                    <td class="text-right">₨ ${item.purchasePrice.toFixed(2)}</td>
                    <td class="text-right">${item.stockQty}</td>
                    <td class="text-right">₨ ${item.stockValue.toFixed(2)}</td>
                  </tr>
                `).join('')}
                <tr class="total-row">
                  <td>Total</td>
                  <td class="text-right"></td>
                  <td class="text-right"></td>
                  <td class="text-right">${filteredData.reduce((sum, item) => sum + item.stockQty, 0)}</td>
                  <td class="text-right">₨ ${filteredData.reduce((sum, item) => sum + item.stockValue, 0).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </body>
        </html>
      `;

      const blob = new Blob([printContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `stock-summary-${currentDate.replace(/\//g, '-')}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      alert('Stock summary downloaded successfully! You can now open and print it from your downloads folder.');
    } catch (error) {
      console.error('Tauri print error:', error);
      handlePrint();
    }
  };

  if (loading) {
    return <div className="text-center py-6 text-gray-400 text-sm">Loading stock data...</div>;
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
            <h1 className="text-lg md:text-xl font-bold text-gray-900">Stock Summary</h1>
            <p className="text-xs text-gray-500 mt-1">Current stock levels and valuation</p>
            <p className="text-xs text-blue-600 mt-1">
              📦 View all items with their current stock quantities and values
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
              placeholder="Search by item name..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-lg bg-white/80 shadow focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border border-gray-200 transition-all placeholder-gray-400 text-gray-900 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white rounded-xl shadow-md border border-gray-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 border-b border-gray-200 gap-3">
          <h2 className="text-base font-semibold text-gray-900">Stock Summary</h2>
          <div className="text-sm text-gray-500">
            Showing {filteredData.length} of {allData.length} items
          </div>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Name</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Sale Price</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Purchase Price</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Stock Qty</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Stock Value</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredData.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                  {item.itemName}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                  ₨ {item.salePrice.toFixed(2)}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                  ₨ {item.purchasePrice.toFixed(2)}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                  {item.stockQty}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                  ₨ {item.stockValue.toFixed(2)}
                </td>
              </tr>
            ))}
            {/* Total Row */}
            <tr className="bg-gray-50 font-semibold">
              <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                Total
              </td>
              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                
              </td>
              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                
              </td>
              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                {filteredData.reduce((sum, item) => sum + item.stockQty, 0)}
              </td>
              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                ₨ {filteredData.reduce((sum, item) => sum + item.stockValue, 0).toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
