'use client'

import React, { useContext } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { SidebarContext } from '../contexts/SidebarContext'
import { FiChevronRight } from 'react-icons/fi'
import { performLogout } from '../../lib/logout'
import { getCurrentUserInfo, canAccessDashboard } from '../../lib/roleAccessControl'
import { checkLicenseStatus } from '../../http/license-keys'

// Define types for nav items
interface NavSubItem {
  id: string;
  label: string;
  icon?: string;
  path: string;
}

interface NavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  description: string;
  hasDropdown?: boolean;
  subItems?: NavSubItem[];
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '🏠', path: '/dashboard', description: 'Overview & Stats' },
  { id: 'parties', label: 'Parties', icon: '👥', path: '/dashboard/parties', description: 'Customers & Suppliers' },
  { id: 'items', label: 'Items', icon: '📦', path: '/dashboard/items', description: 'Products & Services' },
  { 
    id: 'sale', 
    label: 'Sale', 
    icon: '💰', 
    path: '/dashboard/sale', 
    description: 'Sales & Invoices',
    hasDropdown: true,
    subItems: [
      { id: 'sale-invoices', label: 'Sale Invoices', icon: '💰',   path: '/dashboard/sale' },
      { id: 'estimate-quotation', label: 'Estimate/ Quotation', icon: '📋', path: '/dashboard/quotation', },
      { id: 'payment-in', label: 'Payment In', path: '/dashboard/payment-in' },
      { id: 'sale-order', label: 'Sale Order', icon: '📊', path: '/dashboard/sales' },
      { id: 'delivery-challan', label: 'Delivery Challan', icon: '🚚', path: '/dashboard/delivery-challan' },
      { id: 'sale-return-credit', label: 'Sale Return/ Credit Note', path: '/dashboard/credit-note' }
    ]
  },
  { 
    id: 'purchase', 
    label: 'Purchase', 
    icon: '🛒', 
    path: '/dashboard/purchase', 
    description: 'Purchase & Bills',
    hasDropdown: true,
    subItems: [
      { id: 'purchase-bills', label: 'Purchase Bills', icon: '🧾', path: '/dashboard/purchase' },
      { id: 'purchase-order', label: 'Purchase Order', icon: '📋', path: '/dashboard/purchase-order' },
      { id: 'payment-out', label: 'Payment Out', icon: '💸', path: '/dashboard/payment-out' },
      { id: 'expenses', label: 'Expenses', icon: '💸', path: '/dashboard/expenses' }
    ]
  },
  { id: 'cash-bank', label: 'Cash in Hand', icon: '🏦', path: '/dashboard/cash-bank', description: 'Payment Records' },
  { id: 'reports', label: 'Reports', icon: '📈', path: '/dashboard/reports', description: 'Business Analytics' },
  { id: 'barcode', label: 'Barcode', icon: '📱', path: '/dashboard/barcode', description: 'Barcode Scanner' },
  { id: 'backup-restore', label: 'Backup & Restore', icon: '💾', path: '/dashboard/backup-restore', description: 'Data Management' },
  { id: 'settings', label: 'Settings', icon: '⚙️', path: '/dashboard/settings', description: 'App Configuration' }
]

interface ReportsSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const reportTabs = [
  { id: 'overview', name: 'Overview', icon: '📊' },
  { id: 'sales', name: 'Sales', icon: '💰' },
  { id: 'purchase', name: 'Purchase', icon: '🛒' },
  { id: 'inventory', name: 'Inventory', icon: '📦' },
  { id: 'export', name: 'Export', icon: '📥' },
];

