import React from 'react';
import Link from 'next/link';

interface ReportsSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const reportTabs = [
  { id: 'sale', name: 'Sale' },
  { id: 'purchase', name: 'Purchase' },
  { id: 'daybook', name: 'Day Book' },
  { id: 'alltransactions', name: 'All Transactions' },
  { id: 'profitandloss', name: 'Profit and Loss' },
  { id: 'billwiseprofit', name: 'Bill Wise Profit' },
  { id: 'cashflow', name: 'Cash Flow' },
  { id: 'balancesheet', name: 'Balance Sheet' },
];

const ReportsSidebar: React.FC<ReportsSidebarProps> = ({ activeTab, onTabChange }) => {
  return (
    <aside className="w-48 min-h-full bg-white border-l border-gray-200 p-0 flex flex-col">
      <div className="bg-[#f0f6ff] px-6 py-4 border-b border-gray-100">
        <h2 className="text-base font-bold text-blue-800 tracking-wide">Transaction Report</h2>
      </div>
      <nav className="flex flex-col">
        {reportTabs.map(tab => (
          tab.id === 'sale' ? (
            <Link
              key={tab.id}
              href="/dashboard/reports/sale"
              className={`text-left px-6 py-3 text-sm transition-all duration-150 border-b border-gray-100 ${activeTab === tab.id ? 'bg-gray-100 font-bold text-blue-700' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              {tab.name}
            </Link>
          ) : tab.id === 'purchase' ? (
            <Link
              key={tab.id}
              href="/dashboard/reports/purchase"
              className={`text-left px-6 py-3 text-sm transition-all duration-150 border-b border-gray-100 ${activeTab === tab.id ? 'bg-gray-100 font-bold text-blue-700' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              {tab.name}
            </Link>
          ) : tab.id === 'daybook' ? (
            <Link
              key={tab.id}
              href="/dashboard/reports/day-book"
              className={`text-left px-6 py-3 text-sm transition-all duration-150 border-b border-gray-100 ${activeTab === tab.id ? 'bg-gray-100 font-bold text-blue-700' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              {tab.name}
            </Link>
          ) : tab.id === 'alltransactions' ? (
            <Link
              key={tab.id}
              href="/dashboard/reports/all-transactions"
              className={`text-left px-6 py-3 text-sm transition-all duration-150 border-b border-gray-100 ${activeTab === tab.id ? 'bg-gray-100 font-bold text-blue-700' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              {tab.name}
            </Link>
          ) : (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`text-left px-6 py-3 text-sm transition-all duration-150 border-b border-gray-100
              ${activeTab === tab.id
                ? 'bg-gray-100 font-bold text-blue-700'
                : 'bg-white text-gray-700 hover:bg-gray-50'}
            `}
          >
            {tab.name}
          </button>
          )
        ))}
      </nav>
    </aside>
  );
};

export default ReportsSidebar; 