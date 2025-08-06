'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Toast from '../../../components/Toast'
import React, { useRef } from 'react'
import ReactDOM from 'react-dom'
import { getCustomerParties, getPartyBalance } from '../../../../http/parties'
import { getToken } from '../../../lib/auth'
import { getUserItems } from '../../../../http/items'
import { createQuotation } from '../../../../http/quotations'

// Utility functions for unit conversion
const getUnitDisplay = (unit: any) => {
  if (!unit) return 'NONE';
  
  // Handle object format with conversion factor
  if (typeof unit === 'object' && unit.base) {
    const base = unit.base || 'NONE';
    const secondary = unit.secondary && unit.secondary !== 'None' ? unit.secondary : null;
    
    // Return secondary unit if available, otherwise return base unit
    return secondary || base;
  }
  
  // Handle string format like "Piece / Packet"
  if (typeof unit === 'string' && unit.includes(' / ')) {
    const parts = unit.split(' / ');
    return parts[1] && parts[1] !== 'None' ? parts[1] : parts[0];
  }
  
  // Fallback for simple string units
  if (typeof unit === 'string') {
    return unit || 'NONE';
  }
  
  return 'NONE';
};

const convertQuantity = (currentQty: string, fromUnit: string, toUnit: string, itemData: any): string => {
  if (!currentQty || !fromUnit || !toUnit || fromUnit === toUnit) {
    return currentQty;
  }

  const qty = parseFloat(currentQty);
  if (isNaN(qty)) return currentQty;

  const unit = itemData.unit;
  if (!unit) return currentQty;

  // Handle object format with conversion factor
  if (typeof unit === 'object' && unit.conversionFactor) {
    const factor = unit.conversionFactor;
    let convertedQty = qty;
    
    // If converting from base to secondary, multiply by factor
    if (fromUnit === unit.base && toUnit === unit.secondary) {
      convertedQty = qty * factor;
    }
    // If converting from secondary to base, divide by factor
    else if (fromUnit === unit.secondary && toUnit === unit.base) {
      convertedQty = qty / factor;
    }
    
    // Round to nearest whole number for quantity
    return Math.round(convertedQty).toString();
  }
  
  // Handle string format like "Piece / Packet"
  if (typeof unit === 'string' && unit.includes(' / ')) {
    const parts = unit.split(' / ');
    if (parts.length === 2) {
      // Simple conversion: if going from first to second unit, multiply by 10
      // This is a fallback conversion factor
      if (fromUnit === parts[0] && toUnit === parts[1]) {
        return Math.round(qty * 10).toString();
      }
      if (fromUnit === parts[1] && toUnit === parts[0]) {
        return Math.round(qty / 10).toString();
      }
    }
  }
  
  return currentQty;
};

const convertPrice = (currentPrice: string, fromUnit: string, toUnit: string, itemData: any): string => {
  if (!currentPrice || !fromUnit || !toUnit || fromUnit === toUnit) {
    return currentPrice;
  }

  const price = parseFloat(currentPrice);
  if (isNaN(price)) return currentPrice;

  const unit = itemData.unit;
  if (!unit) return currentPrice;

  // Handle object format with conversion factor
  if (typeof unit === 'object' && unit.conversionFactor) {
    const factor = unit.conversionFactor;
    let convertedPrice = price;
    
    // If converting from base to secondary, multiply by factor (price per unit increases)
    if (fromUnit === unit.base && toUnit === unit.secondary) {
      convertedPrice = price * factor;
    }
    // If converting from secondary to base, divide by factor (price per unit decreases)
    else if (fromUnit === unit.secondary && toUnit === unit.base) {
      convertedPrice = price / factor;
    }
    
    // Round to 2 decimal places for price
    return (Math.round(convertedPrice * 100) / 100).toFixed(2);
  }
  
  // Handle string format like "Piece / Packet"
  if (typeof unit === 'string' && unit.includes(' / ')) {
    const parts = unit.split(' / ');
    if (parts.length === 2) {
      // Simple conversion: if going from first to second unit, multiply by 10
      // This is a fallback conversion factor
      if (fromUnit === parts[0] && toUnit === parts[1]) {
        return (Math.round(price * 10 * 100) / 100).toFixed(2);
      }
      if (fromUnit === parts[1] && toUnit === parts[0]) {
        return (Math.round(price / 10 * 100) / 100).toFixed(2);
      }
    }
  }
  
  return currentPrice;
};

