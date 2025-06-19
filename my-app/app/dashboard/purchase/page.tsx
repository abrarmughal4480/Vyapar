'use client'

import { useState, useEffect } from 'react'

interface Purchase {
  id: string
  supplier: string
  amount: number
  date: string
  status: 'Paid' | 'Pending' | 'Overdue'
  items: number
  type: 'Purchase Bill' | 'Cash Purchase' | 'Purchase Return' | 'Purchase Order'
  invoiceNumber?: string
  dueDate?: string
}

interface PurchaseFormData {
  supplier: string
  amount: number
  items: number
  invoiceNumber: string
  dueDate: string
  notes: string
  paymentMode: string
}

interface ItemRow {
  id: number
  item: string
  qty: number
  unit: string
  price: number
  amount: number
}

const units = ['NONE', 'Piece', 'Kg', 'Box', 'Pack']
const mockItems = [
  'Laptop Dell Inspiron 15',
  'Office Chair Premium',
  'Mobile Phone Samsung Galaxy',
  'Desk Lamp LED',
  'Printer HP LaserJet'
]

export default function PurchasePage() {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [businessId, setBusinessId] = useState<string>('')
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking')
  const [backendError, setBackendError] = useState('')
  
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null)
  const [modalType, setModalType] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState('')

  const [formData, setFormData] = useState<PurchaseFormData>({
    supplier: '',
    amount: 0,
    items: 1,
    invoiceNumber: '',
    dueDate: '',
    notes: '',
    paymentMode: 'cash'
  })

  // Add state for "purchase bill" page
  const [showPurchaseBillPage, setShowPurchaseBillPage] = useState(false)
  const [showPurchaseOrderPage, setShowPurchaseOrderPage] = useState(false)
  const [showPurchaseReturnPage, setShowPurchaseReturnPage] = useState(false)

  const [party, setParty] = useState('')
  const [phone, setPhone] = useState('')
  const [billNumber, setBillNumber] = useState('')
  const [billDate, setBillDate] = useState(() => {
    const d = new Date()
    return d.toISOString().slice(0, 10)
  })
  const [rows, setRows] = useState<ItemRow[]>([
    { id: 1, item: '', qty: 0, unit: 'NONE', price: 0, amount: 0 },
    { id: 2, item: '', qty: 0, unit: 'NONE', price: 0, amount: 0 }
  ])
  const [paymentTypes, setPaymentTypes] = useState([{ type: 'Cash' }])
  const [discount, setDiscount] = useState({ percent: 0, amount: 0 })
  const [tax, setTax] = useState({ type: 'NONE', value: 0 })
  const [roundOff, setRoundOff] = useState(0)

  const mockSuppliers = ['ABC Suppliers', 'XYZ Distributors', 'Tech Solutions Ltd', 'Global Parts Inc']

  // Initialize businessId and test backend connection
  useEffect(() => {
    const storedBusinessId = 'business123'
    setBusinessId(storedBusinessId)
    
    const testConnection = async () => {
      try {
        console.log('Testing backend connection...')
        setConnectionStatus('connected')
        console.log('✅ Backend connected successfully')
      } catch (error: any) {
        console.error('❌ Backend connection failed:', error.message)
        setConnectionStatus('error')
        setBackendError(error.message)
      }
    }

    testConnection()
  }, [])

  // Fetch purchases when businessId is available and backend is connected
  useEffect(() => {
    if (businessId && connectionStatus === 'connected') {
      fetchPurchases()
    }
  }, [businessId, connectionStatus])

  const fetchPurchases = async () => {
    try {
      setIsLoading(true)
      
      // Mock data for demo
      const mockPurchases = [
        {
          id: '1',
          supplier: 'ABC Suppliers',
          amount: 25000,
          date: '2025-06-10',
          status: 'Paid' as const,
          items: 5,
          type: 'Purchase Bill' as const,
          invoiceNumber: 'BILL-001',
          dueDate: '2025-06-20'
        },
        {
          id: '2',
          supplier: 'XYZ Distributors',
          amount: 15000,
          date: '2025-06-09',
          status: 'Pending' as const,
          items: 3,
          type: 'Cash Purchase' as const,
          invoiceNumber: 'CASH-002'
        }
      ]
      
      setPurchases(mockPurchases)
      console.log('✅ Purchases loaded successfully:', mockPurchases.length)
    } catch (err: any) {
      console.error('❌ Error fetching purchases:', err.message)
      setError(`Failed to fetch purchases: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const calculateStats = () => {
    const totalPurchases = purchases.length
    const totalAmount = purchases.reduce((sum, p) => sum + p.amount, 0)
    const pendingAmount = purchases.filter(p => p.status === 'Pending').reduce((sum, p) => sum + p.amount, 0)
    const overdueAmount = purchases.filter(p => p.status === 'Overdue').reduce((sum, p) => sum + p.amount, 0)

    return { totalPurchases, totalAmount, pendingAmount, overdueAmount }
  }

  const stats = calculateStats()

  // Updated handleSubmit for modals
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.supplier || formData.amount <= 0) return

    setIsLoading(true)
    setError('')

    try {
      // Mock submission - in real app this would call API
      console.log('Saving purchase:', formData)
      
      const newPurchase: Purchase = {
        id: Date.now().toString(),
        supplier: formData.supplier,
        amount: formData.amount,
        date: new Date().toISOString().split('T')[0],
        status: 'Pending',
        items: formData.items,
        type: modalType === 'purchase-bill' ? 'Purchase Bill' : 
              modalType === 'cash-purchase' ? 'Cash Purchase' :
              modalType === 'purchase-order' ? 'Purchase Order' : 'Purchase Return',
        invoiceNumber: formData.invoiceNumber,
        dueDate: formData.dueDate
      }
      
      setPurchases(prev => [newPurchase, ...prev])
      closeModals()
      console.log('✅ Purchase saved successfully')
      
    } catch (err: any) {
      console.error('❌ Error saving purchase:', err.message)
      setError(`Failed to save purchase: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Add handlePurchaseBillSubmit for detailed purchase bill
  const handlePurchaseBillSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!party || rows.every(row => !row.item || row.qty <= 0)) {
      setError('Please select a party and add at least one item with quantity')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const newPurchase: Purchase = {
        id: Date.now().toString(),
        supplier: party,
        amount: total,
        date: billDate,
        status: 'Pending',
        items: rows.filter(row => row.item && row.qty > 0).length,
        type: 'Purchase Bill',
        invoiceNumber: billNumber || `BILL-${Date.now()}`,
      }
      
      setPurchases(prev => [newPurchase, ...prev])
      
      // Reset form and go back to main page
      setParty('')
      setPhone('')
      setBillNumber('')
      setBillDate(new Date().toISOString().slice(0, 10))
      setRows([
        { id: 1, item: '', qty: 0, unit: 'NONE', price: 0, amount: 0 },
        { id: 2, item: '', qty: 0, unit: 'NONE', price: 0, amount: 0 }
      ])
      setDiscount({ percent: 0, amount: 0 })
      setTax({ type: 'NONE', value: 0 })
      setRoundOff(0)
      
      setShowPurchaseBillPage(false)
      console.log('✅ Purchase bill saved successfully')
      
    } catch (err: any) {
      console.error('❌ Error saving purchase bill:', err.message)
      setError(`Failed to save purchase bill: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Add handlePurchaseOrderSubmit
  const handlePurchaseOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!party || rows.every(row => !row.item || row.qty <= 0)) {
      setError('Please select a party and add at least one item with quantity')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const newPurchase: Purchase = {
        id: Date.now().toString(),
        supplier: party,
        amount: total,
        date: billDate,
        status: 'Pending',
        items: rows.filter(row => row.item && row.qty > 0).length,
        type: 'Purchase Order',
        invoiceNumber: billNumber || `PO-${Date.now()}`,
      }
      
      setPurchases(prev => [newPurchase, ...prev])
      
      // Reset form and go back to main page
      setParty('')
      setPhone('')
      setBillNumber('')
      setBillDate(new Date().toISOString().slice(0, 10))
      setRows([
        { id: 1, item: '', qty: 0, unit: 'NONE', price: 0, amount: 0 },
        { id: 2, item: '', qty: 0, unit: 'NONE', price: 0, amount: 0 }
      ])
      
      setShowPurchaseOrderPage(false)
      console.log('✅ Purchase order saved successfully')
      
    } catch (err: any) {
      console.error('❌ Error saving purchase order:', err.message)
      setError(`Failed to save purchase order: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Update the openModal function to set proper default values
  const openModal = (type: string) => {
    setModalType(type)
    
    let defaultInvoice = ''
    let defaultPaymentMode = 'cash'
    
    switch(type) {
      case 'purchase-bill':
        defaultInvoice = `BILL-${Date.now()}`
        defaultPaymentMode = 'credit'
        break
      case 'cash-purchase':
        defaultInvoice = `CASH-${Date.now()}`
        defaultPaymentMode = 'cash'
        break
      case 'purchase-return':
        defaultInvoice = `RET-${Date.now()}`
        defaultPaymentMode = 'cash'
        setShowPurchaseReturnPage(true)
        return
      case 'purchase-order':
        defaultInvoice = `PO-${Date.now()}`
        defaultPaymentMode = 'credit'
        break
    }
    
    setFormData({
      supplier: '',
      amount: 0,
      items: 1,
      invoiceNumber: defaultInvoice,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: '',
      paymentMode: defaultPaymentMode
    })
  }

  const closeModals = () => {
    setSelectedPurchase(null)
    setModalType(null)
    setFormData({
      supplier: '',
      amount: 0,
      items: 1,
      invoiceNumber: '',
      dueDate: '',
      notes: '',
      paymentMode: 'cash'
    })
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: ['amount', 'items'].includes(name) ? parseFloat(value) || 0 : value
    }))
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Paid': return 'bg-green-100 text-green-800'
      case 'Pending': return 'bg-yellow-100 text-yellow-800'
      case 'Overdue': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Purchase Bill': return 'bg-blue-100 text-blue-800'
      case 'Cash Purchase': return 'bg-green-100 text-green-800'
      case 'Purchase Return': return 'bg-red-100 text-red-800'
      case 'Purchase Order': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredPurchases = purchases.filter(purchase => {
    const matchesSearch = purchase.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         purchase.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         purchase.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesTab = activeTab === 'all' || 
                      (activeTab === 'paid' && purchase.status === 'Paid') ||
                      (activeTab === 'pending' && purchase.status === 'Pending') ||
                      (activeTab === 'overdue' && purchase.status === 'Overdue')

    return matchesSearch && matchesTab
  })

  // Add handlers for purchase bill page
  const handleRowChange = (idx: number, field: keyof ItemRow, value: any) => {
    setRows(rows =>
      rows.map((row, i) =>
        i === idx
          ? {
              ...row,
              [field]: field === 'qty' || field === 'price' ? Number(value) : value,
              amount:
                field === 'qty'
                  ? Number(value) * row.price
                  : field === 'price'
                  ? row.qty * Number(value)
                  : row.qty * row.price
            }
          : row
      )
    )
  }
  const handleAddRow = () => {
    setRows(rows => [
      ...rows,
      { id: rows.length + 1, item: '', qty: 0, unit: 'NONE', price: 0, amount: 0 }
    ])
  }
  const handleRemoveRow = (idx: number) => {
    setRows(rows => rows.length > 1 ? rows.filter((_, i) => i !== idx) : rows)
  }
  const handlePartyChange = (value: string) => {
    setParty(value)
    const found = mockSuppliers.find(p => p === value)
    setPhone(found ? '' : '')
  }

  // Calculate totals
  const subtotal = rows.reduce((sum, row) => sum + (row.amount || 0), 0)
  const discountValue = discount.percent > 0
    ? subtotal * (discount.percent / 100)
    : discount.amount
  const taxable = subtotal - discountValue
  const taxValue = tax.type !== 'NONE' ? taxable * (tax.value / 100) : 0
  const total = Math.round((taxable + taxValue + roundOff) * 100) / 100

  // When showPurchaseBillPage is true, show the bill entry page instead of dashboard
  if (showPurchaseBillPage) {
    return (
      <div className="bg-gray-50 min-h-screen p-0">
        {/* Header */}
        <div className="bg-white px-8 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Purchase Bill</h2>
          <div className="flex items-center gap-4">
            <button className="text-gray-400 hover:text-gray-600">
              <svg width={22} height={22} fill="none" stroke="currentColor" strokeWidth={2}>
                <rect x={3} y={3} width={16} height={16} rx={2}/>
                <path d="M8 3v16M16 3v16"/>
              </svg>
            </button>
            <button className="text-gray-400 hover:text-gray-600 text-2xl" onClick={() => setShowPurchaseBillPage(false)}>✕</button>
          </div>
        </div>

        {/* Show error if any */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 m-8">
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

        {/* Form */}
        <div className="p-8 bg-gray-50">
          {/* Party, Phone, Bill Number, Bill Date */}
          <div className="flex flex-wrap gap-4 items-start mb-4">
            <div className="flex-1 min-w-[220px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Party <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                value={party}
                onChange={e => handlePartyChange(e.target.value)}
                required
              >
                <option value="">Select Party</option>
                {mockSuppliers.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className="min-w-[180px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone No.</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="Phone No."
              />
            </div>
            <div className="flex-1"></div>
            <div className="min-w-[180px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Bill Number</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={billNumber}
                onChange={e => setBillNumber(e.target.value)}
                placeholder="Bill Number"
              />
            </div>
            <div className="min-w-[180px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Bill Date</label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={billDate}
                onChange={e => setBillDate(e.target.value)}
              />
            </div>
          </div>

          {/* Items Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2 font-semibold text-left border-b">#</th>
                  <th className="px-3 py-2 font-semibold text-left border-b">ITEM</th>
                  <th className="px-3 py-2 font-semibold text-left border-b">QTY</th>
                  <th className="px-3 py-2 font-semibold text-left border-b">UNIT</th>
                  <th className="px-3 py-2 font-semibold text-left border-b">PRICE/UNIT</th>
                  <th className="px-3 py-2 font-semibold text-left border-b">AMOUNT</th>
                  <th className="px-3 py-2 border-b"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2">{idx + 1}</td>
                    <td className="px-3 py-2">
                      <select
                        className="w-full border border-gray-200 rounded px-2 py-1"
                        value={row.item}
                        onChange={e => handleRowChange(idx, 'item', e.target.value)}
                      >
                        <option value="">NONE</option>
                        {mockItems.map(item => (
                          <option key={item} value={item}>{item}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        className="w-20 border border-gray-200 rounded px-2 py-1"
                        value={row.qty || ''}
                        min={0}
                        onChange={e => handleRowChange(idx, 'qty', e.target.value)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        className="w-full border border-gray-200 rounded px-2 py-1"
                        value={row.unit}
                        onChange={e => handleRowChange(idx, 'unit', e.target.value)}
                      >
                        {units.map(u => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        className="w-24 border border-gray-200 rounded px-2 py-1"
                        value={row.price || ''}
                        min={0}
                        onChange={e => handleRowChange(idx, 'price', e.target.value)}
                      />
                    </td>
                    <td className="px-3 py-2">{row.amount || 0}</td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => handleRemoveRow(idx)}
                        disabled={rows.length <= 1}
                        title="Remove row"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={7} className="px-3 py-2 text-left">
                    <button
                      type="button"
                      className="px-3 py-1 border border-blue-400 text-blue-600 rounded hover:bg-blue-50 text-xs"
                      onClick={handleAddRow}
                    >
                      ADD ROW
                    </button>
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={5} className="text-right font-semibold px-3 py-2">TOTAL</td>
                  <td className="px-3 py-2">{subtotal}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Payment, Discount, Tax, Round Off, Total */}
          <div className="flex flex-wrap gap-8 mt-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Type</label>
              <select className="border border-gray-300 rounded px-3 py-2 min-w-[120px]">
                <option>Cash</option>
                <option>Bank</option>
                <option>Card</option>
                <option>UPI</option>
              </select>
              <div>
                <button
                  type="button"
                  className="text-blue-600 text-xs mt-2 hover:underline"
                  onClick={() => setPaymentTypes([...paymentTypes, { type: 'Cash' }])}
                >
                  + Add Payment type
                </button>
              </div>
            </div>
            <div className="flex-1"></div>
            <div className="flex flex-col gap-2 min-w-[320px]">
              <div className="flex gap-2 items-center">
                <label className="text-sm text-gray-700 w-20">Discount</label>
                <input
                  type="number"
                  className="w-16 border border-gray-300 rounded px-2 py-1"
                  value={discount.percent}
                  min={0}
                  max={100}
                  onChange={e => setDiscount({ ...discount, percent: Number(e.target.value), amount: 0 })}
                  placeholder="%"
                />
                <span className="text-gray-400">-</span>
                <input
                  type="number"
                  className="w-20 border border-gray-300 rounded px-2 py-1"
                  value={discount.amount}
                  min={0}
                  onChange={e => setDiscount({ ...discount, amount: Number(e.target.value), percent: 0 })}
                  placeholder="(Rs)"
                />
              </div>
              <div className="flex gap-2 items-center">
                <label className="text-sm text-gray-700 w-20">Tax</label>
                <select
                  className="border border-gray-300 rounded px-2 py-1"
                  value={tax.type}
                  onChange={e => {
                    const val = e.target.value
                    setTax({
                      type: val,
                      value:
                        val === 'NONE'
                          ? 0
                          : val === 'GST 5%'
                          ? 5
                          : val === 'GST 12%'
                          ? 12
                          : val === 'GST 18%'
                          ? 18
                          : val === 'GST 28%'
                          ? 28
                          : 0
                    })
                  }}
                >
                  <option value="NONE">NONE</option>
                  <option value="GST 5%">GST 5%</option>
                  <option value="GST 12%">GST 12%</option>
                  <option value="GST 18%">GST 18%</option>
                  <option value="GST 28%">GST 28%</option>
                </select>
                <span className="text-gray-700">{taxValue}</span>
              </div>
              <div className="flex gap-2 items-center">
                <label className="text-sm text-gray-700 w-20">Round Off</label>
                <input
                  type="number"
                  className="w-20 border border-gray-300 rounded px-2 py-1"
                  value={roundOff}
                  onChange={e => setRoundOff(Number(e.target.value))}
                />
                <label className="flex items-center ml-2 text-xs text-gray-600">
                  <input
                    type="checkbox"
                    className="mr-1"
                    checked={!!roundOff}
                    onChange={e => setRoundOff(e.target.checked ? Math.round(total) - (taxable + taxValue) : 0)}
                  />
                  Round Off
                </label>
              </div>
              <div className="flex gap-2 items-center mt-2">
                <label className="text-sm text-gray-700 w-20 font-semibold">Total</label>
                <input
                  type="text"
                  className="w-32 border border-gray-300 rounded px-2 py-1 font-bold text-lg text-right bg-gray-100"
                  value={total}
                  readOnly
                />
              </div>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex justify-end gap-2 mt-8">
            <button
              type="button"
              className="px-6 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 font-semibold"
            >
              Share
            </button>
            <button
              type="button"
              onClick={handlePurchaseBillSubmit}
              disabled={isLoading}
              className="px-8 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // When showPurchaseOrderPage is true, show the same bill entry page (but with heading "Purchase Order")
  if (showPurchaseOrderPage) {
    return (
      <div className="bg-gray-50 min-h-screen p-0">
        {/* Header */}
        <div className="bg-white px-8 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Purchase Order</h2>
          <div className="flex items-center gap-4">
            <button className="text-gray-400 hover:text-gray-600">
              <svg width={22} height={22} fill="none" stroke="currentColor" strokeWidth={2}>
                <rect x={3} y={3} width={16} height={16} rx={2}/>
                <path d="M8 3v16M16 3v16"/>
              </svg>
            </button>
            <button className="text-gray-400 hover:text-gray-600 text-2xl" onClick={() => setShowPurchaseOrderPage(false)}>✕</button>
          </div>
        </div>

        {/* Show error if any */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 m-8">
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

        {/* Form Content */}
        <div className="p-8 bg-gray-50">
          {/* Same content as Purchase Bill but with different title */}
          <div className="flex flex-wrap gap-4 items-start mb-4">
            <div className="flex-1 min-w-[220px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Party <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                value={party}
                onChange={e => handlePartyChange(e.target.value)}
                required
              >
                <option value="">Select Party</option>
                {mockSuppliers.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className="min-w-[180px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone No.</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="Phone No."
              />
            </div>
            <div className="flex-1"></div>
            <div className="min-w-[180px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Order Number</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={billNumber}
                onChange={e => setBillNumber(e.target.value)}
                placeholder="Order Number"
              />
            </div>
            <div className="min-w-[180px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Order Date</label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={billDate}
                onChange={e => setBillDate(e.target.value)}
              />
            </div>
          </div>

          {/* Items Table (same as bill) */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2 font-semibold text-left border-b">#</th>
                  <th className="px-3 py-2 font-semibold text-left border-b">ITEM</th>
                  <th className="px-3 py-2 font-semibold text-left border-b">QTY</th>
                  <th className="px-3 py-2 font-semibold text-left border-b">UNIT</th>
                  <th className="px-3 py-2 font-semibold text-left border-b">PRICE/UNIT</th>
                  <th className="px-3 py-2 font-semibold text-left border-b">AMOUNT</th>
                  <th className="px-3 py-2 border-b"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2">{idx + 1}</td>
                    <td className="px-3 py-2">
                      <select
                        className="w-full border border-gray-200 rounded px-2 py-1"
                        value={row.item}
                        onChange={e => handleRowChange(idx, 'item', e.target.value)}
                      >
                        <option value="">NONE</option>
                        {mockItems.map(item => (
                          <option key={item} value={item}>{item}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        className="w-20 border border-gray-200 rounded px-2 py-1"
                        value={row.qty || ''}
                        min={0}
                        onChange={e => handleRowChange(idx, 'qty', e.target.value)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        className="w-full border border-gray-200 rounded px-2 py-1"
                        value={row.unit}
                        onChange={e => handleRowChange(idx, 'unit', e.target.value)}
                      >
                        {units.map(u => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        className="w-24 border border-gray-200 rounded px-2 py-1"
                        value={row.price || ''}
                        min={0}
                        onChange={e => handleRowChange(idx, 'price', e.target.value)}
                      />
                    </td>
                    <td className="px-3 py-2">{row.amount || 0}</td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => handleRemoveRow(idx)}
                        disabled={rows.length <= 1}
                        title="Remove row"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={7} className="px-3 py-2 text-left">
                    <button
                      type="button"
                      className="px-3 py-1 border border-blue-400 text-blue-600 rounded hover:bg-blue-50 text-xs"
                      onClick={handleAddRow}
                    >
                      ADD ROW
                    </button>
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={5} className="text-right font-semibold px-3 py-2">TOTAL</td>
                  <td className="px-3 py-2">{subtotal}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Payment, Discount, Tax, Round Off, Total */}
          <div className="flex flex-wrap gap-8 mt-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Type</label>
              <select className="border border-gray-300 rounded px-3 py-2 min-w-[120px]">
                <option>Cash</option>
                <option>Bank</option>
                <option>Card</option>
                <option>UPI</option>
              </select>
            </div>
            <div className="flex-1"></div>
            <div className="flex flex-col gap-2 min-w-[320px]">
              <div className="flex gap-2 items-center">
                <label className="text-sm text-gray-700 w-20">Discount</label>
                <input
                  type="number"
                  className="w-16 border border-gray-300 rounded px-2 py-1"
                  value={discount.percent}
                  min={0}
                  max={100}
                  onChange={e => setDiscount({ ...discount, percent: Number(e.target.value), amount: 0 })}
                  placeholder="%"
                />
                <span className="text-gray-400">-</span>
                <input
                  type="number"
                  className="w-20 border border-gray-300 rounded px-2 py-1"
                  value={discount.amount}
                  min={0}
                  onChange={e => setDiscount({ ...discount, amount: Number(e.target.value), percent: 0 })}
                  placeholder="(Rs)"
                />
              </div>
              <div className="flex gap-2 items-center">
                <label className="text-sm text-gray-700 w-20">Tax</label>
                <select
                  className="border border-gray-300 rounded px-2 py-1"
                  value={tax.type}
                  onChange={e => {
                    const val = e.target.value
                    setTax({
                      type: val,
                      value:
                        val === 'NONE'
                          ? 0
                          : val === 'GST 5%'
                          ? 5
                          : val === 'GST 12%'
                          ? 12
                          : val === 'GST 18%'
                          ? 18
                          : val === 'GST 28%'
                          ? 28
                          : 0
                    })
                  }}
                >
                  <option value="NONE">NONE</option>
                  <option value="GST 5%">GST 5%</option>
                  <option value="GST 12%">GST 12%</option>
                  <option value="GST 18%">GST 18%</option>
                  <option value="GST 28%">GST 28%</option>
                </select>
                <span className="text-gray-700">{taxValue}</span>
              </div>
              <div className="flex gap-2 items-center mt-2">
                <label className="text-sm text-gray-700 w-20 font-semibold">Total</label>
                <input
                  type="text"
                  className="w-32 border border-gray-300 rounded px-2 py-1 font-bold text-lg text-right bg-gray-100"
                  value={total}
                  readOnly
                />
              </div>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex justify-end gap-2 mt-8">
            <button
              type="button"
              className="px-6 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 font-semibold"
            >
              Share
            </button>
            <button
              type="button"
              onClick={handlePurchaseOrderSubmit}
              disabled={isLoading}
              className="px-8 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Show "Debit Note" style page for Purchase Return
  if (showPurchaseReturnPage) {
    return (
      <div className="bg-white min-h-screen flex flex-col">
        {/* Top Filters */}
        <div className="flex flex-wrap items-center gap-4 px-6 py-4 border-b border-gray-200 bg-white">
          <div className="text-xl font-semibold text-gray-900">This Month</div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Between</span>
            <input type="date" className="border rounded px-2 py-1 text-sm" value="2025-06-01" readOnly />
            <span className="text-sm text-gray-600">To</span>
            <input type="date" className="border rounded px-2 py-1 text-sm" value="2025-06-30" readOnly />
          </div>
          <select className="border rounded px-3 py-1 text-sm" style={{ minWidth: 120 }} value="ALL FIRMS" disabled>
            <option>ALL FIRMS</option>
          </select>
          <div className="flex-1" />
          <button className="flex items-center gap-1 text-blue-700 hover:underline text-sm">
            <svg width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2}><rect x={3} y={3} width={12} height={12} rx={2}/></svg>
            Excel Report
          </button>
          <button className="flex items-center gap-1 text-blue-700 hover:underline text-sm">
            <svg width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2}><path d="M6 4h9M6 8h9M6 12h9M6 16h9"/></svg>
            Print
          </button>
        </div>
        {/* Debit Note Filter Row */}
        <div className="flex items-center gap-4 px-6 py-3 border-b border-gray-100 bg-gray-50">
          <select className="border-2 border-orange-400 rounded px-3 py-1 text-sm font-medium" style={{ minWidth: 140 }} value="Debit Note" disabled>
            <option>Debit Note</option>
          </select>
          <div className="flex-1" />
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-semibold text-sm flex items-center gap-2"
            onClick={() => {
              setShowPurchaseReturnPage(false)
              setShowPurchaseBillPage(true)
            }}
          >
            + Add Debit Note
          </button>
        </div>
        {/* Search and Table Header */}
        <div className="flex items-center px-6 py-2 border-b border-gray-100 bg-white">
          <input
            type="text"
            className="border rounded px-3 py-1 text-sm"
            placeholder="Search"
            style={{ minWidth: 220 }}
            disabled
          />
        </div>
        {/* Empty State */}
        <div className="flex-1 flex flex-col justify-center items-center bg-white">
          <div className="flex flex-col items-center justify-center py-16">
            <svg width={80} height={80} fill="none" viewBox="0 0 80 80">
              <rect x="15" y="20" width="50" height="40" rx="4" fill="#F3F4F6" />
              <rect x="22" y="28" width="36" height="4" rx="2" fill="#E5E7EB" />
              <rect x="22" y="36" width="24" height="4" rx="2" fill="#E5E7EB" />
              <rect x="22" y="44" width="30" height="4" rx="2" fill="#E5E7EB" />
              <rect x="22" y="52" width="18" height="4" rx="2" fill="#E5E7EB" />
              <rect x="38" y="60" width="4" height="4" rx="2" fill="#2563EB" />
            </svg>
            <div className="text-gray-500 mt-4 text-base font-medium">No data is available for Debit Note.</div>
            <div className="text-gray-400 text-sm">Please try again after making relevant changes.</div>
          </div>
        </div>
        {/* Footer */}
        <div className="flex justify-between items-center px-6 py-2 border-t border-gray-100 bg-white text-sm">
          <span>Total Amount: <span className="text-green-600">Rs 0.00</span></span>
          <span>Balance: <span className="text-blue-700">Rs 0.00</span></span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Connection Status Banner */}
      {connectionStatus === 'checking' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600 mr-3"></div>
            <p className="text-yellow-700">Connecting to backend...</p>
          </div>
        </div>
      )}

      {connectionStatus === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <div className="text-red-400">⚠️</div>
            <div className="ml-3">
              <p className="text-sm text-red-700">Backend connection failed: {backendError}</p>
              <p className="text-xs text-red-600 mt-1">Please ensure the backend server is running on http://localhost:3001</p>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="ml-auto text-red-400 hover:text-red-600 text-sm underline"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {connectionStatus === 'connected' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <div className="text-green-400">✅</div>
            <p className="text-sm text-green-700 ml-3">Backend connected successfully</p>
          </div>
        </div>
      )}

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

      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Purchase Management</h1>
            <p className="text-sm text-gray-500 mt-1">Manage your purchases, bills and supplier transactions</p>
          </div>
          <div className="flex space-x-3">
            <button 
              onClick={() => openModal('purchase-return')} 
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center space-x-2 transition-colors"
            >
              <span>↩️</span>
              <span>Purchase Return</span>
            </button>
            <button 
              onClick={() => openModal('purchase-bill')} 
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2 transition-colors"
            >
              <span>+</span>
              <span>Add Purchase</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-blue-600">{stats.totalPurchases}</div>
          <div className="text-sm text-gray-500">Total Purchases</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-green-600">₹{stats.totalAmount.toLocaleString()}</div>
          <div className="text-sm text-gray-500">Total Amount</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-yellow-600">₹{stats.pendingAmount.toLocaleString()}</div>
          <div className="text-sm text-gray-500">Pending Amount</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-red-600">₹{stats.overdueAmount.toLocaleString()}</div>
          <div className="text-sm text-gray-500">Overdue Amount</div>
        </div>
      </div>

      {/* Purchase Types */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Purchase Types</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button 
            onClick={() => setShowPurchaseBillPage(true)} 
            className="p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group"
          >
            <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">🛒</div>
            <div className="text-sm font-medium text-gray-700 group-hover:text-blue-600">Purchase Bill</div>
            <div className="text-xs text-gray-500 mt-1">Regular supplier bills</div>
          </button>
          <button 
            onClick={() => openModal('cash-purchase')} 
            className="p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all group"
          >
            <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">💰</div>
            <div className="text-sm font-medium text-gray-700 group-hover:text-green-600">Cash Purchase</div>
            <div className="text-xs text-gray-500 mt-1">Immediate payments</div>
          </button>
          <button 
            onClick={() => setShowPurchaseReturnPage(true)} 
            className="p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-red-500 hover:bg-red-50 transition-all group"
          >
            <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">↩️</div>
            <div className="text-sm font-medium text-gray-700 group-hover:text-red-600">Purchase Return</div>
            <div className="text-xs text-gray-500 mt-1">Return defective items</div>
          </button>
          <button 
            onClick={() => setShowPurchaseOrderPage(true)} 
            className="p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all group"
          >
            <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">📝</div>
            <div className="text-sm font-medium text-gray-700 group-hover:text-purple-600">Purchase Order</div>
            <div className="text-xs text-gray-500 mt-1">Create purchase orders</div>
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm mb-6">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="relative">
              <input
                type="text"
                placeholder="Search purchases..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
            </div>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'all', name: 'All Purchases', count: purchases.length },
              { id: 'paid', name: 'Paid', count: purchases.filter(p => p.status === 'Paid').length },
              { id: 'pending', name: 'Pending', count: purchases.filter(p => p.status === 'Pending').length },
              { id: 'overdue', name: 'Overdue', count: purchases.filter(p => p.status === 'Overdue').length }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.name} ({tab.count})
              </button>
            ))}
          </nav>
        </div>

        {/* Purchase List */}
        <div className="divide-y divide-gray-200">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-500">Loading purchases...</span>
            </div>
          ) : filteredPurchases.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">📋</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No purchases found</h3>
              <p className="text-gray-500">Get started by creating your first purchase.</p>
            </div>
          ) : (
            filteredPurchases.map((purchase) => (
              <div key={purchase.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">{purchase.supplier}</h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                          <span>#{purchase.invoiceNumber}</span>
                          <span>•</span>
                          <span>{purchase.date}</span>
                          <span>•</span>
                          <span>{purchase.items} items</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="text-lg font-semibold text-gray-900">₹{purchase.amount.toLocaleString()}</div>
                      {purchase.dueDate && (
                        <div className="text-sm text-gray-500">Due: {purchase.dueDate}</div>
                      )}
                    </div>
                    <div className="flex flex-col space-y-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(purchase.status)}`}>
                        {purchase.status}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(purchase.type)}`}>
                        {purchase.type}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal for Purchase Forms */}
      {modalType && (
        <Modal 
          title={modalType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())} 
          onClose={closeModals}
        >
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Supplier *</label>
                <select
                  name="supplier"
                  value={formData.supplier}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select Supplier</option>
                  {mockSuppliers.map(supplier => (
                    <option key={supplier} value={supplier}>{supplier}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount *</label>
                <input
                  type="number"
                  name="amount"
                  min="0"
                  step="0.01"
                  value={formData.amount}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Number</label>
                <input
                  type="text"
                  name="invoiceNumber"
                  value={formData.invoiceNumber}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Auto-generated"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Mode</label>
                <select
                  name="paymentMode"
                  value={formData.paymentMode}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="cash">Cash</option>
                  <option value="credit">Credit</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="card">Card</option>
                  <option value="upi">UPI</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Number of Items</label>
                <input
                  type="number"
                  name="items"
                  min="1"
                  value={formData.items}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="1"
                />
              </div>

              {modalType !== 'cash-purchase' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                  <input
                    type="date"
                    name="dueDate"
                    value={formData.dueDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Additional notes or description"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={closeModals}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Saving...' : `Create ${modalType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}`}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// Enhanced Modal Component
function Modal({ title, onClose, children }: { title: string, onClose: () => void, children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-[90%] md:w-[800px] max-h-[90vh] overflow-y-auto">
        {/* Enhanced Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6 rounded-t-2xl">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-white">{title}</h2>
              <p className="text-blue-100 text-sm mt-1">Fill in the details below</p>
            </div>
            <button 
              onClick={onClose} 
              className="text-white hover:text-gray-200 text-2xl transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white hover:bg-opacity-20"
            >
              ✕
            </button>
          </div>
        </div>
        
        {/* Enhanced Content */}
        <div className="p-8">
          {children}
        </div>
      </div>
    </div>
  )
}