'use client'
import Header from '../components/Header'
import Sidebar from '../components/Sidebar'
import BottomNavigation from '../components/BottomNavigation'
import { useState } from 'react'
import { SidebarContext } from '../contexts/SidebarContext'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  return (
    <SidebarContext.Provider value={{ isCollapsed, setIsCollapsed }}>
      <div className="min-h-screen bg-gray-50">
        {/* Sidebar for desktop */}
        <Sidebar />
        
        {/* Main content area */}
        <div className={`transition-all duration-300 ease-in-out ${isCollapsed ? 'lg:ml-16' : 'lg:ml-64'}`}>
          {/* Header for mobile */}
          <div className="lg:hidden">
            <Header />
          </div>
          
          {/* Main content */}
          <main className="pb-20 lg:pb-0">
            {children}
          </main>
        </div>
        
        {/* Bottom navigation for mobile */}
        <BottomNavigation />
      </div>
    </SidebarContext.Provider>
  )
}
