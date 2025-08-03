"use client";
import React, { useState, useEffect, useRef, RefObject } from 'react';
import { useRouter } from 'next/navigation';
import { Printer, Settings, MoreHorizontal } from 'lucide-react';
import Toast from '../../../../components/Toast';
import ReactDOM from 'react-dom';
import { createSale, updateSale, getSaleById } from '../../../../../http/sales';
import { getCustomerParties, getPartyBalance } from '../../../../../http/parties';
import { getUserItems } from '../../../../../http/items';
import api from '../../../../../http/api';
import { API_ENDPOINTS } from '../../../../../lib/api';
// Import any other needed components or hooks

interface SaleItem {
  id: number;
  item: string;
  qty: string;
  unit: string;
  price: string;
  amount: number;
  customUnit: string;
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

function getUnitDisplay(unit: any) {
  if (!unit) return '';
  const base = unit.base === 'custom' ? unit.customBase : unit.base;
  const secondary = unit.secondary && unit.secondary !== 'None'
    ? (unit.secondary === 'custom' ? unit.customSecondary : unit.secondary)
    : '';
  return secondary ? `${base} / ${secondary}` : base;
}

function ItemRow({
  item,
  index,
  handleItemChange,
  fetchItemSuggestions,
  showItemSuggestions,
  setShowItemSuggestions,
  itemSuggestions,
  deleteRow,
  newSale,
  addNewRow
}: {
  item: SaleItem;
  index: number;
  handleItemChange: (id: number, field: string, value: any) => void;
  fetchItemSuggestions: () => void;
  showItemSuggestions: { [id: number]: boolean };
  setShowItemSuggestions: React.Dispatch<React.SetStateAction<{ [id: number]: boolean }>>;
  itemSuggestions: any[];
  deleteRow: (id: number) => void;
  newSale: any;
  addNewRow: () => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dropdownStyle, setDropdownStyle] = React.useState<React.CSSProperties>({});

  const handleFocus = () => {
    fetchItemSuggestions();
    setShowItemSuggestions((prev: any) => ({ ...prev, [item.id]: true }));
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
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
    }
  };

