'use client'

import React, { useContext } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { SidebarContext } from '../contexts/SidebarContext'
import { FiChevronRight } from 'react-icons/fi'

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
      { id: 'payment-in', label: 'Payment In', path: '/dashboard/sale/payment-in' },
      { id: 'sale-order', label: 'Sale Order', icon: '📊', path: '/dashboard/sales' },
      { id: 'delivery-challan', label: 'Delivery Challan', icon: '🚚', path: '/dashboard/delivery-challan' },
      { id: 'sale-return-credit', label: 'Sale Return/ Credit Note', path: '/dashboard/credit-note' }
    ]
  },
  { id: 'purchase', label: 'Purchase', icon: '🛒', path: '/dashboard/purchase', description: 'Purchase Orders' },
  { id: 'expenses', label: 'Expenses', icon: '💸', path: '/dashboard/expenses', description: 'Business Expenses' },
  { id: 'cash-bank', label: 'Cash & Bank', icon: '🏦', path: '/dashboard/cash-bank', description: 'Payment Records' },
  { id: 'reports', label: 'Reports', icon: '📈', path: '/dashboard/reports', description: 'Business Analytics' },
  { id: 'barcode', label: 'Barcode', icon: '📱', path: '/dashboard/barcode', description: 'Barcode Scanner' },
  { id: 'backup-restore', label: 'Backup & Restore', icon: '💾', path: '/dashboard/backup-restore', description: 'Data Management' },
  { id: 'settings', label: 'Settings', icon: '⚙️', path: '/dashboard/settings', description: 'App Configuration' }
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [businessName, setBusinessName] = useState('My Business')
  const [openDropdowns, setOpenDropdowns] = useState<{ [key: string]: boolean }>({})

  // Use SidebarContext for isCollapsed and setIsCollapsed
  const { isCollapsed, setIsCollapsed } = useContext(SidebarContext)

  useEffect(() => {
    const name = localStorage.getItem('businessName')
    if (name) setBusinessName(name)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated')
    localStorage.removeItem('businessName')
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('vypar_auth_token')
    localStorage.removeItem('vypar_user_session')
    localStorage.removeItem('businessId')
    router.push('/')
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
      if (item.id === 'sale') {
        router.push('/dashboard/sale')
      }
    } else {
      // Close 'sale' dropdown if another main item is clicked
      setOpenDropdowns(prev => ({ ...prev, sale: false }))
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
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-xl font-bold text-white">V</span>
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
        {navItems.map((item) => (
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
                      setOpenDropdowns(prev => ({ ...prev, sale: true }))
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
            <button className="w-full flex items-center space-x-3 px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" aria-label="Notifications">
              <span>🔔</span>
              <span className="text-sm">Notifications</span>
            </button>
            <button className="w-full flex items-center space-x-3 px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" aria-label="Help & Support">
              <span>❓</span>
              <span className="text-sm">Help & Support</span>
            </button>
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
            <button className="w-full flex justify-center py-2 text-gray-600 hover:bg-gray-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" aria-label="Notifications">🔔</button>
            <button className="w-full flex justify-center py-2 text-gray-600 hover:bg-gray-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" aria-label="Help & Support">❓</button>
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