const ReportsSidebar: React.FC<ReportsSidebarProps> = ({ activeTab, onTabChange }) => {
  return (
    <aside className="w-56 min-h-full bg-gradient-to-b from-blue-50 to-indigo-50 border-r border-gray-200 p-6 flex flex-col gap-2 rounded-2xl shadow-md">
      <h2 className="text-lg font-bold text-gray-800 mb-6 tracking-wide">Reports</h2>
      <nav className="flex flex-col gap-2">
        {reportTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-base transition-all duration-200
              ${activeTab === tab.id
                ? 'bg-blue-600 text-white shadow-lg scale-105'
                : 'bg-white text-gray-700 hover:bg-blue-100'}
            `}
          >
            <span className="text-xl">{tab.icon}</span>
            <span>{tab.name}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
};

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [businessName, setBusinessName] = useState('My Business')
  const [openDropdowns, setOpenDropdowns] = useState<{ [key: string]: boolean }>({})
  const [userInfo, setUserInfo] = useState<any>(null)
  const [userEmail, setUserEmail] = useState<string>('')
  const [showBuyPlan, setShowBuyPlan] = useState(false)
  const [daysSinceCreation, setDaysSinceCreation] = useState(0)
  const [hasLicenseKey, setHasLicenseKey] = useState(false)
  const [licenseDetails, setLicenseDetails] = useState<any>(null)
  const [isCheckingLicense, setIsCheckingLicense] = useState(false)
  const [isDataLoaded, setIsDataLoaded] = useState(false)
  const [isLicenseCheckComplete, setIsLicenseCheckComplete] = useState(false)

  // Use SidebarContext for isCollapsed and setIsCollapsed
  const { isCollapsed, setIsCollapsed } = useContext(SidebarContext)

  useEffect(() => {
    const name = localStorage.getItem('businessName')
    if (name) setBusinessName(name)
    
    // Get current user info for role-based access
    const currentUserInfo = getCurrentUserInfo()
    setUserInfo(currentUserInfo)
    
    // Log token details to see what email is in the token
    try {
      const token = localStorage.getItem('token')
      if (token) {
        const tokenPayload = JSON.parse(atob(token.split('.')[1]));
        console.log('🔍 Sidebar Token Payload:', {
          email: tokenPayload.email,
          userEmail: tokenPayload.userEmail,
          id: tokenPayload.id,
          role: tokenPayload.role,
          context: tokenPayload.context
        });
      }
    } catch (error) {
      console.error('Error parsing token in sidebar:', error);
    }
    
    // Set user email from token
    if (currentUserInfo && currentUserInfo.email) {
      setUserEmail(currentUserInfo.email)
      console.log('📧 Sidebar User Email set to:', currentUserInfo.email)
    } else {
      console.log('❌ No email found in currentUserInfo:', currentUserInfo)
    }
    
    // Check license key status from database
    const checkLicenseStatusFromDB = async () => {
      try {
        const token = localStorage.getItem('token')
        if (token) {
          setIsCheckingLicense(true)
          console.log('Checking license status from database for email:', currentUserInfo?.email)
          const response = await checkLicenseStatus()
          console.log('License status response:', response)
          
          if (response.success && response.data) {
            setHasLicenseKey(response.data.hasValidLicense)
            setLicenseDetails(response.data.license || null)
          } else {
            setHasLicenseKey(false)
            setLicenseDetails(null)
          }
        } else {
          setHasLicenseKey(false)
          setLicenseDetails(null)
        }
      } catch (error) {
        console.error('Error checking license status from database:', error)
        setHasLicenseKey(false)
        setLicenseDetails(null)
      } finally {
        setIsCheckingLicense(false)
        setIsLicenseCheckComplete(true) // Mark license check as complete
      }
    }
    
    checkLicenseStatusFromDB()
    
    // Check if user has been logged in for more than 14 days
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    if (user && user.createdAt) {
      const userCreatedAt = new Date(user.createdAt)
      const currentDate = new Date()
      const days = Math.floor((currentDate.getTime() - userCreatedAt.getTime()) / (1000 * 60 * 60 * 24))
      setDaysSinceCreation(days)
      
      if (days > 14) {
        setShowBuyPlan(true)
      }
    }
    
    // Mark data as loaded after all checks are complete
    setIsDataLoaded(true)
    
    // If no token, mark license check as complete immediately
    if (!localStorage.getItem('token')) {
      setIsLicenseCheckComplete(true)
    }
    
    // Check if we're on pricing page and remove any existing overlay
    if (window.location.pathname === '/dashboard/pricing') {
      const existingOverlay = document.getElementById('buy-plan-overlay')
      if (existingOverlay) {
        existingOverlay.remove()
        console.log('Removed existing overlay on pricing page mount')
      }
    }
  }, [])

  // Add/remove overlay when showBuyPlan changes - Only after data is fully loaded
  useEffect(() => {
    console.log('showBuyPlan changed:', showBuyPlan)
    console.log('hasLicenseKey:', hasLicenseKey)
    console.log('isDataLoaded:', isDataLoaded)
    console.log('isLicenseCheckComplete:', isLicenseCheckComplete)
    
    // Only proceed if all data is loaded and license check is complete
    if (!isDataLoaded || !isLicenseCheckComplete) {
      console.log('Data not fully loaded yet, skipping overlay logic')
      return;
    }
    
    // Don't show overlay on pricing page
    const currentPath = window.location.pathname;
    if (currentPath === '/dashboard/pricing' || 
        currentPath === '/dashboard/pricing/' ||
        currentPath.includes('/dashboard/pricing') ||
        currentPath.includes('pricing')) {
      console.log('On pricing page, not showing overlay - Path:', currentPath)
      removeOverlayOnPricing();
      return;
    }
    
    // Preserve current scroll position
    const currentScrollY = window.scrollY;
    
    // Only show overlay if user doesn't have license key and has exceeded 14 days
    if (showBuyPlan && !hasLicenseKey && daysSinceCreation > 14) {
      // Double check - don't create overlay on pricing page
      if (window.location.pathname === '/dashboard/pricing') {
        console.log('Pricing page detected, not creating overlay')
        return;
      }
      
      console.log('Showing trial expiration overlay')
      
      // Remove existing overlay first
      const existingOverlay = document.getElementById('buy-plan-overlay')
      if (existingOverlay) {
        existingOverlay.remove()
      }
      
      // Create new overlay with better positioning
      const overlay = document.createElement('div')
      overlay.id = 'buy-plan-overlay'
      overlay.className = 'trial-expired-overlay'
      overlay.style.position = 'fixed'
      overlay.style.top = '0'
      overlay.style.left = isCollapsed ? '64px' : '256px'
      overlay.style.width = isCollapsed ? 'calc(100vw - 64px)' : 'calc(100vw - 256px)'
      overlay.style.height = '100vh'
      overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.3)' // Lighter overlay for better visibility
      overlay.style.zIndex = '9999'
      overlay.style.pointerEvents = 'auto' // Changed to auto to prevent clicks
      overlay.style.display = 'block'
      overlay.style.visibility = 'visible'
      overlay.style.opacity = '1'
      overlay.style.transition = 'opacity 0.3s ease-in-out'
      overlay.style.cursor = 'not-allowed'
      overlay.style.userSelect = 'none' // Prevent text selection
      
      // Add click handler to prevent any clicks
      overlay.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
      });
      
      // Add mousedown handler to prevent any interactions
      overlay.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
      });
      
      // Add message to overlay
      const messageDiv = document.createElement('div')
      messageDiv.style.position = 'absolute'
      messageDiv.style.top = '50%'
      messageDiv.style.left = '50%'
      messageDiv.style.transform = 'translate(-50%, -50%)'
      messageDiv.style.textAlign = 'center'
      messageDiv.style.color = 'white'
      messageDiv.style.fontSize = '24px'
      messageDiv.style.fontWeight = 'bold'
      messageDiv.style.textShadow = '2px 2px 4px rgba(0,0,0,0.5)'
      messageDiv.innerHTML = `
        <div style="margin-bottom: 20px;">⏰</div>
        <div>Trial Period Expired</div>
        <div style="font-size: 16px; margin-top: 10px; opacity: 0.9;">
          Please upgrade your plan to continue using the application
        </div>
        <button 
          onclick="window.location.href='/dashboard/pricing'"
          style="
            margin-top: 20px;
            padding: 12px 24px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            transition: all 0.3s ease;
          "
          onmouseover="this.style.transform='scale(1.05)'"
          onmouseout="this.style.transform='scale(1)'"
        >
          Upgrade Now
        </button>
      `
      
      overlay.appendChild(messageDiv)
      
      console.log('Adding overlay with styles:', overlay.style.cssText)
      
      // Try to append to overlay container first, fallback to body
      const overlayContainer = document.getElementById('overlay-container')
      if (overlayContainer) {
        overlayContainer.appendChild(overlay)
        console.log('Overlay added to overlay container')
      } else {
        document.body.appendChild(overlay)
        console.log('Overlay added to body (fallback)')
      }
      
      // Restore scroll position after overlay is added
      requestAnimationFrame(() => {
        window.scrollTo(0, currentScrollY);
      });
    } else {
      // Remove overlay if conditions are not met
      const overlay = document.getElementById('buy-plan-overlay')
      if (overlay) {
        overlay.remove()
        console.log('Overlay removed - conditions not met')
        
        // Restore scroll position after overlay is removed
        requestAnimationFrame(() => {
          window.scrollTo(0, currentScrollY);
        });
      }
    }

    // Cleanup on unmount
    return () => {
      const overlay = document.getElementById('buy-plan-overlay')
      if (overlay) {
        overlay.remove()
      }
    }
  }, [showBuyPlan, hasLicenseKey, isCollapsed, isDataLoaded, isLicenseCheckComplete])

  // Quick fix: Function to remove overlay on pricing page
  const removeOverlayOnPricing = () => {
    const currentPath = window.location.pathname;
    if (currentPath === '/dashboard/pricing' || 
        currentPath === '/dashboard/pricing/' ||
        currentPath.includes('/dashboard/pricing') ||
        currentPath.includes('pricing')) {
      
      const overlay = document.getElementById('buy-plan-overlay');
      if (overlay) {
        overlay.remove();
        console.log('Quick fix: Overlay removed from pricing page - Path:', currentPath);
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
  };



  // Make function globally available for immediate access
  if (typeof window !== 'undefined') {
    (window as any).removeOverlayOnPricing = removeOverlayOnPricing;
  }

  // Simple and direct overlay management
  useEffect(() => {
    const checkAndManageOverlay = () => {
      const currentPath = window.location.pathname;
      const isOnPricingPage = currentPath === '/dashboard/pricing' || 
                              currentPath === '/dashboard/pricing/' ||
                              currentPath.includes('/dashboard/pricing') ||
                              currentPath.includes('pricing');
      
      if (isOnPricingPage) {
        // Remove overlay on pricing page
        removeOverlayOnPricing();
      } else {
        // On other pages, ensure overlay is visible if conditions are met
        if (showBuyPlan && !hasLicenseKey && daysSinceCreation > 14) {
          const existingOverlay = document.getElementById('buy-plan-overlay');
          if (!existingOverlay) {
            // Force overlay creation by triggering a re-render
            console.log('Forcing overlay creation on non-pricing page');
            setTimeout(() => {
              setShowBuyPlan(prev => !prev);
              setTimeout(() => setShowBuyPlan(prev => !prev), 100);
            }, 100);
          }
        }
      }
    };
    
    // Check immediately
    checkAndManageOverlay();
    
    // Check every 200ms
    const interval = setInterval(checkAndManageOverlay, 200);
    
    return () => clearInterval(interval);
  }, [showBuyPlan, hasLicenseKey, daysSinceCreation, pathname]);

  const handleLogout = async () => {
    await performLogout();
  }

  // Function to refresh license status
  const refreshLicenseStatus = async () => {
    try {
      const token = localStorage.getItem('token')
      if (token) {
        setIsCheckingLicense(true)
        console.log('Refreshing license status for email:', userEmail)
        const response = await checkLicenseStatus()
        
        if (response.success && response.data) {
          setHasLicenseKey(response.data.hasValidLicense)
          setLicenseDetails(response.data.license || null)
        } else {
          setHasLicenseKey(false)
          setLicenseDetails(null)
        }
      }
    } catch (error) {
      console.error('Error refreshing license status:', error)
      setHasLicenseKey(false)
      setLicenseDetails(null)
    } finally {
      setIsCheckingLicense(false)
    }
  }

  const toggleDropdown = (itemId: string) => {
    setOpenDropdowns(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }))
  }

  const handleNavigation = (item: NavItem) => {
    if (item.hasDropdown) {
      toggleDropdown(item.id)
      // Close other dropdowns when opening a new one
      setOpenDropdowns(prev => {
        const newState = { ...prev }
        // Close all other dropdowns except the current one
        Object.keys(newState).forEach(key => {
          if (key !== item.id) {
            newState[key] = false
          }
        })
        return newState
      })
      
      // Navigate to default path for dropdown items
      if (item.id === 'sale') {
        router.push('/dashboard/sale')
      } else if (item.id === 'purchase') {
        router.push('/dashboard/purchase')
      }
    } else {
      // Close all dropdowns if another main item is clicked
      setOpenDropdowns(prev => ({ ...prev, sale: false, purchase: false }))
      router.push(item.path)
    }
  }

  const isActiveItem = (item: NavItem) => {
    if (item.hasDropdown) {
      return item.subItems?.some((subItem: NavSubItem) => pathname === subItem.path) || pathname === item.path
    }
    return pathname === item.path
  }

  const isActiveSubItem = (subItem: NavSubItem) => {
    return pathname === subItem.path
  }

  // Calculate progress percentage for the 14-day trial
  const getTrialProgress = () => {
    if (daysSinceCreation >= 14) return 100
    return Math.round((daysSinceCreation / 14) * 100)
  }

  // Get remaining days
  const getRemainingDays = () => {
    const remaining = 14 - daysSinceCreation
    return remaining > 0 ? remaining : 0
  }

  // Function to check if nav item should be visible based on user role
  const shouldShowNavItem = (item: NavItem): boolean => {
    if (!userInfo) return true; // Show all items if user info not available
    
    // If user is not in company context (Default Admin), show all items
    if (userInfo.context !== 'company') return true;
    
    // Special check for dashboard access
    if (item.id === 'dashboard') {
      return canAccessDashboard();
    }
    
    const role = userInfo.role;
    
    // Role-based visibility rules
    switch (role) {
      case 'PURCHASER':
        // PURCHASER can see: Parties, Items, Purchase, Cash & Bank, Barcode, Backup & Restore, Settings
        return ['parties', 'items', 'purchase', 'cash-bank', 'barcode', 'backup-restore', 'settings'].includes(item.id);
      
      case 'SALESMAN':
        // SALESMAN can only see: Parties, Items, Sale, Cash & Bank, Barcode, Backup & Restore, Settings
        return ['parties', 'items', 'sale', 'cash-bank', 'barcode', 'backup-restore', 'settings'].includes(item.id);
      
      case 'CA':
        // CA can see all pages except dashboard (handled above)
        return true;
      
      case 'SECONDARY ADMIN':
        // SECONDARY ADMIN can see most items except add-user functionality
        return true;
      
      default:
        // Default Admin and other roles can see all items
        return true;
    }
  }

  return (
    <aside
      className={`fixed left-0 top-0 h-full bg-white shadow-lg border-r border-gray-200 transition-all duration-300 ease-in-out z-40 ${
        isCollapsed ? 'w-16' : 'w-64'
      } hidden lg:flex flex-col`} 
      aria-label="Sidebar" role="navigation"
    >
      {/* Header */}
      <div className="flex items-center justify-between h-20 p-4 border-b border-gray-200">
        {!isCollapsed && (
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 flex items-center justify-center">
              <img src="/devease_logo.svg" alt="Logo" className="w-12 h-12 object-contain rounded-2xl bg-white shadow-lg" />
            </div>
            <div>
              <h1 className="font-semibold text-gray-900 text-lg">{businessName}</h1>
              <p className="text-xs text-gray-500">Business Account</p>
            </div>
          </div>
        )}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)} 
          className="p-1 hover:bg-gray-100 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? '→' : '←'}
        </button>
      </div>

      {/* Scrollable Nav - Inline Invisible Scrollbar */}
      <nav
        className="flex-1 py-4 px-3 overflow-y-auto no-scrollbar"
        aria-label="Main navigation"
      >
        {navItems.filter(shouldShowNavItem).map((item) => (
          <div key={item.id} className="mb-1">
            <button
              onClick={() => handleNavigation(item)}
              className={`w-full flex items-center px-3 py-2.5 rounded-lg text-left transition-colors group focus:outline-none focus:ring-2 focus:ring-blue-500 relative
                ${isCollapsed ? 'justify-center px-0' : ''}
                ${isActiveItem(item)
                  ? 'bg-blue-50 text-blue-600 font-semibold shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
              `}
              aria-current={isActiveItem(item) ? 'page' : undefined}
              tabIndex={0}
            >
              <span
                className={`min-w-[2.5rem] h-8 flex items-center justify-center text-lg transition-colors duration-200 ${isActiveItem(item) ? 'text-blue-600' : ''}`}
              >
                {item.icon}
                {/* Tooltip for collapsed state */}
                {isCollapsed && (
                  <span className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-lg transition-opacity duration-200">
                    {item.label}
                  </span>
                )}
              </span>
              {!isCollapsed && (
                <>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="font-medium text-sm">{item.label}</div>
                    <div className="text-xs text-gray-500 truncate">{item.description}</div>
                  </div>
                  {item.hasDropdown && (
                    <span className={`text-sm transition-transform duration-200 inline-block ${openDropdowns[item.id] ? 'rotate-90' : ''}`}>
                      <FiChevronRight />
                    </span>
                  )}
                </>
              )}
            </button>

            {/* Dropdown Items */}
            {item.hasDropdown && !isCollapsed && (
              <div
                className={`ml-4 mt-1 space-y-1 transition-all duration-300 ${openDropdowns[item.id] ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
                aria-expanded={openDropdowns[item.id] ? 'true' : 'false'}
              >
                {item.subItems!.map((subItem: NavSubItem) => (
                  <button
                    key={subItem.id}
                    onClick={() => {
                      // Keep the current dropdown open and navigate
                      setOpenDropdowns(prev => ({ ...prev, [item.id]: true }))
                      router.push(subItem.path)
                    }}
                    className={`w-full flex items-center px-3 py-2 rounded-xl text-left text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 relative ${
                      isActiveSubItem(subItem)
                        ? 'bg-blue-100 text-blue-700 font-semibold'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                    tabIndex={0}
                  >
                    <span className="w-2 h-2 bg-gray-400 rounded-full mr-3"></span>
                    {subItem.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-200 p-3">
        {!isCollapsed ? (
          <div className="space-y-2">
            {/* Buy Plan Block - Show only when data is loaded, license check is complete, and user has no license */}
            {isDataLoaded && isLicenseCheckComplete && !hasLicenseKey && (
              <div 
                onClick={() => router.push('/dashboard/pricing')}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-4 mb-3 text-white shadow-lg cursor-pointer hover:shadow-xl transition-all duration-200"
              > 
                <h3 className="font-bold text-sm mb-1">Upgrade Your Plan</h3>
                <p className="text-xs text-purple-100 mb-3">Unlock unlimited features and grow your business</p>
                
                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="w-full bg-white/20 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-500 ${
                        getTrialProgress() >= 100 
                          ? 'bg-red-400' 
                          : getTrialProgress() >= 70 
                          ? 'bg-yellow-400' 
                          : 'bg-green-400'
                      }`}
                      style={{ width: `${getTrialProgress()}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-purple-100 mt-1">
                    <span>Trial Progress</span>
                    <span>{daysSinceCreation}/14 days</span>
                  </div>
                </div>
                

              </div>
            )}
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              aria-label="Logout"
            >
              <span>🚪</span>
              <span className="text-sm">Logout</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Buy Plan Block for collapsed state */}
            {isDataLoaded && isLicenseCheckComplete && !hasLicenseKey && (
              <div 
                onClick={() => router.push('/dashboard/pricing')}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg p-2 mb-2 text-white text-center cursor-pointer hover:shadow-lg transition-all duration-200"
              >
                <div className="text-lg mb-1">💎</div>
                <div className="text-xs text-purple-100 mb-2">
                  {daysSinceCreation}/14
                </div>
                <div className="w-full bg-white/20 rounded-full h-1 mb-2">
                  <div 
                    className={`h-1 rounded-full transition-all duration-500 ${
                      getTrialProgress() >= 100 
                        ? 'bg-red-400' 
                        : getTrialProgress() >= 70 
                        ? 'bg-yellow-400' 
                        : 'bg-green-400'
                    }`}
                    style={{ width: `${getTrialProgress()}%` }}
                  ></div>
                </div>

              </div>
            )}
            <button
              onClick={handleLogout}
              className="w-full flex justify-center py-2 text-red-600 hover:bg-red-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              aria-label="Logout"
            >
              🚪
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}

export { ReportsSidebar };