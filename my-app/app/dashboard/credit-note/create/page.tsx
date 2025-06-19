'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

// This would be saved as: /app/dashboard/sale-order/create/page.js or /pages/dashboard/sale-order/create.js
export default function CreateSalesOrderPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    refNo: '1',
    invoiceDate: new Date().toISOString().split('T')[0],
    customer: '',
    phone: '',
    items: [
      { item: '', qty: 1, unit: 'NONE', price: 0, amount: 0 },
      { item: '', qty: 1, unit: 'NONE', price: 0, amount: 0 }
    ],
    description: '',
    image: null,
    discount: 0,
    discountType: '%',
    tax: 'NONE',
    taxAmount: 0
  })
  
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false)
  const [customers, setCustomers] = useState([
    'Customer 1 - 9876543210',
    'Customer 2 - 9876543211', 
    'Customer 3 - 9876543212'
  ])
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [authToken, setAuthToken] = useState('')
  const [isInitialized, setIsInitialized] = useState(false)
  const [showDescription, setShowDescription] = useState(false)
  const [showImage, setShowImage] = useState(false)

  // Unit options
  const unitOptions = ['NONE', 'PCS', 'KG', 'METER', 'LITER', 'BOX', 'DOZEN']
  const taxOptions = ['NONE', 'GST 5%', 'GST 12%', 'GST 18%', 'GST 28%']

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

  // Auth check
  const checkAuth = useCallback(() => {
    if (typeof window === 'undefined') {
      return null;
    }

    const token = localStorage.getItem('token') || localStorage.getItem('vypar_auth_token');
    const userData = localStorage.getItem('user') || localStorage.getItem('vypar_user_session');
    
    if (!token || !userData) {
      console.log('No authentication found, redirecting to home');
      router.push('/');
      return null;
    }

    try {
      const parsedUser = JSON.parse(userData);
      
      if (!parsedUser.id || !parsedUser.email || parsedUser.email === 'demo@vyparr.com') {
        console.log('Invalid or demo user data, redirecting to home');
        router.push('/');
        return null;
      }

      let businessId = parsedUser.businessId;
      if (!businessId) {
        businessId = `biz_${parsedUser.id}_${Date.now()}`;
        parsedUser.businessId = businessId;
        localStorage.setItem('user', JSON.stringify(parsedUser));
        localStorage.setItem('vypar_user_session', JSON.stringify(parsedUser));
        localStorage.setItem('businessId', businessId);
      }
      
      return {
        token,
        user: parsedUser,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };
    } catch (error) {
      console.log('Error parsing user data, redirecting to home');
      router.push('/');
      return null;
    }
  }, [router]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const auth = checkAuth();
      if (auth) {
        setAuthToken(auth.token);
        setIsInitialized(true);
      }
    }
  }, [checkAuth])

  const getBusinessId = useCallback(() => {
    if (typeof window === 'undefined') {
      return null;
    }

    const auth = checkAuth();
    if (auth?.user?.businessId) {
      return auth.user.businessId;
    }
    
    return localStorage.getItem('businessId');
  }, [checkAuth]);

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

  // Calculate totals
  const subtotal = formData.items.reduce((sum, item) => sum + item.amount, 0)
  const discountAmount = formData.discountType === '%' 
    ? (subtotal * formData.discount) / 100 
    : formData.discount
  const totalAfterDiscount = subtotal - discountAmount
  const taxAmount = formData.tax !== 'NONE' 
    ? (totalAfterDiscount * parseInt(formData.tax.split(' ')[1]?.replace('%', '') || '0')) / 100 
    : 0
  const grandTotal = totalAfterDiscount + taxAmount

  // Update item in the form
  const updateItem = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => {
        if (i === index) {
          const updatedItem = { ...item, [field]: value }
          if (field === 'qty' || field === 'price') {
            updatedItem.amount = updatedItem.qty * updatedItem.price
          }
          return updatedItem
        }
        return item
      })
    }))
  }

  // Add new row
  const addRow = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { item: '', qty: 1, unit: 'NONE', price: 0, amount: 0 }]
    }))
  }

  // Remove row
  const removeRow = (index) => {
    if (formData.items.length > 1) {
      setFormData(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
      }))
    }
  }

  // Handle customer selection
  const handleCustomerSelect = (customer) => {
    const [name, phone] = customer.split(' - ')
    setFormData(prev => ({
      ...prev,
      customer: name,
      phone: phone
    }))
    setSearchDropdownOpen(false)
  }

  // Save sales order
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
      const businessId = getBusinessId();
      if (!businessId) {
        setError('Unable to determine business ID');
        setIsLoading(false);
        return;
      }

      const orderPayload = {
        customerName: formData.customer,
        customerPhone: formData.phone,
        items: formData.items.filter(item => item.item.trim() && item.price > 0),
        subtotal: subtotal,
        tax: taxAmount,
        total: grandTotal,
        status: 'Created',
        date: formData.invoiceDate,
        refNo: formData.refNo,
        discount: discountAmount,
        description: formData.description
      };

      // Save to localStorage
      const localStorageKey = `vyparr_sales_orders_${businessId}`;
      const existingOrders = JSON.parse(localStorage.getItem(localStorageKey) || '[]');
      
      const newOrder = {
        ...orderPayload,
        id: `SO-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const updatedOrders = [newOrder, ...existingOrders];
      localStorage.setItem(localStorageKey, JSON.stringify(updatedOrders));

      // Try to sync with API
      try {
        const response = await fetch(`${API_BASE_URL}/sales/orders/${businessId}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(orderPayload)
        });
        
        if (response.ok) {
          console.log('Sales order synced with API successfully');
        }
      } catch (apiError) {
        console.log('API sync failed, but order saved locally:', apiError);
      }

      alert('Sales order created successfully!')
      router.push('/dashboard/sale-order')
    } catch (error) {
      setError('Failed to save sales order')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle share functionality
  const handleShare = () => {
    alert('Share functionality to be implemented')
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <style jsx>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }
      `}</style>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => router.back()}
                className="text-gray-600 hover:text-gray-800"
              >
                ← Back
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Credit-Note
              </h1>
            </div>
          </div>
        </div>

        {/* Main Form */}
        <div className="bg-white rounded-lg shadow-sm p-6">
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

          {/* Customer and Date Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Customer Search */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search by Name/Phone *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.customer}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, customer: e.target.value }))
                    setSearchDropdownOpen(true)
                  }}
                  onFocus={() => setSearchDropdownOpen(true)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Search by Name/Phone"
                />
                <button 
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  onClick={() => setSearchDropdownOpen(!searchDropdownOpen)}
                >
                  ▼
                </button>
                
                {/* Dropdown */}
                {searchDropdownOpen && (
                  <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-lg mt-1 shadow-lg">
                    {customers
                      .filter(customer => 
                        customer.toLowerCase().includes(formData.customer.toLowerCase())
                      )
                      .map((customer, index) => (
                        <button
                          key={index}
                          className="w-full text-left px-4 py-2 hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                          onClick={() => handleCustomerSelect(customer)}
                        >
                          {customer}
                        </button>
                      ))
                    }
                    <button
                      className="w-full text-left px-4 py-2 text-blue-600 hover:bg-gray-50 border-t"
                      onClick={() => {
                        setSearchDropdownOpen(false)
                        // Add new customer logic here
                      }}
                    >
                      + Add New Customer
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Ref No */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ref No.</label>
              <input
                type="text"
                value={formData.refNo}
                onChange={(e) => setFormData(prev => ({ ...prev, refNo: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Invoice Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Date</label>
              <input
                type="date"
                value={formData.invoiceDate}
                onChange={(e) => setFormData(prev => ({ ...prev, invoiceDate: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-8">
            <div className="overflow-x-auto">
              <table className="w-full border border-gray-300 rounded-lg">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 w-12">#</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">ITEM</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 w-20">QTY</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 w-24">UNIT</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 w-32">PRICE/UNIT</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 w-32">AMOUNT</th>
                    <th className="px-4 py-3 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items.map((item, index) => (
                    <tr key={index} className="border-t border-gray-200">
                      <td className="px-4 py-3 text-sm">{index + 1}</td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={item.item}
                          onChange={(e) => updateItem(index, 'item', e.target.value)}
                          className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter item name"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={(e) => updateItem(index, 'qty', parseFloat(e.target.value) || 0)}
                          className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={item.unit}
                          onChange={(e) => updateItem(index, 'unit', e.target.value)}
                          className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          {unitOptions.map(unit => (
                            <option key={unit} value={unit}>{unit}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.price}
                          onChange={(e) => updateItem(index, 'price', parseFloat(e.target.value) || 0)}
                          className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="0.00"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium">₹{item.amount.toFixed(2)}</div>
                      </td>
                      <td className="px-4 py-3">
                        {formData.items.length > 1 && (
                          <button
                            onClick={() => removeRow(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            ✕
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="mt-4">
              <button
                onClick={addRow}
                className="px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
              >
                ADD ROW
              </button>
            </div>

            {/* Total Section */}
            <div className="flex justify-end mt-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-right">
                  <div className="text-2xl font-bold">TOTAL</div>
                  <div className="text-3xl font-bold text-blue-600">₹{grandTotal.toFixed(2)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Left Side - Description and Image */}
            <div className="space-y-4">
              <div>
                <button 
                  onClick={() => setShowDescription(!showDescription)}
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 mb-3"
                  type="button"
                >
                  <span>📝</span>
                  <span>ADD DESCRIPTION</span>
                  <span className={`transform transition-transform ${showDescription ? 'rotate-90' : ''}`}>▶</span>
                </button>
                
                {showDescription && (
                  <div className="mt-3 animate-slideDown">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      rows={4}
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      placeholder="Enter description or terms and conditions..."
                    />
                  </div>
                )}
              </div>
              
              <div>
                <button 
                  onClick={() => setShowImage(!showImage)}
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 mb-3"
                  type="button"
                >
                  <span>📷</span>
                  <span>ADD IMAGE</span>
                  <span className={`transform transition-transform ${showImage ? 'rotate-90' : ''}`}>▶</span>
                </button>
                
                {showImage && (
                  <div className="mt-3 animate-slideDown">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Upload Image</label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setFormData(prev => ({ ...prev, image: e.target.files?.[0] || null }))}
                        className="hidden"
                        id="image-upload"
                      />
                      <label htmlFor="image-upload" className="cursor-pointer">
                        <div className="text-gray-400 mb-2">
                          <span className="text-4xl">📷</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          Click to upload an image
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          PNG, JPG up to 5MB
                        </div>
                      </label>
                      {formData.image && (
                        <div className="mt-3 text-sm text-green-600">
                          Selected: {formData.image.name}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Side - Discount and Tax */}
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <label className="text-sm font-medium text-gray-700">Discount</label>
                <div className="flex items-center space-x-2">
                  <select
                    value={formData.discountType}
                    onChange={(e) => setFormData(prev => ({ ...prev, discountType: e.target.value }))}
                    className="border border-gray-300 rounded px-2 py-1"
                  >
                    <option value="%">%</option>
                    <option value="Rs">Rs</option>
                  </select>
                  <input
                    type="number"
                    min="0"
                    value={formData.discount}
                    onChange={(e) => setFormData(prev => ({ ...prev, discount: parseFloat(e.target.value) || 0 }))}
                    className="w-20 border border-gray-300 rounded px-2 py-1"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <label className="text-sm font-medium text-gray-700">Tax</label>
                <select
                  value={formData.tax}
                  onChange={(e) => setFormData(prev => ({ ...prev, tax: e.target.value }))}
                  className="border border-gray-300 rounded px-3 py-2"
                >
                  {taxOptions.map(tax => (
                    <option key={tax} value={tax}>{tax}</option>
                  ))}
                </select>
                <span className="text-sm text-gray-600">₹{taxAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4">
            <button
              onClick={handleShare}
              className="px-6 py-3 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors flex items-center space-x-2"
            >
              <span>Share</span>
              <span>▼</span>
            </button>
            
            <button
              onClick={handleSave}
              disabled={isLoading || !formData.customer.trim()}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}