'use client'

import { useState, useEffect } from 'react'

// Accept activeTab and setActiveTab as props from layout
export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('sale');
  const [dateRange, setDateRange] = useState('thisMonth')
  const [showDetailedReport, setShowDetailedReport] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedFormat, setSelectedFormat] = useState('pdf')
  const [isExporting, setIsExporting] = useState(false)

  // Dummy data instead of API calls
  const businessSummary = {
    totalIncome: 1250000,
    revenueGrowth: 12.5,
    profit: 450000,
    totalCustomers: 1250,
    totalProducts: 450
  }

  const monthlyIncome = [
    { month: 'Jan', income: 85000 },
    { month: 'Feb', income: 92000 },
    { month: 'Mar', income: 105000 },
    { month: 'Apr', income: 98000 },
    { month: 'May', income: 115000 },
    { month: 'Jun', income: 125000 }
  ]

  const topProducts = [
    { name: 'Premium Rice 5kg', totalQuantity: 1250, totalSales: 187500 },
    { name: 'Organic Wheat Flour', totalQuantity: 980, totalSales: 147000 },
    { name: 'Pure Honey 1kg', totalQuantity: 750, totalSales: 112500 },
    { name: 'Extra Virgin Oil', totalQuantity: 620, totalSales: 93000 },
    { name: 'Green Tea Bags', totalQuantity: 450, totalSales: 67500 }
  ]



  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value > 0 ? '+' : ''}${value}%`
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      // Simulate export process
      await new Promise(resolve => setTimeout(resolve, 2000))
      console.log(`Exporting as ${selectedFormat}`)
      setShowDetailedReport(false)
    } catch (error: any) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }



  // Define KPIs array outside of JSX
  const kpis = [
    {
      title: 'Total Revenue',
      value: businessSummary ? formatCurrency(businessSummary.totalIncome) : '₹0',
      trend: businessSummary ? formatPercentage(businessSummary.revenueGrowth) : '+0%',
      trendPositive: businessSummary ? businessSummary.revenueGrowth >= 0 : true,
      icon: '💰',
      gradient: 'from-green-500 to-emerald-600',
      bgGradient: 'from-green-50 to-emerald-50',
      subtitle: 'from last month'
    },
    {
      title: 'Net Profit',
      value: businessSummary ? formatCurrency(businessSummary.profit) : '₹0',
      subtitle: 'Revenue - Expenses',
      icon: '📈',
      gradient: 'from-blue-500 to-cyan-600',
      bgGradient: 'from-blue-50 to-cyan-50'
    },
    {
      title: 'Total Customers',
      value: businessSummary ? businessSummary.totalCustomers.toLocaleString() : '0',
      subtitle: 'All time',
      icon: '👥',
      gradient: 'from-purple-500 to-pink-600',
      bgGradient: 'from-purple-50 to-pink-50'
    },
    {
      title: 'Total Products',
      value: businessSummary ? businessSummary.totalProducts.toLocaleString() : '0',
      subtitle: 'In inventory',
      icon: '📦',
      gradient: 'from-orange-500 to-red-600',
      bgGradient: 'from-orange-50 to-red-50'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="flex gap-8">
        <div className="flex-1 min-w-0">
          {/* Header logic for each tab */}
          {activeTab === 'sale' && (
            <>
              <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-4 md:p-6 mb-6 sticky top-0 z-30 border border-gray-100">
                <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
                  <div className="text-center md:text-left">
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900">Sale Invoices</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage your sales, invoices, and payments</p>
                  </div>
                </div>
              </div>
            </>
          )}
          {activeTab === 'purchase' && (
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-4 md:p-6 mb-6 sticky top-0 z-30 border border-gray-100">
              <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
                <div className="text-center md:text-left">
                  <h1 className="text-xl md:text-2xl font-bold text-gray-900">Purchase Bills</h1>
                  <p className="text-sm text-gray-500 mt-1">Manage your purchase bills and supplier payments</p>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'profitandloss' && (
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-4 md:p-6 mb-6 sticky top-0 z-30 border border-gray-100">
              <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
                <div className="text-center md:text-left">
                  <h1 className="text-xl md:text-2xl font-bold text-gray-900">Profit and Loss Report</h1>
                  <p className="text-sm text-gray-500 mt-1">View your business profit and loss summary</p>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'billwiseprofit' && (
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-4 md:p-6 mb-6 sticky top-0 z-30 border border-gray-100">
              <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
                <div className="text-center md:text-left">
                  <h1 className="text-xl md:text-2xl font-bold text-gray-900">Profit on Sale Invoices</h1>
                  <p className="text-sm text-gray-500 mt-1">See profit for each sale invoice</p>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'cashflow' && (
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-4 md:p-6 mb-6 sticky top-0 z-30 border border-gray-100">
              <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
                <div className="text-center md:text-left">
                  <h1 className="text-xl md:text-2xl font-bold text-gray-900">Opening Cash in Hand</h1>
                  <p className="text-sm text-gray-500 mt-1">Cash flow statement</p>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'balancesheet' && (
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-4 md:p-6 mb-6 sticky top-0 z-30 border border-gray-100">
              <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
                <div className="text-center md:text-left">
                  <h1 className="text-xl md:text-2xl font-bold text-gray-900">Balance Sheet</h1>
                  <p className="text-sm text-gray-500 mt-1">Business assets, liabilities, and equity</p>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'daybook' && (
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-4 md:p-6 mb-6 sticky top-0 z-30 border border-gray-100">
              <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
                <div className="text-center md:text-left">
                  <h1 className="text-xl md:text-2xl font-bold text-gray-900">Day Book</h1>
                  <p className="text-sm text-gray-500 mt-1">View all daily business entries</p>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'alltransactions' && (
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-4 md:p-6 mb-6 sticky top-0 z-30 border border-gray-100">
              <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
                <div className="text-center md:text-left">
                  <h1 className="text-xl md:text-2xl font-bold text-gray-900">All Transactions</h1>
                  <p className="text-sm text-gray-500 mt-1">Complete list of all business transactions</p>
                </div>
              </div>
            </div>
          )}
          {/* Default analytics header for all other tabs */}
          {/* (activeTab !== 'sale' && activeTab !== 'purchase' && activeTab !== 'profitandloss' && activeTab !== 'billwiseprofit' && activeTab !== 'cashflow' && activeTab !== 'balancesheet' && activeTab !== 'daybook' && activeTab !== 'alltransactions') && (
      <div className="bg-white rounded-2xl shadow-xl border border-white/20 backdrop-blur-sm p-8 mb-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5"></div>
        <div className="relative z-10">
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between">
            <div className="mb-6 xl:mb-0">
              <div className="flex items-center mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mr-4 shadow-lg">
                  <span className="text-white text-2xl">📊</span>
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    Business Analytics
                  </h1>
                  <p className="text-gray-600 mt-1">Real-time insights and comprehensive reports</p>
                </div>
              </div>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span className="flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                  Live Data
                </span>
                <span>Last updated: {new Date().toLocaleString()}</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
              <select 
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-6 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm hover:shadow-md transition-all duration-200 font-medium"
              >
                <option value="today">📅 Today</option>
                <option value="thisWeek">📊 This Week</option>
                <option value="thisMonth">📈 This Month</option>
                <option value="lastMonth">📉 Last Month</option>
                <option value="thisYear">🗓️ This Year</option>
                <option value="custom">⚙️ Custom Range</option>
              </select>
              <button 
                onClick={() => setShowDetailedReport(true)}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl flex items-center space-x-2 group"
              >
                <span className="group-hover:scale-110 transition-transform duration-200">📊</span>
                <span>Export Report</span>
              </button>
            </div>
          </div>
        </div>
      </div>
          )*/}

      {/* Overview Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-8 animate-fadeIn">
          {/* Enhanced KPI Cards with Gradients */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {kpis.map((kpi, index) => (
              <div key={index} className="group">
                <div className={`bg-gradient-to-br ${kpi.bgGradient} p-6 rounded-2xl shadow-lg border border-white/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-14 h-14 bg-gradient-to-br ${kpi.gradient} rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      <span className="text-white text-2xl">{kpi.icon}</span>
                    </div>
                    {kpi.trend && (
                      <div className={`px-3 py-1 rounded-full text-xs font-bold ${kpi.trendPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {kpi.trend}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="text-3xl font-bold text-gray-900">{kpi.value}</div>
                    <div className="text-sm font-medium text-gray-600">{kpi.title}</div>
                    <div className="text-xs text-gray-500">{kpi.subtitle}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Enhanced Charts Section */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Monthly Income Chart */}
            <div className="bg-white p-8 rounded-2xl shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 flex items-center">
                  <span className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mr-3">
                    <span className="text-white text-lg">📈</span>
                  </span>
                  Revenue Trend
                </h3>
                <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                  2024
                </div>
              </div>
              <div className="h-80">
                {monthlyIncome.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <div className="text-center">
                      <span className="text-6xl mb-4 block opacity-50">📊</span>
                      <p className="font-medium">No revenue data available</p>
                      <p className="text-sm">Start selling to see your revenue trends</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 h-full overflow-y-auto">
                    {monthlyIncome.slice(0, 8).map((data) => {
                      const maxValue = Math.max(...monthlyIncome.map(d => d.income))
                      const percentage = maxValue > 0 ? (data.income / maxValue) * 100 : 0
                      return (
                        <div key={data.month} className="flex items-center space-x-4 group">
                          <div className="w-16 text-sm font-semibold text-gray-600">
                            {data.month}
                          </div>
                          <div className="flex-1 bg-gray-100 rounded-full h-4 relative overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-1000 ease-out relative"
                              style={{ width: `${percentage}%` }}
                            >
                              <div className="absolute inset-0 bg-white opacity-30 animate-pulse"></div>
                            </div>
                          </div>
                          <div className="w-24 text-right">
                            <span className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                              {formatCurrency(data.income)}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
            
            {/* Top Products */}
            <div className="bg-white p-8 rounded-2xl shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 flex items-center">
                  <span className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mr-3">
                    <span className="text-white text-lg">🏆</span>
                  </span>
                  Top Products
                </h3>
                <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                  Best Sellers
                </div>
              </div>
              <div className="h-80 overflow-y-auto">
                {topProducts.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <div className="text-center">
                      <span className="text-6xl mb-4 block opacity-50">📦</span>
                      <p className="font-medium">No products data available</p>
                      <p className="text-sm">Start selling to see your top products here</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {topProducts.map((product, index) => (
                    <div key={index} className="group p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl hover:from-blue-50 hover:to-purple-50 transition-all duration-300 hover:shadow-md">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm ${
                              index === 0 ? 'bg-gradient-to-br from-yellow-400 to-orange-500' :
                              index === 1 ? 'bg-gradient-to-br from-gray-400 to-gray-600' :
                              index === 2 ? 'bg-gradient-to-br from-orange-400 to-red-500' :
                              'bg-gradient-to-br from-blue-400 to-purple-500'
                            }`}>
                              #{index + 1}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                                {product.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                Qty Sold: {product.totalQuantity.toLocaleString()}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-green-600 text-lg">
                              {formatCurrency(product.totalSales)}
                            </div>
                            <div className="text-xs text-gray-500">Total Sales</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Tab Contents */}
      {activeTab === 'sales' && (
        <div className="bg-white rounded-2xl shadow-xl p-8 animate-fadeIn">
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <span className="text-white text-3xl">💰</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Sales Analytics</h3>
            <p className="text-gray-600 max-w-md mx-auto">Detailed sales performance metrics, trends, and customer insights coming soon.</p>
          </div>
        </div>
      )}

      {activeTab === 'inventory' && (
        <div className="bg-white rounded-2xl shadow-xl p-8 animate-fadeIn">
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <span className="text-white text-3xl">📦</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Inventory Reports</h3>
            <p className="text-gray-600 max-w-md mx-auto">Stock levels, inventory movements, and warehouse optimization data.</p>
          </div>
        </div>
      )}

      {/* Professional Export Modal */}
      {showDetailedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl transform transition-all duration-300 animate-slideUp">
            <div className="bg-gradient-to-br from-blue-600 via-purple-600 to-blue-700 px-8 py-8 rounded-t-3xl relative overflow-hidden">
              <div className="absolute inset-0 bg-white opacity-10"></div>
              <div className="relative z-10">
                <h3 className="text-2xl font-bold text-white flex items-center">
                  <span className="w-10 h-10 bg-white bg-opacity-20 rounded-xl flex items-center justify-center mr-4">
                    <span className="text-white text-xl">📊</span>
                  </span>
                  Export Business Report
                </h3>
                <p className="text-blue-100 text-sm mt-2">Generate comprehensive analytics report for your business</p>
              </div>
            </div>
            <div className="p-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-4">Choose Report Format</label>
                  <div className="grid grid-cols-1 gap-4">
                    {[
                      { value: 'pdf', label: 'PDF Report', icon: '📄', description: 'Professional formatted document with charts', color: 'from-red-500 to-red-600' },
                      { value: 'excel', label: 'Excel Spreadsheet', icon: '📊', description: 'Interactive data with formulas and pivot tables', color: 'from-green-500 to-green-600' },
                      { value: 'csv', label: 'CSV Data File', icon: '📋', description: 'Raw data for custom analysis and processing', color: 'from-blue-500 to-blue-600' }
                    ].map((format) => (
                      <label key={format.value} className="group cursor-pointer">
                        <div className={`p-5 border-2 rounded-xl transition-all duration-200 ${
                          selectedFormat === format.value 
                            ? 'border-blue-500 bg-blue-50 shadow-md' 
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}>
                          <div className="flex items-center">
                            <input
                              type="radio"
                              name="format"
                              value={format.value}
                              checked={selectedFormat === format.value}
                              onChange={(e) => setSelectedFormat(e.target.value)}
                              className="sr-only"
                            />
                            <div className={`w-12 h-12 bg-gradient-to-br ${format.color} rounded-xl flex items-center justify-center mr-4 group-hover:scale-105 transition-transform duration-200`}>
                              <span className="text-white text-xl">{format.icon}</span>
                            </div>
                            <div className="flex-1">
                              <div className="font-semibold text-gray-900">{format.label}</div>
                              <div className="text-sm text-gray-600 mt-1">{format.description}</div>
                            </div>
                            <div className={`w-5 h-5 rounded-full border-2 transition-all duration-200 ${
                              selectedFormat === format.value 
                                ? 'border-blue-500 bg-blue-500' 
                                : 'border-gray-300'
                            }`}>
                              {selectedFormat === format.value && (
                                <div className="w-3 h-3 bg-white rounded-full mx-auto mt-0.5"></div>
                              )}
                            </div>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-100">
                  <button 
                    onClick={() => setShowDetailedReport(false)}
                    disabled={isExporting}
                    className="px-8 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-all duration-200 font-medium"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleExport}
                    disabled={isExporting}
                    className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-lg hover:shadow-xl flex items-center space-x-3"
                  >
                    {isExporting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                        <span>Generating Report...</span>
                      </>
                    ) : (
                      <>
                        <span className="text-lg">📥</span>
                        <span>Download Report</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>

      <style jsx>{`
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  )
}