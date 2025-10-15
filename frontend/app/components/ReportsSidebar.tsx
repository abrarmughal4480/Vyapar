import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';


interface ReportsSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const reportTabs = [
  { 
    id: 'sale', 
    name: 'Sale Report', 
    description: 'Sales analysis and insights',
    path: '/dashboard/reports/sale'
  },
  { 
    id: 'purchase', 
    name: 'Purchase Report', 
    description: 'Purchase tracking and analysis',
    path: '/dashboard/reports/purchase'
  },
  { 
    id: 'expense-report', 
    name: 'Expense Report', 
    description: 'Complete expense tracking and analysis',
    path: '/dashboard/reports/expense-report'
  },
  { 
    id: 'daybook', 
    name: 'Day Book', 
    description: 'Daily transaction summary',
    path: '/dashboard/reports/day-book'
  },
  { 
    id: 'alltransactions', 
    name: 'All Transactions', 
    description: 'Complete transaction history',
    path: '/dashboard/reports/all-transactions'
  },
  { 
    id: 'billwiseprofit', 
    name: 'Bill Wise Profit', 
    description: 'Profit analysis by bill',
    path: '/dashboard/reports/bill-wise-profit'
  },
  { 
    id: 'profitandloss', 
    name: 'Profit and Loss', 
    description: 'Financial performance overview',
    path: '/dashboard/reports/profit-and-loss'
  },
];

const partyReportTabs = [
  {
    id: 'all-parties',
    name: 'All Parties',
    description: 'Complete list of all parties with balances',
    path: '/dashboard/reports/all-parties'
  },
  {
    id: 'party-statement',
    name: 'Party Statement',
    description: 'Individual party transactions',
    path: '/dashboard/reports/party-statement'
  },
  {
    id: 'party-wise-profit-and-loss',
    name: 'Party Wise P&L',
    description: 'Profit/loss by party',
    path: '/dashboard/reports/party-wise-profit-and-loss'
  },
  {
    id: 'sale-summary',
    name: 'Sale Summary',
    description: 'Daily sales summary by party',
    path: '/dashboard/reports/sale-summary'
  },
];

const itemStockReportTabs = [
  {
    id: 'stock-summary',
    name: 'Stock Summary',
    description: 'Current stock levels and valuation',
    path: '/dashboard/reports/stock-summary'
  },
  {
    id: 'low-stock-summary',
    name: 'Low Stock Summary',
    description: 'Items below minimum stock level',
    path: '/dashboard/reports/low-stock-summary'
  },
  {
    id: 'item-wise-profit-and-loss',
    name: 'Item Wise P&L',
    description: 'Profit/loss analysis by item',
    path: '/dashboard/reports/item-wise-profit-and-loss'
  },
];

const ReportsSidebar: React.FC<ReportsSidebarProps> = ({ activeTab, onTabChange }) => {
  const pathname = usePathname();
  
  // Auto-detect active tab based on current pathname
  React.useEffect(() => {
    console.log('🔍 ReportsSidebar - Current pathname:', pathname);
    
    const allTabs = [...reportTabs, ...partyReportTabs, ...itemStockReportTabs];
    const currentTab = allTabs.find(tab => {
      const isMatch = pathname === tab.path || pathname.startsWith(tab.path + '/');
      console.log(`  Checking ${tab.name}: ${tab.path} - Match: ${isMatch}`);
      return isMatch;
    });
    
    console.log('✅ Found active tab:', currentTab?.name);
    
    if (currentTab) {
      console.log('🔄 Setting active tab to:', currentTab.id);
      onTabChange(currentTab.id);
    } else {
      console.log('❌ No matching tab found for pathname:', pathname);
    }
  }, [pathname, onTabChange]);
  
  const renderNavItem = (item: any) => {
    // Check if current pathname matches the item path or starts with it
    const isActive = pathname === item.path || pathname.startsWith(item.path + '/');
    
    // Debug logging
    console.log(`Checking tab: ${item.name}, path: ${item.path}, current: ${pathname}, isActive: ${isActive}`);
    
    return (
      <Link
        key={item.id}
        href={item.path}
        className={`group flex items-center space-x-2 px-3 py-2 text-xs transition-all duration-200 border-l-4 hover:bg-blue-50 hover:border-blue-200 ${
          isActive 
            ? 'bg-blue-50 border-blue-500 text-blue-700 font-semibold' 
            : 'border-transparent text-gray-700 hover:text-gray-900'
        }`}
      >
        <div className="flex-1 min-w-0">
          <div className={`font-medium transition-colors duration-200 ${
            isActive ? 'text-blue-700' : 'text-gray-900 group-hover:text-gray-700'
          }`}>
            {item.name}
          </div>
          <div className={`text-xs transition-colors duration-200 ${
            isActive ? 'text-blue-600' : 'text-gray-500 group-hover:text-gray-600'
          }`}>
            {item.description}
          </div>
        </div>
      </Link>
    );
  };

  return (
    <aside className="w-48 min-h-full bg-white border-r border-gray-200 shadow-sm flex flex-col">
      {/* Navigation */}
      <div className="flex-1 overflow-y-auto">
        {/* Transaction Reports Section */}
        <div className="py-3">
          <div className="px-3 mb-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Transaction Reports
            </h3>
          </div>
          <nav className="space-y-1">
            {reportTabs.map(renderNavItem)}
          </nav>
        </div>

        {/* Party Reports Section */}
        <div className="py-3 border-t border-gray-100">
          <div className="px-3 mb-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Party Reports
            </h3>
          </div>
          <nav className="space-y-1">
            {partyReportTabs.map(renderNavItem)}
          </nav>
        </div>

        {/* Item/Stock Reports Section */}
        <div className="py-3 border-t border-gray-100">
          <div className="px-3 mb-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Item/Stock Reports
            </h3>
          </div>
          <nav className="space-y-1">
            {itemStockReportTabs.map(renderNavItem)}
          </nav>
        </div>
      </div>
    </aside>
  );
};

export default ReportsSidebar; 