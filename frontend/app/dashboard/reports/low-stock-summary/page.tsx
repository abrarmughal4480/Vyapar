"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Printer } from 'lucide-react';
import { getToken, getUserIdFromToken } from '../../../lib/auth';
import { fetchItemsByUserId } from '../../../../http/items';

interface LowStockItem {
  _id: string;
  name: string;
  minimumStockQty: number;
  currentStockQty: number;
  stockValue: number;
  unit?: string;
  createdAt: string;
}

export default function LowStockSummaryPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredData, setFilteredData] = useState<LowStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [allData, setAllData] = useState<LowStockItem[]>([]);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const token = getToken();
        const userId = getUserIdFromToken();
        if (!token || !userId) throw new Error('Not authenticated');
        
        // Fetch items data
        const itemsRes = await fetchItemsByUserId(userId, token);
        
        if (!itemsRes.success) {
          throw new Error(itemsRes.message || 'Failed to fetch items data');
        }
        
        const items = itemsRes.data || [];
        
        // Filter items that are below minimum stock
        const lowStockItems = items
          .filter((item: any) => {
            const currentStock = item.stock !== null && item.stock !== undefined ? item.stock : (item.openingQuantity || item.openingStockQuantity || 0);
            const minimumStock = item.minStock || 0;
            return currentStock < minimumStock && minimumStock > 0;
          })
          .map((item: any) => ({
            _id: item._id,
            name: item.name,
            minimumStockQty: item.minStock || 0,
            currentStockQty: item.stock !== null && item.stock !== undefined ? item.stock : (item.openingQuantity || item.openingStockQuantity || 0),
            stockValue: (item.stock !== null && item.stock !== undefined ? item.stock : (item.openingQuantity || item.openingStockQuantity || 0)) * (item.purchasePrice || 0),
            unit: item.unit ? (item.unit.base || 'pcs') : 'pcs',
            createdAt: item.createdAt
          }));
        
        // Sort by creation date - latest at top
        const sortedItems = lowStockItems.sort((a: LowStockItem, b: LowStockItem) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        
        setAllData(sortedItems);
        setFilteredData(sortedItems);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to fetch low stock data');
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
      data = data.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredData(data);
  }, [searchTerm, allData]);

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
        <h2 style="text-align: center; margin-bottom: 20px;">Low Stock Summary Report - ${currentDate}</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr>
              <th style="border: 1px solid #333; padding: 8px; text-align: left; background-color: #f0f0f0; font-weight: bold;">Item Name</th>
              <th style="border: 1px solid #333; padding: 8px; text-align: right; background-color: #f0f0f0; font-weight: bold;">Minimum Stock Qty</th>
              <th style="border: 1px solid #333; padding: 8px; text-align: right; background-color: #f0f0f0; font-weight: bold;">Stock Qty</th>
              <th style="border: 1px solid #333; padding: 8px; text-align: right; background-color: #f0f0f0; font-weight: bold;">Stock Value</th>
            </tr>
          </thead>
          <tbody>
            ${filteredData.map(item => `
              <tr>
                <td style="border: 1px solid #333; padding: 8px; text-align: left;">${item.name}</td>
                <td style="border: 1px solid #333; padding: 8px; text-align: right;">${item.minimumStockQty} ${item.unit}</td>
                <td style="border: 1px solid #333; padding: 8px; text-align: right; color: ${item.currentStockQty < item.minimumStockQty ? 'red' : 'black'};">${item.currentStockQty} ${item.unit}</td>
                <td style="border: 1px solid #333; padding: 8px; text-align: right;">Rs ${item.stockValue.toLocaleString()}</td>
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
            <title>Low Stock Summary Report - ${currentDate}</title>
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
            <h2 class="text-center">Low Stock Summary Report - ${currentDate}</h2>
            <table>
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th class="text-right">Minimum Stock Qty</th>
                  <th class="text-right">Stock Qty</th>
                  <th class="text-right">Stock Value</th>
                </tr>
              </thead>
              <tbody>
                ${filteredData.map(item => `
                  <tr>
                    <td>${item.name}</td>
                    <td class="text-right">${item.minimumStockQty} ${item.unit}</td>
                    <td class="text-right" style="color: ${item.currentStockQty < item.minimumStockQty ? 'red' : 'black'};">${item.currentStockQty} ${item.unit}</td>
                    <td class="text-right">Rs ${item.stockValue.toLocaleString()}</td>
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
      link.download = `low-stock-summary-${currentDate.replace(/\//g, '-')}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      alert('Low Stock Summary report downloaded successfully! You can now open and print it from your downloads folder.');
    } catch (error) {
      console.error('Tauri print error:', error);
      // Fallback to web print if Tauri fails
      handleWebPrint();
    }
  };

  if (loading) {
    return <div className="text-center py-6 text-gray-400 text-sm">Loading low stock data...</div>;
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
            <h1 className="text-lg md:text-xl font-bold text-gray-900">Low Stock Summary</h1>
            <p className="text-xs text-gray-500 mt-1">Items below minimum stock level</p>
            <p className="text-xs text-blue-600 mt-1">
              📊 View items that need restocking
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
          <h2 className="text-base font-semibold text-gray-900">Low Stock Summary</h2>
          <div className="text-sm text-gray-500">
            Showing {filteredData.length} of {allData.length} low stock items
          </div>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Item Name
              </th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Minimum Stock Qty
              </th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stock Qty
              </th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stock Value
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <div className="text-sm text-gray-500">Loading low stock data...</div>
                  </div>
                </td>
              </tr>
            ) : filteredData.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-6 text-gray-400 text-sm">No low stock items found.</td>
              </tr>
            ) : (
              filteredData.map(item => (
                <tr key={item._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900 font-medium">{item.name}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500 text-right">
                    {item.minimumStockQty} {item.unit}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-right">
                    <span className={`font-bold ${
                      item.currentStockQty < item.minimumStockQty ? 'text-red-700' : 'text-gray-900'
                    }`}>
                      {item.currentStockQty} {item.unit}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900 text-right font-bold">
                    Rs {item.stockValue.toLocaleString()}
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
