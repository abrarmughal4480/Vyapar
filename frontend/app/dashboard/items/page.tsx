'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useExport, ExportColumn } from '../../hooks/useExport'
import { getItems, deleteItem } from '../../../http/items'
import { ITEM_CATEGORIES } from '../../constants/categories'
import Toast from '../../components/Toast'
import { jwtDecode } from 'jwt-decode'
import ReactDOM from 'react-dom'

interface Item {
  id?: string
  _id?: string
  itemId?: string
  name: string
  category: string
  subcategory: string
  salePrice: number
  purchasePrice: number
  stock: number
  minStock: number
  unit: {
    base: string;
    secondary: string;
    conversionFactor: number;
    customBase: string;
    customSecondary: string;
  };
  sku: string
  description: string
  supplier: string
  status: 'Active' | 'Inactive' | 'Discontinued'
  type?: 'Product' | 'Service'
  imageUrl?: string
  openingQuantity?: number; // Added for opening stock
  // New fields from bulk import
  hsn?: string
  wholesalePrice?: number
  minimumWholesaleQuantity?: number
  discountType?: string
  saleDiscount?: number
  minimumStockQuantity?: number
  itemLocation?: string
  taxRate?: number
  inclusiveOfTax?: boolean
  baseUnit?: string
  secondaryUnit?: string
  conversionRate?: number
}

interface ItemCategory {
  id: string
  name: string
  icon: string
  subcategories: string[]
  totalItems: number
  totalValue: number
}

interface InventoryStats {
  totalItems: number
  totalValue: number
  lowStockItems: number
  outOfStockItems: number
}


// Move this function above the component
function calculateStats(items: Item[]) {
  const totalItems = items.length
  const totalValue = items.reduce((sum, item) => {
    const stockValue = item.openingQuantity ?? item.stock ?? 0
    const salePrice = item.salePrice ?? 0
    return sum + (stockValue * salePrice)
  }, 0)
  const lowStockItems = items.filter(item => {
    const stockValue = item.openingQuantity ?? item.stock ?? 0
    const minStockValue = item.minStock ?? 0
    return stockValue <= minStockValue
  }).length
  const outOfStockItems = items.filter(item => {
    const stockValue = item.openingQuantity ?? item.stock ?? 0
    return stockValue === 0
  }).length

  return { totalItems, totalValue, lowStockItems, outOfStockItems }
}

// Add this helper function above the component
function getStockDisplay(item: Item, value: number) {
  // Handle new unit structure (from bulk import)
  if (item.baseUnit) {
    let result = `${value} ${item.baseUnit}`;
    if (item.secondaryUnit && item.conversionRate) {
      const secondaryQty = Math.floor(value / item.conversionRate);
      const remainder = value % item.conversionRate;
      result += ` (${secondaryQty} ${item.secondaryUnit}`;
      if (remainder > 0) result += ` + ${remainder} ${item.baseUnit}`;
      result += `; 1 ${item.secondaryUnit} = ${item.conversionRate} ${item.baseUnit})`;
    }
    return result;
  }
  
  // Handle old unit structure
  if (item.unit && item.unit.base) {
    const base = item.unit.base === 'custom' ? item.unit.customBase : item.unit.base;
    let result = `${value} ${base}`;
    if (item.unit.secondary && item.unit.secondary !== 'None' && item.unit.conversionFactor) {
      const secondary = item.unit.secondary === 'custom' ? item.unit.customSecondary : item.unit.secondary;
      const secondaryQty = Math.floor(value / item.unit.conversionFactor);
      const remainder = value % item.unit.conversionFactor;
      result += ` (${secondaryQty} ${secondary}`;
      if (remainder > 0) result += ` + ${remainder} ${base}`;
      result += `; 1 ${secondary} = ${item.unit.conversionFactor} ${base})`;
    }
    return result;
  }
  
  // Fallback: just show the number
  return `${value}`;
}

