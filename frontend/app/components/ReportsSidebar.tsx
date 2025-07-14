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
  { id: 'billwiseprofit', name: 'Bill Wise Profit' },
  { id: 'profitandloss', name: 'Profit and Loss' },
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
          ) : tab.id === 'billwiseprofit' ? (
            <Link
              key={tab.id}
              href="/dashboard/reports/bill-wise-profit"
              className={`text-left px-6 py-3 text-sm transition-all duration-150 border-b border-gray-100 ${activeTab === tab.id ? 'bg-gray-100 font-bold text-blue-700' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              {tab.name}
            </Link>
          ) : tab.id === 'profitandloss' ? (
            <Link
              key={tab.id}
              href="/dashboard/reports/profit-and-loss"
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
      {/* Party Report Section */}
      <div className="bg-[#f0f6ff] px-6 py-4 border-b border-gray-100">
        <h2 className="text-base font-bold text-blue-800 tracking-wide">Party Report</h2>
      </div>
      <nav className="flex flex-col">
        <Link
          href="/dashboard/reports/party-statement"
          className={`text-left px-6 py-3 text-sm transition-all duration-150 border-b border-gray-100 ${activeTab === 'party-statement' ? 'bg-gray-100 font-bold text-blue-700' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
        >
          Party Statement
        </Link>
        <Link
          href="/dashboard/reports/party-wise-profit-and-loss"
          className={`text-left px-6 py-3 text-sm transition-all duration-150 border-b border-gray-100 ${activeTab === 'party-wise-profit-and-loss' ? 'bg-gray-100 font-bold text-blue-700' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
        >
          Party Wise Profit and Loss
        </Link>
        <Link
          href="/dashboard/reports/all-parties"
          className={`text-left px-6 py-3 text-sm transition-all duration-150 border-b border-gray-100 ${activeTab === 'all-parties' ? 'bg-gray-100 font-bold text-blue-700' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
        >
          All Parties
        </Link>
        <Link
          href="/dashboard/reports/party-report-by-item"
          className={`text-left px-6 py-3 text-sm transition-all duration-150 border-b border-gray-100 ${activeTab === 'party-report-by-item' ? 'bg-gray-100 font-bold text-blue-700' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
        >
          Party Report by Item
        </Link>
        <Link
          href="/dashboard/reports/sale-purchase-by-party"
          className={`text-left px-6 py-3 text-sm transition-all duration-150 border-b border-gray-100 ${activeTab === 'sale-purchase-by-party' ? 'bg-gray-100 font-bold text-blue-700' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
        >
          Sale Purchase by Party
        </Link>
        <Link
          href="/dashboard/reports/sale-purchase-by-party-group"
          className={`text-left px-6 py-3 text-sm transition-all duration-150 border-b border-gray-100 ${activeTab === 'sale-purchase-by-party-group' ? 'bg-gray-100 font-bold text-blue-700' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
        >
          Sale Purchase by Party Group
        </Link>
      </nav>
    </aside>
  );
};

export default ReportsSidebar; 