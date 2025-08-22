'use client'
import Header from '../components/Header'
import Sidebar from '../components/Sidebar'
import BottomNavigation from '../components/BottomNavigation'
import { useState, useEffect } from 'react'
import { SidebarContext } from '../contexts/SidebarContext'
import { useRouter } from 'next/navigation'
import sessionManager from '../../lib/sessionManager'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isScrollRestored, setIsScrollRestored] = useState(false)
  const router = useRouter();
  
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      router.replace('/');
      return;
    }
    
    // Start session monitoring when dashboard loads
    sessionManager.startMonitoring();
    
    // Prevent scrolling and hide scrollbar during restoration
    document.body.style.overflow = 'hidden';
    document.body.classList.add('no-scrollbar');
    document.documentElement.classList.add('no-scrollbar');
    
    // Save scroll position before page unload
    const handleBeforeUnload = () => {
      const currentPath = window.location.pathname;
      sessionStorage.setItem(`scrollPosition_${currentPath}`, window.scrollY.toString());
    };
    
    // Restore scroll position immediately without flash
    const restoreScrollPosition = () => {
      const currentPath = window.location.pathname;
      const savedPosition = sessionStorage.getItem(`scrollPosition_${currentPath}`);
      if (savedPosition) {
        const position = parseInt(savedPosition);
        // Restore immediately to prevent flash
        window.scrollTo(0, position);
        sessionStorage.removeItem(`scrollPosition_${currentPath}`);
      }
      
      // Re-enable scrolling, show scrollbar, and show content
      setTimeout(() => {
        document.body.style.overflow = '';
        document.body.classList.remove('no-scrollbar');
        document.documentElement.classList.remove('no-scrollbar');
        setIsScrollRestored(true);
      }, 100);
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Restore scroll position immediately
    restoreScrollPosition();
    
    // Cleanup on unmount
    return () => {
      // Don't stop session monitoring as it should continue running
      // sessionManager.stopMonitoring();
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.body.style.overflow = '';
      document.body.classList.remove('no-scrollbar');
      document.documentElement.classList.remove('no-scrollbar');
    };
  }, [router]);
  
  return (
    <SidebarContext.Provider value={{ isCollapsed, setIsCollapsed }}>
      <div className="min-h-screen bg-gray-50">
        {/* Sidebar for desktop - Also fade in */}
        <div className={`print:hidden transition-opacity duration-300 ${isScrollRestored ? 'opacity-100' : 'opacity-0'}`}>
          <Sidebar />
        </div>
        
        {/* Main content area */}
        <div className={`transition-all duration-300 ease-in-out ${isCollapsed ? 'lg:ml-16' : 'lg:ml-64'}`}>
          {/* Header for mobile */}
          <div className={`lg:hidden print:hidden transition-opacity duration-300 ${isScrollRestored ? 'opacity-100' : 'opacity-0'}`}>
            <Header />
          </div>
          
          {/* Main content - Show only after scroll is restored to prevent flash */}
          <main className={`pb-20 lg:pb-0 transition-opacity duration-300 ${isScrollRestored ? 'opacity-100' : 'opacity-0'}`}>
            {children}
          </main>
          
          {/* Overlay container for trial expiration */}
          <div id="overlay-container" className="relative z-50"></div>
        </div>
        
        {/* Bottom navigation for mobile */}
        <div className={`print:hidden transition-opacity duration-300 ${isScrollRestored ? 'opacity-100' : 'opacity-0'}`}>
          <BottomNavigation />
        </div>
      </div>
      
      {/* Global overlay removal script - Only on pricing page */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              function removeOverlayOnPricing() {
                // Check multiple possible paths for pricing page
                const currentPath = window.location.pathname;
                if (currentPath === '/dashboard/pricing' || 
                    currentPath === '/dashboard/pricing/' ||
                    currentPath.includes('/dashboard/pricing') ||
                    currentPath.includes('pricing')) {
                  
                  const overlay = document.getElementById('buy-plan-overlay');
                  if (overlay) {
                    overlay.remove();
                    console.log('Dashboard layout: Overlay removed from pricing page - Path:', currentPath);
                  }
                  
                  // Also remove any overlay with similar ID
                  const allOverlays = document.querySelectorAll('[id*="overlay"], [id*="Overlay"]');
                  allOverlays.forEach(function(el) {
                    if (el.id.includes('buy-plan') || el.id.includes('overlay')) {
                      el.remove();
                      console.log('Removed additional overlay:', el.id);
                    }
                  });
                }
              }
              
              // Check immediately
              removeOverlayOnPricing();
              
              // Check every 50ms for faster response
              setInterval(removeOverlayOnPricing, 50);
              
              // Also check on route changes
              let currentPath = window.location.pathname;
              setInterval(function() {
                if (window.location.pathname !== currentPath) {
                  currentPath = window.location.pathname;
                  removeOverlayOnPricing();
                }
              }, 50);
              
              // Force check on window focus and load
              window.addEventListener('focus', removeOverlayOnPricing);
              window.addEventListener('load', removeOverlayOnPricing);
              document.addEventListener('DOMContentLoaded', removeOverlayOnPricing);
            })();
          `
        }}
      />
    </SidebarContext.Provider>
  )
}