// Helper function to format tax display
function getTaxDisplay(item: Item) {
  if (!item.taxRate) return '';
  
  const taxType = item.inclusiveOfTax ? 'GST' : 'IGST';
  return `${taxType}@${item.taxRate}%`;
}

// Helper function to format unit display
function getUnitDisplay(item: Item) {
  // Handle new unit structure (from bulk import)
  if (item.baseUnit) {
    if (item.secondaryUnit && item.conversionRate) {
      return `${item.baseUnit} / ${item.secondaryUnit} (1:${item.conversionRate})`;
    }
    return item.baseUnit;
  }
  
  // Handle old unit structure
  if (item.unit && item.unit.base) {
    const base = item.unit.base === 'custom' ? item.unit.customBase : item.unit.base;
    if (item.unit.secondary && item.unit.secondary !== 'None' && item.unit.conversionFactor) {
      const secondary = item.unit.secondary === 'custom' ? item.unit.customSecondary : item.unit.secondary;
      return `${base} / ${secondary} (1:${item.unit.conversionFactor})`;
    }
    return base;
  }
  
  return '';
}

export default function ItemsPage() {
  const router = useRouter()
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(false)
  const [categories] = useState<ItemCategory[]>(
    ITEM_CATEGORIES.map((name, idx) => {
      let icon = '📦';
      let subcategories: string[] = [];
      switch (name) {
        case 'Electronics':
          icon = '💻';
          subcategories = ['Computers', 'Mobile Phones', 'Printers', 'Accessories'];
          break;
        case 'Clothing':
          icon = '👕';
          subcategories = ['Men', 'Women', 'Kids'];
          break;
        case 'Food':
          icon = '🍔';
          subcategories = ['Groceries', 'Snacks', 'Beverages'];
          break;
        case 'Books':
          icon = '📚';
          subcategories = ['Fiction', 'Non-fiction', 'Comics'];
          break;
        case 'Home':
          icon = '🏠';
          subcategories = ['Furniture', 'Decor', 'Appliances'];
          break;
        default:
          icon = '📦';
          subcategories = [];
      }
      return {
        id: String(idx + 1),
        name,
        icon,
        subcategories,
        totalItems: 0,
        totalValue: 0
      };
    })
  )

  const [activeTab, setActiveTab] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [error, setError] = useState('')
  const [businessId, setBusinessId] = useState<string>('')
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const dropdownButtonRef = useRef<HTMLButtonElement>(null)
  const [exportModal, setExportModal] = useState(false)
  const { exportCSV, exportExcel } = useExport()
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' } | null>(null)
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 })

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        dropdownButtonRef.current &&
        !dropdownButtonRef.current.contains(event.target as Node)
      ) {
        setShowCategoryDropdown(false)
      }
    }
    if (showCategoryDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    } else {
      document.removeEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showCategoryDropdown])

  useEffect(() => {
    const token = localStorage.getItem('token') || localStorage.getItem('vypar_auth_token') || '';
    let userId = '';
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        userId = decoded._id || decoded.id || '';
      } catch {}
    }
    setBusinessId(userId);
  }, [])

  useEffect(() => {
    if (businessId) fetchItems()
  }, [businessId])

  const fetchItems = async () => {
    try {
      const result = await getItems(businessId)
      if (result.success) {
        setItems(result.data)
      } else {
        setError(result.message || 'Failed to fetch items')
      }
    } catch (err: any) {
      setError('Failed to fetch items')
    }
  }

  const openAddItemPage = () => {
    router.push('/dashboard/items/add-item')
  }

  const openEditItemPage = (item: Item) => {
    localStorage.setItem('editItem', JSON.stringify(item))
    router.push('/dashboard/items/add-item?edit=true')
  }

  const getStockStatus = (item: Item) => {
    const stockValue = item.openingQuantity ?? item.stock ?? 0;
    const minStockValue = item.minStock ?? 0;
    
    if (stockValue === 0) return { label: 'Out of Stock', color: 'bg-red-100 text-red-800' }
    if (stockValue <= minStockValue) return { label: 'Low Stock', color: 'bg-orange-100 text-orange-800' }
    return { label: 'In Stock', color: 'bg-green-100 text-green-800' }
  }

  const getCategoryIcon = (categoryName: string) => {
    const category = categories.find(cat => cat.name === categoryName)
    return category?.icon || '📦'
  }

  const filteredItems = items.filter(item => {
    const matchesSearch = (item.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (item.sku?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    
    const matchesCategory = !selectedCategory || item.category === selectedCategory
    
    const stockValue = item.openingQuantity ?? item.stock ?? 0;
    const minStockValue = item.minStock ?? 0;
    
    const matchesStatus = activeTab === 'all' || 
                         (activeTab === 'low-stock' && stockValue <= minStockValue) ||
                         (activeTab === 'out-of-stock' && stockValue === 0) ||
                         (activeTab === 'active' && item.status === 'Active')

    return matchesSearch && matchesCategory && matchesStatus
  })

  const exportItems = () => {
    alert('Export functionality would be implemented here')
  }

  const importItems = () => {
    router.push('/dashboard/bulk-imports/import-items')
  }

  const stats = calculateStats(items)

  // Calculate category stats dynamically from items
  const categoryStats = ITEM_CATEGORIES.map((name, idx) => {
    let icon = '📦', subcategories: string[] = [];
    switch (name) {
      case 'Electronics': icon = '💻'; subcategories = ['Computers', 'Mobile Phones', 'Printers', 'Accessories']; break;
      case 'Clothing': icon = '👕'; subcategories = ['Men', 'Women', 'Kids']; break;
      case 'Food': icon = '🍔'; subcategories = ['Groceries', 'Snacks', 'Beverages']; break;
      case 'Books': icon = '📚'; subcategories = ['Fiction', 'Non-fiction', 'Comics']; break;
      case 'Home': icon = '🏠'; subcategories = ['Furniture', 'Decor', 'Appliances']; break;
      default: icon = '📦'; subcategories = [];
    }
    const itemsInCategory = items.filter(item => item.category === name);
    const totalItems = itemsInCategory.length;
    const totalValue = itemsInCategory.reduce((sum, item) => {
      const stockValue = item.openingQuantity ?? item.stock ?? 0;
      const salePrice = item.salePrice ?? 0;
      return sum + (stockValue * salePrice);
    }, 0);
    return {
      id: String(idx + 1),
      name,
      icon,
      subcategories,
      totalItems,
      totalValue
    };
  });

  useEffect(() => {
    // Prevent background scrolling when modals are open
    if (exportModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [exportModal]);

  // Delete item handler
  const handleDeleteItem = async (item: Item) => {
    const id = item.itemId || item._id || '';
    if (!businessId || !id) return;
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      const result = await deleteItem(businessId, id);
      if (result.success) {
        setToast({ message: 'Item deleted successfully!', type: 'success' });
        fetchItems();
      } else {
        setToast({ message: result.message || 'Failed to delete item', type: 'error' });
      }
    } catch (err: any) {
      setToast({ message: err.message || 'An error occurred while deleting the item', type: 'error' });
    }
  }

  // Update dropdown position when opening
  useEffect(() => {
    if (showCategoryDropdown && dropdownButtonRef.current) {
      const rect = dropdownButtonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 6, // 6px gap
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  }, [showCategoryDropdown]);



  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header - sticky, card-like, shadow, rounded */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-4 md:p-6 mb-6 sticky top-0 z-30 border border-gray-100">
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div className="text-center md:text-left">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Items & Services</h1>
            <p className="text-sm text-gray-500 mt-1">Manage your inventory and service offerings</p>
          </div>
          <div className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-3">
            <button
              onClick={importItems}
              className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center justify-center space-x-2 transition-colors"
            >
              <span>📤</span>
              <span>Import</span>
            </button>
            <button
              onClick={() => setExportModal(true)}
              className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center justify-center space-x-2 transition-colors"
            >
              <span>⬇️</span>
              <span>Export</span>
            </button>
            <button
              onClick={openAddItemPage}
              className="w-full md:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2 transition-colors"
            >
              <span>+</span>
              <span>Add Item</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards - colored icons, backgrounds, hover */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
        <div className="bg-gradient-to-br from-blue-100 to-blue-50 p-6 rounded-2xl shadow group hover:shadow-lg transition-all flex flex-col items-start">
          <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-blue-500 text-white mb-3 text-xl">📦</div>
          <div className="text-2xl font-bold text-blue-700">{stats.totalItems}</div>
          <div className="text-sm text-gray-500">Total Items</div>
        </div>
        <div className="bg-gradient-to-br from-green-100 to-green-50 p-6 rounded-2xl shadow group hover:shadow-lg transition-all flex flex-col items-start">
          <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-green-500 text-white mb-3 text-xl">PKR</div>
          <div className="text-2xl font-bold text-green-700">PKR {stats.totalValue.toLocaleString()}</div>
          <div className="text-sm text-gray-500">Total Value</div>
        </div>
        <div className="bg-gradient-to-br from-orange-100 to-orange-50 p-6 rounded-2xl shadow group hover:shadow-lg transition-all flex flex-col items-start">
          <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-orange-500 text-white mb-3 text-xl">⚠️</div>
          <div className="text-2xl font-bold text-orange-700">{stats.lowStockItems}</div>
          <div className="text-sm text-gray-500">Low Stock</div>
        </div>
        <div className="bg-gradient-to-br from-red-100 to-red-50 p-6 rounded-2xl shadow group hover:shadow-lg transition-all flex flex-col items-start">
          <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-white text-red-600 mb-3 text-xl border-2 border-red-200">❌</div>
          <div className="text-2xl font-bold text-red-700">{stats.outOfStockItems}</div>
          <div className="text-sm text-gray-500">Out of Stock</div>
        </div>
      </div>

      {/* Category Pills */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow p-4 md:p-6 mb-6 border border-gray-100 z-[1]">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Item Categories</h2>
        <div className="flex flex-wrap gap-3 md:gap-4">
          {categoryStats.map((category) => {
            let bg = 'bg-gray-100', text = 'text-gray-800', iconBg = 'bg-gray-200';
            switch (category.name) {
              case 'Electronics': bg = 'bg-blue-50'; text = 'text-blue-800'; iconBg = 'bg-blue-100'; break;
              case 'Clothing': bg = 'bg-pink-50'; text = 'text-pink-800'; iconBg = 'bg-pink-100'; break;
              case 'Food': bg = 'bg-yellow-50'; text = 'text-yellow-800'; iconBg = 'bg-yellow-100'; break;
              case 'Books': bg = 'bg-green-50'; text = 'text-green-800'; iconBg = 'bg-green-100'; break;
              case 'Home': bg = 'bg-purple-50'; text = 'text-purple-800'; iconBg = 'bg-purple-100'; break;
              default: bg = 'bg-gray-100'; text = 'text-gray-800'; iconBg = 'bg-gray-200';
            }
            return (
              <div
                key={category.id}
                className={`flex items-center space-x-3 px-6 py-4 rounded-full shadow-sm border cursor-pointer transition-all
                  ${bg} ${text} ${selectedCategory === category.name ? 'border-2 border-blue-500 shadow-lg scale-105' : 'border-gray-200 hover:shadow-md hover:scale-105'}
                `}
                onClick={() => setSelectedCategory(selectedCategory === category.name ? '' : category.name)}
              >
                <span className={`w-9 h-9 flex items-center justify-center rounded-full text-2xl font-bold ${iconBg}`}>{category.icon}</span>
                <div className="flex flex-col">
                  <span className="font-semibold text-base leading-tight">{category.name}</span>
                  <span className="text-xs text-gray-500">{category.totalItems} items</span>
                </div>
                <span className={`ml-4 font-bold text-base`}>PKR {category.totalValue.toLocaleString()}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Filters and Tabs - modern underline, color */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow mb-6 border border-gray-100">
        <div className="p-4 md:p-6 border-b border-gray-100">
          <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
            <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-4">
              {/* Enhanced Search Bar */}
              <div className="relative w-full sm:w-72">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-lg">🔍</span>
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white/80 shadow focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border border-gray-200 transition-all placeholder-gray-400 text-gray-900"
                  autoComplete="off"
                />
              </div>
              {/* Enhanced Category Dropdown */}
              <div ref={dropdownRef} className="relative w-full sm:w-60">
                <button
                  ref={dropdownButtonRef}
                  type="button"
                  className="w-full flex items-center justify-between px-4 py-2.5 rounded-full bg-white/80 shadow border border-gray-200 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all group"
                  onClick={() => setShowCategoryDropdown((v) => !v)}
                  aria-haspopup="listbox"
                  aria-expanded={showCategoryDropdown ? 'true' : 'false'}
                >
                  <span className="truncate">{selectedCategory ? selectedCategory : 'All Categories'}</span>
                  <svg className={`w-5 h-5 ml-2 transition-transform ${showCategoryDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                </button>
                {showCategoryDropdown && typeof window !== 'undefined' && ReactDOM.createPortal(
                  <ul
                    className="absolute z-[9999] bg-white rounded-xl shadow-lg border border-gray-100 py-1 max-h-60 overflow-auto animate-fadeinup custom-dropdown-scrollbar"
                    style={{
                      top: dropdownPosition.top,
                      left: dropdownPosition.left,
                      width: dropdownPosition.width,
                      position: 'absolute',
                    }}
                    tabIndex={-1}
                    role="listbox"
                  >
                    <li
                      className={`px-4 py-2 cursor-pointer rounded-lg transition-all hover:bg-blue-50 ${!selectedCategory ? 'font-semibold text-blue-600' : 'text-gray-700'}`}
                      onClick={() => { setSelectedCategory(''); setShowCategoryDropdown(false); }}
                      role="option"
                      aria-selected={!selectedCategory}
                    >
                      All Categories
                    </li>
                    {categories.map((category) => (
                      <li
                        key={category.id}
                        className={`px-4 py-2 cursor-pointer rounded-lg transition-all hover:bg-blue-50 ${selectedCategory === category.name ? 'font-semibold text-blue-600' : 'text-gray-700'}`}
                        onClick={() => { setSelectedCategory(category.name); setShowCategoryDropdown(false); }}
                        role="option"
                        aria-selected={selectedCategory === category.name}
                      >
                        {category.name}
                      </li>
                    ))}
                  </ul>,
                  document.body
                )}
              </div>
            </div>
          </div>
        </div>
        {/* Status Tabs */}
        <div className="border-b border-gray-100 overflow-x-auto">
          <nav className="flex space-x-4 md:space-x-8 px-4 md:px-6 min-w-max">
            {[
              {
                id: 'all',
                name: 'All Items',
                count: items.length
              },
              {
                id: 'active',
                name: 'Active',
                count: items.filter(i => i.status === 'Active').length
              },
              {
                id: 'low-stock',
                name: 'Low Stock',
                count: items.filter(i => i.stock <= i.minStock).length
              },
              {
                id: 'out-of-stock',
                name: 'Out of Stock',
                count: items.filter(i => i.stock === 0).length
              }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <span>{tab.name}</span>
                <span className="bg-gray-200 text-gray-600 px-2 py-1 rounded-full text-xs">
                  {tab.count}
                </span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <span className="text-red-600 mr-2">⚠️</span>
            <div className="text-red-800">{error}</div>
            <button 
              onClick={() => setError('')}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Items List/Table - alternating rows, avatars, hover */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow border border-gray-100 z-[1]">
        <div className="p-4 md:p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            Items ({filteredItems.length})
          </h2>
        </div>
        {filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📦</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
            <p className="text-gray-500 mb-4">
              {activeTab === 'all' 
                ? 'Add your first item to get started'
                : `No ${activeTab.replace('-', ' ')} items found`
              }
            </p>
            <button 
              onClick={openAddItemPage}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Item
            </button>
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="block md:hidden">
              {filteredItems.map((item) => {
                const key = item._id || item.itemId || item.sku;
                const stockStatus = getStockStatus(item)
                const profit = (item.salePrice ?? 0) - (item.purchasePrice ?? 0)
                const margin = item.salePrice ? ((profit / item.salePrice) * 100).toFixed(1) : '0.0'
                return (
                  <div key={key} className="border-b border-gray-100 p-4 bg-white/80 rounded-xl mb-3 shadow-sm hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-base">
                          {getCategoryIcon(item.category)}
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{item.name}</h3>
                          <p className="text-sm text-gray-500">{item.sku}</p>
                          <p className="text-xs text-gray-400">{item.supplier}</p>
                          <p className="text-xs text-gray-400">Stock: {item.openingQuantity ?? item.stock ?? 0}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${stockStatus.color}`}>
                          {stockStatus.label}
                        </span>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${item.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {item.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <div className="text-sm font-medium text-blue-700">PKR {item.salePrice.toLocaleString()}</div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => openEditItemPage(item)}
                          className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                        >
                          Edit
                        </button>
                        <button className="text-green-600 hover:text-green-900 text-sm font-medium">
                          View
                        </button>
                        <button className="text-red-600 hover:text-red-900 text-sm font-medium" onClick={() => handleDeleteItem(item)}>
                          Delete
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      Cost: PKR {(item.purchasePrice ?? 0).toLocaleString()} • {margin}% margin
                    </div>
                    {/* New fields display */}
                    <div className="mt-2 space-y-1">
                      {item.hsn && (
                        <div className="text-xs text-gray-500">HSN: {item.hsn}</div>
                      )}
                      {item.wholesalePrice && (
                        <div className="text-xs text-gray-500">Wholesale: PKR {item.wholesalePrice.toLocaleString()}</div>
                      )}
                      {getTaxDisplay(item) && (
                        <div className="text-xs text-gray-500">Tax: {getTaxDisplay(item)}</div>
                      )}
                      {item.itemLocation && (
                        <div className="text-xs text-gray-500">Location: {item.itemLocation}</div>
                      )}
                      {getUnitDisplay(item) && (
                        <div className="text-xs text-gray-500">Unit: {getUnitDisplay(item)}</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            {/* Desktop Table View */}
            <div className="hidden md:block">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100 table-fixed">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">Item</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">Pricing</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">Stock</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">Status</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {filteredItems.map((item, idx) => {
                      const key = item._id || item.itemId || item.sku;
                      const stockStatus = getStockStatus(item)
                      const profit = (item.salePrice ?? 0) - (item.purchasePrice ?? 0)
                      const margin = item.salePrice ? ((profit / item.salePrice) * 100).toFixed(1) : '0.0'
                      return (
                        <tr key={key} className={`hover:bg-blue-50/40 transition-all ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                          onDoubleClick={() => openEditItemPage(item)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap flex items-center space-x-3">
                            <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-base flex-shrink-0">
                              {getCategoryIcon(item.category)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium text-gray-900 truncate">{item.name}</div>
                              <div className="text-xs text-gray-500 truncate">{item.sku} • {item.supplier}</div>
                              {item.hsn && (
                                <div className="text-xs text-gray-400 truncate">HSN: {item.hsn}</div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 truncate">{item.category}</div>
                            <div className="text-sm text-gray-500 truncate">{item.subcategory}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">PKR {(item.salePrice ?? 0).toLocaleString()}</div>
                            <div className="text-sm text-gray-500 truncate">Cost: PKR {(item.purchasePrice ?? 0).toLocaleString()} • {margin}% margin</div>
                            {item.wholesalePrice && (
                              <div className="text-xs text-gray-500 truncate">Wholesale: PKR {item.wholesalePrice.toLocaleString()}</div>
                            )}
                            {getTaxDisplay(item) && (
                              <div className="text-xs text-gray-500 truncate">Tax: {getTaxDisplay(item)}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 truncate">{getStockDisplay(item, item.openingQuantity ?? item.stock ?? 0)}</div>
                            <div className="text-sm text-gray-500 truncate">Min: {getStockDisplay(item, item.minStock ?? 0)}</div>
                            {item.itemLocation && (
                              <div className="text-xs text-gray-500 truncate">Location: {item.itemLocation}</div>
                            )}
                            {getUnitDisplay(item) && (
                              <div className="text-xs text-gray-500 truncate">Unit: {getUnitDisplay(item)}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${stockStatus.color}`}>
                              {stockStatus.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="flex justify-center gap-2">
                              <button 
                                onClick={() => openEditItemPage(item)}
                                className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors px-2 py-1 rounded hover:bg-blue-50"
                              >
                                Edit
                              </button>
                              <button className="text-green-600 hover:text-green-800 text-sm font-medium transition-colors px-2 py-1 rounded hover:bg-green-50">
                                View
                              </button>
                              <button className="text-red-600 hover:text-red-800 text-sm font-medium transition-colors px-2 py-1 rounded hover:bg-red-50" onClick={() => handleDeleteItem(item)}>
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>



      {/* Export Modal */}
      {exportModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeinup">
          <div className="bg-white/90 rounded-2xl shadow-2xl w-full max-w-md animate-scalein">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Export Items</h2>
              <button onClick={() => setExportModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                disabled={filteredItems.length === 0}
                onClick={() => { if (filteredItems.length > 0) { exportCSV(filteredItems, [
                  { label: 'Name', key: 'name' },
                  { label: 'Category', key: 'category' },
                  { label: 'Subcategory', key: 'subcategory' },
                  { label: 'Sale Price', key: 'salePrice' },
                  { label: 'Purchase Price', key: 'purchasePrice' },
                  { label: 'Stock', key: 'stock' },
                  { label: 'Min Stock', key: 'minStock' },
                  { label: 'Unit', key: 'unit' },
                  { label: 'SKU', key: 'sku' },
                  { label: 'Supplier', key: 'supplier' },
                  { label: 'Status', key: 'status' },
                ], 'items.csv'); setExportModal(false); } }}
              >
                <span>📄</span> Export as CSV
              </button>
              <button
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                disabled={filteredItems.length === 0}
                onClick={() => { if (filteredItems.length > 0) { exportExcel(filteredItems, [
                  { label: 'Name', key: 'name' },
                  { label: 'Category', key: 'category' },
                  { label: 'Subcategory', key: 'subcategory' },
                  { label: 'Sale Price', key: 'salePrice' },
                  { label: 'Purchase Price', key: 'purchasePrice' },
                  { label: 'Stock', key: 'stock' },
                  { label: 'Min Stock', key: 'minStock' },
                  { label: 'Unit', key: 'unit' },
                  { label: 'SKU', key: 'sku' },
                  { label: 'Supplier', key: 'supplier' },
                  { label: 'Status', key: 'status' },
                ], 'items.xlsx'); setExportModal(false); } }}
              >
                <span>📊</span> Export as Excel
              </button>
              {filteredItems.length === 0 && (
                <div className="text-center text-sm text-gray-500 mt-2">No items to export.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      {/* Add animation keyframes at the end if not present */}
      <style jsx global>{`
        @keyframes fadeinup {
          0% { opacity: 0; transform: translateY(40px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeinup {
          animation: fadeinup 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        @keyframes scalein {
          0% { opacity: 0; transform: scale(0.95); }
          100% { opacity: 1; transform: scale(1); }
        }
        .animate-scalein {
          animation: scalein 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
      `}</style>
    </div>
  )
}
