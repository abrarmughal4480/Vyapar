'use client';

import React, { useState } from 'react';
import ReportsSidebar from '../../components/ReportsSidebar';

interface ReportsLayoutProps {
  children: React.ReactNode;
}

const ReportsLayout: React.FC<ReportsLayoutProps> = ({ children }) => {
  const [activeTab, setActiveTab] = useState('overview');
  return (
    <div className="w-full min-h-screen flex gap-8">
      <div className="hidden md:block h-screen sticky top-0">
        <ReportsSidebar activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
      <div className="flex-1 min-w-0 overflow-y-auto max-h-screen">{React.cloneElement(children as React.ReactElement, { activeTab, setActiveTab })}</div>
    </div>
  );
};

export default ReportsLayout; 