  return (
    <tr
      className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-blue-50'} hover:bg-blue-100 transition-colors`}
    >
      <td className="py-2 px-2 font-medium">{index + 1}</td>
      <td className="py-2 px-2">
        <input
          ref={inputRef}
          type="text"
          value={item.item}
          onChange={e => handleItemChange(item.id, 'item', e.target.value)}
          onFocus={handleFocus}
          onBlur={() => setTimeout(() => setShowItemSuggestions((prev: any) => ({ ...prev, [item.id]: false })), 200)}
          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
          placeholder="Enter item name..."
        />
        {showItemSuggestions[item.id] && typeof window !== 'undefined' && ReactDOM.createPortal(
          <ul style={dropdownStyle} className="bg-white border border-blue-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">

            {itemSuggestions.length > 0 ? (
              itemSuggestions
                .filter((i: any) => i.name && i.name.toLowerCase().includes(item.item.toLowerCase()))
              .map((i: any) => (
                <li
                  key={i._id}
                    className="px-4 py-2 hover:bg-blue-100 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0"
                  onMouseDown={() => {
                    console.log('Selected item:', i);
                    console.log('Setting quantity to stock value for item ID:', item.id);
                    handleItemChange(item.id, 'item', i.name);
                    // Set the unit to the item's unit string from backend
                    handleItemChange(item.id, 'unit', i.unit || 'NONE');
                    handleItemChange(item.id, 'price', i.salePrice || 0);
                    // Keep quantity empty when item is selected
                    handleItemChange(item.id, 'qty', '');
                    console.log('Quantity should now be stock value for item:', item.id);
                    setShowItemSuggestions((prev: any) => ({ ...prev, [item.id]: false }));
                  }}
                >
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-800">{i.name}</span>
                      <span className="text-xs text-gray-500">{i.unit || 'NONE'} • PKR {i.salePrice || 0} • Qty: {i.stock ?? 0}</span>
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
          onChange={e => {
            handleItemChange(item.id, 'qty', e.target.value);
            // If this is the last row and qty is not empty, add a new row
            if (
              index === newSale.items.length - 1 &&
              e.target.value &&
              !newSale.items.some((row: { qty?: string }, idx: number) => idx > index && !row.qty)
            ) {
              // Add a new row
              addNewRow();
            }
          }}
          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
        />
      </td>
      <td className="py-2 px-2">
        <CustomDropdown
          options={[
            { value: item.unit, label: item.unit },
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
        {newSale.items.length > 1 && (
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
}

const AddSalePage = () => {
  const router = useRouter();
  const [newSale, setNewSale] = useState({
    partyName: '',
    phoneNo: '',
    items: [
      { id: 1, item: '', qty: '', unit: 'NONE', customUnit: '', price: '', amount: 0 }
    ],
    discount: '',
    discountType: '%',
    tax: '',
    taxType: '%',
    paymentType: 'Credit',
    editingId: null
  });
  const [sourceOrderId, setSourceOrderId] = useState<string | null>(null);
  const [sourceOrderNumber, setSourceOrderNumber] = useState<string | null>(null);
  const [sourceChallanId, setSourceChallanId] = useState<string | null>(null);
  const [sourceChallanNumber, setSourceChallanNumber] = useState<string | null>(null);
  const [quotationId, setQuotationId] = useState<string | null>(null);
  const [showDescription, setShowDescription] = useState(false);
  const [description, setDescription] = useState('');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailData, setEmailData] = useState({
    to: '',
    subject: '',
    message: ''
  });
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [showItemSuggestions, setShowItemSuggestions] = useState<{[id: number]: boolean}>({});
  const [salesStats, setSalesStats] = useState({
    totalAmount: 0,
    totalReceived: 0,
    totalBalance: 0
  });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [saleStatus, setSaleStatus] = useState('Draft');
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' } | null>(null);
  const [formErrors, setFormErrors] = useState<any>({});
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState('KG');
  const [showPartyDropdown, setShowPartyDropdown] = useState(false);
  const [partySearch, setPartySearch] = useState('');
  const [customerSuggestions, setCustomerSuggestions] = useState<any[]>([]);
  const [itemSuggestions, setItemSuggestions] = useState<any[]>([]);
  const [partyBalance, setPartyBalance] = useState<number|null>(null);
  const [invoiceNo, setInvoiceNo] = useState<string | null>(null);
  const [nextInvoiceNo, setNextInvoiceNo] = useState<string | null>(null);

  // Fetch items on component mount
  useEffect(() => {
    const initializeData = async () => {
      await fetchItemSuggestions();
    };
    initializeData();
  }, []);

  // Handle quotation and challan data from URL parameters
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const quotationParam = urlParams.get('quotation');
      const convertFromChallan = urlParams.get('convertFromChallan');
      const challanDataParam = urlParams.get('challanData');
      
              if (quotationParam) {
          try {
            // Handle both encoded and non-encoded data
            let quotationData;
            try {
              quotationData = JSON.parse(decodeURIComponent(quotationParam));
            } catch (decodeError) {
              // If decodeURIComponent fails, try parsing directly
              quotationData = JSON.parse(quotationParam);
            }
          
          // Pre-fill the form with quotation data
          setNewSale(prev => ({
            ...prev,
            partyName: quotationData.customerName || '',
            phoneNo: quotationData.customerPhone || '',
            items: quotationData.items?.map((item: any, index: number) => ({
              id: index + 1,
              item: item.item || '',
              qty: item.qty?.toString() || '',
              unit: item.unit || 'NONE',
              customUnit: item.customUnit || '',
              price: item.price?.toString() || '',
              amount: item.amount || 0
            })) || prev.items
          }));
          
          setDescription(quotationData.description || '');
          setQuotationId(quotationData.quotationId || null);
          
          // Show success message
          setToast({ 
            message: 'Quotation data loaded successfully! You can now convert it to a sale.', 
            type: 'success' 
          });
        } catch (error) {
          console.error('Error parsing quotation data:', error);
          setToast({ 
            message: 'Error loading quotation data. Please fill the form manually.', 
            type: 'error' 
          });
        }
      } else if (convertFromChallan === 'true' && challanDataParam) {
        try {
          // Handle both encoded and non-encoded data
          let challanData;
          try {
            challanData = JSON.parse(decodeURIComponent(challanDataParam));
          } catch (decodeError) {
            // If decodeURIComponent fails, try parsing directly
            challanData = JSON.parse(challanDataParam);
          }
          
          // Pre-fill the form with challan data
          setNewSale(prev => ({
            ...prev,
            partyName: challanData.partyName || '',
            phoneNo: challanData.phoneNo || '',
            items: challanData.items?.map((item: any, index: number) => ({
              id: index + 1,
              item: item.item || '',
              qty: item.qty?.toString() || '',
              unit: item.unit || 'NONE',
              customUnit: item.customUnit || '',
              price: item.price?.toString() || '',
              amount: item.amount || 0
            })) || prev.items,
            discount: challanData.discount || '0',
            discountType: challanData.discountType || '%',
            tax: challanData.tax || '0',
            taxType: challanData.taxType || '%',
            paymentType: challanData.paymentType || 'Credit'
          }));
          
          setDescription(challanData.description || '');
          setSourceChallanId(challanData.sourceChallanId || null);
          setSourceChallanNumber(challanData.sourceChallanNumber || null);
          
          // Show success message
          setToast({ 
            message: `Delivery Challan ${challanData.sourceChallanNumber} data loaded successfully! You can now convert it to a sale.`, 
            type: 'success' 
          });
        } catch (error) {
          console.error('Error parsing challan data:', error);
          console.error('Raw challan data param:', challanDataParam);
          setToast({ 
            message: 'Error loading challan data. Please fill the form manually.', 
            type: 'error' 
          });
        }
      }
    }
  }, []);

  // Validation
  const validateForm = () => {
    const errors: any = {};
    if (!newSale.partyName) errors.partyName = 'Customer is required';
    const validItems = newSale.items.filter(item => item.item && parseFloat(item.qty) > 0 && parseFloat(item.price) > 0);
    if (validItems.length === 0) errors.items = 'At least one valid item is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewSale(prev => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (id: number, field: string, value: any) => {
    console.log(`handleItemChange called: id=${id}, field=${field}, value=${value}`);
    setNewSale(prev => {
      const updated = {
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
            console.log(`Updated item ${id}:`, updated);
            return updated;
          }
          return item;
        })
      };
      console.log('New sale state:', updated);
      return updated;
    });
  };

  const addNewRow = () => {
    setNewSale((prev: any) => ({
      ...prev,
      items: [
        ...prev.items,
        { id: Date.now(), item: '', qty: '', unit: 'NONE', customUnit: '', price: '', amount: 0 }
      ]
    }));
  };

  const deleteRow = (id: number) => {
    if (newSale.items.length === 1) return;
    setNewSale(prev => ({ ...prev, items: prev.items.filter(item => item.id !== id) }));
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

  const calculateTotal = () => newSale.items.reduce((sum, item) => sum + (item.amount || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    try {
      const token =
        (typeof window !== 'undefined' && (localStorage.getItem('token') || localStorage.getItem('vypar_auth_token'))) || '';
      // Filter out incomplete items
      const filteredItems = newSale.items.filter(
        item =>
          item.item &&
          item.qty &&
          item.price &&
          !isNaN(Number(item.qty)) &&
          !isNaN(Number(item.price))
      );
      const saleData = {
        ...newSale,
        items: filteredItems,
        description,
        imageUrl: uploadedImage,
        tax: newSale.tax === 'NONE' || newSale.tax === '' ? 0 : newSale.tax,
        sourceOrderId, // Include the original order ID
        sourceOrderNumber // Include the original order number
      };
      let result;
      if (newSale.editingId) {
        result = await updateSale(newSale.editingId, saleData, token);
      } else {
        result = await createSale(saleData, token);
      }
      if (result.success && result.sale && result.sale._id) {
        setInvoiceNo(result.sale.invoiceNo || null);
        
        // If this was converted from a quotation, update the quotation status
        if (quotationId) {
          try {
            // Import the function to update quotation status
            const { updateQuotationStatus } = await import('../../../../../http/quotations');
            await updateQuotationStatus(quotationId, 'Converted to Sale', result.sale.invoiceNo, token);
            setToast({ 
              message: `Sale saved! Invoice No: ${result.sale.invoiceNo || ''}. Quotation converted successfully.`, 
              type: 'success' 
            });
          } catch (updateError) {
            setToast({ 
              message: `Sale saved! Invoice No: ${result.sale.invoiceNo || ''}. Note: Could not update quotation status.`, 
              type: 'success' 
            });
          }
        } else if (sourceOrderId) {
          // If this was converted from a sales order, update the order status
          try {
            // Import the function to update sale order status
            const { updateSaleOrderStatus } = await import('../../../../../http/saleOrders');
            await updateSaleOrderStatus(sourceOrderId, 'Completed', token);
            setToast({ 
              message: `Sale saved! Invoice No: ${result.sale.invoiceNo || ''}. Sales Order ${sourceOrderNumber} marked as completed.`, 
              type: 'success' 
            });
          } catch (updateError) {
            setToast({ 
              message: `Sale saved! Invoice No: ${result.sale.invoiceNo || ''}. Note: Could not update sales order status.`, 
              type: 'success' 
            });
          }
        } else if (sourceChallanId) {
          // If this was converted from a delivery challan, update the challan status
          try {
            console.log('=== CONVERTING DELIVERY CHALLAN TO SALE ===');
            console.log('Source Challan ID:', sourceChallanId);
            console.log('Source Challan Number:', sourceChallanNumber);
            console.log('Sale Invoice No:', result.sale.invoiceNo);
            console.log('Token:', token ? 'Present' : 'Missing');
            
            // Import the function to update delivery challan status
            const { updateDeliveryChallanStatus } = await import('../../../../../http/deliveryChallan');
            const updateResult = await updateDeliveryChallanStatus(sourceChallanId, 'Close', token, result.sale.invoiceNo);
            console.log('Update result:', updateResult);
            
            if (updateResult.success) {
              setToast({ 
                message: `Sale saved! Invoice No: ${result.sale.invoiceNo || ''}. Delivery Challan converted successfully.`, 
                type: 'success' 
              });
              // Redirect back to delivery challan page with success parameters
              setTimeout(() => {
                router.push(`/dashboard/delivery-challan?conversionSuccess=true&challanId=${sourceChallanId}`);
              }, 2000);
            } else {
              console.error('Update failed:', updateResult);
              setToast({ 
                message: `Sale saved! Invoice No: ${result.sale.invoiceNo || ''}. Note: Could not update delivery challan status.`, 
                type: 'success' 
              });
              setTimeout(() => router.push('/dashboard/sale'), 2000);
            }
          } catch (updateError) {
            console.error('Error updating delivery challan:', updateError);
            // Type check karo ke updateError object hai aur usme response property hai
            if (
              updateError &&
              typeof updateError === 'object' &&
              'response' in updateError &&
              (updateError as any).response?.data
            ) {
              console.error('Error details:', (updateError as any).response.data);
            }
            setToast({ 
              message: `Sale saved! Invoice No: ${result.sale.invoiceNo || ''}. Note: Could not update delivery challan status.`, 
              type: 'success' 
            });
            setTimeout(() => router.push('/dashboard/sale'), 2000);
          }
        } else {
          setToast({ message: `Sale saved! Invoice No: ${result.sale.invoiceNo || ''}`, type: 'success' });
        }
        
        setTimeout(() => router.push(`/dashboard/sale/invoice/${result.sale._id}`), 1500);
        return;
      }
      if (result.success) {
        setToast({ message: 'Sale saved successfully!', type: 'success' });
        setLoading(false);
        setTimeout(() => router.push('/dashboard/sale'), 1200);
      } else {
        setToast({ message: result.message || 'Failed to save sale', type: 'error' });
        setLoading(false);
      }
    } catch (err: any) {
      setToast({ message: err.message || 'Failed to save sale', type: 'error' });
      setLoading(false);
    }
  };

  const fetchCustomerSuggestions = async () => {
    const token =
      (typeof window !== 'undefined' && (localStorage.getItem('token') || localStorage.getItem('vypar_auth_token'))) || '';
    const customers = await getCustomerParties(token);
    console.log('Fetched customers:', customers);
    setCustomerSuggestions(customers);
  };

  const fetchItemSuggestions = async () => {
    const token =
      (typeof window !== 'undefined' && (localStorage.getItem('token') || localStorage.getItem('vypar_auth_token'))) || '';
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
      // Debug: Log each item's stock value
      if (items && items.length > 0) {
        console.log('Sample item data:', items[0]);
        items.forEach((item: any, index: number) => {
          console.log(`Item ${index + 1}: ${item.name}, Stock: ${item.stock}, OpeningQuantity: ${item.openingQuantity}`);
        });
      }
      setItemSuggestions(items || []);
    } catch (error) {
      console.error('Error fetching items:', error);
      setItemSuggestions([]);
    }
  };

  // Handle URL parameters for converting from sales order
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const convertFromOrder = urlParams.get('convertFromOrder');
      const orderData = urlParams.get('orderData');
      
      if (convertFromOrder === 'true' && orderData) {
        try {
          const parsedData = JSON.parse(orderData);
          setNewSale({
            partyName: parsedData.partyName || '',
            phoneNo: parsedData.phoneNo || '',
            items: parsedData.items || [
              { id: 1, item: '', qty: '', unit: 'NONE', customUnit: '', price: '', amount: 0 }
            ],
            discount: parsedData.discount || '',
            discountType: parsedData.discountType || '%',
            tax: parsedData.tax || '',
            taxType: parsedData.taxType || '%',
            paymentType: parsedData.paymentType || 'Credit',
            editingId: null
          });
          setDescription(parsedData.description || '');
          setSourceOrderId(parsedData.sourceOrderId || null);
          setSourceOrderNumber(parsedData.sourceOrderNumber || null);
          
          // Show success message
          setToast({ message: `Converting from Sales Order: ${parsedData.sourceOrderNumber}`, type: 'success' });
        } catch (error) {
          console.error('Error parsing order data:', error);
        }
      }
    }
  }, []);

  // Fetch party balance when partyName changes
  useEffect(() => {
    const fetchBalance = async () => {
      if (!newSale.partyName) {
        setPartyBalance(null);
        return;
      }
      const token =
        (typeof window !== 'undefined' && (localStorage.getItem('token') || localStorage.getItem('vypar_auth_token'))) || '';
      try {
        const balance = await getPartyBalance(newSale.partyName, token);
        setPartyBalance(balance);
      } catch (err) {
        setPartyBalance(null);
      }
    };
    fetchBalance();
  }, [newSale.partyName]);

  // Fetch next invoice number on mount
  useEffect(() => {
    const fetchNextInvoiceNo = async () => {
      try {
        const token =
          (typeof window !== 'undefined' && (localStorage.getItem('token') || localStorage.getItem('vypar_auth_token'))) || '';
        const res = await api.get(API_ENDPOINTS.NEXT_INVOICE_NO, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setNextInvoiceNo(res.data.nextInvoiceNo);
      } catch (err) {
        setNextInvoiceNo(null);
      }
    };
    fetchNextInvoiceNo();
  }, []);

  // Totals calculation
  const subTotal = calculateTotal();
  let discountValue = 0;
  if (newSale.discount && !isNaN(Number(newSale.discount))) {
    if (newSale.discountType === '%') {
      discountValue = subTotal * Number(newSale.discount) / 100;
    } else {
      discountValue = Number(newSale.discount);
    }
  }
  // Tax calculation
  let taxValue = 0;
  if (newSale.tax && !isNaN(Number(newSale.tax))) {
    if (newSale.taxType === '%') {
      taxValue = (subTotal - discountValue) * Number(newSale.tax) / 100;
    } else if (newSale.taxType === 'PKR') {
      taxValue = Number(newSale.tax);
    }
  }
  const grandTotal = Math.max(0, subTotal - discountValue + taxValue);

  // UI
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const editId = urlParams.get('editId');
      if (editId) {
        const token = localStorage.getItem('token') || '';
        getSaleById(editId, token).then(result => {
          if (result && result.success && result.sale) {
            const saleData = result.sale;
            setNewSale({
              partyName: saleData.partyName || '',
              phoneNo: saleData.phoneNo || '',
              items: Array.isArray(saleData.items) ? saleData.items.map((item: any, idx: number) => ({
                id: idx + 1,
                item: item.item || '',
                qty: item.qty || '',
                unit: item.unit || 'NONE',
                customUnit: item.customUnit || '',
                price: item.price || '',
                amount: item.amount || 0
              })) : [],
              discount: saleData.discount || '',
              discountType: saleData.discountType || '%',
              tax: saleData.tax || '',
              taxType: saleData.taxType || '%',
              paymentType: saleData.paymentType || 'Credit',
              editingId: saleData._id || saleData.id || null
            });
            setDescription(saleData.description || '');
            setUploadedImage(saleData.imageUrl || null);
            setSaleStatus(saleData.status || 'Draft');
          }
        });
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-2 sm:px-4 md:px-8">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {nextInvoiceNo && !invoiceNo && (
        <div className="w-full flex justify-center py-2">
          <div className="bg-blue-50 text-blue-700 px-6 py-2 rounded-lg font-bold text-lg shadow">Next Invoice No: {nextInvoiceNo}</div>
        </div>
      )}
      <div className="w-full h-auto bg-white/90 rounded-2xl shadow-2xl border border-gray-100 overflow-hidden mx-auto my-6">
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-white/90 border-b border-gray-200 flex justify-between items-center px-6 py-4">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Add Sale</h1>
          <button
            type="button"
            onClick={() => router.push('/dashboard/sale')}
            className="text-gray-400 hover:text-gray-600 text-2xl"
            aria-label="Cancel"
          >
            ✕
          </button>
        </div>
        {/* Invoice Number Display */}
        {(invoiceNo || nextInvoiceNo) && (
          <div className="w-full flex justify-center py-2">
            <div className={`px-8 py-3 rounded-xl font-extrabold text-2xl border-2 shadow-lg tracking-wider flex items-center gap-3 ${invoiceNo ? 'bg-green-50 text-green-700 border-green-300' : 'bg-blue-50 text-blue-700 border-blue-300'}`}>
              <span className="uppercase text-base font-semibold text-gray-500">Invoice Number:</span>
              <span>{invoiceNo ? invoiceNo : nextInvoiceNo}</span>
            </div>
          </div>
        )}
        <form onSubmit={handleSubmit} className="divide-y divide-gray-200 w-full">
          {/* Customer Section */}
          <div className="bg-gray-50 px-6 py-6 w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-blue-600 mb-2">Customer *</label>
                <div className="relative">
                  <input
                    type="text"
                    name="partyName"
                    value={newSale.partyName}
                    onChange={handleInputChange}
                    onFocus={() => {
                      fetchCustomerSuggestions();
                      setShowCustomerSuggestions(true);
                    }}
                    onBlur={() => setTimeout(() => setShowCustomerSuggestions(false), 200)}
                    className={`w-full px-4 py-3 border-2 rounded-lg transition-all duration-200 ${formErrors.partyName ? 'border-red-300 bg-red-50' : 'border-blue-200 focus:border-blue-500'} focus:ring-2 focus:ring-blue-200 focus:outline-none`}
                    placeholder="Search or enter customer name"
                  />
                  {showCustomerSuggestions && (
                    <div className="absolute left-0 right-0 mt-1 w-full z-50">
                      {customerSuggestions.length > 0 ? (
                        <ul className="bg-white border border-blue-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {customerSuggestions.map((c) => (
                            <li
                              key={c._id}
                              className="px-4 py-2 hover:bg-blue-100 cursor-pointer transition-colors"
                              onMouseDown={() => {
                                setNewSale(prev => ({ ...prev, partyName: c.name, phoneNo: c.phone }));
                                setShowCustomerSuggestions(false);
                              }}
                            >
                              {c.name} {c.phone && <span className="text-xs text-gray-400">({c.phone})</span>}
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
                {formErrors.partyName && <p className="text-xs text-red-500 mt-1">{formErrors.partyName}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input
                  type="text"
                  name="phoneNo"
                  value={newSale.phoneNo}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                  placeholder="Phone number"
                />
              </div>
            </div>
          </div>

          {/* Items Table Section */}
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
                  {newSale.items.map((item, index) => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      index={index}
                      handleItemChange={handleItemChange}
                      fetchItemSuggestions={fetchItemSuggestions}
                      showItemSuggestions={showItemSuggestions}
                      setShowItemSuggestions={setShowItemSuggestions}
                      itemSuggestions={itemSuggestions}
                      deleteRow={deleteRow}
                      newSale={newSale}
                      addNewRow={addNewRow}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            {formErrors.items && <p className="text-xs text-red-500 mt-2">{formErrors.items}</p>}
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
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Add any additional notes or description for this sale..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={4}
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
                        name="discount"
                        value={newSale.discount}
                        onChange={handleInputChange}
                        className="w-24 h-11 px-3 border-2 border-blue-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                      />
                      <CustomDropdown
                        options={[
                          { value: '%', label: '%' },
                          { value: 'PKR', label: '(PKR)' }
                        ]}
                        value={newSale.discountType}
                        onChange={val => setNewSale(prev => ({ ...prev, discountType: val }))}
                        className="w-28 min-w-[72px] mb-1 h-11"
                      />
                    </div>
                    <div className="text-xs text-gray-500 min-h-[24px] mt-1">
                      {newSale.discount && !isNaN(Number(newSale.discount)) ? (
                        <>
                          Discount: 
                          {newSale.discountType === '%'
                            ? `${newSale.discount}% = PKR ${discountValue.toFixed(2)}`
                            : `PKR ${discountValue.toFixed(2)}`}
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
                    value={newSale.tax}
                    onChange={handleInputChange}
                    className="w-24 h-11 px-3 border-2 border-blue-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                  <CustomDropdown
                    options={[
                      { value: '%', label: '%' },
                      { value: 'PKR', label: '(PKR)' }
                    ]}
                    value={newSale.taxType || '%'}
                    onChange={val => setNewSale(prev => ({ ...prev, taxType: val }))}
                    className="w-28 min-w-[72px] mb-1 h-11"
                  />
                </div>
                <div className="text-xs text-gray-500 min-h-[24px] mt-1">
                  {newSale.tax && !isNaN(Number(newSale.tax)) ? (
                    <>
                      Tax: {newSale.taxType === '%'
                        ? `${newSale.tax}% = PKR ${taxValue.toFixed(2)}`
                        : `PKR ${taxValue.toFixed(2)}`}
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
                      { value: 'Cash', label: 'Cash' }
                    ]}
                    value={newSale.paymentType}
                    onChange={val => setNewSale(prev => ({ ...prev, paymentType: val }))}
                    className="mb-1"
                  />
                  <div className="text-xs text-gray-500 min-h-[24px] mt-1">
                    {/* Reserved for future info text, keeps alignment consistent */}
                  </div>
                </div>
              </div>
              {/* Totals */}
              <div className="md:col-span-1 flex flex-col items-end gap-2">
                <div className="bg-gradient-to-r from-blue-100 to-blue-50 border border-blue-200 rounded-xl px-8 py-4 text-right shadow w-full min-w-[220px]">
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>Sub Total</span>
                      <span>PKR {subTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>Discount</span>
                      <span>- PKR {discountValue.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>Tax</span>
                      <span>+ PKR {taxValue.toFixed(2)}</span>
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

          {/* Submit Button */}
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
                  <span>Add Sale</span>
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
  );
};

export default AddSalePage; 