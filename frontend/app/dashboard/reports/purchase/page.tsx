"use client";
import React, { useState, useRef, useEffect } from 'react';
import { Plus, MoreVertical, Search, Filter, Download, X, ChevronDown, Calendar, Share2, Save, Info, Camera, Image, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getToken, getUserIdFromToken } from '../../../lib/auth';
import { getPurchasesByUser, getPurchaseStatsByUser, deletePurchase } from '../../../../http/purchases';
import { jwtDecode } from 'jwt-decode';
import TableActionMenu from '../../../components/TableActionMenu';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { getCurrentUserInfo, canAddData, canEditData, canDeleteData } from '../../../../lib/roleAccessControl';

// Type definitions
interface Discount {
  percentage: string;
  amount: string;
}

interface ImageData {
  id: number;
  url: string;
  name: string;
}

interface FormData {
  billNumber: string;
  billDate: string;
  party: string;
  phoneNo: string;
  paymentType: string;
  discount: Discount;
  tax: string;
  taxAmount: number;
  description: string;
  images: ImageData[];
}

interface Item {
  id: number;
  category: string;
  item: string;
  itemCode: string;
  qty: string;
  unit: string;
  price: string;
  amount: number;
}

interface BillData extends FormData {
  id: number;
  type: string;
  items: Item[];
  total: number;
  createdAt: string;
  status: string;
}

// Database purchase interface
interface PurchaseData {
  _id: string;
  userId: string;
  supplierName: string;
  phoneNo: string;
  items: Array<{
    item: string;
    qty: number;
    unit: string;
    price: number;
    amount: number;
    customUnit?: string;
  }>;
  discount: number;
  discountType: string;
  discountValue: number;
  tax: number;
  taxType: string;
  taxValue: number;
  grandTotal: number;
  billNo: string;
  paymentType: string;
  description: string;
  imageUrl: string;
  createdAt: string;
  balance: number;
  paid: number;
}

interface PurchaseSaleFormPageProps {
  onClose: () => void;
  onSave: (billData: BillData) => void;
  type?: 'purchase' | 'sale';
}

