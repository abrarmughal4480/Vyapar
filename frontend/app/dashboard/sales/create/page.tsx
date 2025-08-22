'use client'

import React, { useState, useEffect, useCallback, useLayoutEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getToken } from '../../../lib/auth'
import { createSaleOrder } from '../../../../http/saleOrders'
import { getCustomerParties, getPartyBalance } from '../../../../http/parties'
import { getUserItems } from '../../../../http/items'
import ReactDOM from 'react-dom'
import Toast from '../../../components/Toast'

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
export default function CreateSalesOrderPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: new Date().toISOString().split('T')[0],
    customer: '',
    phone: '',
    items: [
      { id: 1, item: '', qty: 1, unit: 'NONE', price: 0, amount: 0, customUnit: '' },
      { id: 2, item: '', qty: 1, unit: 'NONE', price: 0, amount: 0, customUnit: '' }
    ],
    description: '',
    image: null,
    discount: 0,
    discountType: '%',
    tax: '',
    taxType: '%',
    taxAmount: 0,
    paymentType: 'Credit',
  })
  
  const [customerSuggestions, setCustomerSuggestions] = useState<any[]>([])
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false)
  const [quotationId, setQuotationId] = useState<string | null>(null)

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Handle quotation data from URL parameters
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const quotationParam = urlParams.get('quotation');
      
      if (quotationParam) {
        try {
          const quotationData = JSON.parse(decodeURIComponent(quotationParam));
          
          // Pre-fill the form with quotation data
          setFormData(prev => ({
            ...prev,
            customer: quotationData.customerName || '',
            phone: quotationData.customerPhone || '',
            items: quotationData.items?.map((item: any, index: number) => ({
              id: index + 1,
              item: item.item || '',
              qty: item.qty || 1,
              unit: item.unit || 'NONE',
              customUnit: item.customUnit || '',
              price: item.price || 0,
              amount: item.amount || 0
            })) || prev.items,
            description: quotationData.description || ''
          }));
          
          setQuotationId(quotationData.quotationId || null);
          
          // Show success message
          setToast({ 
            message: 'Quotation data loaded successfully! You can now convert it to a sales order.', 
            type: 'success' 
          });
        } catch (error) {
          console.error('Error parsing quotation data:', error);
          setToast({ 
            message: 'Error loading quotation data. Please fill the form manually.', 
            type: 'error' 
          });
        }
      }
    }
  }, []);

  // Block ALL window/page scroll on arrow keys globally
  useEffect(() => {
    function blockAllArrowScroll(e: KeyboardEvent) {
      // Only block if not focused on any input (let input's own onKeyDown handle it)
      if (
        ["ArrowDown", "ArrowUp"].includes(e.key) &&
        !(e.target instanceof HTMLInputElement)
      ) {
        e.preventDefault();
      }
    }
    window.addEventListener("keydown", blockAllArrowScroll, { passive: false });
    return () => window.removeEventListener("keydown", blockAllArrowScroll);
  }, []);

  // Unit options
  const unitOptions = ['NONE', 'PCS', 'KG', 'METER', 'LITER', 'BOX', 'DOZEN']
  const taxOptions = ['NONE', 'GST 5%', 'GST 12%', 'GST 18%', 'GST 28%']

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

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
  // Function to calculate appropriate price based on quantity and item data
  const calculatePriceForQuantity = (qty: number, itemData: any) => {
    if (!itemData) return 0;
    
    const quantity = parseFloat(qty.toString()) || 0;
    const minWholesaleQty = itemData.minimumWholesaleQuantity || 0;
    const wholesalePrice = itemData.wholesalePrice || 0;
    const salePrice = itemData.salePrice || 0;
    
    // If quantity meets or exceeds minimum wholesale quantity, use wholesale price
    if (quantity >= minWholesaleQty && wholesalePrice > 0) {
      return wholesalePrice;
    }
    
    // Otherwise use regular sale price
    return salePrice;
  };

  const updateItem = (id: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.id === id) {
          let updatedItem = { ...item, [field]: value }
          
          // If quantity is changing, recalculate price based on wholesale logic
          if (field === 'qty') {
            const selectedItem = itemSuggestions.find(i => i.name === item.item);
            if (selectedItem) {
              const newPrice = calculatePriceForQuantity(value, selectedItem);
              updatedItem.price = newPrice;
              console.log(`Wholesale price calculation: qty=${value}, minWholesaleQty=${selectedItem.minimumWholesaleQuantity}, wholesalePrice=${selectedItem.wholesalePrice}, newPrice=${newPrice}`);
            }
          }
          
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
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' } | null>(null);

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
        { id: Date.now(), item: '', qty: 1, unit: 'NONE', price: 0, amount: 0, customUnit: '' }
      ]
    }));
  };

  // Remove row
  const removeRow = (id: number) => {
    if (formData.items.length === 1) return;
    setFormData(prev => ({ ...prev, items: prev.items.filter(item => item.id !== id) }));
  };

  // Fetch parties for suggestions
  const fetchCustomerSuggestions = async () => {
    const token = getToken();
    if (!token) return;
    try {
      const parties = await getCustomerParties(token);
      setCustomerSuggestions(parties || []);
    } catch {}
  };

  // Add state for items and suggestions
  const [itemSuggestions, setItemSuggestions] = useState<any[]>([])
  const [showItemSuggestions, setShowItemSuggestions] = useState<{[id: number]: boolean}>({})
  const [partyBalance, setPartyBalance] = useState<number|null>(null)

  // Fetch items for suggestions
  const fetchItemSuggestions = async () => {
    const token = getToken();
    if (!token) return;
    try {
      const items = await getUserItems(token);
      console.log('Fetched items for suggestions:', items);
      setItemSuggestions(items || []);
    } catch (error) {
      console.error('Error fetching item suggestions:', error);
      setItemSuggestions([]);
    }
  };

  // Debug effect to log item suggestions changes
  useEffect(() => {
    console.log('Item suggestions updated:', itemSuggestions);
  }, [itemSuggestions]);

  // Fetch item suggestions on component mount
  useEffect(() => {
    console.log('Component mounted, fetching initial item suggestions...');
    fetchItemSuggestions();
  }, []);

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
      const orderPayload = {
        customerName: formData.customer,
        customerPhone: formData.phone,
        items: formData.items.filter(item => item.item.trim() && item.price > 0),
        subtotal: subtotal,
        tax: taxAmount,
        total: grandTotal,
        status: 'Created',
        orderDate: formData.invoiceDate,
        dueDate: formData.dueDate,
        discount: discountAmount,
        description: formData.description
      };

      const token = getToken();
      if (!token) {
        setError('User not authenticated');
        setIsLoading(false);
        return;
      }
      
      const result = await createSaleOrder(orderPayload, token);
      
      // If this was converted from a quotation, update the quotation status
      if (quotationId && result.success) {
        try {
          // Import the function to update quotation status
          const { updateQuotationStatus } = await import('../../../../http/quotations');
          await updateQuotationStatus(quotationId, 'Converted to Sale Order', result.data?.orderNumber, token);
          setToast({ 
            message: `Sales order created successfully! Order No: ${result.data?.orderNumber || ''}. Quotation converted successfully.`, 
            type: 'success' 
          });
        } catch (updateError) {
          setToast({ 
            message: `Sales order created successfully! Order No: ${result.data?.orderNumber || ''}. Note: Could not update quotation status.`, 
            type: 'success' 
          });
        }
      } else {
        setToast({ message: 'Sales order created successfully!', type: 'success' });
      }
      
      setTimeout(() => router.push('/dashboard/sales'), 1500);
      return;
    } catch (error: any) {
      setError('Failed to save sales order. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  // Handle share functionality
  const handleShare = () => {
    alert('Share functionality to be implemented')
  }

  // ItemRow component (inline, matching sale add)
  function ItemRow({
    item,
    index,
    handleItemChange,
    showItemSuggestions,
    setShowItemSuggestions,
    itemSuggestions,
    deleteRow
  }: {
    item: any;
    index: number;
    handleItemChange: (id: number, field: string, value: any) => void;
    showItemSuggestions: {[id: number]: boolean};
    setShowItemSuggestions: React.Dispatch<React.SetStateAction<{[id: number]: boolean}>>;
    itemSuggestions: any[];
    deleteRow: (id: number) => void;
  }) {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
    // Add state for item and unit dropdown highlight
    const [itemDropdownIndex, setItemDropdownIndex] = useState(0);
    const [unitDropdownIndex, setUnitDropdownIndex] = useState(0);
    const [isKeyboardNavigating, setIsKeyboardNavigating] = useState(false);
    const [unitDropdownOpen, setUnitDropdownOpen] = useState(false);

    const updateDropdownPosition = () => {
      if (inputRef.current) {
        const rect = inputRef.current.getBoundingClientRect();
        const style: React.CSSProperties = {
          position: 'absolute' as const,
          top: rect.bottom + window.scrollY + 4,
          left: rect.left + window.scrollX + 4,
          width: rect.width,
          zIndex: 9999
        };
        setDropdownStyle(style);
      }
    };

    useLayoutEffect(() => {
      if (showItemSuggestions[item.id]) {
        updateDropdownPosition();
        window.addEventListener('scroll', updateDropdownPosition, true);
        window.addEventListener('resize', updateDropdownPosition);
        // Add click outside logic
        const handleClickOutside = (event: MouseEvent) => {
          if (
            inputRef.current &&
            !inputRef.current.contains(event.target as Node)
          ) {
            setShowItemSuggestions((prev: any) => ({ ...prev, [item.id]: false }));
          }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
          window.removeEventListener('scroll', updateDropdownPosition, true);
          window.removeEventListener('resize', updateDropdownPosition);
          document.removeEventListener('mousedown', handleClickOutside);
        };
      }
    }, [showItemSuggestions[item.id]]);

    const handleFocus = () => {
      fetchItemSuggestions();
      setShowItemSuggestions((prev: any) => ({ ...prev, [item.id]: true }));
      setItemDropdownIndex(0); // reset highlight
      updateDropdownPosition();
    };

    // Prepare unit options
    const unitOptions = (() => {
      const options: DropdownOption[] = [];
      if (item.item) {
        const selectedItem = itemSuggestions.find(i => i.name === item.item);
        if (selectedItem && selectedItem.unit) {
          const unit = selectedItem.unit;
          if (typeof unit === 'object' && unit.base) {
            if (unit.base && unit.base !== 'NONE') {
              options.push({ value: unit.base, label: unit.base });
            }
            if (unit.secondary && unit.secondary !== 'None' && unit.secondary !== unit.base) {
              options.push({ value: unit.secondary, label: unit.secondary });
            }
          } else if (typeof unit === 'string' && unit.includes(' / ')) {
            const parts = unit.split(' / ');
            if (parts[0] && parts[0] !== 'NONE') {
              options.push({ value: parts[0], label: parts[0] });
            }
            if (parts[1] && parts[1] !== 'None') {
              options.push({ value: parts[1], label: parts[1] });
            }
          } else if (typeof unit === 'string') {
            options.push({ value: unit, label: unit });
          }
        }
      }
      if (options.length === 0) {
        options.push({ value: 'NONE', label: 'NONE' });
      }
      return options;
    })();

    return (
      <tr className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-blue-50'} hover:bg-blue-100 transition-colors`}>
        <td className="py-2 px-2 font-medium">{index + 1}</td>
        <td className="py-2 px-2">
          <input
            ref={inputRef}
            type="text"
            value={item.item}
            onChange={e => {
              handleItemChange(item.id, 'item', e.target.value);
              setItemDropdownIndex(0); // reset highlight
            }}
            onFocus={handleFocus}
            onBlur={() => {
              // Use a longer timeout to allow for keyboard navigation
              setTimeout(() => {
                // Only close if the focus is not within the dropdown
                const activeElement = document.activeElement;
                const dropdown = document.querySelector(`[data-dropdown-id="${item.id}"]`);
                if (!dropdown?.contains(activeElement)) {
                  setShowItemSuggestions((prev: any) => ({ ...prev, [item.id]: false }));
                }
              }, 300);
            }}
            className="item-dropdown-input w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
            placeholder="Enter item name..."
            data-testid={`item-input-${item.id}`}
            onKeyDown={e => {
              console.log('Items dropdown key pressed:', e.key, 'Dropdown open:', showItemSuggestions[item.id], 'Current index:', itemDropdownIndex);
              
              if (["ArrowDown", "ArrowUp", "Enter", "Escape"].includes(e.key)) {
                e.preventDefault();
                e.stopPropagation();
              }
              
              if (!showItemSuggestions[item.id]) {
                if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                  handleFocus();
                }
                return;
              }
              
              const filtered = itemSuggestions.filter(i => i.name && i.name.toLowerCase().includes(item.item.toLowerCase()));
              const optionsCount = filtered.length;
              
              console.log('Filtered items count:', optionsCount, 'Current index:', itemDropdownIndex);
              
              if (e.key === 'ArrowDown') {
                setIsKeyboardNavigating(true);
                const newIndex = Math.min(itemDropdownIndex + 1, optionsCount - 1);
                console.log('ArrowDown: setting index to', newIndex);
                setItemDropdownIndex(newIndex);
              } else if (e.key === 'ArrowUp') {
                setIsKeyboardNavigating(true);
                const newIndex = Math.max(itemDropdownIndex - 1, 0);
                console.log('ArrowUp: setting index to', newIndex);
                setItemDropdownIndex(newIndex);
              } else if (e.key === 'Enter') {
                const idx = itemDropdownIndex;
                const selected = filtered[idx];
                if (selected) {
                  setIsKeyboardNavigating(false);
                  handleItemChange(item.id, 'item', selected.name);
                  const unitDisplay = getUnitDisplay(selected.unit);
                  handleItemChange(item.id, 'unit', unitDisplay);
                  handleItemChange(item.id, 'price', selected.salePrice || 0);
                  handleItemChange(item.id, 'qty', '1');
                  setShowItemSuggestions((prev: any) => ({ ...prev, [item.id]: false }));
                }
              } else if (e.key === 'Escape') {
                setIsKeyboardNavigating(false);
                setShowItemSuggestions((prev: any) => ({ ...prev, [item.id]: false }));
              }
            }}
          />
          {showItemSuggestions[item.id] && typeof window !== 'undefined' && ReactDOM.createPortal(
            <ul 
              style={dropdownStyle} 
              className="bg-white border border-blue-200 rounded-lg shadow-lg max-h-60 overflow-y-auto custom-dropdown-scrollbar"
              data-dropdown-id={item.id}
            >
              {itemSuggestions
                .filter((i: any) => i.name && i.name.toLowerCase().includes(item.item.toLowerCase()))
                .map((i: any, idx: number) => (
                  <li
                    key={i._id}
                    className={`px-4 py-2 hover:bg-blue-100 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0 ${itemDropdownIndex === idx ? 'bg-blue-100 text-blue-700 font-semibold' : ''}`}
                    onMouseDown={e => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsKeyboardNavigating(false);
                      handleItemChange(item.id, 'item', i.name);
                      const unitDisplay = getUnitDisplay(i.unit);
                      handleItemChange(item.id, 'unit', unitDisplay);
                      handleItemChange(item.id, 'price', i.salePrice || 0);
                      handleItemChange(item.id, 'qty', '1');
                      setShowItemSuggestions((prev: any) => ({ ...prev, [item.id]: false }));
                    }}
                    ref={el => { 
                      // Only scroll when actively navigating with keyboard
                      if (itemDropdownIndex === idx && el && isKeyboardNavigating) {
                        const container = el.closest('ul');
                        if (container) {
                          const elementTop = el.offsetTop;
                          const elementHeight = el.offsetHeight;
                          const containerHeight = container.clientHeight;
                          const scrollTop = container.scrollTop;
                          
                          // Check if element is outside visible area
                          if (elementTop < scrollTop || elementTop + elementHeight > scrollTop + containerHeight) {
                            // Scroll to keep element in view
                            container.scrollTo({
                              top: Math.max(0, elementTop - containerHeight / 2),
                              behavior: 'smooth'
                            });
                          }
                        }
                      }
                    }}
                    role="option"
                    aria-selected={itemDropdownIndex === idx}
                    tabIndex={0}
                    onKeyDown={(e: React.KeyboardEvent<HTMLLIElement>) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        e.stopPropagation();
                        handleItemChange(item.id, 'item', i.name);
                        const unitDisplay = getUnitDisplay(i.unit);
                        handleItemChange(item.id, 'unit', unitDisplay);
                        handleItemChange(item.id, 'price', i.salePrice || 0);
                        handleItemChange(item.id, 'qty', '1');
                        setShowItemSuggestions((prev: any) => ({ ...prev, [item.id]: false }));
                      }
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
        </td>
        <td className="py-2 px-2">
          <input
            type="number"
            min={0}
            value={item.qty}
            onChange={e => {
              handleItemChange(item.id, 'qty', e.target.value);
              if (
                index === formData.items.length - 1 &&
                e.target.value &&
                !formData.items.some((row: { qty?: number }, idx: number) => idx > index && !row.qty)
              ) {
                addRow();
              }
            }}
            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
          />
        </td>
        <td className="py-2 px-2">
          <CustomDropdown
            options={unitOptions}
            value={item.unit}
            onChange={val => {
              const selectedItem = itemSuggestions.find(i => i.name === item.item);
              if (selectedItem) {
                if (item.qty) {
                  const convertedQty = convertQuantity(item.qty, item.unit, val, selectedItem);
                  handleItemChange(item.id, 'qty', convertedQty);
                }
                if (item.price) {
                  const convertedPrice = convertPrice(item.price, item.unit, val, selectedItem);
                  handleItemChange(item.id, 'price', convertedPrice);
                }
              }
              handleItemChange(item.id, 'unit', val);
            }}
            dropdownIndex={unitDropdownIndex}
            setDropdownIndex={setUnitDropdownIndex}
            optionsCount={unitOptions.length}
          />
          {item.unit === 'Custom' && (
            <input
              type="text"
              value={item.customUnit}
              onChange={e => handleItemChange(item.id, 'customUnit', e.target.value)}
              className="mt-2 w-full px-3 py-2 border-2 border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="Enter custom unit"
              autoComplete="off"
            />
          )}
        </td>
        <td className="py-2 px-2">
          <div className="relative">
            <input
              type="number"
              min={0}
              value={item.price}
              onChange={e => handleItemChange(item.id, 'price', e.target.value)}
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
            />
            {/* Wholesale price indicator */}
            {(() => {
              const selectedItem = itemSuggestions.find(i => i.name === item.item);
              if (selectedItem && item.qty) {
                const qty = parseFloat(item.qty) || 0;
                const minWholesaleQty = selectedItem.minimumWholesaleQuantity || 0;
                const wholesalePrice = selectedItem.wholesalePrice || 0;
                const currentPrice = parseFloat(item.price) || 0;
                
                if (qty >= minWholesaleQty && wholesalePrice > 0 && currentPrice === wholesalePrice) {
                  return (
                    <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full shadow-sm">
                      Wholesale
                    </div>
                  );
                }
              }
              return null;
            })()}
          </div>
        </td>
        <td className="py-2 px-2">
          <span className="text-gray-900 font-semibold">{isNaN(item.amount) ? '0.00' : item.amount.toFixed(2)} {item.unit === 'Custom' && item.customUnit ? item.customUnit : item.unit !== 'NONE' ? item.unit : ''}</span>
        </td>
        <td className="py-2 px-2 flex gap-1">
          {formData.items.length > 1 && (
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

  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [description, setDescription] = useState('');

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;
    const file = event.target.files[0];
    setImageUploading(true);
    // Simulate upload, or use your real upload logic here
    const reader = new FileReader();
    reader.onloadend = () => {
      setUploadedImage(reader.result as string);
      setImageUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => setUploadedImage(null);

  // CustomDropdown copied from sale add page
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
    dropdownIndex: number;
    setDropdownIndex: React.Dispatch<React.SetStateAction<number>>;
    optionsCount: number;
  }
  function CustomDropdown({ options, value, onChange, className = '', placeholder = 'Select', disabled = false, dropdownIndex, setDropdownIndex, optionsCount }: CustomDropdownProps) {
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
          onKeyDown={(e: React.KeyboardEvent<HTMLButtonElement>) => {
            if (["ArrowDown", "ArrowUp", "Enter", "Escape"].includes(e.key)) {
              e.preventDefault();
              e.stopPropagation();
            }
            
            if (e.key === 'ArrowDown') {
              setDropdownIndex(i => Math.min(i + 1, optionsCount - 1));
            } else if (e.key === 'ArrowUp') {
              setDropdownIndex(i => Math.max(i - 1, 0));
            } else if (e.key === 'Enter') {
              const selected = options[dropdownIndex];
              if (selected) {
                onChange(selected.value);
                setOpen(false);
              }
            } else if (e.key === 'Escape') {
              setOpen(false);
            }
          }}
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
            {options.map((opt: DropdownOption, idx: number) => (
              <li
                key={opt.value}
                className={`px-4 py-2 cursor-pointer flex items-center gap-2 hover:bg-blue-50 transition-colors ${value === opt.value ? 'bg-blue-100 font-semibold text-blue-700' : 'text-gray-700'} ${dropdownIndex === idx ? 'bg-blue-100 text-blue-700 font-semibold' : ''}`}
                onMouseDown={e => { e.preventDefault(); onChange(opt.value); setOpen(false); }}
                tabIndex={0}
                onKeyDown={(e: React.KeyboardEvent<HTMLLIElement>) => { 
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    onChange(opt.value); 
                    setOpen(false);
                  }
                }}
                aria-selected={value === opt.value}
                ref={el => { 
                  if (dropdownIndex === idx && el) {
                    const container = el.closest('ul');
                    if (container) {
                      const elementTop = el.offsetTop;
                      const elementHeight = el.offsetHeight;
                      const containerHeight = container.clientHeight;
                      const scrollTop = container.scrollTop;
                      
                      // Check if element is outside visible area
                      if (elementTop < scrollTop || elementTop + elementHeight > scrollTop + containerHeight) {
                        // Scroll to keep element in view
                        container.scrollTo({
                          top: Math.max(0, elementTop - containerHeight / 2),
                          behavior: 'smooth'
                        });
                      }
                    }
                  }
                }}
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

  // Add state for customer dropdown highlight
  const [customerDropdownIndex, setCustomerDropdownIndex] = useState(0);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="w-full h-auto bg-white/90 rounded-2xl shadow-2xl border border-gray-100 overflow-hidden mx-auto my-6">
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-white/90 border-b border-gray-200 flex justify-between items-center px-6 py-4">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Add Sale Order</h1>
          <button
            type="button"
            onClick={() => router.push('/dashboard/sales')}
            className="text-gray-400 hover:text-gray-600 text-2xl"
            aria-label="Cancel"
          >
            ✕
          </button>
        </div>
        {/* Main Form */}
        <form className="divide-y divide-gray-200 w-full px-6 py-6">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Left: Customer and Phone, consistent with sale add */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-blue-600 mb-2">Customer *</label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.customer}
                    onChange={e => {
                      setFormData(prev => ({ ...prev, customer: e.target.value }));
                      setSearchDropdownOpen(true);
                      setCustomerDropdownIndex(0); // reset highlight
                    }}
                    onFocus={() => {
                      setSearchDropdownOpen(true);
                      fetchCustomerSuggestions();
                    }}
                    onBlur={() => setTimeout(() => setSearchDropdownOpen(false), 200)}
                    className={`w-full px-4 py-3 border-2 rounded-lg transition-all duration-200 border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none`}
                    placeholder="Search or enter customer name"
                    autoComplete="off"
                    onKeyDown={e => {
                      if (!searchDropdownOpen) return;
                      const filtered = customerSuggestions.filter((party: any) =>
                        party.name.toLowerCase().includes(formData.customer.toLowerCase()) ||
                        (party.phone && party.phone.includes(formData.customer))
                      );
                      const optionsCount = filtered.length + 1; // +1 for Add Customer
                      if (["ArrowDown", "ArrowUp", "Enter", "Escape"].includes(e.key)) {
                        e.preventDefault();
                        e.stopPropagation();
                      }
                      if (e.key === 'ArrowDown') {
                        setCustomerDropdownIndex(i => Math.min(i + 1, optionsCount - 1));
                      } else if (e.key === 'ArrowUp') {
                        setCustomerDropdownIndex(i => Math.max(i - 1, 0));
                      } else if (e.key === 'Enter') {
                        if (customerDropdownIndex === 0) {
                          router.push('/dashboard/parties?addParty=1&returnUrl=' + encodeURIComponent('/dashboard/sales/create'));
                          setSearchDropdownOpen(false);
                        } else {
                          const party = filtered[customerDropdownIndex - 1];
                          if (party) {
                            setFormData(prev => ({ ...prev, customer: party.name, phone: party.phone || '' }));
                            setSearchDropdownOpen(false);
                          }
                        }
                      } else if (e.key === 'Escape') {
                        setSearchDropdownOpen(false);
                      }
                    }}
                  />
                  {searchDropdownOpen && (
                    <div className="absolute left-0 right-0 mt-1 w-full z-50">
                      {(customerSuggestions.length > 0 || true) ? (
                        <ul className="bg-white border border-blue-200 rounded-lg shadow-lg max-h-60 overflow-y-auto custom-dropdown-scrollbar">
                          {/* Add Customer option at the top */}
                          <li
                            className={`px-4 py-2 cursor-pointer text-blue-600 font-semibold hover:bg-blue-50 rounded-t-lg ${customerDropdownIndex === 0 ? 'bg-blue-100 text-blue-700' : ''}`}
                            onMouseDown={e => {
                              e.preventDefault();
                              e.stopPropagation();
                              router.push('/dashboard/parties?addParty=1&returnUrl=' + encodeURIComponent('/dashboard/sales/create'));
                              setSearchDropdownOpen(false);
                            }}
                            ref={el => { 
                              if (customerDropdownIndex === 0 && el) {
                                const container = el.closest('ul');
                                if (container) {
                                  const elementTop = el.offsetTop;
                                  const elementHeight = el.offsetHeight;
                                  const containerHeight = container.clientHeight;
                                  const scrollTop = container.scrollTop;
                                  
                                  // Check if element is outside visible area
                                  if (elementTop < scrollTop || elementTop + elementHeight > scrollTop + containerHeight) {
                                    // Scroll to keep element in view
                                    container.scrollTo({
                                      top: Math.max(0, elementTop - containerHeight / 2),
                                      behavior: 'smooth'
                                    });
                                  }
                                }
                              }
                            }}
                            role="option"
                            aria-selected={customerDropdownIndex === 0}
                          >
                            + Add Customer
                          </li>
                          {customerSuggestions
                            .filter((party: any) =>
                              party.name.toLowerCase().includes(formData.customer.toLowerCase()) ||
                              (party.phone && party.phone.includes(formData.customer))
                            )
                            .map((party: any, idx: number) => (
                              <li
                                key={party._id || idx}
                                className={`px-4 py-2 hover:bg-blue-100 cursor-pointer transition-colors ${customerDropdownIndex === idx + 1 ? 'bg-blue-100 text-blue-700 font-semibold' : ''}`}
                                onMouseDown={e => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setFormData(prev => ({ ...prev, customer: party.name, phone: party.phone || '' }));
                                  setSearchDropdownOpen(false);
                                }}
                                ref={el => { 
                                  if (customerDropdownIndex === idx + 1 && el) {
                                    const container = el.closest('ul');
                                    if (container) {
                                      const elementTop = el.offsetTop;
                                      const elementHeight = el.offsetHeight;
                                      const containerHeight = container.clientHeight;
                                      const scrollTop = container.scrollTop;
                                      
                                      // Check if element is outside visible area
                                      if (elementTop < scrollTop || elementTop + elementHeight > scrollTop + containerHeight) {
                                        // Scroll to keep element in view
                                        container.scrollTo({
                                          top: Math.max(0, elementTop - containerHeight / 2),
                                          behavior: 'smooth'
                                        });
                                      }
                                    }
                                  }
                                }}
                                role="option"
                                aria-selected={customerDropdownIndex === idx + 1}
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
                {error && !formData.customer.trim() && (
                  <p className="text-xs text-red-500 mt-1">Customer is required</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                  placeholder="Phone number"
                />
              </div>
            </div>
            {/* Right: Invoice Date and Due Date vertically, small size */}
            <div className="flex flex-col gap-4 items-end justify-start">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Invoice Date</label>
                <input
                  type="date"
                  value={formData.invoiceDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, invoiceDate: e.target.value }))}
                  className="w-40 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Due Date</label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                  className="w-40 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Items Table Section */}
          <div className={`bg-white px-6 py-6 w-full rounded-b-2xl`}> 
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-blue-800 flex items-center gap-2">
                <span>🛒</span> Items
              </h2>
              {/*
              <button
                type="button"
                onClick={addRow}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition-colors font-semibold text-sm"
              >
                <span className="text-xl">+</span> Add Row
              </button>
              */}
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
                  {formData.items.map((item, index) => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      index={index}
                      handleItemChange={updateItem}
                      showItemSuggestions={showItemSuggestions}
                      setShowItemSuggestions={setShowItemSuggestions}
                      itemSuggestions={itemSuggestions}
                      deleteRow={removeRow}
                    />
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
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Add any additional notes or description for this sale order..."
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
                        value={formData.discount}
                        onChange={e => setFormData(prev => ({ ...prev, discount: Number(e.target.value) }))}
                        className="w-24 h-11 px-3 border-2 border-blue-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                      />
                      <CustomDropdown
                        options={[
                          { value: '%', label: '%' },
                          { value: 'PKR', label: '(PKR)' },
                        ]}
                        value={formData.discountType}
                        onChange={e => setFormData(prev => ({ ...prev, discountType: e }))}
                        className="w-28 min-w-[72px] mb-1 h-11 border-2 border-blue-100 rounded-lg"
                        dropdownIndex={0}
                        setDropdownIndex={() => {}}
                        optionsCount={2}
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
                    name="tax"
                    value={formData.tax}
                    onChange={e => setFormData(prev => ({ ...prev, tax: e.target.value }))}
                    className="w-24 h-11 px-3 border-2 border-blue-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                  <CustomDropdown
                    options={[
                      { value: '%', label: '%' },
                      { value: 'PKR', label: '(PKR)' },
                    ]}
                    value={formData.taxType}
                    onChange={e => setFormData(prev => ({ ...prev, taxType: e }))}
                    className="w-28 min-w-[72px] mb-1 h-11 border-2 border-blue-100 rounded-lg"
                    dropdownIndex={0}
                    setDropdownIndex={() => {}}
                    optionsCount={2}
                  />
                </div>
                <div className="text-xs text-gray-500 min-h-[24px] mt-1">
                  {formData.tax && !isNaN(Number(formData.tax)) ? (
                    <>
                      Tax: {formData.taxType === '%'
                        ? `${formData.tax}% = PKR ${((subtotal - (formData.discountType === '%' ? (subtotal * formData.discount / 100) : Number(formData.discount))) * Number(formData.tax) / 100).toFixed(2)}`
                        : `PKR ${Number(formData.tax).toFixed(2)}`}
                    </>
                  ) : null}
                </div>
              </div>
              {/* Payment Type (optional, can be left out if not in sale order) */}
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
                    onChange={e => setFormData(prev => ({ ...prev, paymentType: e }))}
                    className="mb-1 border-2 border-blue-100 rounded-lg h-11"
                    dropdownIndex={0}
                    setDropdownIndex={() => {}}
                    optionsCount={2}
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
                      <span>PKR {(subtotal - (formData.discountType === '%' ? (subtotal * formData.discount / 100) : Number(formData.discount)) + (formData.taxType === '%' ? ((subtotal - (formData.discountType === '%' ? (subtotal * formData.discount / 100) : Number(formData.discount))) * Number(formData.tax) / 100) : Number(formData.tax))).toFixed(2)}</span>
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
    </div>
  )
}