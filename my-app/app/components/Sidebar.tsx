'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const navItems = [
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
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [openDropdowns, setOpenDropdowns] = useState({})

  useEffect(() => {
    const name = localStorage.getItem('businessName')
    if (name) setBusinessName(name)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated')
    localStorage.removeItem('businessName')
    router.push('/')
  }

  const toggleDropdown = (itemId) => {
    setOpenDropdowns(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }))
  }

  const handleNavigation = (item) => {
    if (item.hasDropdown) {
      toggleDropdown(item.id)
    } else {
      router.push(item.path)
    }
  }

  const isActiveItem = (item) => {
    if (item.hasDropdown) {
      return item.subItems?.some(subItem => pathname === subItem.path) || pathname === item.path
    }
    return pathname === item.path
  }

  const isActiveSubItem = (subItem) => {
    return pathname === subItem.path
  }

  return (
    <aside
      className={`fixed left-0 top-0 h-full bg-white shadow-lg border-r border-gray-200 transition-all duration-300 z-40 ${
        isCollapsed ? 'w-16' : 'w-64'
      } hidden lg:flex flex-col`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        {!isCollapsed && (
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">V</span>
            </div>
            <div>
              <h1 className="font-semibold text-gray-900 text-sm">{businessName}</h1>
              <p className="text-xs text-gray-500">Business Account</p>
            </div>
          </div>
        )}
        <button onClick={() => setIsCollapsed(!isCollapsed)} className="p-1 hover:bg-gray-100 rounded">
          {isCollapsed ? '→' : '←'}
        </button>
      </div>

      {/* Scrollable Nav - Inline Invisible Scrollbar */}
      <nav
        className="flex-1 py-4 px-3 overflow-y-auto"
        style={{
          scrollbarWidth: 'none', // Firefox
          msOverflowStyle: 'none', // IE 10+
        }}
      >
        <style jsx>{`
          nav::-webkit-scrollbar {
            display: none;
          }
        `}</style>

        {navItems.map((item) => (
          <div key={item.id} className="mb-1">
            <button
              onClick={() => handleNavigation(item)}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                isActiveItem(item)
                  ? 'bg-blue-50 text-blue-600 border border-blue-200'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {!isCollapsed && (
                <>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{item.label}</div>
                    <div className="text-xs text-gray-500 truncate">{item.description}</div>
                  </div>
                  {item.hasDropdown && (
                    <span className={`text-sm transition-transform ${openDropdowns[item.id] ? 'rotate-90' : ''}`}>
                      ▶
                    </span>
                  )}
                </>
              )}
            </button>

            {/* Dropdown Items */}
            {item.hasDropdown && !isCollapsed && openDropdowns[item.id] && (
              <div className="ml-4 mt-1 space-y-1">
                {item.subItems.map((subItem) => (
                  <button
                    key={subItem.id}
                    onClick={() => router.push(subItem.path)}
                    className={`w-full flex items-center px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                      isActiveSubItem(subItem)
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
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
            <button className="w-full flex items-center space-x-3 px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-lg">
              <span>🔔</span>
              <span className="text-sm">Notifications</span>
            </button>
            <button className="w-full flex items-center space-x-3 px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-lg">
              <span>❓</span>
              <span className="text-sm">Help & Support</span>
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
            >
              <span>🚪</span>
              <span className="text-sm">Logout</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <button className="w-full flex justify-center py-2 text-gray-600 hover:bg-gray-50 rounded-lg">🔔</button>
            <button className="w-full flex justify-center py-2 text-gray-600 hover:bg-gray-50 rounded-lg">❓</button>
            <button
              onClick={handleLogout}
              className="w-full flex justify-center py-2 text-red-600 hover:bg-red-50 rounded-lg"
            >
              🚪
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}