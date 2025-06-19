'use client';

import { useState } from 'react';

export default function BusinessOverview() {
  const [activeTab, setActiveTab] = useState('sales');

  const salesData = [
    { month: 'Jan', sales: 65000, purchases: 45000 },
    { month: 'Feb', sales: 75000, purchases: 52000 },
    { month: 'Mar', sales: 85000, purchases: 58000 },
    { month: 'Apr', sales: 95000, purchases: 65000 },
    { month: 'May', sales: 88000, purchases: 60000 },
    { month: 'Jun', sales: 125000, purchases: 85000 },
  ];

  const maxValue = Math.max(...salesData.map(d => Math.max(d.sales, d.purchases)));

  return (
    <div className="bg-white rounded-lg p-6 card-shadow">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Business Overview</h2>
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('sales')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'sales'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Sales vs Purchase
          </button>
          <button
            onClick={() => setActiveTab('profit')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'profit'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Profit Trend
          </button>
        </div>
      </div>

      <div className="h-64 flex items-end justify-between space-x-2">
        {salesData.map((data, index) => (
          <div key={index} className="flex-1 flex flex-col items-center">
            <div className="w-full flex flex-col items-center space-y-1 mb-2">
              <div
                className="w-full bg-blue-500 rounded-t-sm"
                style={{ height: `${(data.sales / maxValue) * 180}px` }}
              ></div>
              <div
                className="w-full bg-green-500 rounded-t-sm"
                style={{ height: `${(data.purchases / maxValue) * 180}px` }}
              ></div>
            </div>
            <span className="text-xs text-gray-600 font-medium">{data.month}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center mt-4 space-x-6">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
          <span className="text-sm text-gray-600">Sales</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
          <span className="text-sm text-gray-600">Purchases</span>
        </div>
      </div>
    </div>
  );
}
