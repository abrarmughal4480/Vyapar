"use client";
import React, { useState } from 'react';
import { Plus, MoreVertical, Search, Filter, Download, X, ChevronDown, Calendar, Share2, Save, Info, Camera } from 'lucide-react';

// Purchase Form Page Component
function PurchaseFormPage({ onClose, onSave }: { onClose: () => void; onSave?: (data: any) => void }) {
  const [formData, setFormData] = useState({
    billNumber: 'Purchase #1',
    billDate: '19/06/2025',
    party: '',
    phoneNo: '',
    paymentType: 'Cash',
    discount: { percentage: '', amount: '' },
    tax: 'NONE',
    taxAmount: 0,
    description: '',
    images: []
  });

  const [items, setItems] = useState([
    { id: 1, category: 'ALL', item: '', itemCode: '', qty: '', unit: 'NONE', price: '', amount: 0 },
    { id: 2, category: 'ALL', item: '', itemCode: '', qty: '', unit: 'NONE', price: '', amount: 0 }
  ]);

  const [showPartyDropdown, setShowPartyDropdown] = useState(false);
  const [parties] = useState([
    { name: 'manaN', phone: '2345678', balance: '4556864' }
  ]);

  const addRow = () => {
    const newRow = {
      id: items.length + 1,
      category: 'ALL',
      item: '',
      itemCode: '',
      qty: '',
      unit: 'NONE',
      price: '',
      amount: 0
    };
    setItems([...items, newRow]);
  };

  const updateItem = (id, field, value) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        if (field === 'qty' || field === 'price') {
          const qty = parseFloat(updatedItem.qty) || 0;
          const price = parseFloat(updatedItem.price) || 0;
          updatedItem.amount = qty * price;
        }
        return updatedItem;
      }
      return item;
    }));
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.amount, 0);
  };

  const handleSave = () => {
    const billData = {
      id: Date.now(),
      type: 'purchase',
      ...formData,
      items: items.filter(item => item.item || item.qty || item.price),
      total: calculateTotal(),
      createdAt: new Date().toISOString(),
      status: 'Draft'
    };
    
    if (onSave) {
      onSave(billData);
    }
    
    alert(`Purchase bill saved successfully!\nBill Number: ${formData.billNumber}\nTotal: ₹${calculateTotal().toFixed(2)}`);
    onClose();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-base font-medium text-gray-800">{formData.billNumber}</span>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
              <button className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white">
                <Info size={12} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Title */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-2">
          <h2 className="text-lg font-semibold text-gray-900">Purchase</h2>
        </div>
      </div>

      {/* Form Content */}
      <div className="max-w-7xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow-sm p-4">
          {/* Party and Bill Details */}
          <div className="grid grid-cols-12 gap-4 mb-4">
            {/* Left Side - Party Search */}
            <div className="col-span-12 md:col-span-6">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by Name/Phone *"
                  value={formData.party}
                  onClick={() => setShowPartyDropdown(!showPartyDropdown)}
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer text-sm"
                  readOnly
                />
                <ChevronDown className="absolute right-2 top-2.5 h-4 w-4 text-gray-400" />
                
                {showPartyDropdown && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-b shadow-lg z-10">
                    <button className="w-full p-2 text-left text-blue-600 hover:bg-blue-50 border-b border-gray-200 flex items-center gap-2 text-sm">
                      <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center">
                        <Plus size={10} />
                      </div>
                      Add Party
                    </button>
                    {parties.map((party, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setFormData({...formData, party: party.name});
                          setShowPartyDropdown(false);
                        }}
                        className="w-full p-2 text-left hover:bg-gray-50"
                      >
                        <div className="font-medium text-sm">{party.name}</div>
                        <div className="text-xs text-gray-500">{party.phone}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Side - Bill Details */}
            <div className="col-span-12 md:col-span-6">
              <div className="grid grid-cols-2 gap-2 text-right">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Bill Number</label>
                  <div className="text-sm font-medium">Purchase #1</div>
                </div>
                <div>
                  <label className="block text-xs text-blue-600 mb-1">Bill Date</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.billDate}
                      onChange={(e) => setFormData({...formData, billDate: e.target.value})}
                      className="w-full p-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs text-right"
                    />
                    <Calendar className="absolute right-1 top-1 h-2 w-2 text-gray-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="border border-gray-200 rounded overflow-hidden mb-4">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-2 text-left font-medium text-gray-600 uppercase border-r border-gray-200">#</th>
                  <th className="px-2 py-2 text-left font-medium text-blue-600 uppercase border-r border-gray-200">CATEGORY</th>
                  <th className="px-2 py-2 text-left font-medium text-blue-600 uppercase border-r border-gray-200">ITEM</th>
                  <th className="px-2 py-2 text-left font-medium text-blue-600 uppercase border-r border-gray-200">QTY</th>
                  <th className="px-2 py-2 text-left font-medium text-blue-600 uppercase border-r border-gray-200">UNIT</th>
                  <th className="px-2 py-2 text-left font-medium text-blue-600 uppercase border-r border-gray-200">PRICE/UNIT</th>
                  <th className="px-2 py-2 text-left font-medium text-blue-600 uppercase">AMOUNT</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {items.map((item, index) => (
                  <tr key={item.id} className="border-b border-gray-200">
                    <td className="px-2 py-2 text-sm border-r border-gray-200">{index + 1}</td>
                    <td className="px-2 py-2 border-r border-gray-200">
                      <select 
                        value={item.category}
                        onChange={(e) => updateItem(item.id, 'category', e.target.value)}
                        className="w-full p-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="ALL">ALL</option>
                      </select>
                    </td>
                    <td className="px-2 py-2 border-r border-gray-200">
                      <input
                        type="text"
                        value={item.item}
                        onChange={(e) => updateItem(item.id, 'item', e.target.value)}
                        className="w-full p-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-2 py-2 border-r border-gray-200">
                      <input
                        type="number"
                        value={item.qty}
                        onChange={(e) => updateItem(item.id, 'qty', e.target.value)}
                        className="w-full p-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-2 py-2 border-r border-gray-200">
                      <select 
                        value={item.unit}
                        onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                        className="w-full p-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="NONE">NONE</option>
                        <option value="Pcs">Pcs</option>
                        <option value="Kg">Kg</option>
                        <option value="Ltr">Ltr</option>
                      </select>
                    </td>
                    <td className="px-2 py-2 border-r border-gray-200">
                      <input
                        type="number"
                        value={item.price}
                        onChange={(e) => updateItem(item.id, 'price', e.target.value)}
                        className="w-full p-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-2 py-2 text-xs font-medium">
                      {item.amount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div className="px-4 py-2 bg-white border-t border-gray-200">
              <button
                onClick={addRow}
                className="text-blue-600 hover:text-blue-800 text-xs font-medium border border-blue-200 px-3 py-1 rounded"
              >
                ADD ROW
              </button>
            </div>
            
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
              <span className="font-medium text-sm">TOTAL</span>
              <span className="font-bold text-sm">{calculateTotal().toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Section */}
          <div className="grid grid-cols-12 gap-4 mb-4">
            <div className="col-span-12 md:col-span-3">
              <label className="block text-xs text-gray-600 mb-1">Payment Type</label>
              <select 
                value={formData.paymentType}
                onChange={(e) => setFormData({...formData, paymentType: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
              >
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
                <option value="UPI">UPI</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
            <button 
              onClick={handleSave}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Sale Form Page Component
function SaleFormPage({ onClose, onSave }: { onClose: () => void; onSave?: (data: any) => void }) {
  const [formData, setFormData] = useState({
    billNumber: 'Sale #1',
    billDate: '19/06/2025',
    party: '',
    phoneNo: '',
    paymentType: 'Cash',
    discount: { percentage: '', amount: '' },
    tax: 'NONE',
    taxAmount: 0,
    description: '',
    images: []
  });

  const [items, setItems] = useState([
    { id: 1, category: 'ALL', item: '', itemCode: '', qty: '', unit: 'NONE', price: '', amount: 0 },
    { id: 2, category: 'ALL', item: '', itemCode: '', qty: '', unit: 'NONE', price: '', amount: 0 }
  ]);

  const [showPartyDropdown, setShowPartyDropdown] = useState(false);
  const [parties] = useState([
    { name: 'John Doe', phone: '9876543210', balance: '15000' },
    { name: 'Jane Smith', phone: '8765432109', balance: '8500' }
  ]);

  const addRow = () => {
    const newRow = {
      id: items.length + 1,
      category: 'ALL',
      item: '',
      itemCode: '',
      qty: '',
      unit: 'NONE',
      price: '',
      amount: 0
    };
    setItems([...items, newRow]);
  };

  const updateItem = (id, field, value) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        if (field === 'qty' || field === 'price') {
          const qty = parseFloat(updatedItem.qty) || 0;
          const price = parseFloat(updatedItem.price) || 0;
          updatedItem.amount = qty * price;
        }
        return updatedItem;
      }
      return item;
    }));
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.amount, 0);
  };

  const handleSave = () => {
    const billData = {
      id: Date.now(),
      type: 'sale',
      ...formData,
      items: items.filter(item => item.item || item.qty || item.price),
      total: calculateTotal(),
      createdAt: new Date().toISOString(),
      status: 'Draft'
    };
    
    if (onSave) {
      onSave(billData);
    }
    
    alert(`Sale bill saved successfully!\nBill Number: ${formData.billNumber}\nTotal: ₹${calculateTotal().toFixed(2)}`);
    onClose();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-base font-medium text-gray-800">{formData.billNumber}</span>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
              <button className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white">
                <Info size={12} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Title */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-2">
          <h2 className="text-lg font-semibold text-gray-900">Sale</h2>
        </div>
      </div>

      {/* Form Content - Similar layout to Purchase */}
      <div className="max-w-7xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow-sm p-4">
          {/* Party and Bill Details */}
          <div className="grid grid-cols-12 gap-4 mb-4">
            {/* Left Side - Party Search */}
            <div className="col-span-12 md:col-span-6">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by Name/Phone *"
                  value={formData.party}
                  onClick={() => setShowPartyDropdown(!showPartyDropdown)}
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer text-sm"
                  readOnly
                />
                <ChevronDown className="absolute right-2 top-2.5 h-4 w-4 text-gray-400" />
                
                {showPartyDropdown && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-b shadow-lg z-10">
                    <button className="w-full p-2 text-left text-blue-600 hover:bg-blue-50 border-b border-gray-200 flex items-center gap-2 text-sm">
                      <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center">
                        <Plus size={10} />
                      </div>
                      Add Party
                    </button>
                    {parties.map((party, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setFormData({...formData, party: party.name});
                          setShowPartyDropdown(false);
                        }}
                        className="w-full p-2 text-left hover:bg-gray-50"
                      >
                        <div className="font-medium text-sm">{party.name}</div>
                        <div className="text-xs text-gray-500">{party.phone}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Side - Bill Details */}
            <div className="col-span-12 md:col-span-6">
              <div className="grid grid-cols-2 gap-2 text-right">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Bill Number</label>
                  <div className="text-sm font-medium">Sale #1</div>
                </div>
                <div>
                  <label className="block text-xs text-blue-600 mb-1">Bill Date</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.billDate}
                      onChange={(e) => setFormData({...formData, billDate: e.target.value})}
                      className="w-full p-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs text-right"
                    />
                    <Calendar className="absolute right-1 top-1 h-2 w-2 text-gray-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="border border-gray-200 rounded overflow-hidden mb-4">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-2 text-left font-medium text-gray-600 uppercase border-r border-gray-200">#</th>
                  <th className="px-2 py-2 text-left font-medium text-blue-600 uppercase border-r border-gray-200">CATEGORY</th>
                  <th className="px-2 py-2 text-left font-medium text-blue-600 uppercase border-r border-gray-200">ITEM</th>
                  <th className="px-2 py-2 text-left font-medium text-blue-600 uppercase border-r border-gray-200">QTY</th>
                  <th className="px-2 py-2 text-left font-medium text-blue-600 uppercase border-r border-gray-200">UNIT</th>
                  <th className="px-2 py-2 text-left font-medium text-blue-600 uppercase border-r border-gray-200">PRICE/UNIT</th>
                  <th className="px-2 py-2 text-left font-medium text-blue-600 uppercase">AMOUNT</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {items.map((item, index) => (
                  <tr key={item.id} className="border-b border-gray-200">
                    <td className="px-2 py-2 text-sm border-r border-gray-200">{index + 1}</td>
                    <td className="px-2 py-2 border-r border-gray-200">
                      <select 
                        value={item.category}
                        onChange={(e) => updateItem(item.id, 'category', e.target.value)}
                        className="w-full p-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="ALL">ALL</option>
                      </select>
                    </td>
                    <td className="px-2 py-2 border-r border-gray-200">
                      <input
                        type="text"
                        value={item.item}
                        onChange={(e) => updateItem(item.id, 'item', e.target.value)}
                        className="w-full p-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-2 py-2 border-r border-gray-200">
                      <input
                        type="number"
                        value={item.qty}
                        onChange={(e) => updateItem(item.id, 'qty', e.target.value)}
                        className="w-full p-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-2 py-2 border-r border-gray-200">
                      <select 
                        value={item.unit}
                        onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                        className="w-full p-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="NONE">NONE</option>
                        <option value="Pcs">Pcs</option>
                        <option value="Kg">Kg</option>
                        <option value="Ltr">Ltr</option>
                      </select>
                    </td>
                    <td className="px-2 py-2 border-r border-gray-200">
                      <input
                        type="number"
                        value={item.price}
                        onChange={(e) => updateItem(item.id, 'price', e.target.value)}
                        className="w-full p-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-2 py-2 text-xs font-medium">
                      {item.amount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div className="px-4 py-2 bg-white border-t border-gray-200">
              <button
                onClick={addRow}
                className="text-blue-600 hover:text-blue-800 text-xs font-medium border border-blue-200 px-3 py-1 rounded"
              >
                ADD ROW
              </button>
            </div>
            
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
              <span className="font-medium text-sm">TOTAL</span>
              <span className="font-bold text-sm">{calculateTotal().toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Section */}
          <div className="grid grid-cols-12 gap-4 mb-4">
            <div className="col-span-12 md:col-span-3">
              <label className="block text-xs text-gray-600 mb-1">Payment Type</label>
              <select 
                value={formData.paymentType}
                onChange={(e) => setFormData({...formData, paymentType: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
              >
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
                <option value="UPI">UPI</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
            <button 
              onClick={handleSave}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Purchase Order Form Page Component
function PurchaseOrderFormPage({ onClose, onSave, type = 'purchase-order' }: { onClose: () => void; onSave?: (data: any) => void; type?: string }) {
  const [formData, setFormData] = useState({
    orderNumber: '1',
    orderDate: '19/06/2025',
    dueDate: '19/06/2025',
    party: '',
    phoneNo: '',
    paymentType: 'Cash',
    discount: { percentage: '', amount: '' },
    tax: 'NONE',
    taxAmount: 0,
    description: '',
    images: [],
    status: 'Draft'
  });

  const [items, setItems] = useState([
    { id: 1, category: 'ALL', item: '', itemCode: '', qty: '', unit: 'NONE', price: '', amount: 0 },
    { id: 2, category: 'ALL', item: '', itemCode: '', qty: '', unit: 'NONE', price: '', amount: 0 }
  ]);

  const [showPartyDropdown, setShowPartyDropdown] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const [parties] = useState([
    { name: 'ABC Suppliers', phone: '9876543210', balance: '25000' },
    { name: 'XYZ Traders', phone: '8765432109', balance: '15000' }
  ]);

  const addRow = () => {
    const newRow = {
      id: items.length + 1,
      category: 'ALL',
      item: '',
      itemCode: '',
      qty: '',
      unit: 'NONE',
      price: '',
      amount: 0
    };
    setItems([...items, newRow]);
  };

  const updateItem = (id, field, value) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        if (field === 'qty' || field === 'price') {
          const qty = parseFloat(updatedItem.qty) || 0;
          const price = parseFloat(updatedItem.price) || 0;
          updatedItem.amount = qty * price;
        }
        return updatedItem;
      }
      return item;
    }));
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.amount, 0);
  };

  const handleSave = () => {
    const orderData = {
      id: Date.now(),
      type: type,
      ...formData,
      items: items.filter(item => item.item || item.qty || item.price),
      total: calculateTotal(),
      createdAt: new Date().toISOString()
    };
    
    console.log('Saving order:', orderData);
    
    if (onSave) {
      onSave(orderData);
    }
    
    alert(`Purchase order saved successfully!\nOrder Number: ${formData.orderNumber}\nTotal: ₹${calculateTotal().toFixed(2)}`);
    onClose();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-base font-medium text-gray-800">Purchase Order #{formData.orderNumber}</span>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
              <button className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white">
                <Info size={12} />
              </button>
            </div>
            <div className="flex items-center gap-1">
              <button className="p-1 text-gray-400 hover:text-gray-600">
                <div className="w-4 h-4 border border-gray-400 rounded"></div>
              </button>
              <button className="p-1 text-gray-400 hover:text-gray-600">
                <div className="w-4 h-4 border border-gray-400 rounded flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                </div>
              </button>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Title */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-2">
          <h2 className="text-lg font-semibold text-gray-900">Purchase Order</h2>
        </div>
      </div>

      {/* Form Content */}
      <div className="max-w-7xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow-sm p-4">
          {/* Party and Order Details */}
          <div className="grid grid-cols-12 gap-4 mb-4">
            {/* Left Side - Party Search */}
            <div className="col-span-12 md:col-span-6">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by Name/Phone *"
                  value={formData.party}
                  onClick={() => setShowPartyDropdown(!showPartyDropdown)}
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer text-sm"
                  readOnly
                />
                <ChevronDown className="absolute right-2 top-2.5 h-4 w-4 text-gray-400" />
                
                {showPartyDropdown && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-b shadow-lg z-10">
                    <button className="w-full p-2 text-left text-blue-600 hover:bg-blue-50 border-b border-gray-200 flex items-center gap-2 text-sm">
                      <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center">
                        <Plus size={10} />
                      </div>
                      Add Party
                    </button>
                    {parties.map((party, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setFormData({...formData, party: party.name});
                          setShowPartyDropdown(false);
                        }}
                        className="w-full p-2 text-left hover:bg-gray-50"
                      >
                        <div className="font-medium text-sm">{party.name}</div>
                        <div className="text-xs text-gray-500">{party.phone}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Side - Order Details */}
            <div className="col-span-12 md:col-span-6">
              <div className="grid grid-cols-3 gap-2 text-right">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Order No</label>
                  <div className="text-sm font-medium">{formData.orderNumber}</div>
                </div>
                <div>
                  <label className="block text-xs text-blue-600 mb-1">Order Date</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.orderDate}
                      onChange={(e) => setFormData({...formData, orderDate: e.target.value})}
                      className="w-full p-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs text-right"
                    />
                    <Calendar className="absolute right-1 top-1 h-2 w-2 text-gray-400" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-blue-600 mb-1">Due Date</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                      className="w-full p-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs text-right"
                    />
                    <Calendar className="absolute right-1 top-1 h-2 w-2 text-gray-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="border border-gray-200 rounded overflow-hidden mb-4">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-2 text-left font-medium text-gray-600 uppercase border-r border-gray-200">#</th>
                  <th className="px-2 py-2 text-left font-medium text-blue-600 uppercase border-r border-gray-200">CATEGORY</th>
                  <th className="px-2 py-2 text-left font-medium text-blue-600 uppercase border-r border-gray-200">ITEM</th>
                  <th className="px-2 py-2 text-left font-medium text-blue-600 uppercase border-r border-gray-200">ITEM CODE</th>
                  <th className="px-2 py-2 text-left font-medium text-blue-600 uppercase border-r border-gray-200">QTY</th>
                  <th className="px-2 py-2 text-left font-medium text-blue-600 uppercase border-r border-gray-200">UNIT</th>
                  <th className="px-2 py-2 text-left font-medium text-blue-600 uppercase border-r border-gray-200">PRICE/UNIT</th>
                  <th className="px-2 py-2 text-left font-medium text-blue-600 uppercase border-r border-gray-200">AMOUNT</th>
                  <th className="px-2 py-2 text-left font-medium text-blue-600 uppercase">
                    <Info size={12} className="text-blue-500" />
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {items.map((item, index) => (
                  <tr key={item.id} className="border-b border-gray-200">
                    <td className="px-2 py-2 text-sm border-r border-gray-200">{index + 1}</td>
                    <td className="px-2 py-2 border-r border-gray-200">
                      <select 
                        value={item.category}
                        onChange={(e) => updateItem(item.id, 'category', e.target.value)}
                        className="w-full p-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="ALL">ALL</option>
                      </select>
                    </td>
                    <td className="px-2 py-2 border-r border-gray-200">
                      <input
                        type="text"
                        value={item.item}
                        onChange={(e) => updateItem(item.id, 'item', e.target.value)}
                        className="w-full p-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-2 py-2 border-r border-gray-200">
                      <input
                        type="text"
                        value={item.itemCode}
                        onChange={(e) => updateItem(item.id, 'itemCode', e.target.value)}
                        className="w-full p-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-2 py-2 border-r border-gray-200">
                      <input
                        type="number"
                        value={item.qty}
                        onChange={(e) => updateItem(item.id, 'qty', e.target.value)}
                        className="w-full p-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-2 py-2 border-r border-gray-200">
                      <select 
                        value={item.unit}
                        onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                        className="w-full p-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="NONE">NONE</option>
                        <option value="Pcs">Pcs</option>
                        <option value="Kg">Kg</option>
                        <option value="Ltr">Ltr</option>
                      </select>
                    </td>
                    <td className="px-2 py-2 border-r border-gray-200">
                      <input
                        type="number"
                        value={item.price}
                        onChange={(e) => updateItem(item.id, 'price', e.target.value)}
                        className="w-full p-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-2 py-2 text-xs font-medium border-r border-gray-200">
                      {item.amount.toFixed(2)}
                    </td>
                    <td className="px-2 py-2"></td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div className="px-4 py-2 bg-white border-t border-gray-200">
              <button
                onClick={addRow}
                className="text-blue-600 hover:text-blue-800 text-xs font-medium border border-blue-200 px-3 py-1 rounded"
              >
                ADD ROW
              </button>
            </div>
            
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
              <span className="font-medium text-sm">TOTAL</span>
              <div className="flex gap-8">
                <span className="text-sm">0</span>
                <span className="font-bold text-sm">{calculateTotal().toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment and Discount Section */}
          <div className="grid grid-cols-12 gap-4 mb-4">
            {/* Payment Type */}
            <div className="col-span-12 md:col-span-3">
              <label className="block text-xs text-gray-600 mb-1">Payment Type</label>
              <select 
                value={formData.paymentType}
                onChange={(e) => setFormData({...formData, paymentType: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
              >
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
                <option value="UPI">UPI</option>
                <option value="Cheque">Cheque</option>
              </select>
              <button className="text-blue-600 text-xs mt-1 flex items-center gap-1">
                <Plus size={10} />
                Add Payment type
              </button>
            </div>

            {/* Spacer */}
            <div className="col-span-12 md:col-span-6"></div>

            {/* Discount and Tax */}
            <div className="col-span-12 md:col-span-3">
              <div className="space-y-2">
                {/* Discount */}
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Discount</label>
                  <div className="flex gap-1">
                    <div className="flex-1 relative">
                      <input
                        type="number"
                        placeholder="0"
                        value={formData.discount.percentage}
                        onChange={(e) => setFormData({
                          ...formData, 
                          discount: {...formData.discount, percentage: e.target.value}
                        })}
                        className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs pr-6"
                      />
                      <span className="absolute right-2 top-2 text-gray-500 text-xs">%</span>
                    </div>
                    <span className="text-xs text-gray-500 self-center">-</span>
                    <div className="flex-1 relative">
                      <input
                        type="number"
                        placeholder="0"
                        value={formData.discount.amount}
                        onChange={(e) => setFormData({
                          ...formData, 
                          discount: {...formData.discount, amount: e.target.value}
                        })}
                        className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs pr-6"
                      />
                      <span className="absolute right-2 top-2 text-gray-500 text-xs">Rs</span>
                    </div>
                  </div>
                </div>

                {/* Tax */}
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-600 mb-1">Tax</label>
                    <select 
                      value={formData.tax}
                      onChange={(e) => setFormData({...formData, tax: e.target.value})}
                      className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                    >
                      <option value="NONE">NONE</option>
                      <option value="GST_5">GST 5%</option>
                      <option value="GST_12">GST 12%</option>
                      <option value="GST_18">GST 18%</option>
                      <option value="GST_28">GST 28%</option>
                    </select>
                  </div>
                  <div className="w-16">
                    <input
                      type="number"
                      value={formData.taxAmount}
                      readOnly
                      className="w-full p-2 border border-gray-300 rounded bg-gray-50 text-center text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="mb-4">
            <div 
              className="flex items-center gap-2 text-gray-600 cursor-pointer hover:text-blue-600"
              onClick={() => setShowDescription(!showDescription)}
            >
              <div className={`w-4 h-4 border border-gray-400 rounded flex items-center justify-center ${showDescription ? 'bg-blue-100 border-blue-400' : ''}`}>
                {showDescription && <div className="w-2 h-2 bg-blue-600 rounded-full"></div>}
              </div>
              <span className="text-sm font-medium text-gray-500">ADD DESCRIPTION</span>
            </div>
            
            {showDescription && (
              <div className="mt-3">
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Enter description here..."
                  className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                  rows={3}
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-4 border-t border-gray-200">
            <button className="w-full sm:w-auto flex items-center justify-center gap-1 px-4 py-2 border border-blue-300 rounded text-blue-600 hover:bg-blue-50 text-sm">
              Share
              <ChevronDown size={12} />
            </button>
            <button 
              onClick={handleSave}
              className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PurchaseOrderPage() {
  const [businessName, setBusinessName] = useState('Enter Business Name');
  const [orders, setOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState('purchase-order'); // 'purchase-order', 'purchase', 'sale'

  const handleAddPurchaseOrder = () => {
    setFormType('purchase-order');
    setShowForm(true);
  };

  const handleAddSale = () => {
    setFormType('sale');
    setShowForm(true);
  };

  const handleAddPurchase = () => {
    setFormType('purchase');
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
  };

  const saveOrder = (orderData) => {
    setOrders(prev => [...prev, orderData]);
    setShowForm(false);
  };

  if (showForm) {
    if (formType === 'purchase-order') {
      return (
        <PurchaseOrderFormPage 
          onClose={closeForm} 
          onSave={saveOrder}
        />
      );
    } else if (formType === 'purchase') {
      return (
        <PurchaseFormPage 
          onClose={closeForm} 
          onSave={saveOrder}
        />
      );
    } else if (formType === 'sale') {
      return (
        <SaleFormPage 
          onClose={closeForm} 
          onSave={saveOrder}
        />
      );
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Business Name Input */}
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="text-lg font-medium text-gray-700 bg-transparent border-none outline-none focus:text-gray-900"
                placeholder="Enter Business Name"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleAddSale}
                className="flex items-center gap-2 px-4 py-2 bg-pink-100 text-pink-700 rounded-lg hover:bg-pink-200 transition-colors"
              >
                <Plus size={16} />
                Add Sale
              </button>
              
              <button
                onClick={handleAddPurchase}
                className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
              >
                <Plus size={16} />
                Add Purchase
              </button>

              <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                <Plus size={20} />
              </button>

              <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                <MoreVertical size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Orders Section Title */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <h2 className="text-xl font-semibold text-gray-500 text-center">ORDERS</h2>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {orders.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
            {/* Shopping Cart Illustration */}
            <div className="w-48 h-48 mb-8 relative">
              <div className="absolute inset-0 bg-blue-100 rounded-full opacity-20"></div>
              <div className="absolute inset-4 bg-blue-200 rounded-full opacity-30"></div>
              <div className="absolute inset-8 bg-blue-300 rounded-full opacity-40"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative">
                  {/* Shopping Cart */}
                  <svg width="80" height="80" viewBox="0 0 100 100" className="text-blue-600">
                    <path
                      d="M20 20h10l8 40h30l6-20H35"
                      stroke="currentColor"
                      strokeWidth="3"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle cx="25" cy="75" r="3" fill="currentColor" />
                    <circle cx="65" cy="75" r="3" fill="currentColor" />
                    <path
                      d="M30 60h28"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                  
                  {/* Document/Receipt */}
                  <div className="absolute -right-6 -top-2">
                    <div className="w-8 h-10 bg-white border-2 border-gray-300 rounded-sm shadow-sm">
                      <div className="w-full h-1 bg-gray-300 mt-1"></div>
                      <div className="w-3/4 h-1 bg-gray-300 mt-1 ml-1"></div>
                      <div className="w-1/2 h-1 bg-gray-300 mt-1 ml-1"></div>
                      <div className="w-full h-1 bg-gray-300 mt-1"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Text Content */}
            <div className="max-w-md mb-8 px-4">
              <p className="text-gray-600 text-lg leading-relaxed">
                Make & share purchase orders with your parties & convert them to purchase bill instantly.
              </p>
            </div>

            {/* Call to Action Button */}
            <button
              onClick={handleAddPurchaseOrder}
              className="px-8 py-3 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 transition-colors shadow-sm"
            >
              Add Your First Purchase Order
            </button>
          </div>
        ) : (
          /* List View (when there are orders) */
          <div>
            {/* Search and Filter Bar */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-6 gap-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search orders..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                  />
                </div>
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 w-full sm:w-auto justify-center">
                  <Filter size={16} />
                  Filter
                </button>
              </div>
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 justify-center">
                  <Download size={16} />
                  Export
                </button>
                <button
                  onClick={handleAddPurchaseOrder}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 justify-center"
                >
                  <Plus size={16} />
                  Add Purchase Order
                </button>
              </div>
            </div>

            {/* Orders List Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px]">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Order No.
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Supplier
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Order Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Due Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {orders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {order.orderNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {order.party || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {order.orderDate}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {order.dueDate || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₹{order.total.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            {order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex flex-col sm:flex-row gap-1 sm:gap-2">
                            <button className="text-blue-600 hover:text-blue-900 text-xs sm:text-sm">Edit</button>
                            <button className="text-green-600 hover:text-green-900 text-xs sm:text-sm">Convert</button>
                            <button className="text-red-600 hover:text-red-900 text-xs sm:text-sm">Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}