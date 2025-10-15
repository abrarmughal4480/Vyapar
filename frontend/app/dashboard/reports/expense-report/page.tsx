"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Printer, Filter, Download, Plus, Camera, X } from 'lucide-react';
import { getToken } from '../../../lib/auth';
import { getExpenses, createExpense } from '../../../../http/expenses';

interface ExpenseItem {
  _id: string;
  expenseNumber: string;
  expenseDate: string;
  expenseCategory: string;
  party: string;
  paymentType: string;
  totalAmount: number;
  creditAmount: number;
  receivedAmount: number;
  description?: string;
  createdAt: string;
}

export default function ExpenseReportPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredData, setFilteredData] = useState<ExpenseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [allData, setAllData] = useState<ExpenseItem[]>([]);
  const [filters, setFilters] = useState({
    category: '',
    paymentType: '',
    dateFrom: '',
    dateTo: ''
  });
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const token = getToken();
        if (!token) throw new Error('Not authenticated');
        
        // Fetch expenses data with filters
        const expensesRes = await getExpenses(filters);
        
        if (!expensesRes.success) {
          throw new Error(expensesRes.message || 'Failed to fetch expenses data');
        }
        
        const expenses = expensesRes.data || [];
        
        // Map expenses to our interface
        const mappedExpenses = expenses.map((expense: any) => ({
          _id: expense._id,
          expenseNumber: expense.expenseNumber || '',
          expenseDate: expense.expenseDate,
          expenseCategory: expense.expenseCategory || '',
          party: expense.party || '',
          paymentType: expense.paymentType || '',
          totalAmount: expense.totalAmount || 0,
          creditAmount: expense.creditAmount || 0,
          receivedAmount: expense.receivedAmount || 0,
          description: expense.description || '',
          createdAt: expense.createdAt
        }));
        
        // Sort by expense date - latest at top
        const sortedExpenses = mappedExpenses.sort((a: ExpenseItem, b: ExpenseItem) => 
          new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime()
        );
        
        setAllData(sortedExpenses);
        setFilteredData(sortedExpenses);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to fetch expense data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [filters]);

  useEffect(() => {
    let data = allData;
    
    // Filter by search term
    if (searchTerm) {
      data = data.filter(item =>
        item.expenseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.party.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.expenseCategory.toLowerCase().includes(searchTerm.toLowerCase())
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
        <h2 style="text-align: center; margin-bottom: 20px;">Expense Report - ${currentDate}</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr>
              <th style="border: 1px solid #333; padding: 8px; text-align: left; background-color: #f0f0f0; font-weight: bold;">Date</th>
              <th style="border: 1px solid #333; padding: 8px; text-align: left; background-color: #f0f0f0; font-weight: bold;">Exp No.</th>
              <th style="border: 1px solid #333; padding: 8px; text-align: left; background-color: #f0f0f0; font-weight: bold;">Party</th>
              <th style="border: 1px solid #333; padding: 8px; text-align: left; background-color: #f0f0f0; font-weight: bold;">Category Name</th>
              <th style="border: 1px solid #333; padding: 8px; text-align: left; background-color: #f0f0f0; font-weight: bold;">Payment Type</th>
              <th style="border: 1px solid #333; padding: 8px; text-align: right; background-color: #f0f0f0; font-weight: bold;">Amount</th>
              <th style="border: 1px solid #333; padding: 8px; text-align: right; background-color: #f0f0f0; font-weight: bold;">Balance Due</th>
            </tr>
          </thead>
          <tbody>
            ${filteredData.map(item => `
              <tr>
                <td style="border: 1px solid #333; padding: 8px; text-align: left;">${new Date(item.expenseDate).toLocaleDateString()}</td>
                <td style="border: 1px solid #333; padding: 8px; text-align: left;">${item.expenseNumber}</td>
                <td style="border: 1px solid #333; padding: 8px; text-align: left;">${item.party === 'Unknown' ? '' : item.party}</td>
                <td style="border: 1px solid #333; padding: 8px; text-align: left;">${item.expenseCategory}</td>
                <td style="border: 1px solid #333; padding: 8px; text-align: left;">${item.paymentType}</td>
                <td style="border: 1px solid #333; padding: 8px; text-align: right;">Rs ${item.totalAmount.toLocaleString()}</td>
                <td style="border: 1px solid #333; padding: 8px; text-align: right;">Rs ${item.creditAmount.toLocaleString()}</td>
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
            <title>Expense Report - ${currentDate}</title>
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
            <h2 class="text-center">Expense Report - ${currentDate}</h2>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Exp No.</th>
                  <th>Party</th>
                  <th>Category Name</th>
                  <th>Payment Type</th>
                  <th class="text-right">Amount</th>
                  <th class="text-right">Balance Due</th>
                </tr>
              </thead>
              <tbody>
                ${filteredData.map(item => `
                  <tr>
                    <td>${new Date(item.expenseDate).toLocaleDateString()}</td>
                    <td>${item.expenseNumber}</td>
                    <td>${item.party === 'Unknown' ? '' : item.party}</td>
                    <td>${item.expenseCategory}</td>
                    <td>${item.paymentType}</td>
                    <td class="text-right">Rs ${item.totalAmount.toLocaleString()}</td>
                    <td class="text-right">Rs ${item.creditAmount.toLocaleString()}</td>
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
      link.download = `expense-report-${currentDate.replace(/\//g, '-')}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      alert('Expense report downloaded successfully! You can now open and print it from your downloads folder.');
    } catch (error) {
      console.error('Tauri print error:', error);
      // Fallback to web print if Tauri fails
      handleWebPrint();
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      category: '',
      paymentType: '',
      dateFrom: '',
      dateTo: ''
    });
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImageUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'vyapar_expenses'); // You'll need to set this up in Cloudinary

      const response = await fetch('https://api.cloudinary.com/v1_1/YOUR_CLOUD_NAME/image/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.secure_url) {
        setUploadedImage(data.secure_url);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
    } finally {
      setImageUploading(false);
    }
  };

  const removeImage = () => {
    setUploadedImage(null);
  };

  if (loading) {
    return <div className="text-center py-6 text-gray-400 text-sm">Loading expense data...</div>;
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
            <h1 className="text-lg md:text-xl font-bold text-gray-900">Expense Report</h1>
            <p className="text-xs text-gray-500 mt-1">Complete expense tracking and analysis</p>
            <p className="text-xs text-blue-600 mt-1">
              📊 Track all business expenses and payments
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddExpense(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Expense
            </button>
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
              placeholder="Search by expense number, party, or category..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-lg bg-white/80 shadow focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border border-gray-200 transition-all placeholder-gray-400 text-gray-900 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={clearFilters}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              <Filter className="w-4 h-4" />
              Clear Filters
            </button>
          </div>
        </div>
        
        {/* Filter Controls */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
            <select
              value={filters.category}
              onChange={e => handleFilterChange('category', e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/80 shadow border border-gray-200 text-sm"
            >
              <option value="">All Categories</option>
              <option value="Petrol">Petrol</option>
              <option value="Office Supplies">Office Supplies</option>
              <option value="Travel">Travel</option>
              <option value="Meals">Meals</option>
              <option value="Utilities">Utilities</option>
              <option value="Marketing">Marketing</option>
              <option value="Other">Other</option>
            </select>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Payment Type</label>
            <select
              value={filters.paymentType}
              onChange={e => handleFilterChange('paymentType', e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/80 shadow border border-gray-200 text-sm"
            >
              <option value="">All Payment Types</option>
              <option value="Cash">Cash</option>
              <option value="Card">Card</option>
              <option value="UPI">UPI</option>
              <option value="Cheque">Cheque</option>
              <option value="Credit">Credit</option>
            </select>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">From Date</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={e => handleFilterChange('dateFrom', e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/80 shadow border border-gray-200 text-sm"
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">To Date</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={e => handleFilterChange('dateTo', e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/80 shadow border border-gray-200 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Add Expense Modal */}
      {showAddExpense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Add New Expense</h2>
                <button
                  onClick={() => setShowAddExpense(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Expense Category</label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                      <option value="">Select Category</option>
                      <option value="Petrol">Petrol</option>
                      <option value="Office Supplies">Office Supplies</option>
                      <option value="Travel">Travel</option>
                      <option value="Meals">Meals</option>
                      <option value="Utilities">Utilities</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Party</label>
                    <input
                      type="text"
                      placeholder="Enter party name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                    <input
                      type="number"
                      placeholder="Enter amount"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Type</label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                      <option value="Cash">Cash</option>
                      <option value="Card">Card</option>
                      <option value="UPI">UPI</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Credit">Credit</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Expense Date</label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <input
                      type="text"
                      placeholder="Enter description"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Image Upload Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Add Receipt Image</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="imageUpload"
                      disabled={imageUploading}
                    />
                    <label
                      htmlFor="imageUpload"
                      className={`flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-200 ${
                        imageUploading
                          ? 'border-blue-300 bg-blue-50 text-blue-700 cursor-not-allowed'
                          : uploadedImage 
                          ? 'border-green-500 bg-green-50 text-green-700' 
                          : 'border-gray-300 text-gray-600 hover:border-gray-400 hover:bg-gray-50'
                      }`}
                    >
                      <Camera className="w-4 h-4" />
                      <span className="font-medium">
                        {imageUploading ? 'Uploading...' : uploadedImage ? 'Image Added' : 'Add Receipt Image'}
                      </span>
                    </label>
                    {uploadedImage && (
                      <button
                        type="button"
                        onClick={removeImage}
                        className="flex items-center gap-2 px-3 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-all duration-200"
                      >
                        <X className="w-4 h-4" />
                        <span className="font-medium">Remove</span>
                      </button>
                    )}
                  </div>
                  {uploadedImage && (
                    <div className="mt-4">
                      <img
                        src={uploadedImage}
                        alt="Receipt"
                        className="w-32 h-32 object-cover rounded-lg border border-gray-200"
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddExpense(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Add Expense
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto bg-white rounded-xl shadow-md border border-gray-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 border-b border-gray-200 gap-3">
          <h2 className="text-base font-semibold text-gray-900">Expense Report</h2>
          <div className="text-sm text-gray-500">
            Showing {filteredData.length} of {allData.length} expenses
          </div>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Exp No.
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Party
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category Name
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Payment Type
              </th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Balance Due
              </th>
              <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <div className="text-sm text-gray-500">Loading expense data...</div>
                  </div>
                </td>
              </tr>
            ) : filteredData.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-6 text-gray-400 text-sm">No expenses found.</td>
              </tr>
            ) : (
              filteredData.map(item => (
                <tr key={item._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900">
                    {new Date(item.expenseDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900 font-medium">
                    {item.expenseNumber}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900">
                    {item.party === 'Unknown' ? '' : item.party}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900">
                    {item.expenseCategory}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      item.paymentType === 'Cash' ? 'bg-green-100 text-green-800' :
                      item.paymentType === 'Credit' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {item.paymentType}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900 text-right font-bold">
                    Rs {item.totalAmount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-right">
                    <span className={`font-bold ${
                      item.creditAmount > 0 ? 'text-red-700' : 'text-green-700'
                    }`}>
                      Rs {item.creditAmount.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center text-xs text-gray-500">
                    <button className="hover:text-gray-700">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                      </svg>
                    </button>
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
