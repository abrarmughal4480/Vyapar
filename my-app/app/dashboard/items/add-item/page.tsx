'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

interface Item {
  id?: string
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
  // Stock related fields
  openingQuantity?: number
  atPrice?: number
  asOfDate?: string
  location?: string
}

export default function AddItemPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editMode = searchParams.get('edit') === 'true'

  const [newItem, setNewItem] = useState<Item>({
    name: '',
    category: '',
    subcategory: '',
    salePrice: 0,
    purchasePrice: 0,
    stock: 0,
    minStock: 0,
    unit: 'Piece',
    sku: '',
    description: '',
    supplier: '',
    status: 'Active',
    type: 'Product',
    openingQuantity: 0,
    atPrice: 0,
    asOfDate: new Date().toISOString().split('T')[0],
    location: ''
  })

  const [formErrors, setFormErrors] = useState<Partial<Record<keyof Item, string>>>({})
  const [activeTab, setActiveTab] = useState('pricing')
  const [showUnitModal, setShowUnitModal] = useState(false)
  const [selectedBaseUnit, setSelectedBaseUnit] = useState('Piece')
  const [selectedSecondaryUnit, setSelectedSecondaryUnit] = useState('None')
  const [businessId, setBusinessId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const storedBusinessId = localStorage.getItem('businessId') || 'business123'
    setBusinessId(storedBusinessId)
  }, [])

  useEffect(() => {
    if (editMode) {
      const itemData = localStorage.getItem('editItem')
      if (itemData) {
        setNewItem(JSON.parse(itemData))
      }
    }
  }, [editMode])

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showUnitModal) {
        setShowUnitModal(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showUnitModal])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setNewItem(prev => ({ ...prev, [name]: value }))
  }

  const validateForm = () => {
    const errors: Partial<Record<keyof Item, string>> = {}

    if (!newItem.name) errors.name = 'Item name is required'
    if (!newItem.category) errors.category = 'Category is required'
    if (!newItem.subcategory) errors.subcategory = 'Subcategory is required'
    if (newItem.salePrice <= 0) errors.salePrice = 'Sale price must be greater than 0'
    if (newItem.purchasePrice <= 0) errors.purchasePrice = 'Purchase price must be greater than 0'
    if (newItem.stock < 0) errors.stock = 'Stock cannot be negative'
    if (newItem.minStock < 0) errors.minStock = 'Minimum stock cannot be negative'
    if (!newItem.unit) errors.unit = 'Unit is required'
    if (!newItem.sku) errors.sku = 'SKU is required'
    if (!newItem.description) errors.description = 'Description is required'
    if (!newItem.supplier) errors.supplier = 'Supplier is required'
    if (!newItem.openingQuantity && newItem.openingQuantity !== 0) errors.openingQuantity = 'Opening quantity is required'
    if (newItem.atPrice <= 0) errors.atPrice = 'At price must be greater than 0'
    if (!newItem.asOfDate) errors.asOfDate = 'As of date is required'
    if (!newItem.location) errors.location = 'Location is required'

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      console.log('Form validation failed:', formErrors);
      return;
    }

    setIsLoading(true);

    try {
      console.log('Submitting item:', newItem);
      console.log('Business ID:', businessId);
      
      const url = editMode 
        ? `http://localhost:3001/items/${businessId}/${newItem.id}` 
        : `http://localhost:3001/items/${businessId}`;
      
      const method = editMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newItem)
      })

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json()
      console.log('Response result:', result);

      if (result.success) {
        alert(`Item ${editMode ? 'updated' : 'created'} successfully`)
        router.push('/dashboard/items')
      } else {
        alert(result.message || `Failed to ${editMode ? 'update' : 'save'} item`)
      }
    } catch (err: any) {
      console.error('Error submitting form:', err);
      alert(`An error occurred while ${editMode ? 'updating' : 'saving'} the item: ${err.message}`)
    } finally {
      setIsLoading(false);
    }
  }

  const tabs = [
    { id: 'pricing', name: 'Pricing', icon: '💰' },
    { id: 'stock', name: 'Stock', icon: '📦' }
  ]

  // Calculate profit metrics
  const profitPerUnit = newItem.salePrice - newItem.purchasePrice
  const profitMargin = newItem.salePrice > 0 ? (profitPerUnit / newItem.salePrice * 100) : 0
  const markup = newItem.purchasePrice > 0 ? (profitPerUnit / newItem.purchasePrice * 100) : 0
  const totalProfit = profitPerUnit * (newItem.stock || 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4 space-y-6">
        {/* Product/Service Toggle */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Add Item</h1>
            <div className="flex items-center space-x-4">
              <span className={`text-sm font-medium ${newItem.type === 'Product' ? 'text-blue-600' : 'text-gray-500'}`}>
                Product
              </span>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={newItem.type === 'Service'}
                  onChange={(e) => setNewItem(prev => ({ ...prev, type: e.target.checked ? 'Service' : 'Product' }))}
                  className="sr-only"
                />
                <div
                  onClick={() => setNewItem(prev => ({ ...prev, type: prev.type === 'Service' ? 'Product' : 'Service' }))}
                  className={`w-12 h-6 rounded-full cursor-pointer transition-colors duration-200 ${
                    newItem.type === 'Service' ? 'bg-blue-500' : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                      newItem.type === 'Service' ? 'translate-x-6' : 'translate-x-0.5'
                    } mt-0.5`}
                  />
                </div>
              </div>
              <span className={`text-sm font-medium ${newItem.type === 'Service' ? 'text-blue-600' : 'text-gray-500'}`}>
                Service
              </span>
            </div>
          </div>

          {/* Main Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {/* Item Name */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-blue-600 mb-2">
                Item Name *
              </label>
              <input
                type="text"
                name="name"
                value={newItem.name}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border-2 rounded-lg transition-all duration-200 ${
                  formErrors.name ? 'border-red-300 bg-red-50' : 'border-blue-200 focus:border-blue-500'
                } focus:ring-2 focus:ring-blue-200 focus:outline-none`}
                placeholder="Enter item name"
              />
              {formErrors.name && <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>}
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <div className="relative">
                <select
                  name="category"
                  value={newItem.category}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border-2 rounded-lg transition-all duration-200 appearance-none ${
                    formErrors.category ? 'border-red-300 bg-red-50' : 'border-gray-300 focus:border-blue-500'
                  } focus:ring-2 focus:ring-blue-200 focus:outline-none bg-white`}
                >
                  <option value="">Category</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Clothing">Clothing</option>
                  <option value="Food">Food</option>
                  <option value="Books">Books</option>
                  <option value="Home">Home</option>
                  <option value="Other">Other</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              {formErrors.category && <p className="text-xs text-red-500 mt-1">{formErrors.category}</p>}
            </div>

            {/* Select Unit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Unit
              </label>
              <button
                type="button"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors font-medium"
                onClick={() => {
                  setSelectedBaseUnit(newItem.unit || 'Piece');
                  setShowUnitModal(true);
                }}
              >
                {newItem.unit || 'Select Unit'}
              </button>
            </div>
          </div>

          {/* Second Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Item Code */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Item Code
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  name="sku"
                  value={newItem.sku}
                  onChange={handleInputChange}
                  className={`flex-1 px-4 py-3 border-2 rounded-lg transition-all duration-200 ${
                    formErrors.sku ? 'border-red-300 bg-red-50' : 'border-gray-300 focus:border-blue-500'
                  } focus:ring-2 focus:ring-blue-200 focus:outline-none`}
                  placeholder="Item Code"
                />
                <button
                  type="button"
                  onClick={() => {
                    const code = 'ITM' + Date.now().toString().slice(-6);
                    setNewItem(prev => ({ ...prev, sku: code }));
                  }}
                  className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium whitespace-nowrap"
                >
                  Assign Code
                </button>
              </div>
              {formErrors.sku && <p className="text-xs text-red-500 mt-1">{formErrors.sku}</p>}
            </div>

            {/* Add Item Image */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Item Image
              </label>
              <button
                type="button"
                className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-colors font-medium flex items-center justify-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Add Item Image</span>
              </button>
            </div>
          </div>

          {/* Additional Fields */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subcategory
                </label>
                <input
                  type="text"
                  name="subcategory"
                  value={newItem.subcategory}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border-2 rounded-lg transition-all duration-200 ${
                    formErrors.subcategory ? 'border-red-300 bg-red-50' : 'border-gray-300 focus:border-blue-500'
                  } focus:ring-2 focus:ring-blue-200 focus:outline-none`}
                  placeholder="Enter subcategory"
                />
                {formErrors.subcategory && <p className="text-xs text-red-500 mt-1">{formErrors.subcategory}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Supplier
                </label>
                <input
                  type="text"
                  name="supplier"
                  value={newItem.supplier}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border-2 rounded-lg transition-all duration-200 ${
                    formErrors.supplier ? 'border-red-300 bg-red-50' : 'border-gray-300 focus:border-blue-500'
                  } focus:ring-2 focus:ring-blue-200 focus:outline-none`}
                  placeholder="Enter supplier name"
                />
                {formErrors.supplier && <p className="text-xs text-red-500 mt-1">{formErrors.supplier}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  name="status"
                  value={newItem.status}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Discontinued">Discontinued</option>
                </select>
              </div>

              <div className="lg:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={newItem.description}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border-2 rounded-lg transition-all duration-200 ${
                    formErrors.description ? 'border-red-300 bg-red-50' : 'border-gray-300 focus:border-blue-500'
                  } focus:ring-2 focus:ring-blue-200 focus:outline-none`}
                  placeholder="Enter item description"
                  rows={3}
                />
                {formErrors.description && <p className="text-xs text-red-500 mt-1">{formErrors.description}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-4 px-4 text-sm font-medium border-b-3 transition-all duration-200 ${
                    activeTab === tab.id
                      ? (tab.id === 'pricing' 
                          ? 'border-red-500 text-red-600 bg-red-50' 
                          : 'border-gray-500 text-gray-600 bg-gray-50')
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  } flex items-center justify-center space-x-2`}
                >
                  <span className="text-lg">{tab.icon}</span>
                  <span>{tab.name}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Enhanced Tab Content */}
          <div className="p-6">
            {/* Pricing Tab */}
            {activeTab === 'pricing' && (
              <div className="space-y-6">
                <div className="max-w-md">
                  <label className="block text-sm font-medium text-gray-900 mb-3">
                    Sale Price
                  </label>
                  <input
                    type="number"
                    name="salePrice"
                    value={newItem.salePrice}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border-2 rounded-lg transition-all duration-200 ${
                      formErrors.salePrice ? 'border-red-300 bg-red-50' : 'border-gray-300 focus:border-blue-500'
                    } focus:ring-2 focus:ring-blue-200 focus:outline-none text-lg`}
                    placeholder="Sale Price"
                  />
                  {formErrors.salePrice && <p className="text-xs text-red-500 mt-1">{formErrors.salePrice}</p>}
                </div>

                {/* Add Wholesale Price */}
                <div>
                  <button
                    type="button"
                    className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium"
                    onClick={() => {
                      // Toggle wholesale price visibility
                      const wholesaleSection = document.getElementById('wholesaleSection');
                      if (wholesaleSection) {
                        wholesaleSection.style.display = wholesaleSection.style.display === 'none' ? 'block' : 'none';
                      }
                    }}
                  >
                    <span className="text-xl">+</span>
                    <span>Add Wholesale Price</span>
                  </button>
                </div>

                {/* Wholesale Price Section (Initially Hidden) */}
                <div id="wholesaleSection" style={{display: 'none'}} className="space-y-4">
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <h4 className="text-sm font-semibold text-gray-800 mb-3">Wholesale Pricing</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Wholesale Price
                        </label>
                        <input
                          type="number"
                          name="purchasePrice"
                          value={newItem.purchasePrice}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-3 border-2 rounded-lg transition-all duration-200 ${
                            formErrors.purchasePrice ? 'border-red-300 bg-red-50' : 'border-gray-300 focus:border-blue-500'
                          } focus:ring-2 focus:ring-blue-200 focus:outline-none bg-white`}
                          placeholder="Wholesale Price"
                        />
                        {formErrors.purchasePrice && <p className="text-xs text-red-500 mt-1">{formErrors.purchasePrice}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Min Quantity
                        </label>
                        <input
                          type="number"
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none bg-white"
                          placeholder="Minimum quantity"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Profit Analysis */}
                {(newItem.salePrice > 0 && newItem.purchasePrice > 0) && (
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                    <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                      <span className="mr-2">💹</span>
                      Profit Analysis
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Profit per unit:</span>
                        <div className="font-semibold text-green-700">
                          ₹{profitPerUnit.toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600">Profit margin:</span>
                        <div className="font-semibold text-green-700">
                          {profitMargin.toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600">Markup:</span>
                        <div className="font-semibold text-green-700">
                          {markup.toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600">Total profit:</span>
                        <div className="font-semibold text-green-700">
                          ₹{totalProfit.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Stock Tab */}
            {activeTab === 'stock' && (
              <div className="space-y-6">
                {/* Opening Stock Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Opening Quantity
                    </label>
                    <input
                      type="number"
                      name="openingQuantity"
                      value={newItem.openingQuantity || ''}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border-2 rounded-lg transition-all duration-200 ${
                        formErrors.openingQuantity ? 'border-red-300 bg-red-50' : 'border-gray-300 focus:border-blue-500'
                      } focus:ring-2 focus:ring-blue-200 focus:outline-none`}
                      placeholder="0"
                    />
                    {formErrors.openingQuantity && <p className="text-xs text-red-500 mt-1">{formErrors.openingQuantity}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      At Price
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-3 text-gray-500">₹</span>
                      <input
                        type="number"
                        name="atPrice"
                        value={newItem.atPrice || ''}
                        onChange={handleInputChange}
                        className={`w-full pl-8 pr-4 py-3 border-2 rounded-lg transition-all duration-200 ${
                          formErrors.atPrice ? 'border-red-300 bg-red-50' : 'border-gray-300 focus:border-blue-500'
                        } focus:ring-2 focus:ring-blue-200 focus:outline-none`}
                        placeholder="0"
                      />
                    </div>
                    {formErrors.atPrice && <p className="text-xs text-red-500 mt-1">{formErrors.atPrice}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      As Of Date
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        name="asOfDate"
                        value={newItem.asOfDate || ''}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 border-2 rounded-lg transition-all duration-200 ${
                          formErrors.asOfDate ? 'border-red-300 bg-red-50' : 'border-gray-300 focus:border-blue-500'
                        } focus:ring-2 focus:ring-blue-200 focus:outline-none`}
                      />
                      <span className="absolute right-3 top-3 text-gray-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </span>
                    </div>
                    {formErrors.asOfDate && <p className="text-xs text-red-500 mt-1">{formErrors.asOfDate}</p>}
                  </div>
                </div>

                {/* Stock Management Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Min Stock To Maintain
                    </label>
                    <input
                      type="number"
                      name="minStock"
                      value={newItem.minStock || ''}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border-2 rounded-lg transition-all duration-200 ${
                        formErrors.minStock ? 'border-red-300 bg-red-50' : 'border-gray-300 focus:border-blue-500'
                      } focus:ring-2 focus:ring-blue-200 focus:outline-none`}
                      placeholder="0"
                    />
                    {formErrors.minStock && <p className="text-xs text-red-500 mt-1">{formErrors.minStock}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Location
                    </label>
                    <input
                      type="text"
                      name="location"
                      value={newItem.location || ''}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border-2 rounded-lg transition-all duration-200 ${
                        formErrors.location ? 'border-red-300 bg-red-50' : 'border-gray-300 focus:border-blue-500'
                      } focus:ring-2 focus:ring-blue-200 focus:outline-none`}
                      placeholder="Storage location"
                    />
                    {formErrors.location && <p className="text-xs text-red-500 mt-1">{formErrors.location}</p>}
                  </div>
                </div>

                {/* Current Stock (calculated or entered) */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                  <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                    <span className="mr-2">📊</span>
                    Current Stock Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Current Stock Quantity
                      </label>
                      <input
                        type="number"
                        name="stock"
                        value={newItem.stock || ''}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 border-2 rounded-lg transition-all duration-200 ${
                          formErrors.stock ? 'border-red-300 bg-red-50' : 'border-gray-300 focus:border-blue-500'
                        } focus:ring-2 focus:ring-blue-200 focus:outline-none bg-white`}
                        placeholder="0"
                      />
                      {formErrors.stock && <p className="text-xs text-red-500 mt-1">{formErrors.stock}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Stock Value
                      </label>
                      <div className="px-4 py-3 bg-white rounded-lg border-2 border-gray-200">
                        <span className="text-gray-900 font-medium">
                          ₹{((newItem.stock || 0) * (newItem.atPrice || newItem.purchasePrice || 0)).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Enhanced Stock Status */}
                {(newItem.stock > 0 || newItem.minStock > 0) && (
                  <div className={`rounded-xl p-4 border ${
                    (newItem.stock || 0) <= (newItem.minStock || 0)
                      ? 'bg-orange-50 border-orange-200' 
                      : 'bg-green-50 border-green-200'
                  }`}>
                    <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center">
                      <span className="mr-2">📈</span>
                      Stock Status
                    </h4>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {(newItem.stock || 0) <= (newItem.minStock || 0) ? (
                          <>
                            <span className="text-orange-600 font-medium text-lg">⚠️</span>
                            <span className="text-orange-800 font-medium">Low Stock Alert</span>
                          </>
                        ) : (
                          <>
                            <span className="text-green-600 font-medium text-lg">✅</span>
                            <span className="text-green-800 font-medium">Stock Level Good</span>
                          </>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-600">
                          {newItem.stock || 0} / {newItem.minStock || 0} units
                        </div>
                        <div className="text-xs text-gray-500">
                          Current / Minimum
                        </div>
                      </div>
                    </div>
                    
                    {/* Stock level progress bar */}
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>Stock Level</span>
                        <span>{Math.round(((newItem.stock || 0) / Math.max(newItem.minStock || 1, 1)) * 100)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            (newItem.stock || 0) <= (newItem.minStock || 0) 
                              ? 'bg-orange-500' 
                              : 'bg-green-500'
                          }`}
                          style={{ 
                            width: `${Math.min(((newItem.stock || 0) / Math.max(newItem.minStock || 1, 1)) * 100, 100)}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Stock Movement Tracking */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                    <span className="mr-2">📋</span>
                    Quick Stock Actions
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <button 
                      type="button"
                      className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
                      onClick={() => setNewItem(prev => ({ ...prev, stock: (prev.stock || 0) + 1 }))}
                    >
                      +1 Stock
                    </button>
                    <button 
                      type="button"
                      className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
                      onClick={() => setNewItem(prev => ({ ...prev, stock: Math.max((prev.stock || 0) - 1, 0) }))}
                    >
                      -1 Stock
                    </button>
                    <button 
                      type="button"
                      className="px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium"
                      onClick={() => setNewItem(prev => ({ ...prev, stock: prev.minStock || 0 }))}
                    >
                      Set to Min
                    </button>
                    <button 
                      type="button"
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                      onClick={() => setNewItem(prev => ({ ...prev, stock: 0 }))}
                    >
                      Reset Stock
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4 pt-6">
          <button
            type="button"
            onClick={() => router.push('/dashboard/items')}
            className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isLoading}
            className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
              isLoading 
                ? 'bg-gray-400 text-white cursor-not-allowed' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>{editMode ? 'Updating...' : 'Saving...'}</span>
              </>
            ) : (
              <>
                <span>{editMode ? 'Update Item' : 'Add Item'}</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Unit Selection Modal */}
      {showUnitModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowUnitModal(false);
            }
          }}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Select Unit</h3>
              <button
                onClick={() => setShowUnitModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                {/* Base Unit */}
                <div>
                  <label className="block text-sm font-medium text-blue-600 mb-2 uppercase tracking-wide">
                    Base Unit
                  </label>
                  <select
                    value={selectedBaseUnit}
                    onChange={(e) => setSelectedBaseUnit(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-orange-300 rounded-md focus:border-orange-500 focus:ring-2 focus:ring-orange-200 focus:outline-none bg-white"
                  >
                    <option value="None">None</option>
                    <option value="Piece">Piece</option>
                    <option value="Kg">Kg</option>
                    <option value="Gram">Gram</option>
                    <option value="Liter">Liter</option>
                    <option value="Meter">Meter</option>
                    <option value="Box">Box</option>
                    <option value="Packet">Packet</option>
                    <option value="Dozen">Dozen</option>
                    <option value="Unit">Unit</option>
                  </select>
                </div>

                {/* Secondary Unit */}
                <div>
                  <label className="block text-sm font-medium text-blue-600 mb-2 uppercase tracking-wide">
                    Secondary Unit
                  </label>
                  <select
                    value={selectedSecondaryUnit}
                    onChange={(e) => setSelectedSecondaryUnit(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-md focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none bg-white"
                  >
                    <option value="None">None</option>
                    <option value="Piece">Piece</option>
                    <option value="Kg">Kg</option>
                    <option value="Gram">Gram</option>
                    <option value="Liter">Liter</option>
                    <option value="Meter">Meter</option>
                    <option value="Box">Box</option>
                    <option value="Packet">Packet</option>
                    <option value="Dozen">Dozen</option>
                    <option value="Unit">Unit</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  setNewItem(prev => ({ ...prev, unit: selectedBaseUnit }));
                  setShowUnitModal(false);
                }}
                className="px-6 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors font-medium"
              >
                SAVE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}