// This would be saved as: /app/dashboard/sale-order/create/page.js or /pages/dashboard/sale-order/create.js

interface FormData {
  refNo: string;
  invoiceDate: string;
  customer: string;
  phone: string;
  items: { id: number; item: string; qty: number; unit: string; customUnit: string; price: number; amount: number }[];
  description: string;
  image: File | null;
  discount: number;
  discountType: string;
  tax: string;
  taxType: string;
  paymentType: string;
}

interface DropdownOption {
  value: string;
  label: string;
}

interface CustomDropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (val: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

function CustomDropdown({ options, value, onChange, className = '', placeholder = 'Select', disabled = false }: CustomDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!ref.current) return;
      if (!(event.target instanceof Node)) return;
      if (!ref.current.contains(event.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: 'absolute',
        top: rect.bottom + window.scrollY + 6,
        left: rect.left + window.scrollX + rect.width / 2 - (rect.width + 40) / 2,
        width: rect.width + 40,
        minWidth: rect.width,
        zIndex: 1000,
        maxHeight: '12rem',
        overflowY: 'auto',
      });
    }
  }, [open]);

  return (
    <div ref={ref} className={`relative ${disabled ? 'opacity-60 pointer-events-none' : ''} ${className}`}> 
      <button
        ref={btnRef}
        type="button"
        className={`w-full px-3 py-2 border-2 border-blue-100 rounded-lg bg-white flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-blue-200 appearance-none transition-all ${open ? 'ring-2 ring-blue-300' : ''}`}
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        tabIndex={0}
      >
        <span className="truncate text-left">{options.find((o: DropdownOption) => o.value === value)?.label || placeholder}</span>
        <span className={`ml-2 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
        </span>
      </button>
      {open && typeof window !== 'undefined' && ReactDOM.createPortal(
        <ul
          style={dropdownStyle}
          className="bg-white border-2 border-blue-100 rounded-lg shadow-lg animate-fadeinup custom-dropdown-scrollbar"
          onMouseDown={e => e.preventDefault()}
        >
          {options.map((opt: DropdownOption) => (
            <li
              key={opt.value}
              className={`px-4 py-2 cursor-pointer flex items-center gap-2 hover:bg-blue-50 transition-colors ${value === opt.value ? 'bg-blue-100 font-semibold text-blue-700' : 'text-gray-700'}`}
              onMouseDown={e => { e.preventDefault(); onChange(opt.value); setOpen(false); }}
              tabIndex={0}
              onKeyDown={(e: React.KeyboardEvent<HTMLLIElement>) => { if (e.key === 'Enter') { onChange(opt.value); setOpen(false); }}}
              aria-selected={value === opt.value}
            >
              {opt.label}
            </li>
          ))}
        </ul>,
        document.body
      )}
    </div>
  );
}

export default function CreateSalesOrderPage() {
  const router = useRouter()
  const [formData, setFormData] = useState<FormData>({
    refNo: '1',
    invoiceDate: new Date().toISOString().split('T')[0],
    customer: '',
    phone: '',
    items: [
      { id: 1, item: '', qty: 0, unit: 'NONE', customUnit: '', price: 0, amount: 0 },
      { id: 2, item: '', qty: 0, unit: 'NONE', customUnit: '', price: 0, amount: 0 }
    ],
    description: '',
    image: null,
    discount: 0,
    discountType: '%',
    tax: '0',
    taxType: '%',
    paymentType: 'cash'
  })
  
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false)
  const [customers, setCustomers] = useState([
    'Customer 1 - 9876543210',
    'Customer 2 - 9876543211', 
    'Customer 3 - 9876543212'
  ])
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showDescription, setShowDescription] = useState(false)
  const [showImage, setShowImage] = useState(false)
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' } | null>(null)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [imageUploading, setImageUploading] = useState(false)
  const [customerSuggestions, setCustomerSuggestions] = useState<any[]>([]);
  const [itemSuggestions, setItemSuggestions] = useState<any[]>([]);
  const [showItemSuggestions, setShowItemSuggestions] = useState<{[id: number]: boolean}>({});
  const [partyBalance, setPartyBalance] = useState<number | null>(null);

  // Unit options
  const unitOptions = ['NONE', 'PCS', 'KG', 'METER', 'LITER', 'BOX', 'DOZEN']
  const taxOptions = ['NONE', 'GST 5%', 'GST 12%', 'GST 18%', 'GST 28%']

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

  // Get business ID from localStorage
  const getBusinessId = useCallback(() => {
    if (typeof window === 'undefined') {
      return null;
    }

    const userData = localStorage.getItem('user') || localStorage.getItem('vypar_user_session');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        return parsedUser.businessId || localStorage.getItem('businessId');
      } catch (error) {
        return localStorage.getItem('businessId');
      }
    }
    
    return localStorage.getItem('businessId');
  }, []);

  // Calculate amount for each item
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => ({
        ...item,
        amount: item.qty * item.price
      }))
    }))
  }, [])

  // Fetch party balance when customer changes
  useEffect(() => {
    const fetchBalance = async () => {
      if (!formData.customer) {
        setPartyBalance(null);
        return;
      }
      const token = getToken();
      if (!token) return;
      try {
        const balance = await getPartyBalance(formData.customer, token);
        setPartyBalance(balance);
      } catch (err) {
        setPartyBalance(null);
      }
    };
    fetchBalance();
  }, [formData.customer]);

  // Calculate totals
  const subtotal = formData.items.reduce((sum, item) => sum + item.amount, 0)
  const discountValue = formData.discountType === '%' 
    ? (subtotal * formData.discount / 100) 
    : formData.discount
  const taxValue = (subtotal * parseFloat(formData.tax) / 100)
  const grandTotal = Math.max(0, subtotal - discountValue + taxValue)

  // Update item in the form (by id)
  const updateItem = (id: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === id) {
          let updated = { ...item, [field]: value };
          if (field === 'unit' && value !== 'Custom') {
            updated.customUnit = '';
          }
          if (field === 'qty' || field === 'price') {
            updated.amount = (field === 'qty' ? value : item.qty) * (field === 'price' ? value : item.price);
          }
          return updated;
        }
        return item;
      })
    }));
  };

  // Add new row (only if last row is filled)
  const addRow = () => {
    const lastItem = formData.items[formData.items.length - 1];
    if (!lastItem.item || !lastItem.qty || !lastItem.price) {
      setToast({ message: 'Please fill the last row before adding a new one.', type: 'error' });
      return;
    }
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        { id: Date.now(), item: '', qty: 0, unit: 'NONE', customUnit: '', price: 0, amount: 0 }
      ]
    }));
  };

  // Remove row (by id)
  const removeRow = (id: number) => {
    if (formData.items.length > 1) {
      setFormData(prev => ({
        ...prev,
        items: prev.items.filter(item => item.id !== id)
      }));
    }
  };

  // Handle customer selection
  const handleCustomerSelect = (customer: string) => {
    const [name, phone] = customer.split(' - ')
    setFormData(prev => ({
      ...prev,
      customer: name,
      phone: phone
    }))
    setSearchDropdownOpen(false)
  }

  // Handle image upload
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImageUploading(true);
    try {
      // Create a preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedImage(e.target?.result as string);
        setFormData(prev => ({ ...prev, image: file }));
        setImageUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading image:', error);
      setImageUploading(false);
    }
  };

  const removeImage = () => {
    setUploadedImage(null);
    setFormData(prev => ({ ...prev, image: null }));
  };

  // Save quotation
  const handleSave = async () => {
    if (!formData.customer.trim()) {
      setError('Customer name is required')
      return
    }

    if (formData.items.every(item => !item.item.trim())) {
      setError('At least one item is required')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const token = getToken();
      if (!token) throw new Error('Not logged in');
      const quotationPayload = {
        customerName: formData.customer,
        customerPhone: formData.phone,
        items: formData.items
          .filter(item => item.item.trim() && item.price > 0)
          .map(item => ({
            item: item.item,
            qty: item.qty,
            unit: item.unit,
            customUnit: item.customUnit,
            price: item.price,
            amount: item.amount
          })),
        subtotal: subtotal,
        tax: taxValue,
        totalAmount: grandTotal,
        status: 'Quotation Open',
        date: formData.invoiceDate,
        refNo: formData.refNo,
        discount: discountValue,
        description: formData.description,
        customerBalance: grandTotal
      };
      const res = await createQuotation(quotationPayload, token);
      if (res && res.success) {
        setToast({ message: 'Quotation created successfully!', type: 'success' });
        router.push('/dashboard/quotation');
      } else {
        setError(res?.message || 'Failed to save quotation');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to save quotation')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle share functionality
  const handleShare = () => {
    setToast({ message: 'Share functionality to be implemented', type: 'success' })
  }

  const fetchCustomerSuggestions = async () => {
    const token = getToken();
    if (!token) return;
    try {
      const parties = await getCustomerParties(token);
      setCustomerSuggestions(parties || []);
    } catch {}
  };

  const fetchItemSuggestions = async () => {
    const token = getToken();
    if (!token) return;
    try {
      const items = await getUserItems(token);
      setItemSuggestions(items || []);
    } catch {}
  };

  const inputRefs = useRef<{ [id: number]: HTMLInputElement | null }>({});
  const [dropdownStyles, setDropdownStyles] = useState<{ [id: number]: React.CSSProperties }>({});

  const updateDropdownPosition = (id: number) => {
    const input = inputRefs.current[id];
    if (input) {
      const rect = input.getBoundingClientRect();
      setDropdownStyles(prev => ({
        ...prev,
        [id]: {
          position: 'absolute',
          top: rect.bottom + window.scrollY + 6,
          left: rect.left + window.scrollX,
          width: rect.width,
          zIndex: 1000,
          maxHeight: '15rem',
          overflowY: 'auto',
        }
      }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-2 sm:px-4 md:px-8">
      <div className="w-full h-auto bg-white/90 rounded-2xl shadow-2xl border border-gray-100 overflow-hidden mx-auto my-6">
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-white/90 border-b border-gray-200 flex justify-between items-center px-6 py-4">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Add Quotation</h1>
          <button
            type="button"
            onClick={() => router.push('/dashboard/quotation')}
            className="text-gray-400 hover:text-gray-600 text-2xl"
            aria-label="Cancel"
          >
            ✕
          </button>
        </div>

        {/* Main Form */}
        <form onSubmit={handleSave} className="divide-y divide-gray-200 w-full">
          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <span className="text-red-600 mr-2">⚠️</span>
                <div className="text-red-800">{error}</div>
                <button 
                  onClick={() => setError('')}
                  className="ml-auto text-red-600 hover:text-red-800 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Customer Section */}
          <div className="bg-gray-50 px-6 py-6 w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-blue-600 mb-2">Customer *</label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.customer}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, customer: e.target.value }))
                      setSearchDropdownOpen(true)
                    }}
                    onFocus={() => {
                      fetchCustomerSuggestions();
                      setSearchDropdownOpen(true);
                    }}
                    onBlur={() => setTimeout(() => setSearchDropdownOpen(false), 200)}
                    className="w-full px-4 py-3 border-2 border-blue-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
                    placeholder="Search or enter customer name"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                  {searchDropdownOpen && (
                    <div className="absolute left-0 right-0 mt-1 w-full z-50">
                      {customerSuggestions.length > 0 ? (
                        <ul className="bg-white border border-blue-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {customerSuggestions
                            .filter((party: any) =>
                              party.name.toLowerCase().includes(formData.customer.toLowerCase()) ||
                              (party.phone && party.phone.includes(formData.customer))
                            )
                            .map((party: any, index: number) => (
                              <li
                                key={party._id || index}
                                className="px-4 py-2 hover:bg-blue-100 cursor-pointer transition-colors"
                                onMouseDown={() => handleCustomerSelect(`${party.name} - ${party.phone || ''}`)}
                              >
                                {party.name} {party.phone && <span className="text-xs text-gray-400">({party.phone})</span>}
                              </li>
                            ))}
                        </ul>
                      ) : (
                        <div className="bg-white border border-blue-200 rounded-lg shadow-lg px-4 py-2 text-gray-400">No customers found.</div>
                      )}
                    </div>
                  )}
                </div>
                {partyBalance !== null && (
                  <div className={`text-xs mt-1 font-semibold ${partyBalance < 0 ? 'text-red-600' : 'text-green-600'}`}>Balance: PKR {Math.abs(partyBalance).toLocaleString()}</div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                  placeholder="Phone number"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </div>
            </div>
          </div>

          {/* Items Table Section */}
          <div className="bg-white px-6 py-6 w-full rounded-b-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-blue-800 flex items-center gap-2">
                <span>🛒</span> Items
              </h2>
              <button
                type="button"
                onClick={addRow}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition-colors font-semibold text-sm"
              >
                <span className="text-xl">+</span> Add Row
              </button>
            </div>
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-gradient-to-br from-blue-50 to-gray-100">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-gray-200 bg-blue-100">
                    <th className="text-left py-3 px-2 font-semibold text-gray-700 w-8">#</th>
                    <th className="text-left py-3 px-2 font-semibold text-gray-700">ITEM</th>
                    <th className="text-left py-3 px-2 font-semibold text-gray-700 w-20">QTY</th>
                    <th className="text-left py-3 px-2 font-semibold text-gray-700 w-32">UNIT</th>
                    <th className="text-left py-3 px-2 font-semibold text-gray-700 w-32">PRICE/UNIT</th>
                    <th className="text-left py-3 px-2 font-semibold text-gray-700 w-32">AMOUNT</th>
                    <th className="text-left py-3 px-2 font-semibold text-gray-700 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items.map((item: { id: number; item: string; qty: number; unit: string; customUnit: string; price: number; amount: number }, index: number) => (
                    <tr key={item.id} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-blue-50'} hover:bg-blue-100 transition-colors`}>
                      <td className="py-2 px-2 font-medium">{index + 1}</td>
                      <td className="py-2 px-2">
                        <div className="relative">
                          <input
                            ref={el => { inputRefs.current[item.id] = el; }}
                            type="text"
                            value={item.item}
                            onChange={(e) => updateItem(item.id, 'item', e.target.value)}
                            onFocus={() => {
                              fetchItemSuggestions();
                              setShowItemSuggestions(prev => ({ ...prev, [item.id]: true }));
                              updateDropdownPosition(item.id);
                            }}
                            onBlur={() => setTimeout(() => setShowItemSuggestions(prev => ({ ...prev, [item.id]: false })), 200)}
                            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
                            placeholder="Enter item name..."
                            autoComplete="off"
                            autoCorrect="off"
                            spellCheck={false}
                          />
                          {showItemSuggestions[item.id] && itemSuggestions.length > 0 && typeof window !== 'undefined' && ReactDOM.createPortal(
                            <ul style={dropdownStyles[item.id] || {}} className="bg-white border border-blue-200 rounded-lg shadow-lg max-h-60 overflow-y-auto z-[1000]" >
                              {itemSuggestions
                                .filter((i: any) => i.name.toLowerCase().includes(item.item.toLowerCase()))
                                .map((i: any) => (
                                  <li
                                    key={i._id}
                                    className="px-4 py-2 hover:bg-blue-100 cursor-pointer transition-colors"
                                    onMouseDown={() => {
                                      updateItem(item.id, 'item', i.name);
                                      // Set the unit to the item's base unit or secondary unit from backend
                                      const unitDisplay = getUnitDisplay(i.unit);
                                      updateItem(item.id, 'unit', unitDisplay);
                                      updateItem(item.id, 'price', i.salePrice || 0);
                                      // Set a default quantity of 1 when item is selected
                                      updateItem(item.id, 'qty', 1);
                                      // Calculate amount after setting price
                                      const price = i.salePrice || 0;
                                      const qty = item.qty || 0;
                                      const amount = price * qty;
                                      updateItem(item.id, 'amount', amount);
                                      setShowItemSuggestions(prev => ({ ...prev, [item.id]: false }));
                                    }}
                                  >
                                    <div className="flex justify-between items-center">
                                      <span className="font-medium text-gray-800">{i.name}</span>
                                      <span className="text-xs text-gray-500">{getUnitDisplay(i.unit) || 'NONE'} • PKR {i.salePrice || 0} • Qty: {i.stock ?? 0}</span>
                                    </div>
                                  </li>
                                ))}
                            </ul>,
                            document.body
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          min="0"
                          value={item.qty}
                          onChange={(e) => {
                            updateItem(item.id, 'qty', parseFloat(e.target.value) || 0);
                            // If this is the last row and qty is not empty, add a new row
                            if (
                              index === formData.items.length - 1 &&
                              e.target.value &&
                              !formData.items.some((row: { qty?: number }, idx: number) => idx > index && !row.qty)
                            ) {
                              // Add a new row
                              addRow();
                            }
                          }}
                          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
                          autoComplete="off"
                          autoCorrect="off"
                          spellCheck={false}
                        />
                      </td>
                      <td className="py-2 px-2">
                        <CustomDropdown
                          options={(() => {
                            const options: DropdownOption[] = [];
                            
                            // Add base and secondary units if they exist in the item data
                            if (item.item) {
                              const selectedItem = itemSuggestions.find(i => i.name === item.item);
                              if (selectedItem && selectedItem.unit) {
                                const unit = selectedItem.unit;
                                
                                // Handle object format with conversion factor
                                if (typeof unit === 'object' && unit.base) {
                                  // Add base unit
                                  if (unit.base && unit.base !== 'NONE') {
                                    options.push({ value: unit.base, label: unit.base });
                                  }
                                  // Add secondary unit if it exists and is different from base
                                  if (unit.secondary && unit.secondary !== 'None' && unit.secondary !== unit.base) {
                                    options.push({ value: unit.secondary, label: unit.secondary });
                                  }
                                }
                                // Handle string format like "Piece / Packet"
                                else if (typeof unit === 'string' && unit.includes(' / ')) {
                                  const parts = unit.split(' / ');
                                  // Add both parts as separate options
                                  if (parts[0] && parts[0] !== 'NONE') {
                                    options.push({ value: parts[0], label: parts[0] });
                                  }
                                  if (parts[1] && parts[1] !== 'None') {
                                    options.push({ value: parts[1], label: parts[1] });
                                  }
                                }
                                // Handle simple string unit
                                else if (typeof unit === 'string') {
                                  options.push({ value: unit, label: unit });
                                }
                              }
                            }
                            
                            // If no units found from item, add NONE
                            if (options.length === 0) {
                              options.push({ value: 'NONE', label: 'NONE' });
                            }
                            return options;
                          })()}
                          value={item.unit}
                          onChange={val => {
                            // Get the selected item data for conversion
                            const selectedItem = itemSuggestions.find(i => i.name === item.item);
                            if (selectedItem) {
                              // Convert quantity based on unit change
                              if (item.qty) {
                                const convertedQty = convertQuantity(item.qty.toString(), item.unit, val, selectedItem);
                                updateItem(item.id, 'qty', parseFloat(convertedQty) || 0);
                              }
                              // Convert price based on unit change
                              if (item.price) {
                                const convertedPrice = convertPrice(item.price.toString(), item.unit, val, selectedItem);
                                updateItem(item.id, 'price', parseFloat(convertedPrice) || 0);
                              }
                            }
                            updateItem(item.id, 'unit', val);
                          }}
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.price}
                          onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
                          autoComplete="off"
                          autoCorrect="off"
                          spellCheck={false}
                        />
                      </td>
                      <td className="py-2 px-2">
                        <div className="text-sm font-medium">PKR {item.amount.toFixed(2)}</div>
                      </td>
                      <td className="py-2 px-2 flex gap-1">
                        {formData.items.length > 1 && (
                          <button
                            type="button"
                            className="text-red-600 hover:text-red-700 px-2 py-1 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 transition-colors"
                            onClick={() => removeRow(item.id)}
                            title="Delete row"
                          >
                            –
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Image Upload & Description Section */}
          <div className="bg-gray-50 px-6 py-6 w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Add Image</label>
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="imageUpload"
                    disabled={imageUploading}
                  />
                  <label
                    htmlFor="imageUpload"
                    className={`flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-200 ${
                      imageUploading
                        ? 'border-blue-300 bg-blue-50 text-blue-700 cursor-not-allowed'
                        : uploadedImage 
                        ? 'border-green-500 bg-green-50 text-green-700' 
                        : 'border-gray-300 text-gray-600 hover:border-gray-400 hover:bg-gray-50'
                    }`}
                  >
                    <span>{imageUploading ? '⏳' : uploadedImage ? '✅' : '🖼️'}</span>
                    <span className="font-medium">
                      {imageUploading ? 'Uploading...' : uploadedImage ? 'Image Added' : 'Add Image'}
                    </span>
                  </label>
                  {uploadedImage && (
                    <button
                      type="button"
                      onClick={removeImage}
                      className="flex items-center gap-2 px-3 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-all duration-200"
                    >
                      <span>🗑️</span>
                      <span className="font-medium">Remove</span>
                    </button>
                  )}
                </div>
                {uploadedImage && (
                  <div className="mt-4">
                    <img
                      src={uploadedImage}
                      alt="Uploaded preview"
                      className="max-w-full sm:max-w-xs max-h-32 object-cover border border-gray-300 rounded-lg shadow-sm"
                    />
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description / Notes</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Add any additional notes or description for this quotation..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={4}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </div>
            </div>
          </div>

          {/* Summary Section */}
          <div className="bg-white px-6 py-8 w-full rounded-xl shadow-sm mt-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
              {/* Discount */}
              <div>
                <label className="block text-sm font-semibold text-blue-700 mb-2 flex items-center gap-1">
                  <span>💸</span> Discount
                </label>
                <div className="flex flex-row items-center gap-2">
                  <div className="flex flex-col flex-1">
                    <div className="flex flex-row gap-2">
                      <input
                        type="number"
                        value={formData.discount}
                        onChange={(e) => setFormData(prev => ({ ...prev, discount: parseFloat(e.target.value) || 0 }))}
                        className="w-24 h-11 px-3 border-2 border-blue-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck={false}
                      />
                      <CustomDropdown
                        options={[
                          { value: '%', label: '%' },
                          { value: 'PKR', label: '(PKR)' },
                        ]}
                        value={formData.discountType}
                        onChange={val => setFormData(prev => ({ ...prev, discountType: val }))}
                        className="w-28 min-w-[72px] mb-1 h-11 border-2 border-blue-100 rounded-lg"
                      />
                    </div>
                    <div className="text-xs text-gray-500 min-h-[24px] mt-1">
                      {formData.discount && !isNaN(Number(formData.discount)) ? (
                        <>
                          Discount: 
                          {formData.discountType === '%'
                            ? `${formData.discount}% = PKR ${(subtotal * formData.discount / 100).toFixed(2)}`
                            : `PKR ${Number(formData.discount).toFixed(2)}`}
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tax */}
              <div>
                <label className="block text-sm font-semibold text-blue-700 mb-2 flex items-center gap-1">
                  <span>🧾</span> Tax
                </label>
                <div className="flex flex-row items-center gap-2">
                  <input
                    type="number"
                    value={formData.tax}
                    onChange={(e) => setFormData(prev => ({ ...prev, tax: e.target.value }))}
                    className="w-24 h-11 px-3 border-2 border-blue-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                  <CustomDropdown
                    options={[
                      { value: '%', label: '%' },
                      { value: 'PKR', label: '(PKR)' },
                    ]}
                    value={formData.taxType}
                    onChange={val => setFormData(prev => ({ ...prev, taxType: val }))}
                    className="w-28 min-w-[72px] mb-1 h-11 border-2 border-blue-100 rounded-lg"
                  />
                </div>
                <div className="text-xs text-gray-500 min-h-[24px] mt-1">
                  {formData.tax && !isNaN(Number(formData.tax)) ? (
                    <>
                      Tax: {formData.tax}% = PKR {((subtotal - (formData.discountType === '%' ? (subtotal * formData.discount / 100) : Number(formData.discount))) * Number(formData.tax) / 100).toFixed(2)}
                    </>
                  ) : null}
                </div>
              </div>

              {/* Payment Type */}
              <div>
                <label className="block text-sm font-semibold text-blue-700 mb-2 flex items-center gap-1">
                  <span>💳</span> Payment Type
                </label>
                <div className="flex flex-col">
                  <CustomDropdown
                    options={[
                      { value: 'Credit', label: 'Credit' },
                      { value: 'Cash', label: 'Cash' },
                    ]}
                    value={formData.paymentType}
                    onChange={val => setFormData(prev => ({ ...prev, paymentType: val }))}
                    className="mb-1 border-2 border-blue-100 rounded-lg h-11"
                  />
                  <div className="text-xs text-gray-500 min-h-[24px] mt-1"></div>
                </div>
              </div>

              {/* Totals */}
              <div className="md:col-span-1 flex flex-col items-end gap-2">
                <div className="bg-gradient-to-r from-blue-100 to-blue-50 border border-blue-200 rounded-xl px-8 py-4 text-right shadow w-full min-w-[220px]">
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>Sub Total</span>
                      <span>PKR {subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>Discount</span>
                      <span>- PKR {(formData.discountType === '%' ? (subtotal * formData.discount / 100) : Number(formData.discount)).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>Tax</span>
                      <span>+ PKR {(formData.taxType === '%' ? ((subtotal - (formData.discountType === '%' ? (subtotal * formData.discount / 100) : Number(formData.discount))) * Number(formData.tax) / 100) : Number(formData.tax)).toFixed(2)}</span>
                    </div>
                    <div className="border-t border-blue-200 my-2"></div>
                    <div className="flex justify-between text-lg font-bold text-blue-900">
                      <span>Grand Total</span>
                      <span>PKR {grandTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
        
        {/* Submit Button */}
        <div className="flex justify-end gap-4 px-6 py-6 bg-gray-50 border-t border-gray-200 w-full">
          <button
            type="button"
            onClick={handleSave}
            disabled={isLoading || !formData.customer.trim()}
            className={`px-8 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2 ${isLoading ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <span>Save</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}