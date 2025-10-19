"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Printer, Share2 } from 'lucide-react';
import TableActionMenu from '../../../components/TableActionMenu';
import { getToken, getUserIdFromToken } from '../../../lib/auth';
import { getItemWiseProfitLoss } from '../../../../http/items';

interface ItemWiseProfitLossItem {
  id: string;
  itemName: string;
  sale: number;
  creditNoteSaleReturn: number;
  purchase: number;
  drNotePurchaseReturn: number;
  openingStock: number;
  closingStock: number;
  taxReceivable: number;
  taxPayable: number;
  netProfitLoss: number;
}

export default function ItemWiseProfitLossPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredData, setFilteredData] = useState<ItemWiseProfitLossItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [allData, setAllData] = useState<ItemWiseProfitLossItem[]>([]);
  const [totalNetProfitLoss, setTotalNetProfitLoss] = useState(0);
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
        
        // Fetch real item wise profit loss data from API
        const response = await getItemWiseProfitLoss();
        
        if (!response.success) {
          throw new Error(response.message || 'Failed to fetch item wise profit loss data');
        }
        
        const profitLossData = response.data.items || [];
        const totalAmount = response.data.totalNetProfitLoss || 0;
        
        console.log('Item Wise Profit Loss Data:', {
          apiResponse: response,
          totalItems: profitLossData.length,
          totalNetProfitLoss: totalAmount,
          sampleItems: profitLossData.slice(0, 2),
        });
        
        setAllData(profitLossData);
        setFilteredData(profitLossData);
        setTotalNetProfitLoss(totalAmount);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to fetch item wise profit loss data');
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
        <h2 style="text-align: center; margin-bottom: 20px;">ITEM WISE PROFIT AND LOSS</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #f5f5f5;">
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Item Name</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Sale</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Cr. Note / Sale Return</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Purchase</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Dr. Note / Purchase Return</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Opening Stock</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Closing Stock</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Tax Receivable</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Tax Payable</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Net Profit/Loss</th>
            </tr>
          </thead>
          <tbody>
            ${filteredData.map(item => `
              <tr>
                <td style="border: 1px solid #ddd; padding: 8px;">${item.itemName}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">₨ ${item.sale.toFixed(2)}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">₨ ${item.creditNoteSaleReturn.toFixed(2)}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">₨ ${item.purchase.toFixed(2)}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">₨ ${item.drNotePurchaseReturn.toFixed(2)}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${item.openingStock}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${item.closingStock}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">₨ ${item.taxReceivable.toFixed(2)}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">₨ ${item.taxPayable.toFixed(2)}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">₨ ${item.netProfitLoss.toFixed(2)}</td>
              </tr>
            `).join('')}
            <tr style="background-color: #f5f5f5; font-weight: bold;">
              <td style="border: 1px solid #ddd; padding: 8px;">Total Amount:</td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: right;"></td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: right;"></td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: right;"></td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: right;"></td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: right;"></td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: right;"></td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: right;"></td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: right;"></td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">₨ ${totalNetProfitLoss.toFixed(2)}</td>
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
            <title>Item Wise Profit and Loss - ${currentDate}</title>
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
            <h2 style="text-align: center;">ITEM WISE PROFIT AND LOSS</h2>
            <table>
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th class="text-right">Sale</th>
                  <th class="text-right">Cr. Note / Sale Return</th>
                  <th class="text-right">Purchase</th>
                  <th class="text-right">Dr. Note / Purchase Return</th>
                  <th class="text-right">Opening Stock</th>
                  <th class="text-right">Closing Stock</th>
                  <th class="text-right">Tax Receivable</th>
                  <th class="text-right">Tax Payable</th>
                  <th class="text-right">Net Profit/Loss</th>
                </tr>
              </thead>
              <tbody>
                ${filteredData.map(item => `
                  <tr>
                    <td>${item.itemName}</td>
                    <td class="text-right">₨ ${item.sale.toFixed(2)}</td>
                    <td class="text-right">₨ ${item.creditNoteSaleReturn.toFixed(2)}</td>
                    <td class="text-right">₨ ${item.purchase.toFixed(2)}</td>
                    <td class="text-right">₨ ${item.drNotePurchaseReturn.toFixed(2)}</td>
                    <td class="text-right">${item.openingStock}</td>
                    <td class="text-right">${item.closingStock}</td>
                    <td class="text-right">₨ ${item.taxReceivable.toFixed(2)}</td>
                    <td class="text-right">₨ ${item.taxPayable.toFixed(2)}</td>
                    <td class="text-right">₨ ${item.netProfitLoss.toFixed(2)}</td>
                  </tr>
                `).join('')}
                <tr class="total-row">
                  <td>Total Amount:</td>
                  <td class="text-right"></td>
                  <td class="text-right"></td>
                  <td class="text-right"></td>
                  <td class="text-right"></td>
                  <td class="text-right"></td>
                  <td class="text-right"></td>
                  <td class="text-right"></td>
                  <td class="text-right"></td>
                  <td class="text-right">₨ ${totalNetProfitLoss.toFixed(2)}</td>
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
      link.download = `item-wise-profit-loss-${currentDate.replace(/\//g, '-')}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      alert('Item Wise Profit and Loss report downloaded successfully! You can now open and print it from your downloads folder.');
    } catch (error) {
      console.error('Tauri print error:', error);
      handlePrint();
    }
  };

  if (loading) {
    return <div className="text-center py-6 text-gray-400 text-sm">Loading item wise profit loss data...</div>;
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
            <h1 className="text-lg md:text-xl font-bold text-gray-900">Item Wise Profit and Loss</h1>
            <p className="text-xs text-gray-500 mt-1">Profit/loss analysis by item</p>
            <p className="text-xs text-blue-600 mt-1">
              📊 View detailed profit and loss breakdown for each item
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
          <h2 className="text-base font-semibold text-gray-900">Item Wise Profit and Loss</h2>
          <div className="text-sm text-gray-500">
            Showing {filteredData.length} of {allData.length} items
          </div>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Name</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Sale</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cr. Note / Sale Return</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Purchase</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Dr. Note / Purchase Return</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Opening Stock</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Closing Stock</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Tax Receivable</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Tax Payable</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Net Profit/Loss</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredData.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                  {item.itemName}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                  ₨ {item.sale.toFixed(2)}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                  ₨ {item.creditNoteSaleReturn.toFixed(2)}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                  ₨ {item.purchase.toFixed(2)}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                  ₨ {item.drNotePurchaseReturn.toFixed(2)}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                  {item.openingStock}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                  {item.closingStock}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                  ₨ {item.taxReceivable.toFixed(2)}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                  ₨ {item.taxPayable.toFixed(2)}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                  ₨ {item.netProfitLoss.toFixed(2)}
                </td>
              </tr>
            ))}
            {/* Total Row */}
            <tr className={`font-semibold ${totalNetProfitLoss >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
              <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                <div className="flex items-center gap-2">
                  <span>Total Amount:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    totalNetProfitLoss >= 0 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {totalNetProfitLoss >= 0 ? 'Profit' : 'Loss'}
                  </span>
                </div>
              </td>
              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                
              </td>
              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                
              </td>
              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                
              </td>
              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                
              </td>
              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                
              </td>
              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                
              </td>
              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                
              </td>
              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                
              </td>
              <td className={`px-4 py-2 whitespace-nowrap text-sm font-bold text-right ${
                totalNetProfitLoss >= 0 ? 'text-green-700' : 'text-red-700'
              }`}>
                ₨ {totalNetProfitLoss.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
