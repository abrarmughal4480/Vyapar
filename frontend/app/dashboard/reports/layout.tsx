'use client';

import React, { useState } from 'react';
import ReportsSidebar from '../../components/ReportsSidebar';

interface ReportsLayoutProps {
  children: React.ReactNode;
}

const ReportsLayout: React.FC<ReportsLayoutProps> = ({ children }) => {
  const [activeTab, setActiveTab] = useState('overview');
  return (
    <div className="w-full min-h-screen flex">
      {/* Sidebar - Fixed width, scrollable */}
      <div className="hidden md:block w-56 h-screen sticky top-0 overflow-y-auto scrollbar-hide">
        <ReportsSidebar activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
      
      {/* Main Content - Scrollable */}
      <div className="flex-1 min-w-0 h-screen overflow-y-auto">
        {React.cloneElement(children as React.ReactElement, { activeTab, setActiveTab })}
      </div>

      {/* Custom CSS for hiding scrollbar */}
      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;  /* Internet Explorer 10+ */
          scrollbar-width: none;  /* Firefox */
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;  /* Safari and Chrome */
        }
      `}</style>
    </div>
  );
};

export default ReportsLayout; 