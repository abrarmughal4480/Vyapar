'use client'
import Header from '../components/Header'
import Sidebar from '../components/Sidebar'
import BottomNavigation from '../components/BottomNavigation'
import { useState, useEffect } from 'react'
import { SidebarContext } from '../contexts/SidebarContext'
import { useRouter } from 'next/navigation'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const router = useRouter();
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      router.replace('/');
    }
  }, [router]);
  return (
    <SidebarContext.Provider value={{ isCollapsed, setIsCollapsed }}>
      <div className="min-h-screen bg-gray-50">
        {/* Sidebar for desktop */}
        <div className="print:hidden">
          <Sidebar />
        </div>
        
        {/* Main content area */}
        <div className={`transition-all duration-300 ease-in-out ${isCollapsed ? 'lg:ml-16' : 'lg:ml-64'}`}>
          {/* Header for mobile */}
          <div className="lg:hidden print:hidden">
            <Header />
          </div>
          
          {/* Main content */}
          <main className="pb-20 lg:pb-0">
            {children}
          </main>
        </div>
        
        {/* Bottom navigation for mobile */}
        <div className="print:hidden">
          <BottomNavigation />
        </div>
      </div>
    </SidebarContext.Provider>
  )
}
