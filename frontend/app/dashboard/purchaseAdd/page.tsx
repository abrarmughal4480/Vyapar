"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ReactDOM from 'react-dom';
import Toast from '../../components/Toast';
import { Plus, ChevronDown, Calendar, Info, Camera } from 'lucide-react';
import { getToken } from '../../lib/auth';
import { fetchPartiesByUserId, getPartyBalance } from '../../../http/parties';
import { getUserItems } from '../../../http/items';
import { createPurchase } from '../../../http/purchases';
import { createPurchaseOrder, updatePurchaseOrder } from '../../../http/purchaseOrders';
import { jwtDecode } from 'jwt-decode';

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

type DropdownOption = { value: string; label: string };

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

// Update PurchaseItem type
type PurchaseItem = {
  id: number;
  item: string;
  itemCode: string;
  qty: string;
  unit: string;
  customUnit: string;
  price: string;
  amount: number;
};

export default function AddPurchasePage() {
  const router = useRouter();
  const [pageTitle, setPageTitle] = useState('Add Purchase Bill');
  const [pageType, setPageType] = useState<'purchase-bill' | 'purchase-order'>('purchase-bill');
  const [originalOrderId, setOriginalOrderId] = useState<string | null>(null);
  const [originalOrderDueDate, setOriginalOrderDueDate] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
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

  const [items, setItems] = useState<Item[]>([
    { id: 1, category: 'ALL', item: '', itemCode: '', qty: '', unit: 'NONE', price: '', amount: 0 },
    { id: 2, category: 'ALL', item: '', itemCode: '', qty: '', unit: 'NONE', price: '', amount: 0 }
  ]);

  const [showPartyDropdown, setShowPartyDropdown] = useState<boolean>(false);
  const [showDescription, setShowDescription] = useState<boolean>(false);
  const [showImageSection, setShowImageSection] = useState<boolean>(false);

  const [newPurchase, setNewPurchase] = useState({
    partyName: '',
    phoneNo: '',
    billDate: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: new Date().toISOString().split('T')[0],
    items: [
      { id: 1, item: '', itemCode: '', qty: '', unit: 'NONE', customUnit: '', price: '', amount: 0 },
      { id: 2, item: '', itemCode: '', qty: '', unit: 'NONE', customUnit: '', price: '', amount: 0 }
    ],
    discount: '',
    discountAmount: '',
    discountType: '%',
    tax: '',
    taxAmount: '',
    taxType: '%',
    paymentType: 'Cash',
    description: '',
    editingId: null
  });

  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [parties, setParties] = useState<any[]>([]);
  const [showPartySuggestions, setShowPartySuggestions] = useState(false);
  const [showItemSuggestions, setShowItemSuggestions] = useState<{[id: number]: boolean}>({});
  const [itemSuggestions, setItemSuggestions] = useState<any[]>([]);
  const [partyBalance, setPartyBalance] = useState<number|null>(null);
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' } | null>(null);
  const [formErrors, setFormErrors] = useState<any>({});
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const itemInputRefs = useRef<{[id: number]: HTMLInputElement | null}>({});
  const [redirectTo, setRedirectTo] = useState('/dashboard/purchase');
  
  // Check if opened from different contexts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const fromContext = urlParams.get('from');
      const orderDataParam = urlParams.get('orderData');
      const convertFromOrder = urlParams.get('convertFromOrder');
      
      if (fromContext === 'purchase-order') {
        setPageTitle('Add Purchase Order');
        setPageType('purchase-order');
        setRedirectTo('/dashboard/purchase-order');
        
        // If order data is provided, populate the form
        if (orderDataParam) {
          try {
            const orderData = JSON.parse(decodeURIComponent(orderDataParam));
            setOriginalOrderId(orderData._id);
            setOriginalOrderDueDate(orderData.dueDate || null);
            setNewPurchase(prev => ({
              ...prev,
              partyName: orderData.supplierName || '',
              phoneNo: orderData.phoneNo || '',
              items: orderData.items?.map((item: any, index: number) => ({
                id: index + 1,
                item: item.item || '',
                itemCode: item.itemCode || '',
                qty: item.qty?.toString() || '',
                unit: item.unit || 'NONE',
                customUnit: item.customUnit || '',
                price: item.price?.toString() || '',
                amount: item.amount || 0
              })) || prev.items,
              orderDate: orderData.orderDate || new Date().toISOString().split('T')[0],
              dueDate: orderData.dueDate || new Date().toISOString().split('T')[0]
            }));
          } catch (error) {
            console.error('Error parsing order data:', error);
          }
        }
      } else if (convertFromOrder === 'true' && orderDataParam) {
        // Handle conversion from purchase order
        setPageTitle('Add Purchase Bill');
        setPageType('purchase-bill');
        
        try {
          const orderData = JSON.parse(orderDataParam);
          setOriginalOrderId(orderData.sourceOrderId);
          setOriginalOrderDueDate(orderData.dueDate || null);
          setNewPurchase(prev => ({
            ...prev,
            partyName: orderData.supplierName || '',
            phoneNo: orderData.phoneNo || '',
            items: orderData.items?.map((item: any, index: number) => ({
              id: index + 1,
              item: item.item || '',
              itemCode: item.itemCode || '',
              qty: item.qty?.toString() || '',
              unit: item.unit || 'NONE',
              customUnit: item.customUnit || '',
              price: item.price?.toString() || '',
              amount: item.amount || 0
            })) || prev.items,
            discount: orderData.discount || '',
            discountType: orderData.discountType || '%',
            tax: orderData.tax || '',
            taxType: orderData.taxType || '%',
            paymentType: orderData.paymentType || 'Credit',
            description: orderData.description || ''
          }));
        } catch (error) {
          console.error('Error parsing order data:', error);
        }
      } else if (fromContext === 'purchase-bills') {
        setPageTitle('Add Purchase Bill');
        setPageType('purchase-bill');
      }
    }
  }, []);

  // Fetch parties and items on component mount
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      await fetchPartySuggestions();
      await fetchItemSuggestions();
      setLoading(false);
    };
    initializeData();
  }, []);

  // Clear party balance when party name changes
  useEffect(() => {
    if (!newPurchase.partyName) {
      setPartyBalance(null);
      return;
    }
    fetchPartyBalance(newPurchase.partyName);
  }, [newPurchase.partyName]);

  useEffect(() => {
    if (!newPurchase.partyName || !parties.length) return;
    const matchedParty = parties.find(
      (p) => p.name && p.name.toLowerCase() === newPurchase.partyName.toLowerCase()
    );
    if (matchedParty && matchedParty.phone && newPurchase.phoneNo !== matchedParty.phone) {
      setNewPurchase((prev) => ({
        ...prev,
        phoneNo: matchedParty.phone
      }));
    }
  }, [newPurchase.partyName, parties]);

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
    return newPurchase.items.reduce((sum, item) => sum + (item.amount || 0), 0);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageUploading(true);
      setTimeout(() => {
        setUploadedImage(URL.createObjectURL(file));
        setImageUploading(false);
      }, 1000);
    }
  };

  const removeImage = () => setUploadedImage(null);

  const handleSave = () => {
    const billData: BillData = {
      id: Date.now(),
      type: 'purchase',
      ...formData,
      items: items.filter(item => item.item || item.qty || item.price),
      total: calculateTotal(),
      createdAt: new Date().toISOString(),
      status: 'Draft'
    };
    // Save to localStorage
    const prev = JSON.parse(localStorage.getItem('purchases') || '[]');
    localStorage.setItem('purchases', JSON.stringify([...prev, billData]));
    alert(`Purchase bill saved successfully!\nBill Number: ${formData.billNumber}\nTotal: PKR${calculateTotal().toFixed(2)}`);
    router.push('/dashboard/purchase');
  };

  // Validation
  const validateForm = () => {
    const errors: any = {};
    if (!newPurchase.partyName) errors.partyName = 'Supplier is required';
    const validItems = newPurchase.items.filter(item => item.item && parseFloat(item.qty) > 0 && parseFloat(item.price) > 0);
    if (validItems.length === 0) errors.items = 'At least one valid item is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewPurchase(prev => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (id: number, field: string, value: any) => {
    setNewPurchase(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === id) {
          let updated = { ...item, [field]: value };
          if (field === 'unit' && value !== 'Custom') {
            updated.customUnit = '';
          }
          updated.amount =
            field === 'qty' || field === 'price'
              ? (parseFloat(field === 'qty' ? value : item.qty) || 0) * (parseFloat(field === 'price' ? value : item.price) || 0)
              : item.amount;
          return updated;
        }
        return item;
      })
    }));
  };

  const addNewRow = () => {
    const lastItem = newPurchase.items[newPurchase.items.length - 1];
    if (!lastItem.item || !lastItem.qty || !lastItem.price) {
      setToast({ message: 'Please fill the last row before adding a new one.', type: 'error' });
      return;
    }
    setNewPurchase(prev => ({
      ...prev,
      items: [
        ...prev.items,
        { id: Date.now(), item: '', itemCode: '', qty: '', unit: 'NONE', customUnit: '', price: '', amount: 0 }
      ]
    }));
  };

  const deleteRow = (id: number) => {
    if (newPurchase.items.length === 1) return;
    setNewPurchase(prev => ({ ...prev, items: prev.items.filter(item => item.id !== id) }));
  };

  // Fetch parties from API
  const fetchPartySuggestions = async () => {
    try {
      const token = getToken();
      if (!token) {
        setToast({ message: 'Authentication required', type: 'error' });
        return;
      }
      const response = await fetchPartiesByUserId(token);
      // Handle both response formats: { data: [...] } or direct array
      const partiesData = response.data || response || [];
      setParties(partiesData);
      console.log('Fetched parties:', partiesData);
    } catch (error) {
      console.error('Error fetching parties:', error);
      setToast({ message: 'Failed to fetch parties', type: 'error' });
    }
  };

  // Fetch party balance
  const fetchPartyBalance = async (partyName: string) => {
    try {
      const token = getToken();
      if (!token) return;
      const response = await getPartyBalance(partyName, token);
      const balance = response.balance || response || 0;
      setPartyBalance(balance);
      console.log('Party balance for', partyName, ':', balance);
    } catch (error) {
      console.error('Error fetching party balance:', error);
      setPartyBalance(null);
    }
  };

  const fetchItemSuggestions = async () => {
    const token = getToken();
    if (!token) {
      console.log('No token found for fetching items');
      return;
    }
    try {
      const response = await getUserItems(token);
      console.log('Fetched items response:', response);
      
      // Handle different response formats
      let items = [];
      if (response && response.success && response.items) {
        items = response.items;
      } else if (Array.isArray(response)) {
        items = response;
      } else if (response && response.data) {
        items = response.data;
      }
      
      console.log('Processed items:', items);
      setItemSuggestions(items || []);
    } catch (error) {
      console.error('Error fetching items:', error);
      setItemSuggestions([]);
    }
  };

  // Totals calculation
  const subTotal = calculateTotal();
  let discountValue = 0;
  if (newPurchase.discount && !isNaN(Number(newPurchase.discount))) {
    if (newPurchase.discountType === '%') {
      discountValue = subTotal * Number(newPurchase.discount) / 100;
    } else {
      discountValue = Number(newPurchase.discount);
    }
  }
  // Tax calculation
  let taxValue = 0;
  if (newPurchase.tax && !isNaN(Number(newPurchase.tax))) {
    if (newPurchase.taxType === '%') {
      taxValue = (subTotal - discountValue) * Number(newPurchase.tax) / 100;
    } else if (newPurchase.taxType === 'PKR') {
      taxValue = Number(newPurchase.tax);
    }
  }
  const grandTotal = Math.max(0, subTotal - discountValue + taxValue);

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    try {
      const token = getToken();
      if (!token) {
        throw new Error('Authentication token not found');
      }

      // Prepare common data
      const commonData = {
        supplierName: newPurchase.partyName,
        phoneNo: newPurchase.phoneNo,
        items: newPurchase.items
          .filter(item => 
            item.item &&
            item.qty &&
            item.price &&
            !isNaN(Number(item.qty)) &&
            !isNaN(Number(item.price))
          )
          .map(item => ({
            item: item.item,
            qty: Number(item.qty),
            unit: item.unit === 'NONE' ? 'Piece' : item.unit,
            price: Number(item.price),
            amount: Number(item.amount),
            customUnit: item.customUnit || ''
          })),
        discount: newPurchase.discount || 0,
        discountType: newPurchase.discountType || '%',
        tax: newPurchase.tax || 0,
        taxType: newPurchase.taxType || '%',
        paymentType: newPurchase.paymentType || 'Credit',
        description: newPurchase.description || '',
        imageUrl: uploadedImage || '',
        orderDate: newPurchase.invoiceDate,
        dueDate: newPurchase.dueDate ? new Date(newPurchase.dueDate).toISOString() : null,
        sourceOrderId: originalOrderId // Include the source order ID for conversion
      };

      console.log('Due date being sent:', {
        originalDueDate: newPurchase.dueDate,
        convertedDueDate: newPurchase.dueDate ? new Date(newPurchase.dueDate).toISOString() : null,
        commonData: commonData
      });

      let response;
      let successMessage;
      let redirectPath;

      if (pageType === 'purchase-order') {
        // Create purchase order
        const orderData = {
          ...commonData,
          orderDate: new Date().toISOString().split('T')[0],
          dueDate: new Date().toISOString().split('T')[0],
          status: 'Created'
        };
        
        response = await createPurchaseOrder(token, orderData);
        successMessage = 'Purchase order created successfully!';
        redirectPath = '/dashboard/purchase-order';
      } else {
        // Create purchase bill
        response = await createPurchase(commonData, token);
        successMessage = 'Purchase bill created successfully!';
        redirectPath = '/dashboard/purchase';
        
        // If this was a conversion from purchase order, update the original order status and invoice number
        if (originalOrderId) {
          try {
            console.log('=== CONVERTING PURCHASE ORDER TO PURCHASE ===');
            console.log('Source Order ID:', originalOrderId);
            console.log('Purchase Bill No:', response?.purchase?.billNo || response?.billNo || response?.billNumber || '');
            console.log('Token:', token ? 'Present' : 'Missing');
            
            // Use the actual purchase bill number for invoiceNumber
            const billNumber = response?.purchase?.billNo || response?.billNo || response?.billNumber || response?.id || '';
            console.log('=== CONVERT PURCHASE ORDER DEBUG ===');
            console.log('Response:', response);
            console.log('Purchase object:', response?.purchase);
            console.log('Attempting to update purchase order with:', {
              orderId: originalOrderId,
              billNumber: billNumber,
              purchaseId: response?.purchase?._id || response?._id
            });
            
            try {
              const updateResult = await updatePurchaseOrder(token, originalOrderId, { 
                status: 'Completed',
                invoiceNumber: billNumber,
                convertedToInvoice: response?.purchase?._id || response?._id || null,
                dueDate: originalOrderDueDate ? new Date(originalOrderDueDate).toISOString() : (newPurchase.dueDate ? new Date(newPurchase.dueDate).toISOString() : null)
              });
              
              console.log('Update result:', updateResult);
              
              if (updateResult && updateResult.success) {
                console.log('Purchase order update successful!');
                successMessage = `Purchase bill created! Bill No: ${billNumber}. Purchase Order converted successfully.`;
              } else {
                console.error('Update failed:', updateResult);
                successMessage = `Purchase bill created! Bill No: ${billNumber}. Note: Could not update purchase order status.`;
              }
            } catch (updateError: any) {
              console.error('Error updating purchase order:', updateError);
              console.error('Update error details:', {
                message: updateError.message,
                response: updateError.response?.data,
                status: updateError.response?.status
              });
              successMessage = `Purchase bill created! Bill No: ${billNumber}. Note: Could not update purchase order status.`;
            }
          } catch (error) {
            console.error('Error updating purchase order status:', error);
            successMessage = `Purchase bill created! Bill No: ${response?.purchase?.billNo || response?.billNo || response?.billNumber || ''}. Note: Could not update purchase order status.`;
          }
        }
      }
      
      if (response.success) {
        setToast({ message: successMessage, type: 'success' });
        setTimeout(() => router.push(redirectPath || redirectTo), 1200);
      } else {
        throw new Error(response.message || 'Failed to create purchase');
      }
    } catch (err: any) {
      console.error('Purchase creation error:', err);
      setToast({ message: err.message || 'Failed to create purchase', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('convertFromOrder') === 'true') {
        setRedirectTo('/dashboard/purchase-order');
      }
    }
  }, []);

  return (
    <div className="relative min-h-screen">
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white bg-opacity-80">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mb-4"></div>
            <div className="text-lg text-blue-700 font-semibold">Loading...</div>
          </div>
        </div>
      )}
      {!loading && (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-2 sm:px-4 md:px-8">
          {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
          <div className="w-full h-auto bg-white/90 rounded-2xl shadow-2xl border border-gray-100 overflow-hidden mx-auto my-6">
            {/* Sticky Header - match sale add page */}
            <div className="sticky top-0 z-10 bg-white/90 border-b border-gray-200 flex justify-between items-center px-6 py-4">
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">{pageTitle}</h1>
              <button
                type="button"
                onClick={() => router.push(redirectTo)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
                aria-label="Cancel"
              >
                ✕
              </button>
            </div>
            {/* Supplier and Date Section - match sale add page */}
            <form onSubmit={handleSubmit} className="divide-y divide-gray-200 w-full">
              <div className="bg-gray-50 px-6 py-6 w-full">
                <div className={`grid gap-6 ${pageType === 'purchase-order' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                  {/* Supplier and Phone - Full width for purchase bills */}
                  <div className={`grid gap-4 ${pageType === 'purchase-order' ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-2'}`}>
                    <div>
                      <label className="block text-sm font-medium text-blue-600 mb-2">Supplier *</label>
                      <div className="relative">
                        <input
                          type="text"
                          name="partyName"
                          value={newPurchase.partyName}
                          onChange={handleInputChange}
                          onFocus={() => {
                            fetchPartySuggestions();
                            setShowPartySuggestions(true);
                          }}
                          onBlur={() => setTimeout(() => setShowPartySuggestions(false), 200)}
                          className={`w-full px-4 py-3 border-2 rounded-lg transition-all duration-200 ${formErrors.partyName ? 'border-red-300 bg-red-50' : 'border-blue-200 focus:border-blue-500'} focus:ring-2 focus:ring-blue-200 focus:outline-none`}
                          placeholder="Search or enter supplier name"
                        />
                        {showPartySuggestions && (
                          <div className="absolute left-0 right-0 mt-1 w-full z-50">
                            {parties.length > 0 ? (
                              <ul className="bg-white border border-blue-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                {parties.map((party: any) => (
                                  <li
                                    key={party._id}
                                    className="px-4 py-2 hover:bg-blue-100 cursor-pointer transition-colors"
                                    onMouseDown={() => {
                                      setNewPurchase(prev => ({ 
                                        ...prev, 
                                        partyName: party.name, 
                                        phoneNo: party.phone || '' 
                                      }));
                                      setShowPartySuggestions(false);
                                      fetchPartyBalance(party.name);
                                    }}
                                  >
                                    {party.name} {party.phone && <span className="text-xs text-gray-400">({party.phone})</span>}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <div className="bg-white border border-blue-200 rounded-lg shadow-lg px-4 py-2 text-gray-400">No suppliers found.</div>
                            )}
                          </div>
                        )}
                      </div>
                      {partyBalance !== null && (
                        <div className={`text-xs mt-1 font-semibold ${partyBalance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          Balance: PKR {Math.abs(partyBalance).toLocaleString()}
                        </div>
                      )}
                      {formErrors.partyName && <p className="text-xs text-red-500 mt-1">{formErrors.partyName}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                      <input
                        type="text"
                        name="phoneNo"
                        value={newPurchase.phoneNo}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                        placeholder="Phone number"
                      />
                    </div>
                  </div>
                  {/* Right: Invoice Date and Due Date - Only for Purchase Orders */}
                  {pageType === 'purchase-order' && (
                    <div className="flex flex-col gap-4 items-end justify-start">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Invoice Date</label>
                        <input
                          type="date"
                          name="invoiceDate"
                          value={newPurchase.invoiceDate || new Date().toISOString().split('T')[0]}
                          onChange={handleInputChange}
                          className="w-40 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Due Date</label>
                        <input
                          type="date"
                          name="dueDate"
                          value={newPurchase.dueDate || new Date().toISOString().split('T')[0]}
                          onChange={handleInputChange}
                          className="w-40 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {/* Items Table Section - match sale add page */}
              <div className={`bg-white px-6 py-6 w-full rounded-b-2xl ${formErrors.items ? 'border-2 border-red-300' : ''}`}>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-blue-800 flex items-center gap-2">
                    <span>🛒</span> Items
                  </h2>
                  <button
                    type="button"
                    onClick={addNewRow}
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
                      {newPurchase.items.map((item, index) => {
                        const handleFocus = async (event: React.FocusEvent<HTMLInputElement>) => {
                          console.log('Item input focused, fetching suggestions...');
                          await fetchItemSuggestions();
                          console.log('Setting showItemSuggestions to true for item:', item.id);
                          setShowItemSuggestions(prev => ({ ...prev, [item.id]: true }));
                          
                          const rect = event.target.getBoundingClientRect();
                          const style: React.CSSProperties = {
                            position: 'absolute',
                            top: rect.bottom + window.scrollY + 4,
                            left: rect.left + window.scrollX,
                            width: rect.width,
                            zIndex: 9999,
                            maxHeight: '200px',
                            overflowY: 'auto' as const
                          };
                          console.log('Setting dropdown style:', style);
                          setDropdownStyle(style);
                        };

                        return (
                          <tr
                            key={item.id}
                            className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-blue-50'} hover:bg-blue-100 transition-colors`}
                          >
                            <td className="py-2 px-2 font-medium">{index + 1}</td>
                            <td className="py-2 px-2">
                              <input
                                type="text"
                                value={item.item}
                                onChange={e => handleItemChange(item.id, 'item', e.target.value)}
                                onFocus={handleFocus}
                                onBlur={() => setTimeout(() => setShowItemSuggestions(prev => ({ ...prev, [item.id]: false })), 200)}
                                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
                                placeholder="Enter item name..."
                              />
                              {showItemSuggestions[item.id] && typeof window !== 'undefined' && ReactDOM.createPortal(
                                <ul style={dropdownStyle} className="bg-white border border-blue-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                  
                                  {itemSuggestions.length > 0 ? (
                                    itemSuggestions
                                      .filter(i => i.name && i.name.toLowerCase().includes(item.item.toLowerCase()))
                                    .map(i => (
                                      <li
                                        key={i._id}
                                          className="px-4 py-2 hover:bg-blue-100 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0"
                                        onMouseDown={() => {
                                          console.log('Selected item:', i);
                                          handleItemChange(item.id, 'item', i.name);
                                          // Map the unit to dropdown options
                                          let mappedUnit = 'NONE';
                                          if (i.unit) {
                                            const unitMap: { [key: string]: string } = {
                                              'Piece': 'PCS',
                                              'Kg': 'KG',
                                              'Gram': 'KG',
                                              'Liter': 'LITER',
                                              'Meter': 'METER',
                                              'Box': 'BOX',
                                              'Packet': 'PACKET',
                                              'Dozen': 'DOZEN',
                                              'Unit': 'UNIT'
                                            };
                                            mappedUnit = unitMap[i.unit] || i.unit.toUpperCase();
                                          }
                                          handleItemChange(item.id, 'unit', mappedUnit);
                                          handleItemChange(item.id, 'price', i.purchasePrice || 0);
                                          setShowItemSuggestions(prev => ({ ...prev, [item.id]: false }));
                                        }}
                                      >
                                                          <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-800">{i.name}</span>
                        <span className="text-xs text-gray-500">{i.unit || 'NONE'} • PKR {i.purchasePrice || 0} • Qty: {i.stock || 0}</span>
                      </div>
                                      </li>
                                      ))
                                  ) : (
                                    <li className="px-4 py-3 text-center">
                                      <div className="text-gray-500 text-sm">
                                        {itemSuggestions.length === 0 ? (
                                          <div>
                                            <div className="text-gray-400 mb-1">📦</div>
                                            <div>No items available</div>
                                            <div className="text-xs text-gray-400 mt-1">Add items in the Items section first</div>
                                          </div>
                                        ) : (
                                          <div>
                                            <div className="text-gray-400 mb-1">🔍</div>
                                            <div>No matching items</div>
                                            <div className="text-xs text-gray-400 mt-1">Try a different search term</div>
                                          </div>
                                        )}
                                      </div>
                                    </li>
                                  )}
                                </ul>,
                                document.body
                              )}
                            </td>
                            <td className="py-2 px-2">
                              <input
                                type="number"
                                value={item.qty}
                                min={0}
                                onChange={e => handleItemChange(item.id, 'qty', e.target.value)}
                                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
                              />
                            </td>
                            <td className="py-2 px-2">
                              <CustomDropdown
                                options={[
                                  { value: 'NONE', label: 'NONE' },
                                  { value: 'KG', label: 'KG' },
                                  { value: 'PCS', label: 'PCS' },
                                  { value: 'BOX', label: 'BOX' },
                                  { value: 'Custom', label: 'Custom' }
                                ]}
                                value={item.unit}
                                onChange={val => handleItemChange(item.id, 'unit', val)}
                              />
                              {item.unit === 'Custom' && (
                                <input
                                  type="text"
                                  value={item.customUnit}
                                  onChange={e => handleItemChange(item.id, 'customUnit', e.target.value)}
                                  className="mt-2 w-full px-3 py-2 border-2 border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                                  placeholder="Enter custom unit"
                                />
                              )}
                            </td>
                            <td className="py-2 px-2">
                              <input
                                type="number"
                                value={item.price}
                                min={0}
                                onChange={e => handleItemChange(item.id, 'price', e.target.value)}
                                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
                              />
                            </td>
                            <td className="py-2 px-2">
                              <span className="text-gray-900 font-semibold">{isNaN(item.amount) ? '0.00' : item.amount.toFixed(2)} {item.unit === 'Custom' && item.customUnit ? item.customUnit : item.unit !== 'NONE' ? item.unit : ''}</span>
                            </td>
                            <td className="py-2 px-2 flex gap-1">
                              {newPurchase.items.length > 1 && (
                                <button
                                  type="button"
                                  className="text-red-600 hover:text-red-700 px-2 py-1 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 transition-colors"
                                  onClick={() => deleteRow(item.id)}
                                  title="Delete row"
                                >
                                  –
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {formErrors.items && <p className="text-xs text-red-500 mt-2">{formErrors.items}</p>}
              </div>
              {/* Image Upload & Description Section (match sale) */}
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
                      value={newPurchase.description}
                      onChange={e => setNewPurchase({...newPurchase, description: e.target.value})}
                      placeholder="Add any additional notes or description for this purchase..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      rows={4}
                    />
                  </div>
                </div>
              </div>
              {/* Summary Section (match sale) */}
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
                            name="discount"
                            value={newPurchase.discount}
                            onChange={e => setNewPurchase({ ...newPurchase, discount: e.target.value })}
                            className="w-24 h-11 px-3 border-2 border-blue-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                          />
                          <CustomDropdown
                            options={[
                              { value: '%', label: '%' },
                              { value: 'PKR', label: 'PKR' }
                            ]}
                            value={newPurchase.discountType}
                            onChange={val => setNewPurchase({ ...newPurchase, discountType: val })}
                            className="w-28 min-w-[72px] mb-1 h-11"
                          />
                        </div>
                        <div className="text-xs text-gray-500 min-h-[24px] mt-1">
                          {newPurchase.discount && !isNaN(Number(newPurchase.discount)) ? (
                            <>
                              Discount: 
                              {newPurchase.discountType === '%'
                                ? `${newPurchase.discount}% = PKR${discountValue.toFixed(2)}`
                                : `PKR${discountValue.toFixed(2)}`}
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
                        name="tax"
                        value={newPurchase.tax}
                        onChange={e => setNewPurchase({ ...newPurchase, tax: e.target.value })}
                        className="w-24 h-11 px-3 border-2 border-blue-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                      />
                      <CustomDropdown
                        options={[
                          { value: '%', label: '%' },
                          { value: 'PKR', label: 'PKR' }
                        ]}
                        value={newPurchase.taxType}
                        onChange={val => setNewPurchase({ ...newPurchase, taxType: val })}
                        className="w-28 min-w-[72px] mb-1 h-11"
                      />
                    </div>
                    <div className="text-xs text-gray-500 min-h-[24px] mt-1">
                      {newPurchase.tax && !isNaN(Number(newPurchase.tax)) ? (
                        <>
                          Tax: {newPurchase.taxType === '%'
                            ? `${newPurchase.tax}% = PKR${taxValue.toFixed(2)}`
                            : `PKR${taxValue.toFixed(2)}`}
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
                          { value: 'Cash', label: 'Cash' },
                          { value: 'Card', label: 'Card' },
                          { value: 'UPI', label: 'UPI' },
                          { value: 'Cheque', label: 'Cheque' }
                        ]}
                        value={newPurchase.paymentType}
                        onChange={val => setNewPurchase({ ...newPurchase, paymentType: val })}
                        className="mb-1"
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
                          <span>PKR{subTotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-xs text-gray-600">
                          <span>Discount</span>
                          <span>- PKR{discountValue.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-xs text-gray-600">
                          <span>Tax</span>
                          <span>+ PKR{taxValue.toFixed(2)}</span>
                        </div>
                        <div className="border-t border-blue-200 my-2"></div>
                        <div className="flex justify-between text-lg font-bold text-blue-900">
                          <span>Grand Total</span>
                          <span>PKR{grandTotal.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Submit Button (match sale) */}
              <div className="flex justify-end gap-4 px-6 py-6 bg-gray-50 border-t border-gray-200 w-full">
                <button
                  type="submit"
                  disabled={loading}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
                    loading 
                      ? 'bg-gray-400 text-white cursor-not-allowed' 
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <span>Add Purchase</span>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
