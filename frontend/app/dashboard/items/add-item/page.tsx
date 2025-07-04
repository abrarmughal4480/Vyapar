'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { addItem, updateItem } from '../../../../http/items'
import Toast from '../../../components/Toast'
import { ITEM_CATEGORIES } from '../../../constants/categories'
import { fetchPartiesByUserId, PartyData } from '../../../../http/parties'
import { jwtDecode } from 'jwt-decode'
import ReactDOM from 'react-dom'

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
    asOfDate: '',
    location: ''
  })

  const [formErrors, setFormErrors] = useState<Partial<Record<keyof Item, string>>>({})
  const [activeTab, setActiveTab] = useState('pricing')
  const [showUnitModal, setShowUnitModal] = useState(false)
  const [selectedBaseUnit, setSelectedBaseUnit] = useState('Piece')
  const [selectedSecondaryUnit, setSelectedSecondaryUnit] = useState('None')
  const [businessId, setBusinessId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  const categoryDropdownRef = useRef<HTMLDivElement>(null)
  const categoryDropdownButtonRef = useRef<HTMLButtonElement>(null)
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const statusDropdownRef = useRef<HTMLDivElement>(null)
  const statusDropdownButtonRef = useRef<HTMLButtonElement>(null)
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' } | null>(null)
  const [parties, setParties] = useState<PartyData[]>([])
  const [partiesLoading, setPartiesLoading] = useState(false)
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false)
  const supplierDropdownRef = useRef<HTMLDivElement>(null)
  const supplierDropdownButtonRef = useRef<HTMLButtonElement>(null)
  const [supplierSearch, setSupplierSearch] = useState('')
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 })

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

  // Prevent background scrolling when unit modal is open
  useEffect(() => {
    if (showUnitModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showUnitModal]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        categoryDropdownRef.current &&
        !categoryDropdownRef.current.contains(event.target as Node) &&
        categoryDropdownButtonRef.current &&
        !categoryDropdownButtonRef.current.contains(event.target as Node)
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

  // Close status dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        statusDropdownRef.current &&
        !statusDropdownRef.current.contains(event.target as Node) &&
        statusDropdownButtonRef.current &&
        !statusDropdownButtonRef.current.contains(event.target as Node)
      ) {
        setShowStatusDropdown(false)
      }
    }
    if (showStatusDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    } else {
      document.removeEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showStatusDropdown])

  // Set default asOfDate on client only to avoid hydration mismatch
  useEffect(() => {
    if (!newItem.asOfDate) {
      setNewItem(prev => ({ ...prev, asOfDate: new Date().toISOString().split('T')[0] }))
    }
  }, [])

  // Fetch parties for supplier suggestions
  useEffect(() => {
    const fetchParties = async () => {
      setPartiesLoading(true)
      try {
        const token = localStorage.getItem('token') || ''
        const res = await fetchPartiesByUserId(token)
        if (res.success) {
          setParties(res.data.filter((p: PartyData) => {
            const type = (p.partyType || '').toLowerCase();
            return type === 'supplier' || type === 'both';
          }))
        } else {
          setParties([])
        }
      } catch {
        setParties([])
      } finally {
        setPartiesLoading(false)
      }
    }
    fetchParties()
  }, [])

  // Close supplier dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        supplierDropdownRef.current &&
        !supplierDropdownRef.current.contains(event.target as Node) &&
        supplierDropdownButtonRef.current &&
        !supplierDropdownButtonRef.current.contains(event.target as Node)
      ) {
        setShowSupplierDropdown(false)
      }
    }
    if (showSupplierDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    } else {
      document.removeEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showSupplierDropdown])

  // Update dropdown position when opening
  useEffect(() => {
    if (showCategoryDropdown && categoryDropdownButtonRef.current) {
      const rect = categoryDropdownButtonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 6, // 6px gap
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  }, [showCategoryDropdown]);

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
    if ((newItem.atPrice ?? 0) <= 0) errors.atPrice = 'At price must be greater than 0'
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
      let result;
      const id = (newItem as any).itemId || (newItem as any)._id || '';
      if (editMode && id) {
        result = await updateItem(businessId, id, newItem);
      } else {
        result = await addItem(businessId, newItem);
      }
      if (result.success) {
        setToast({ message: editMode ? 'Item updated successfully!' : 'Item created successfully!', type: 'success' });
        setTimeout(() => {
          router.push('/dashboard/items');
        }, 1200);
      } else {
        setToast({ message: result.message || (editMode ? 'Failed to update item' : 'Failed to create item'), type: 'error' });
      }
    } catch (err: any) {
      setToast({ message: err.message || (editMode ? 'An error occurred while updating the item' : 'An error occurred while creating the item'), type: 'error' });
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-2 sm:px-4 md:px-8">
      <div className="w-full max-w-none h-auto bg-white/90 rounded-2xl shadow-2xl border border-gray-100 overflow-hidden mx-auto my-6">
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-white/90 border-b border-gray-200 flex justify-between items-center px-6 py-4">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">{editMode ? 'Edit Item' : 'Add Item'}</h1>
          <button
            type="button"
            onClick={() => router.push('/dashboard/items')}
            className="text-gray-400 hover:text-gray-600 text-2xl"
            aria-label="Cancel"
          >
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="divide-y divide-gray-200 w-full">
          {/* Main Form Fields Section */}
          <div className="bg-gray-50 px-6 py-6 w-full">
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <div className="inline-flex rounded-full bg-gray-100 p-1 shadow-inner" role="group" aria-label="Item Type">
                <button
                  type="button"
                  className={`px-6 py-2 rounded-full font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-all duration-200 text-sm
                    ${newItem.type === 'Product' ? 'bg-blue-600 text-white shadow border border-blue-600 scale-105' : 'bg-transparent text-gray-700 hover:bg-blue-50 border border-transparent'}`}
                  aria-pressed={newItem.type === 'Product'}
                  onClick={() => setNewItem(prev => ({ ...prev, type: 'Product' }))}
                >
                  Product
                </button>
                <button
                  type="button"
                  className={`px-6 py-2 rounded-full font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-all duration-200 text-sm
                    ${newItem.type === 'Service' ? 'bg-blue-600 text-white shadow border border-blue-600 scale-105' : 'bg-transparent text-gray-700 hover:bg-blue-50 border border-transparent'}`}
                  aria-pressed={newItem.type === 'Service'}
                  onClick={() => setNewItem(prev => ({ ...prev, type: 'Service' }))}
                >
                  Service
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
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
                <div ref={categoryDropdownRef} className="relative w-full">
                  <button
                    ref={categoryDropdownButtonRef}
                    type="button"
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-full bg-white/80 shadow border-2 ${formErrors.category ? 'border-red-300 bg-red-50' : 'border-gray-300 focus:border-blue-500'} text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all group`}
                    onClick={() => setShowCategoryDropdown((v) => !v)}
                    aria-haspopup="listbox"
                    aria-expanded={showCategoryDropdown ? 'true' : 'false'}
                  >
                    <span className="truncate">{newItem.category || 'Select Category'}</span>
                    <svg className={`w-5 h-5 ml-2 transition-transform ${showCategoryDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                  </button>
                  {showCategoryDropdown && (
                    <ul
                      className="absolute z-[9999] bg-white rounded-xl shadow-lg border border-gray-100 py-1 max-h-60 overflow-auto animate-fadeinup"
                      style={{
                        top: '100%',
                        left: 0,
                        width: '100%',
                        position: 'absolute',
                      }}
                      tabIndex={-1}
                      role="listbox"
                    >
                      {ITEM_CATEGORIES.map((cat) => (
                        <li
                          key={cat}
                          className={`px-4 py-2 cursor-pointer rounded-lg transition-all hover:bg-blue-50 ${newItem.category === cat ? 'font-semibold text-blue-600' : 'text-gray-700'}`}
                          onClick={() => { setNewItem(prev => ({ ...prev, category: cat })); setShowCategoryDropdown(false); }}
                          role="option"
                          aria-selected={newItem.category === cat}
                        >
                          {cat}
                        </li>
                      ))}
                    </ul>
                  )}
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-4 w-full">
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
            <div className="mt-6 pt-6 border-t border-gray-200 w-full">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
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
                  <div ref={supplierDropdownRef} className="relative w-full">
                    <button
                      ref={supplierDropdownButtonRef}
                      type="button"
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg bg-white/80 shadow border-2 ${formErrors.supplier ? 'border-red-300 bg-red-50' : 'border-gray-300 focus:border-blue-500'} text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all group`}
                      onClick={() => setShowSupplierDropdown((v) => !v)}
                      aria-haspopup="listbox"
                      aria-expanded={showSupplierDropdown ? 'true' : 'false'}
                    >
                      <span className="truncate">{newItem.supplier || 'Select Supplier'}</span>
                      <svg className={`w-5 h-5 ml-2 transition-transform ${showSupplierDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    {showSupplierDropdown && (
                      <ul
                        className="absolute z-[100] bg-white rounded-xl shadow-lg border border-gray-100 py-1 max-h-60 overflow-auto animate-fadeinup w-full"
                        style={{ top: '110%', left: 0 }}
                        tabIndex={-1}
                        role="listbox"
                      >
                        <li className="px-3 py-2">
                          <input
                            type="text"
                            className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200"
                            placeholder="Search supplier..."
                            value={supplierSearch}
                            onChange={e => setSupplierSearch(e.target.value)}
                          />
                        </li>
                        {partiesLoading ? (
                          <li className="px-4 py-2 text-gray-500 text-sm">Loading...</li>
                        ) : (
                          parties.filter(p => p.name.toLowerCase().includes(supplierSearch.toLowerCase())).length === 0 ? (
                            <li className="px-4 py-2 text-gray-500 text-sm">No suppliers found</li>
                          ) : (
                            parties.filter(p => p.name.toLowerCase().includes(supplierSearch.toLowerCase())).map((party, idx) => {
                              const isSelected = newItem.supplier === party.name;
                              return (
                                <li
                                  key={party.name + idx}
                                  className={`px-4 py-2 cursor-pointer rounded-lg transition-all hover:bg-blue-50 ${isSelected ? 'font-semibold text-blue-600 bg-blue-100' : 'text-gray-700'}`}
                                  onClick={() => { setNewItem(prev => ({ ...prev, supplier: party.name })); setShowSupplierDropdown(false); setSupplierSearch(''); }}
                                  role="option"
                                  aria-selected={isSelected}
                                >
                                  {party.name}
                                  <span className="ml-2 text-xs text-gray-400">{party.phone ? `📞 ${party.phone}` : ''}{party.email ? `  ✉️ ${party.email}` : ''}</span>
                                </li>
                              )
                            })
                          )
                        )}
                        <li className="px-4 py-2 border-t border-gray-100">
                          <button
                            type="button"
                            className="text-blue-600 hover:underline text-xs"
                            onClick={() => { setNewItem(prev => ({ ...prev, supplier: supplierSearch })); setShowSupplierDropdown(false); }}
                          >
                            Use "{supplierSearch}" as supplier
                          </button>
                        </li>
                      </ul>
                    )}
                  </div>
                  {formErrors.supplier && <p className="text-xs text-red-500 mt-1">{formErrors.supplier}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <div ref={statusDropdownRef} className="relative w-full">
                    <button
                      ref={statusDropdownButtonRef}
                      type="button"
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-full bg-white/80 shadow border-2 border-gray-300 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all group`}
                      onClick={() => setShowStatusDropdown((v) => !v)}
                      aria-haspopup="listbox"
                      aria-expanded={showStatusDropdown ? 'true' : 'false'}
                    >
                      <span className="truncate">{newItem.status || 'Select Status'}</span>
                      <svg className={`w-5 h-5 ml-2 transition-transform ${showStatusDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    {showStatusDropdown && (
                      <ul
                        className="absolute z-[100] bg-white rounded-xl shadow-lg border border-gray-100 py-1 max-h-60 overflow-auto animate-fadeinup w-full"
                        style={{
                          top: '110%',
                          left: 0,
                        }}
                        tabIndex={-1}
                        role="listbox"
                      >
                        {['Active', 'Inactive', 'Discontinued'].map((status) => (
                          <li
                            key={status}
                            className={`px-4 py-2 cursor-pointer rounded-lg transition-all hover:bg-blue-50 ${newItem.status === status ? 'font-semibold text-blue-600' : 'text-gray-700'}`}
                            onClick={() => { setNewItem(prev => ({ ...prev, status }) as Item); setShowStatusDropdown(false); }}
                            role="option"
                            aria-selected={newItem.status === status}
                          >
                            {status}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
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

          {/* Tabs Section */}
          <div className="bg-white px-6 pt-6 pb-0 w-full">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8">
                {tabs.map((tab) => (
                  <button
                    type="button"
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <span className="text-lg">{tab.icon}</span>
                    <span>{tab.name}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6 w-full">
            {/* Pricing Tab */}
            {activeTab === 'pricing' && (
              <div className="space-y-6">
                <div className="max-w-md">
                  <label className="block text-sm font-medium text-gray-900 mb-3">
                    Sale Price (PKR)
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
                          PKR {profitPerUnit.toFixed(2)}
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
                          PKR {totalProfit.toFixed(2)}
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
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none select-none">PKR</span>
                      <input
                        type="number"
                        name="atPrice"
                        value={newItem.atPrice || ''}
                        onChange={handleInputChange}
                        className={`w-full pl-14 pr-4 py-3 border-2 rounded-lg transition-all duration-200 ${
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
                          PKR {((newItem.stock || 0) * ((newItem.atPrice ?? newItem.purchasePrice) || 0)).toLocaleString()}
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

          {/* Submit Button (moved inside form) */}
          <div className="flex justify-end gap-4 px-6 py-6 bg-gray-50 border-t border-gray-200 w-full">
            <button
              type="submit"
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
        </form>
      </div>

      {/* Unit Selection Modal */}
      {showUnitModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeinup" onClick={(e) => { if (e.target === e.currentTarget) setShowUnitModal(false); }}>
          <div className="bg-white/90 rounded-2xl shadow-2xl w-full max-w-md animate-scalein">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-xl font-semibold text-gray-900">Select Unit</h3>
              <button onClick={() => setShowUnitModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                {/* Base Unit */}
                <div>
                  <label className="block text-sm font-medium text-blue-600 mb-2 uppercase tracking-wide">Base Unit</label>
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
                  <label className="block text-sm font-medium text-blue-600 mb-2 uppercase tracking-wide">Secondary Unit</label>
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
            <div className="flex justify-end p-4 rounded-b-2xl">
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

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}