// Purchase/Sale Form Page Component
function PurchaseSaleFormPage({ onClose, onSave, type = 'purchase' }: PurchaseSaleFormPageProps) {
  const [formData, setFormData] = useState<FormData>({
    billNumber: type === 'purchase' ? 'Purchase #1' : 'Sale #1',
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

  const [items, setItems] = useState<Item[]>([
    { id: 1, category: 'ALL', item: '', itemCode: '', qty: '', unit: 'NONE', price: '', amount: 0 },
    { id: 2, category: 'ALL', item: '', itemCode: '', qty: '', unit: 'NONE', price: '', amount: 0 }
  ]);

  const [showPartyDropdown, setShowPartyDropdown] = useState<boolean>(false);
  const [showDescription, setShowDescription] = useState<boolean>(false);
  const [showImageSection, setShowImageSection] = useState<boolean>(false);
  const [parties] = useState<{ name: string; phone: string; balance: string }[]>([
    { name: 'manaN', phone: '2345678', balance: '4556864' }
  ]);

  const addRow = () => {
    const newRow: Item = {
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

  const updateItem = (id: number, field: keyof Item, value: string) => {
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

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        const result = e.target?.result;
        if (typeof result === 'string') {
          setFormData(prev => ({
            ...prev,
            images: [
              ...prev.images,
              {
                id: Date.now() + Math.random(),
                url: result,
                name: file.name
              }
            ]
          }));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (imageId: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter(img => img.id !== imageId)
    }));
  };

  const handleSave = () => {
    const billData: BillData = {
      id: Date.now(),
      type: type,
      ...formData,
      items: items.filter(item => item.item || item.qty || item.price),
      total: calculateTotal(),
      createdAt: new Date().toISOString(),
      status: 'Draft'
    };

    console.log('Saving bill:', billData);

    if (onSave) {
      onSave(billData);
    }

    alert(`${type} bill saved successfully!\nBill Number: ${formData.billNumber}\nTotal: ₹${calculateTotal().toFixed(2)}`);
    onClose();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-4 md:p-6 mb-6 sticky top-0 z-30 border border-gray-100">
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div className="text-center md:text-left">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Purchase Bills</h1>
            <p className="text-sm text-gray-500 mt-1">Manage your purchases, bills, and payments</p>
          </div>
          <div className="flex flex-col md:flex-row gap-2 md:gap-4">
            <button
              onClick={handleSave}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow"
            >
              + Add Purchase
            </button>
            <button className="p-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors">
              <Settings className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="max-w-7xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow-sm p-6">
          {/* Party and Bill Details */}
          <div className="grid grid-cols-12 gap-4 mb-4">
            {/* Left Side - Party Details */}
            <div className="col-span-6">
              <div className="relative">
                <label className="block text-sm font-medium text-blue-600 mb-1">
                  Party <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder=""
                    value={formData.party}
                    onClick={() => setShowPartyDropdown(!showPartyDropdown)}
                    className="w-full p-2 border-2 border-blue-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer text-sm"
                    readOnly
                  />
                  <span className="absolute right-2 top-2.5 h-4 w-4 text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                  </span>

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
                            setFormData({ ...formData, party: party.name });
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

              <div className="mt-2">
                <input
                  type="text"
                  placeholder="Phone No."
                  value={formData.phoneNo}
                  onChange={(e) => setFormData({ ...formData, phoneNo: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                />
              </div>

              <div className="mt-2 text-xs">
                <div className="text-gray-600">Party Balance</div>
                <div className="font-semibold text-red-600">4556864 ₹</div>
              </div>
            </div>

            {/* Right Side - Bill Details */}
            <div className="col-span-6">
              <div className="text-right">
                <div className="mb-2">
                  <label className="block text-xs text-gray-600 mb-1">Bill Number</label>
                  <div className="text-sm font-medium">Purchase #1</div>
                </div>

                <div>
                  <label className="block text-xs text-blue-600 mb-1">Bill Date</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.billDate}
                      onChange={(e) => setFormData({ ...formData, billDate: e.target.value })}
                      className="w-24 p-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm text-right"
                    />
                    <Calendar className="absolute right-1 top-1.5 h-3 w-3 text-gray-400" />
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
                  <th className="px-2 py-2 text-left font-medium text-gray-600 uppercase">#</th>
                  <th className="px-2 py-2 text-left font-medium text-blue-600 uppercase">Category</th>
                  <th className="px-2 py-2 text-left font-medium text-blue-600 uppercase">Item</th>
                  <th className="px-2 py-2 text-left font-medium text-blue-600 uppercase">Item Code</th>
                  <th className="px-2 py-2 text-left font-medium text-blue-600 uppercase">Qty</th>
                  <th className="px-2 py-2 text-left font-medium text-blue-600 uppercase">Unit</th>
                  <th className="px-2 py-2 text-left font-medium text-blue-600 uppercase">Price/Unit</th>
                  <th className="px-2 py-2 text-left font-medium text-blue-600 uppercase">Amount</th>
                  <th className="px-2 py-2 text-left font-medium text-blue-600 uppercase">
                    <Info size={12} className="text-blue-500" />
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {items.map((item, index) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-2 py-2 text-sm">{index + 1}</td>
                    <td className="px-2 py-2">
                      <select
                        value={item.category}
                        onChange={(e) => updateItem(item.id, 'category', e.target.value)}
                        className="w-full p-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="ALL">ALL</option>
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={item.item}
                        onChange={(e) => updateItem(item.id, 'item', e.target.value)}
                        className="w-full p-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={item.itemCode}
                        onChange={(e) => updateItem(item.id, 'itemCode', e.target.value)}
                        className="w-full p-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        value={item.qty}
                        onChange={(e) => updateItem(item.id, 'qty', e.target.value)}
                        className="w-full p-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-2 py-2">
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
                    <td className="px-2 py-2">
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

          {/* Payment Section */}
          <div className="grid grid-cols-12 gap-4 mb-4">
            {/* Payment Type */}
            <div className="col-span-3">
              <label className="block text-xs text-gray-600 mb-1">Payment Type</label>
              <select
                value={formData.paymentType}
                onChange={(e) => setFormData({ ...formData, paymentType: e.target.value })}
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
            <div className="col-span-6"></div>

            {/* Discount and Tax */}
            <div className="col-span-3">
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
                          discount: { ...formData.discount, percentage: e.target.value }
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
                          discount: { ...formData.discount, amount: e.target.value }
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
                      onChange={(e) => setFormData({ ...formData, tax: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter description here..."
                  className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                  rows={3}
                />
              </div>
            )}
          </div>

          {/* Add Image Section */}
          <div className="mb-4">
            <div
              className="flex items-center gap-2 text-gray-600 cursor-pointer hover:text-blue-600"
              onClick={() => setShowImageSection(!showImageSection)}
            >
              <div className={`w-4 h-4 border border-gray-400 rounded flex items-center justify-center ${showImageSection ? 'bg-blue-100 border-blue-400' : ''}`}>
                {showImageSection && <div className="w-2 h-2 bg-blue-600 rounded-full"></div>}
              </div>
              <span className="text-sm font-medium text-gray-500">ADD IMAGE</span>
            </div>

            {showImageSection && (
              <div className="mt-3">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                  />
                  <label htmlFor="image-upload" className="cursor-pointer">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                        <Camera size={24} className="text-gray-400" />
                      </div>
                      <span className="text-sm text-gray-600">Click to upload images</span>
                      <span className="text-xs text-gray-400">Support: JPG, PNG, GIF</span>
                    </div>
                  </label>
                </div>

                {/* Display uploaded images */}
                {formData.images.length > 0 && (
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    {formData.images.map((image) => (
                      <div key={image.id} className="relative">
                        <img
                          src={image.url}
                          alt={image.name}
                          className="w-full h-20 object-cover rounded border"
                        />
                        <button
                          onClick={() => removeImage(image.id)}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-200">
            <button className="flex items-center gap-1 px-4 py-2 border border-blue-300 rounded text-blue-600 hover:bg-blue-50 text-sm">
              Share
              <ChevronDown size={12} />
            </button>
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

export default function PurchaseBillsPage() {
  const [businessName, setBusinessName] = useState<string>('Enter Business Name');
  const [purchases, setPurchases] = useState<PurchaseData[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalGrandTotal: 0,
    totalBalance: 0,
    totalPaid: 0
  });
  const router = useRouter();

  // Add state for filterType, dateFrom, dateTo
  const [filterType, setFilterType] = useState<string>('All');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const dateRanges: { value: string; label: string }[] = [
    { value: 'All', label: 'All Time' },
    { value: 'Today', label: 'Today' },
    { value: 'Yesterday', label: 'Yesterday' },
    { value: 'This Week', label: 'This Week' },
    { value: 'This Month', label: 'This Month' },
    { value: 'Last Month', label: 'Last Month' },
    { value: 'This Year', label: 'This Year' },
    { value: 'Custom', label: 'Custom Range' },
  ];

  // Add state for status filter and dropdown open/close
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [showDateDropdown, setShowDateDropdown] = useState<boolean>(false);
  const dateDropdownRef = useRef<HTMLDivElement>(null);
  const dateDropdownButtonRef = useRef<HTMLButtonElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dateDropdownRef.current &&
        !dateDropdownRef.current.contains(event.target as Node) &&
        dateDropdownButtonRef.current &&
        !dateDropdownButtonRef.current.contains(event.target as Node)
      ) {
        setShowDateDropdown(false);
      }
    }
    if (showDateDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDateDropdown]);

  // Add state for confirm dialog
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [purchaseToDelete, setPurchaseToDelete] = useState<PurchaseData | null>(null);
  
  // Role-based access control
  const [userInfo, setUserInfo] = useState<any>(null)
  const [isClient, setIsClient] = useState(false)

  // Fetch purchases and stats from API
  React.useEffect(() => {
    // Set client-side flag for hydration safety
    setIsClient(true);
    
    // Get current user info for role-based access
    const currentUserInfo = getCurrentUserInfo();
    setUserInfo(currentUserInfo);
    
    const fetchPurchases = async () => {
      try {
        setLoading(true);
        const token = getToken();
        if (!token) {
          console.error('No authentication token found');
          return;
        }

        // Get userId from token
        const userId = getUserIdFromToken();

        if (!userId) {
          console.error('No user ID found in token');
          return;
        }

        // Fetch purchases
        const purchasesResponse = await getPurchasesByUser(userId, token);
        if (purchasesResponse.success) {
          const mapped = (purchasesResponse.purchases || []).map((purchase: any) => ({
            ...purchase,
            id: purchase._id || purchase.id,
          }));
          setPurchases(mapped);
        }

        // Fetch stats
        const statsResponse = await getPurchaseStatsByUser(userId, token);
        if (statsResponse.success) {
          setStats(statsResponse.stats || {
            totalGrandTotal: 0,
            totalBalance: 0,
            totalPaid: 0
          });
        }
      } catch (error) {
        console.error('Error fetching purchases:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPurchases();
  }, []);

  const handleAddPurchase = () => {
    // Navigate to purchase add page with purchase bills context
    router.push('/dashboard/purchaseAdd?from=purchase-bills');
  };

  const getDateRange = (filterType: string) => {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    switch (filterType) {
      case 'Today':
        return { from: startOfDay, to: endOfDay };
      case 'Yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return {
          from: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate()),
          to: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59)
        };
      case 'This Week':
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        return {
          from: new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate()),
          to: endOfDay
        };
      case 'This Month':
        return {
          from: new Date(today.getFullYear(), today.getMonth(), 1),
          to: endOfDay
        };
      case 'Last Month':
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59);
        return { from: lastMonth, to: lastMonthEnd };
      case 'This Year':
        return {
          from: new Date(today.getFullYear(), 0, 1),
          to: endOfDay
        };
      default:
        return null;
    }
  };

  const handleFilterTypeChange = (newFilterType: string) => {
    setFilterType(newFilterType);
    if (newFilterType === 'Custom') {
      // Keep current date range
      setShowDateDropdown(false);
      return;
    }
    const dateRange = getDateRange(newFilterType);
    if (dateRange) {
      setDateFrom(dateRange.from.toISOString().split('T')[0]);
      setDateTo(dateRange.to.toISOString().split('T')[0]);
    } else {
      setDateFrom('');
      setDateTo('');
    }
    setShowDateDropdown(false);
  };

  // Delete handler
  const handleDeletePurchase = (purchase: PurchaseData) => {
    setPurchaseToDelete(purchase);
    setShowDeleteDialog(true);
  };

  const confirmDeletePurchase = async () => {
    if (!purchaseToDelete) return;
    setDeleteLoading(true);
    try {
      const token = getToken();
      if (!token) {
        setDeleteLoading(false);
        return;
      }
      await deletePurchase(purchaseToDelete._id, token);
      setPurchases((prev) => prev.filter((p) => p._id !== purchaseToDelete._id));
      setShowDeleteDialog(false);
      setPurchaseToDelete(null);
      // Optionally, refresh purchases from backend here
    } catch (err: any) {
      // Optionally, show error
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50 p-3">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-md p-3 mb-4 sticky top-0 z-30 border border-gray-100">
          <div className="flex flex-col space-y-3 md:flex-row md:items-center md:justify-between md:space-y-0">
            <div className="text-center md:text-left">
              <h1 className="text-lg md:text-xl font-bold text-gray-900">Purchase Bills</h1>
              <p className="text-xs text-gray-500 mt-1">Manage your purchases, bills, and payments</p>
            </div>
            <div className="flex flex-col md:flex-row gap-2 md:gap-3">
              {isClient && canAddData() ? (
                <button
                  onClick={handleAddPurchase}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg font-medium flex items-center gap-2 transition-colors shadow text-sm"
                >
                  + Add Purchase
                </button>
              ) : (
                <div className="bg-gray-100 text-gray-500 px-4 py-1.5 rounded-lg font-medium flex items-center gap-2 text-sm">
                  + Add Purchase (Restricted)
                </div>
              )}
              <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <Settings className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>
        </div>

        {/* Stats Grid (like sales) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
          <div className="bg-gradient-to-br from-blue-100 to-blue-50 p-4 rounded-xl shadow group hover:shadow-md transition-all flex flex-col items-start">
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-500 text-white mb-2 text-lg">🛒</div>
            <div className="text-lg font-bold text-blue-700">PKR {purchases.reduce((sum: number, p: PurchaseData) => sum + (p.grandTotal || 0), 0).toLocaleString()}</div>
            <div className="text-xs text-gray-500">Total Purchases</div>
          </div>
          <div className="bg-gradient-to-br from-green-100 to-green-50 p-4 rounded-xl shadow group hover:shadow-md transition-all flex flex-col items-start">
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-green-500 text-white mb-2 text-lg">⬆️</div>
            <div className="text-lg font-bold text-green-700">PKR {purchases.reduce((sum: number, p: PurchaseData) => sum + (p.paid || 0), 0).toLocaleString()}</div>
            <div className="text-xs text-gray-500">Total Paid</div>
          </div>
          <div className="bg-gradient-to-br from-orange-100 to-orange-50 p-4 rounded-xl shadow group hover:shadow-md transition-all flex flex-col items-start">
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-orange-500 text-white mb-2 text-lg">🧾</div>
            <div className="text-lg font-bold text-orange-700">PKR {purchases.reduce((sum: number, p: PurchaseData) => sum + (p.balance || 0), 0).toLocaleString()}</div>
            <div className="text-xs text-gray-500">Balance Due</div>
          </div>
        </div>

        {/* Search & Filters Section (like sales) */}
        <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow p-3 mb-4 border border-gray-100 z-[1]">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
            {/* Modern Search Bar */}
            <div className="relative w-full md:w-72">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-sm">🔍</span>
              <input
                type="text"
                placeholder="Search bills..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-lg bg-white/80 shadow focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border border-gray-200 transition-all placeholder-gray-400 text-gray-900 text-sm"
              />
            </div>
            {/* Filter Tabs/Pills */}
            <div className="flex gap-2 md:gap-3">
              {['All', 'Paid', 'Pending', 'Overdue'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors text-xs border-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${statusFilter === tab
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
              <div ref={dateDropdownRef} className="relative w-full sm:w-48">
                <button
                  ref={dateDropdownButtonRef}
                  type="button"
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-white/80 shadow border border-gray-200 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all group text-sm"
                  onClick={() => setShowDateDropdown((v) => !v)}
                  aria-haspopup="listbox"
                  aria-expanded={showDateDropdown ? 'true' : 'false'}
                >
                  <span className="truncate">{dateRanges.find(r => r.value === filterType)?.label || 'All Time'}</span>
                  <svg className={`w-4 h-4 ml-2 transition-transform ${showDateDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                </button>
                {showDateDropdown && (
                  <ul
                    className="absolute z-[100] bg-white rounded-lg shadow-lg border border-gray-100 py-1 max-h-60 overflow-auto animate-fadeinup w-full"
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
                className="px-3 py-1.5 rounded-lg bg-white border-2 border-gray-200 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm min-w-[130px] text-xs"
                placeholder="From Date"
                disabled={filterType !== 'Custom' && filterType !== 'All'}
              />
              <span className="text-gray-500 text-xs">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-white border-2 border-gray-200 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm min-w-[130px] text-xs"
                placeholder="To Date"
                disabled={filterType !== 'Custom' && filterType !== 'All'}
              />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 border-b border-gray-200 gap-3">
            <h2 className="text-base font-semibold text-gray-900">Transactions</h2>
            <div className="flex gap-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search transactions..."
                  className="pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg text-xs w-full md:w-56 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>
              <button
                className="p-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
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
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Bill #</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Supplier</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Date</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Amount</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Paid</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Balance</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-gray-500 text-sm">
                      Loading purchases...
                    </td>
                  </tr>
                ) : purchases.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-gray-500 text-sm font-medium">
                      {loading ? 'Loading purchase bills...' : 'No purchase bills found. Create your first purchase!'}
                    </td>
                  </tr>
                ) : (
                  purchases
                    .filter(purchase => {
                      // Search filter
                      const searchLower = searchTerm.toLowerCase();
                      const matchesSearch = 
                        purchase.supplierName.toLowerCase().includes(searchLower) ||
                        purchase.billNo.toLowerCase().includes(searchLower);
                      
                      // Status filter
                      let matchesStatus = true;
                      if (statusFilter === 'Paid') {
                        matchesStatus = purchase.balance === 0;
                      } else if (statusFilter === 'Pending') {
                        matchesStatus = purchase.balance > 0;
                      } else if (statusFilter === 'Overdue') {
                        matchesStatus = purchase.balance > 0;
                      }
                      
                      return matchesSearch && matchesStatus;
                    })
                    .map((purchase: PurchaseData, idx: number) => (
                      <tr key={purchase._id || idx} className={`hover:bg-blue-50/40 transition-all ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                        <td className="px-6 py-4 text-sm text-blue-700 font-bold whitespace-nowrap text-center">
                          {purchase.billNo}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap text-left">
                          <div className="text-sm text-gray-900">{purchase.supplierName}</div>
                          <div className="text-xs text-gray-500">{purchase.phoneNo}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap text-center">
                          {purchase.createdAt ? new Date(purchase.createdAt).toLocaleDateString('en-IN') : 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-blue-700 whitespace-nowrap text-center">
                          PKR {purchase.grandTotal?.toLocaleString() || '0'}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-green-700 whitespace-nowrap text-center">
                          PKR {purchase.paid?.toLocaleString() || '0'}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-orange-700 whitespace-nowrap text-center">
                          PKR {purchase.balance?.toLocaleString() || '0'}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-center">
                          <span className={`px-3 py-1 text-xs font-medium rounded-full border ${purchase.balance === 0 ? 'bg-green-100 text-green-800 border-green-200' : 'bg-orange-100 text-orange-800 border-orange-200'}`}>{purchase.balance === 0 ? 'Paid' : 'Unpaid'}</span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          {isClient && (canEditData() || canDeleteData()) ? (
                            <TableActionMenu
                              onEdit={canEditData() ? () => router.push(`/dashboard/purchaseAdd?id=${purchase._id}`) : undefined}
                              onDelete={canDeleteData() ? () => handleDeletePurchase(purchase) : undefined}
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
      </div>
      <ConfirmDialog
        open={showDeleteDialog}
        title="Delete Purchase Bill?"
        description={purchaseToDelete ? `Are you sure you want to delete purchase bill ${purchaseToDelete.billNo}? This action cannot be undone.` : ''}
        onCancel={() => setShowDeleteDialog(false)}
        onConfirm={confirmDeletePurchase}
        loading={deleteLoading}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </>
  );
}