'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Item {
  id: string
  name: string
  category: string
  subcategory: string
  salePrice: number
  purchasePrice: number
  stock: number
  minStock: number
  unit: string
  sku: string
  description: string
  supplier: string
  status: 'Active' | 'Inactive' | 'Discontinued'
  type?: 'Product' | 'Service'
  imageUrl?: string
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
  const totalValue = items.reduce((sum, item) => sum + (item.stock * item.salePrice), 0)
  const lowStockItems = items.filter(item => item.stock <= item.minStock).length
  const outOfStockItems = items.filter(item => item.stock === 0).length

  return { totalItems, totalValue, lowStockItems, outOfStockItems }
}

export default function ItemsPage() {
  const router = useRouter()
  const [items, setItems] = useState<Item[]>([
    {
      id: 'ITM001',
      name: 'Laptop Dell Inspiron 15',
      category: 'Electronics',
      subcategory: 'Computers',
      salePrice: 45000,
      purchasePrice: 40000,
      stock: 15,
      minStock: 5,
      unit: 'Piece',
      sku: 'DL-INS-15',
      description: 'Dell Inspiron 15 inch laptop with 8GB RAM',
      supplier: 'Dell Technologies',
      status: 'Active'
    },
    {
      id: 'ITM002',
      name: 'Office Chair Premium',
      category: 'Furniture',
      subcategory: 'Seating',
      salePrice: 12000,
      purchasePrice: 9000,
      stock: 8,
      minStock: 3,
      unit: 'Piece',
      sku: 'OFC-CHR-PRM',
      description: 'Ergonomic office chair with lumbar support',
      supplier: 'Office Furniture Co.',
      status: 'Active'
    },
    {
      id: 'ITM003',
      name: 'Mobile Phone Samsung Galaxy',
      category: 'Electronics',
      subcategory: 'Mobile Phones',
      salePrice: 25000,
      purchasePrice: 22000,
      stock: 25,
      minStock: 10,
      unit: 'Piece',
      sku: 'SAM-GAL-A54',
      description: 'Samsung Galaxy A54 128GB',
      supplier: 'Samsung India',
      status: 'Active'
    },
    {
      id: 'ITM004',
      name: 'Desk Lamp LED',
      category: 'Furniture',
      subcategory: 'Lighting',
      salePrice: 2500,
      purchasePrice: 2000,
      stock: 0,
      minStock: 5,
      unit: 'Piece',
      sku: 'LED-DSK-LMP',
      description: 'Adjustable LED desk lamp with USB charging',
      supplier: 'Lighting Solutions',
      status: 'Active'
    },
    {
      id: 'ITM005',
      name: 'Printer HP LaserJet',
      category: 'Electronics',
      subcategory: 'Printers',
      salePrice: 18000,
      purchasePrice: 15000,
      stock: 3,
      minStock: 2,
      unit: 'Piece',
      sku: 'HP-LJ-P1102',
      description: 'HP LaserJet Pro P1102 Printer',
      supplier: 'HP India',
      status: 'Active'
    }
  ])

  const [categories] = useState<ItemCategory[]>([
    {
      id: '1',
      name: 'Electronics',
      icon: '💻',
      subcategories: ['Computers', 'Mobile Phones', 'Printers', 'Accessories'],
      totalItems: 3,
      totalValue: 88000
    },
    {
      id: '2',
      name: 'Furniture',
      icon: '🪑',
      subcategories: ['Seating', 'Tables', 'Storage', 'Lighting'],
      totalItems: 2,
      totalValue: 14500
    },
    {
      id: '3',
      name: 'Stationery',
      icon: '📝',
      subcategories: ['Office Supplies', 'Writing Materials', 'Paper Products'],
      totalItems: 0,
      totalValue: 0
    },
    {
      id: '4',
      name: 'Services',
      icon: '🔧',
      subcategories: ['Maintenance', 'Consulting', 'Training', 'Support'],
      totalItems: 0,
      totalValue: 0
    }
  ])

  const [activeTab, setActiveTab] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [error, setError] = useState('')
  const [bulkImportModal, setBulkImportModal] = useState(false)
  const [businessId, setBusinessId] = useState<string>('')

  useEffect(() => {
    const storedBusinessId = localStorage.getItem('businessId') || 'business123'
    setBusinessId(storedBusinessId)
  }, [])

  useEffect(() => {
    if (businessId) fetchItems()
  }, [businessId])

  const fetchItems = async () => {
    try {
      const response = await fetch(`http://localhost:3001/items/${businessId}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      })
      const result = await response.json()
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
    if (item.stock === 0) return { label: 'Out of Stock', color: 'bg-red-100 text-red-800' }
    if (item.stock <= item.minStock) return { label: 'Low Stock', color: 'bg-orange-100 text-orange-800' }
    return { label: 'In Stock', color: 'bg-green-100 text-green-800' }
  }

  const getCategoryIcon = (categoryName: string) => {
    const category = categories.find(cat => cat.name === categoryName)
    return category?.icon || '📦'
  }

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.supplier.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = !selectedCategory || item.category === selectedCategory
    
    const matchesStatus = activeTab === 'all' || 
                         (activeTab === 'low-stock' && item.stock <= item.minStock) ||
                         (activeTab === 'out-of-stock' && item.stock === 0) ||
                         (activeTab === 'active' && item.status === 'Active')

    return matchesSearch && matchesCategory && matchesStatus
  })

  const exportItems = () => {
    alert('Export functionality would be implemented here')
  }

  const importItems = () => {
    setBulkImportModal(true)
  }

  const stats = calculateStats(items)

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Items & Services</h1>
            <p className="text-sm text-gray-500 mt-1">Manage your inventory and service offerings</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={importItems}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center space-x-2 transition-colors"
            >
              <span>📤</span>
              <span>Import</span>
            </button>
            <button
              onClick={exportItems}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center space-x-2 transition-colors"
            >
              <span>📊</span>
              <span>Export</span>
            </button>
            <button
              onClick={openAddItemPage}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2 transition-colors"
            >
              <span>+</span>
              <span>Add Item</span>
            </button>
          </div>
        </div>
      </div>


     {/*lters and Tabs */}
      <div className="bg-white rounded-lg shadow-sm mb-6">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex space-x-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
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
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
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
          <div className="flex">
            <div className="text-red-400">⚠️</div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <button 
              onClick={() => setError('')}
              className="ml-auto text-red-400 hover:text-red-600"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Items List */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pricing</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredItems.map((item) => {
                  const stockStatus = getStockStatus(item)
                  const profit = item.salePrice - item.purchasePrice
                  const margin = ((profit / item.salePrice) * 100).toFixed(1)
                  
                  return (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-xl mr-3">{getCategoryIcon(item.category)}</span>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{item.name}</div>
                            <div className="text-sm text-gray-500">{item.sku} • {item.supplier}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{item.category}</div>
                        <div className="text-sm text-gray-500">{item.subcategory}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">₹{item.salePrice.toLocaleString()}</div>
                        <div className="text-sm text-gray-500">Cost: ₹{item.purchasePrice.toLocaleString()} • {margin}% margin</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{item.stock} {item.unit}</div>
                        <div className="text-sm text-gray-500">Min: {item.minStock} {item.unit}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${stockStatus.color}`}>
                          {stockStatus.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex justify-center space-x-2">
                          <button 
                            onClick={() => openEditItemPage(item)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
                          >
                            Edit
                          </button>
                          <button className="text-green-600 hover:text-green-800 text-sm font-medium transition-colors">
                            View
                          </button>
                          <button className="text-red-600 hover:text-red-800 text-sm font-medium transition-colors">
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
        )}
      </div>

      {/* Keep only the Bulk Import Modal if needed */}
      {bulkImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Import Items</h2>
                <button 
                  onClick={() => setBulkImportModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="text-center py-8">
                <div className="text-gray-400 text-4xl mb-4">📤</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Bulk Import Items</h3>
                <p className="text-gray-500 mb-4">Upload CSV or Excel file to import multiple items</p>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Choose File
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
