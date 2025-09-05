"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Filter, Download, X, ChevronDown, Calendar, Share2, Save, Info, Camera } from 'lucide-react';
import { getToken } from '../../lib/auth';
import { getUserPurchaseOrders, updatePurchaseOrder, fixCompletedPurchaseOrders, deletePurchaseOrderById, getPurchaseOrderById } from '../../../http/purchaseOrders';
import { useRouter, useSearchParams } from 'next/navigation';
import TableActionMenu from '../../components/TableActionMenu';
import ConfirmDialog from '../../components/ConfirmDialog';
import { getCurrentUserInfo, canEditData, canDeleteData, canAddData } from '../../../lib/roleAccessControl';
import { useSidebar } from '../../contexts/SidebarContext';

// Purchase Form Page Component
function PurchaseFormPage({ onClose, onSave }: { onClose: () => void; onSave?: (data: any) => void }) {
  const [formData, setFormData] = useState({
    billNumber: 'Purchase #1',
    billDate: '19/06/2025',
    party: '',
    phoneNo: '',
    balance: '',
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

  const updateItem = (id: number, field: string, value: any) => {
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
                          setFormData({
                            ...formData,
                            party: party.name,
                            phoneNo: party.phone,
                            balance: party.balance
                          });
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
              {/* Show balance if available */}
              {formData.balance !== undefined && formData.balance !== '' && (
                <div className={`mt-1 text-sm font-semibold ${parseFloat(formData.balance) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  ₹{Math.abs(parseFloat(formData.balance)).toLocaleString('en-IN')}
                </div>
              )}
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
    balance: '',
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

  const updateItem = (id: number, field: string, value: any) => {
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
    orderDate: new Date().toLocaleDateString('en-GB'), // Today's date
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB'), // 7 days from today
    party: '',
    phoneNo: '',
    balance: '',
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

  const updateItem = (id: number, field: string, value: any) => {
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
    // Convert date strings to proper Date objects
    const parseDate = (dateStr: string) => {
      const [day, month, year] = dateStr.split('/');
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    };

    console.log('Form data before processing:', {
      formData: formData,
      items: items,
      orderDate: formData.orderDate,
      dueDate: formData.dueDate
    });

    const orderDate = parseDate(formData.orderDate);
    const dueDate = parseDate(formData.dueDate);
    
    // Set due date to end of day (23:59:59)
    dueDate.setHours(23, 59, 59, 999);

    console.log('Parsed dates:', {
      orderDate: orderDate,
      dueDate: dueDate,
      orderDateISO: orderDate.toISOString(),
      dueDateISO: dueDate.toISOString()
    });

    const orderData = {
      id: Date.now(),
      type: type,
      ...formData,
      orderDate: orderDate.toISOString(),
      dueDate: dueDate.toISOString(),
      supplierPhone: formData.phoneNo,
      items: items.filter(item => item.item || item.qty || item.price),
      total: calculateTotal(),
      createdAt: new Date().toISOString()
    };
    
    console.log('Final order data being saved:', orderData);
    
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
                          setFormData({
                            ...formData,
                            party: party.name,
                            phoneNo: party.phone,
                            balance: party.balance
                          });
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
              {/* Show balance if available */}
              {formData.balance !== undefined && formData.balance !== '' && (
                <div className={`mt-1 text-sm font-semibold ${parseFloat(formData.balance) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  ₹{Math.abs(parseFloat(formData.balance)).toLocaleString('en-IN')}
                </div>
              )}
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
                      onChange={(e) => {
                        console.log('Order date changed to:', e.target.value);
                        setFormData({...formData, orderDate: e.target.value});
                      }}
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
                      onChange={(e) => {
                        console.log('Due date changed to:', e.target.value);
                        setFormData({...formData, dueDate: e.target.value});
                      }}
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
  const router = useRouter();
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const editId = searchParams ? searchParams.get('id') : null;
  const [businessName, setBusinessName] = useState('Enter Business Name');
  const [orders, setOrders] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState('purchase-order'); // 'purchase-order', 'purchase', 'sale'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [convertingOrder, setConvertingOrder] = useState<string | null>(null);
  const [fixingOrders, setFixingOrders] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateRanges, setDateRanges] = useState([
    { value: 'All', label: 'All Time' },
    { value: 'Custom', label: 'Custom' },
    { value: 'Today', label: 'Today' },
    { value: 'Yesterday', label: 'Yesterday' },
    { value: 'This Week', label: 'This Week' },
    { value: 'This Month', label: 'This Month' },
    { value: 'This Year', label: 'This Year' }
  ]);
  const [filterType, setFilterType] = useState('All');
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const dateDropdownRef = useRef<HTMLDivElement>(null);
  const dateDropdownButtonRef = useRef<HTMLButtonElement>(null);
  // Add state for confirm dialog
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<any | null>(null);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);
  
  // Import sidebar context for auto-collapse
  const { setIsCollapsed } = useSidebar();
  const [wasSidebarCollapsed, setWasSidebarCollapsed] = useState(false);

  // Auto-collapse sidebar when page opens and restore when closing
  useEffect(() => {
    // Store current sidebar state and collapse it
    const currentSidebarState = document.body.classList.contains('sidebar-collapsed') || 
                               document.documentElement.classList.contains('sidebar-collapsed');
    setWasSidebarCollapsed(currentSidebarState);
    
    // Collapse sidebar for better form experience
    setIsCollapsed(true);
    
    // Restore sidebar state when component unmounts
    return () => {
      setIsCollapsed(wasSidebarCollapsed);
    };
  }, [setIsCollapsed, wasSidebarCollapsed]);

  // Get current user info for role-based access
  useEffect(() => {
    const currentUserInfo = getCurrentUserInfo();
    setUserInfo(currentUserInfo);
  }, []);

  // Add loading state to prevent hydration mismatch
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Fetch purchase orders from database
  useEffect(() => {
    const fetchPurchaseOrders = async () => {
      try {
        const token = getToken();
        if (!token) {
          setError('Authentication required');
          return;
        }

        const purchaseOrders = await getUserPurchaseOrders(token);
        setOrders(purchaseOrders || []);
      } catch (err: any) {
        console.error('Error fetching purchase orders:', err);
        setError('Failed to fetch purchase orders');
      }
    };

    fetchPurchaseOrders();
  }, []);

  useEffect(() => {
    if (!editId) return;
    // Only run if editId is a valid string
    const fetchOrder = async () => {
      try {
        const token = getToken();
        if (!token) return;
        const result = await getPurchaseOrderById(editId, token);
        if (result && result.success && result.order) {
          // No setFormData or setItems here; remove these lines
        }
      } catch (err) {
        // Optionally show error
      }
    };
    fetchOrder();
  }, [editId]);

  const handleAddPurchaseOrder = () => {
    // Check if user can add data
    if (!isClient || !canAddData()) {
      console.log('❌ User cannot add purchase orders');
      return;
    }
    router.push('/dashboard/purchaseAdd?from=purchase-order');
  };

  const handleAddSale = () => {
    setFormType('sale');
    setShowForm(true);
  };

  const handleAddPurchase = () => {
    router.push('/dashboard/purchaseAdd?from=purchase-bills');
  };

  const handleFixCompletedOrders = async () => {
    try {
      setFixingOrders(true);
      const token = getToken();
      if (!token) {
        alert('Authentication required');
        return;
      }
      
      console.log('=== FIX COMPLETED ORDERS DEBUG ===');
      console.log('Token:', token ? 'Present' : 'Missing');
      console.log('Attempting to fix completed purchase orders...');
      
      const result = await fixCompletedPurchaseOrders(token);
      console.log('Fix result:', result);
      
      if (result && result.success) {
        console.log('Fix successful! Fixed count:', result.fixedCount);
        alert(`Fixed ${result.fixedCount} completed purchase orders!`);
        refreshOrders(); // Refresh the orders list
      } else {
        console.error('Fix failed:', result);
        alert('Failed to fix completed orders');
      }
    } catch (err: any) {
      console.error('Error fixing completed orders:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      alert(`Error fixing completed orders: ${err.message}`);
    } finally {
      setFixingOrders(false);
    }
  };

  // Convert purchase order to purchase
  const handleConvertToPurchase = (order: any) => {
    setConvertingOrder(order._id);
    
    // Prepare purchase data from order
    const purchaseData = {
      supplierName: order.supplierName || '',
      phoneNo: order.supplierPhone || order.phoneNo || '', // Use supplierPhone from purchase order
      dueDate: order.dueDate || '', // Include due date
      items: order.items?.map((item: any, index: number) => ({
        id: index + 1,
        item: item.item || '',
        qty: item.qty?.toString() || '',
        unit: item.unit || 'NONE',
        customUnit: item.customUnit || '',
        price: item.price?.toString() || '',
        amount: item.amount || 0
      })) || [
        { id: 1, item: '', qty: '', unit: 'NONE', customUnit: '', price: '', amount: 0 },
        { id: 2, item: '', qty: '', unit: 'NONE', customUnit: '', price: '', amount: 0 }
      ],
      discount: order.discount?.toString() || '',
      discountType: order.discountType || '%',
      tax: order.tax?.toString() || '',
      taxType: order.taxType || '%',
      paymentType: order.paymentType || 'Credit',
      description: order.description || '',
      sourceOrderId: order._id, // Track the original order
      sourceOrderNumber: order.orderNumber
    };

    // Navigate to purchase add page with data
    const queryParams = new URLSearchParams({
      convertFromOrder: 'true',
      orderData: JSON.stringify(purchaseData)
    });
    
    router.push(`/dashboard/purchaseAdd?${queryParams.toString()}`);
  };

  // Get status with overdue logic
  const getOrderStatus = (order: any) => {
    if (order.status === 'Completed') return 'Order Completed';
    
    if (order.dueDate) {
      const dueDate = new Date(order.dueDate);
      const today = new Date();
      if (dueDate < today && order.status !== 'Completed') {
        return 'Overdue';
      }
    }
    
    return order.status || 'Draft';
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Order Completed':
        return 'bg-green-100 text-green-800';
      case 'Overdue':
        return 'bg-red-100 text-red-800';
      case 'Completed':
        return 'bg-green-100 text-green-800';
      case 'Draft':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  // Refresh orders when returning from add page
  useEffect(() => {
    const handleFocus = () => {
      refreshOrders();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const closeForm = () => {
    setShowForm(false);
  };

  const saveOrder = (orderData: any) => {
    console.log('saveOrder called with data:', orderData);
    setOrders(prev => [...prev, orderData]);
    setShowForm(false);
  };

  // Refresh orders after adding new one
  const refreshOrders = async () => {
    try {
      const token = getToken();
      if (!token) return;
      
      const purchaseOrders = await getUserPurchaseOrders(token);
      setOrders(purchaseOrders || []);
    } catch (err: any) {
      console.error('Error refreshing purchase orders:', err);
    }
  };

  const handleFilterTypeChange = (value: string) => {
    setFilterType(value);
    setShowDateDropdown(false);
    
    // Set date range based on selection
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    
    switch (value) {
      case 'Today':
        setDateFrom(startOfDay.toISOString().split('T')[0]);
        setDateTo(endOfDay.toISOString().split('T')[0]);
        break;
      case 'Yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const startOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
        const endOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59);
        setDateFrom(startOfYesterday.toISOString().split('T')[0]);
        setDateTo(endOfYesterday.toISOString().split('T')[0]);
        break;
      case 'This Week':
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59);
        setDateFrom(startOfWeek.toISOString().split('T')[0]);
        setDateTo(endOfWeek.toISOString().split('T')[0]);
        break;
      case 'This Month':
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
        setDateFrom(startOfMonth.toISOString().split('T')[0]);
        setDateTo(endOfMonth.toISOString().split('T')[0]);
        break;
      case 'This Year':
        const startOfYear = new Date(today.getFullYear(), 0, 1);
        const endOfYear = new Date(today.getFullYear(), 11, 31, 23, 59, 59);
        setDateFrom(startOfYear.toISOString().split('T')[0]);
        setDateTo(endOfYear.toISOString().split('T')[0]);
        break;
      case 'Custom':
        // Keep existing dates for custom
        break;
      default:
        setDateFrom('');
        setDateTo('');
        break;
    }
  };

  // Delete handler
  const handleDeleteOrder = (order: any) => {
    setOrderToDelete(order);
    setShowDeleteDialog(true);
  };

  const confirmDeleteOrder = async () => {
    if (!orderToDelete) return;
    setDeleteLoading(true);
    try {
      const token = getToken();
      if (!token) {
        setDeleteLoading(false);
        return;
      }
      await deletePurchaseOrderById(orderToDelete._id || orderToDelete.id, token);
      setOrders((prev) => prev.filter((o) => (o._id || o.id) !== (orderToDelete._id || orderToDelete.id)));
      setShowDeleteDialog(false);
      setOrderToDelete(null);
      // Optionally, refresh orders from backend here
    } catch (err: any) {
      // Optionally, show error
    } finally {
      setDeleteLoading(false);
    }
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
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-4 md:p-6 mb-6 sticky top-0 z-30 border border-gray-100">
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div className="text-center md:text-left">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Purchase Orders</h1>
            <p className="text-sm text-gray-500 mt-1">Manage your purchase orders and convert them to bills</p>
          </div>
          <div className="flex flex-col md:flex-row gap-2 md:gap-4">
            {!isClient ? (
              // Show loading state during SSR to prevent hydration mismatch
              <div className="bg-gray-100 text-gray-500 px-6 py-2 rounded-lg font-medium flex items-center gap-2">
                + Add Purchase Order
              </div>
            ) : canAddData() ? (
            <button
              onClick={handleAddPurchaseOrder}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow"
              disabled={loading}
            >
              + Add Purchase Order
            </button>
            ) : (
              <div className="bg-gray-100 text-gray-500 px-6 py-2 rounded-lg font-medium flex items-center gap-2">
                + Add Purchase Order (Restricted)
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6">
        <div className="bg-gradient-to-br from-blue-100 to-blue-50 p-6 rounded-2xl shadow group hover:shadow-lg transition-all flex flex-col items-start">
          <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-blue-500 text-white mb-3 text-xl">📦</div>
          <div className="text-2xl font-bold text-blue-700">{orders.length}</div>
          <div className="text-sm text-gray-500">Total Orders</div>
        </div>
        <div className="bg-gradient-to-br from-green-100 to-green-50 p-6 rounded-2xl shadow group hover:shadow-lg transition-all flex flex-col items-start">
          <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-green-500 text-white mb-3 text-xl">💰</div>
          <div className="text-2xl font-bold text-green-700">PKR {orders.reduce((sum, o) => sum + (o.total || 0), 0).toLocaleString()}</div>
          <div className="text-sm text-gray-500">Total Amount</div>
        </div>
        <div className="bg-gradient-to-br from-purple-100 to-purple-50 p-6 rounded-2xl shadow group hover:shadow-lg transition-all flex flex-col items-start">
          <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-purple-500 text-white mb-3 text-xl">✅</div>
          <div className="text-2xl font-bold text-purple-700">{orders.filter(o => o.status === 'Completed' || o.status === 'Order Completed').length}</div>
          <div className="text-sm text-gray-500">Completed Orders</div>
        </div>
      </div>
      {/* Search & Filters Section (like sales) */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow p-4 md:p-6 mb-6 border border-gray-100 z-[1]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          {/* Modern Search Bar */}
          <div className="relative w-full md:w-80">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-lg">🔍</span>
            <input
              type="text"
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white/80 shadow focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border border-gray-200 transition-all placeholder-gray-400 text-gray-900"
            />
          </div>
          {/* Filter Tabs/Pills */}
          <div className="flex gap-2 md:gap-4">
            {['All', 'Draft', 'Completed', 'Overdue'].map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-4 py-2 rounded-full font-medium transition-colors text-sm border-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${statusFilter === tab
                    ? 'bg-blue-600 text-white border-blue-600 shadow scale-105'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-blue-50'
                  }`}
              >
                {tab}
              </button>
            ))}
          </div>
          {/* Date Range & Quick Filter Dropdown (custom style) */}
          <div className="flex flex-col sm:flex-row gap-2 items-center mt-2">
            {/* Custom Dropdown for Date Range */}
            <div ref={dateDropdownRef} className="relative w-full sm:w-56">
              <button
                ref={dateDropdownButtonRef}
                type="button"
                className="w-full flex items-center justify-between px-4 py-2.5 rounded-full bg-white/80 shadow border border-gray-200 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all group"
                onClick={() => setShowDateDropdown((v) => !v)}
                aria-haspopup="listbox"
                aria-expanded={showDateDropdown ? 'true' : 'false'}
              >
                <span className="truncate">{dateRanges.find(r => r.value === filterType)?.label || 'All Time'}</span>
                <svg className={`w-5 h-5 ml-2 transition-transform ${showDateDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
              </button>
              {showDateDropdown && (
                <ul
                  className="absolute z-[100] bg-white rounded-xl shadow-lg border border-gray-100 py-1 max-h-60 overflow-auto animate-fadeinup w-full"
                  style={{ top: '110%', left: 0 }}
                  tabIndex={-1}
                  role="listbox"
                >
                  {dateRanges.map((range) => (
                    <li
                      key={range.value}
                      className={`px-4 py-2 cursor-pointer rounded-lg transition-all hover:bg-blue-50 ${filterType === range.value ? 'font-semibold text-blue-600 bg-blue-100' : 'text-gray-700'}`}
                      onClick={() => handleFilterTypeChange(range.value)}
                      role="option"
                      aria-selected={filterType === range.value}
                    >
                      {range.label}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {/* Date Pickers */}
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="px-4 py-2 rounded-full bg-white border-2 border-gray-200 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm min-w-[140px]"
              placeholder="From Date"
              disabled={filterType === 'All'}
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="px-4 py-2 rounded-full bg-white border-2 border-gray-200 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm min-w-[140px]"
              placeholder="To Date"
              disabled={filterType === 'All'}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 border-b border-gray-200 gap-4">
          <h2 className="text-lg font-semibold text-gray-900">Transactions</h2>
          <div className="flex gap-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-full text-sm w-full md:w-64 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>
            <button
              className="p-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
              title="Print"
            >
              🖨️
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Order No.</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Supplier</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Order Date</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Due Date</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Amount</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Balance</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Status</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Actions</th>
                <th className="px-4 py-4 text-center text-sm font-semibold text-gray-700"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                    Loading orders...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-red-500">
                    {error}
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                    No purchase orders found. Create your first purchase order!
                  </td>
                </tr>
              ) : (
                orders
                  .filter(order => {
                    // Search filter
                    const searchLower = searchTerm.toLowerCase();
                    const matchesSearch = (
                      (order.supplierName || '').toLowerCase().includes(searchLower) ||
                      (order.orderNumber || '').toString().toLowerCase().includes(searchLower)
                    );

                    // Status filter
                    const orderStatus = getOrderStatus(order);
                    const matchesStatus = statusFilter === 'All' || 
                      (statusFilter === 'Completed' && (orderStatus === 'Completed' || orderStatus === 'Order Completed')) ||
                      (statusFilter === 'Draft' && orderStatus === 'Draft') ||
                      (statusFilter === 'Overdue' && orderStatus === 'Overdue');

                    // Date filter
                    let matchesDate = true;
                    if (filterType !== 'All') {
                      const orderDate = new Date(order.orderDate);
                      const today = new Date();
                      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

                      switch (filterType) {
                        case 'Today':
                          matchesDate = orderDate >= startOfDay && orderDate <= endOfDay;
                          break;
                        case 'Yesterday':
                          const yesterday = new Date(today);
                          yesterday.setDate(yesterday.getDate() - 1);
                          const startOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
                          const endOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59);
                          matchesDate = orderDate >= startOfYesterday && orderDate <= endOfYesterday;
                          break;
                        case 'This Week':
                          const startOfWeek = new Date(today);
                          startOfWeek.setDate(today.getDate() - today.getDay());
                          const endOfWeek = new Date(startOfWeek);
                          endOfWeek.setDate(startOfWeek.getDate() + 6);
                          endOfWeek.setHours(23, 59, 59);
                          matchesDate = orderDate >= startOfWeek && orderDate <= endOfWeek;
                          break;
                        case 'This Month':
                          const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                          const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
                          matchesDate = orderDate >= startOfMonth && orderDate <= endOfMonth;
                          break;
                        case 'This Year':
                          const startOfYear = new Date(today.getFullYear(), 0, 1);
                          const endOfYear = new Date(today.getFullYear(), 11, 31, 23, 59, 59);
                          matchesDate = orderDate >= startOfYear && orderDate <= endOfYear;
                          break;
                        case 'Custom':
                          if (dateFrom && dateTo) {
                            const fromDate = new Date(dateFrom);
                            const toDate = new Date(dateTo);
                            toDate.setHours(23, 59, 59);
                            matchesDate = orderDate >= fromDate && orderDate <= toDate;
                          }
                          break;
                      }
                    }

                    return matchesSearch && matchesStatus && matchesDate;
                  })
                  .map((order, idx) => (
                    <tr key={order._id || order.id} className={`hover:bg-blue-50/40 transition-all ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <td className="px-6 py-4 text-sm text-blue-700 font-bold whitespace-nowrap text-center">{order.orderNumber}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap text-center">{order.supplierName || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap text-center">{order.orderDate ? new Date(order.orderDate).toLocaleDateString() : 'N/A'}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap text-center">{order.dueDate ? new Date(order.dueDate).toLocaleDateString() : 'N/A'}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-blue-700 whitespace-nowrap text-center">PKR {order.total ? order.total.toLocaleString() : '0.00'}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-orange-600 whitespace-nowrap text-center">PKR {order.balance ? order.balance.toLocaleString() : '0.00'}</td>
                      <td className="px-6 py-4 text-sm font-medium whitespace-nowrap text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(getOrderStatus(order))}`}>{getOrderStatus(order)}</span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium whitespace-nowrap text-center">
                        <div className="flex justify-center gap-2">
                          {getOrderStatus(order) === 'Order Completed' ? (
                            order.invoiceNumber ? (
                              <span className="text-blue-600 text-sm font-medium">
                                Converted to {order.invoiceNumber}
                              </span>
                            ) : (
                              <span className="text-orange-600 text-sm font-medium">
                                Completed (No Invoice)
                              </span>
                            )
                          ) : (
                            <button 
                              onClick={() => handleConvertToPurchase(order)}
                              disabled={convertingOrder === order._id}
                              className={`text-green-600 hover:text-green-800 text-sm font-medium ${convertingOrder === order._id ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              Convert to Purchase
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        {isClient && (canEditData() || canDeleteData()) ? (
                        <TableActionMenu
                            onEdit={canEditData() ? async () => {
                            const token = getToken();
                            const id = order._id || order.id;
                            if (!id) return;
                              const result = await getPurchaseOrderById(id, token);
                            if (result && result.success && result.order) {
                              // Prepare purchaseData as in handleConvertToPurchase
                              const purchaseData = {
                                supplierName: result.order.supplierName || '',
                                phoneNo: result.order.supplierPhone || result.order.phoneNo || '',
                                dueDate: result.order.dueDate || '',
                                items: (result.order.items || []).map((item: any, index: number) => ({
                                  id: index + 1,
                                  item: item.item || '',
                                  qty: item.qty?.toString() || '',
                                  unit: item.unit || 'NONE',
                                  customUnit: item.customUnit || '',
                                  price: item.price?.toString() || '',
                                  amount: item.amount || 0
                                })),
                                discount: result.order.discount?.toString() || '',
                                discountType: result.order.discountType || '%',
                                tax: result.order.tax?.toString() || '',
                                taxType: result.order.taxType || '%',
                                paymentType: result.order.paymentType || 'Credit',
                                description: result.order.description || '',
                                sourceOrderId: result.order._id,
                                sourceOrderNumber: result.order.orderNumber
                              };
                              const queryParams = new URLSearchParams({
                                convertFromOrder: 'true',
                                orderData: JSON.stringify(purchaseData)
                              });
                              router.push(`/dashboard/purchaseAdd?${queryParams.toString()}`);
                            }
                            } : undefined}
                            onDelete={canDeleteData() ? () => handleDeleteOrder(order) : undefined}
                          // onView={() => ...} // Optional: implement view modal if needed
                        />
                        ) : (
                          <div className="text-gray-400 text-sm">No actions</div>
                        )}
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Add ConfirmDialog at the end */}
      <ConfirmDialog
        open={showDeleteDialog}
        title="Delete Purchase Order?"
        description={orderToDelete ? `Are you sure you want to delete purchase order ${orderToDelete.orderNumber}? This action cannot be undone.` : ''}
        onCancel={() => setShowDeleteDialog(false)}
        onConfirm={confirmDeleteOrder}
        loading={deleteLoading}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
}