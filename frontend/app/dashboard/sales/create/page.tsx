'use client'

import React, { useState, useEffect, useCallback, useLayoutEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getToken } from '../../../lib/auth'
import { createSaleOrder } from '../../../../http/saleOrders'
import { getCustomerParties, getPartyBalance } from '../../../../http/parties'
import { getUserItems } from '../../../../http/items'
import ReactDOM from 'react-dom'
import Toast from '../../../components/Toast'
import { CustomDropdown, type DropdownOption } from '../../../components/CustomDropdown'
import { ItemsDropdown } from '../../../components/ItemsDropdown'
import { UnitsDropdown } from '../../../components/UnitsDropdown'
import { PaymentMethodDropdown } from '../../../components/PaymentMethodDropdown'
import { useSidebar } from '../../../contexts/SidebarContext'
import { useBankAccounts } from '../../../hooks/useBankAccounts'

const getUnitDisplay = (unit: any) => {
  if (!unit) return 'NONE';

  if (typeof unit === 'object' && unit.base) {
    const base = unit.base || 'NONE';
    const secondary = unit.secondary && unit.secondary !== 'None' ? unit.secondary : null;

    return base;
  }

  if (typeof unit === 'string' && unit.includes(' / ')) {
    const parts = unit.split(' / ');
    return parts[0] || 'NONE';
  }

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

  if (typeof unit === 'object' && unit.conversionFactor) {
    const factor = unit.conversionFactor;
    let convertedQty = qty;

    if (fromUnit === unit.base && toUnit === unit.secondary) {
      convertedQty = qty * factor;
    }
    else if (fromUnit === unit.secondary && toUnit === unit.base) {
      convertedQty = qty / factor;
    }

    return Math.round(convertedQty).toString();
  }

  if (typeof unit === 'string' && unit.includes(' / ')) {
    const parts = unit.split(' / ');
    if (parts.length === 2) {
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

  if (typeof unit === 'object' && unit.conversionFactor) {
    const factor = unit.conversionFactor;
    let convertedPrice = price;

    if (fromUnit === unit.base && toUnit === unit.secondary) {
      convertedPrice = price * factor;
    }
    else if (fromUnit === unit.secondary && toUnit === unit.base) {
      convertedPrice = price / factor;
    }

    return (Math.round(convertedPrice * 100) / 100).toFixed(2);
  }

  if (typeof unit === 'string' && unit.includes(' / ')) {
    const parts = unit.split(' / ');
    if (parts.length === 2) {
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

const ItemRow = React.memo(({
  item,
  index,
  handleItemChange,
  showItemSuggestions,
  setShowItemSuggestions,
  itemSuggestions,
  deleteRow,
  addRow,
  formData
}: {
  item: any;
  index: number;
  handleItemChange: (id: number, field: string, value: any) => void;
  showItemSuggestions: { [id: number]: boolean };
  setShowItemSuggestions: React.Dispatch<React.SetStateAction<{ [id: number]: boolean }>>;
  itemSuggestions: any[];
  deleteRow: (id: number) => void;
  addRow: () => void;
  formData: any;
}) => {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
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
    setShowItemSuggestions((prev: any) => ({ ...prev, [item.id]: true }));
    setItemDropdownIndex(0);
    updateDropdownPosition();
  };

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
        <ItemsDropdown
          items={itemSuggestions}
          value={item.item}
          onChange={(val) => handleItemChange(item.id, "item", val)}
          onItemSelect={(selectedItem) => {
            if (selectedItem.salePrice) {
              handleItemChange(item.id, "price", selectedItem.salePrice.toString());
            }
            if (selectedItem.unit) {
              const unitDisplay = getUnitDisplay(selectedItem.unit);
              handleItemChange(item.id, "unit", unitDisplay);
            }
          }}
          showSuggestions={showItemSuggestions[item.id] || false}
          setShowSuggestions={(show) => setShowItemSuggestions(prev => ({ ...prev, [item.id]: show }))}
          placeholder="Enter item name..."
        />
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
              e.target.value
            ) {
              addRow();
            }
          }}
          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
        />
      </td>
      <td className="py-2 px-2">
        <UnitsDropdown
          units={unitOptions}
          value={item.unit}
          onChange={val => {
            const selectedItem = itemSuggestions.find(i => i.name === item.item);
            if (selectedItem) {
              if (item.qty) {
                let convertedQty = parseFloat(item.qty) || 0;
                if (selectedItem.unit && typeof selectedItem.unit === 'object' && selectedItem.unit.conversionFactor) {
                  if (val === selectedItem.unit.secondary) {
                    convertedQty = convertedQty * selectedItem.unit.conversionFactor;
                  }
                }

                const minWholesaleQty = selectedItem.minimumWholesaleQuantity || 0;
                const wholesalePrice = selectedItem.wholesalePrice || 0;

                let finalPrice;
                if (convertedQty >= minWholesaleQty && wholesalePrice > 0) {
                  if (val === selectedItem.unit?.base) {
                    finalPrice = wholesalePrice;
                  } else if (val === selectedItem.unit?.secondary && selectedItem.unit?.conversionFactor) {
                    finalPrice = wholesalePrice * selectedItem.unit.conversionFactor;
                  } else {
                    finalPrice = wholesalePrice;
                  }
                } else {
                  if (val === selectedItem.unit?.base) {
                    finalPrice = selectedItem.salePrice || 0;
                  } else if (val === selectedItem.unit?.secondary && selectedItem.unit?.conversionFactor) {
                    finalPrice = (selectedItem.salePrice || 0) * selectedItem.unit.conversionFactor;
                  } else {
                    finalPrice = selectedItem.salePrice || 0;
                  }
                }

                handleItemChange(item.id, 'price', finalPrice);
              } else {
                if (val === selectedItem.unit?.base) {
                  handleItemChange(item.id, 'price', selectedItem.salePrice || 0);
                } else if (val === selectedItem.unit?.secondary && selectedItem.unit?.conversionFactor) {
                  handleItemChange(item.id, 'price', (selectedItem.salePrice || 0) * selectedItem.unit.conversionFactor);
                } else {
                  handleItemChange(item.id, 'price', selectedItem.salePrice || 0);
                }
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
          {(() => {
            const selectedItem = itemSuggestions.find(i => i.name === item.item);
            if (selectedItem && item.qty) {
              const qty = parseFloat(item.qty) || 0;
              const minWholesaleQty = selectedItem.minimumWholesaleQuantity || 0;
              const wholesalePrice = selectedItem.wholesalePrice || 0;
              const currentPrice = parseFloat(item.price) || 0;

              let convertedQty = qty;
              if (selectedItem.unit && typeof selectedItem.unit === 'object' && selectedItem.unit.conversionFactor) {
                if (item.unit === selectedItem.unit.secondary) {
                  convertedQty = qty * selectedItem.unit.conversionFactor;
                }
              }

              let expectedWholesalePrice = wholesalePrice;
              if (selectedItem.unit && typeof selectedItem.unit === 'object' && selectedItem.unit.conversionFactor) {
                if (item.unit === selectedItem.unit.secondary) {
                  expectedWholesalePrice = wholesalePrice * selectedItem.unit.conversionFactor;
                }
              }

              if (convertedQty >= minWholesaleQty && wholesalePrice > 0 && Math.abs(currentPrice - expectedWholesalePrice) < 0.01) {
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
        {deleteRow && (
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
});

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
    paymentMethod: 'Cash',
    bankAccountId: null as string | null,
    bankAccountName: '',
  })

  const [customerSuggestions, setCustomerSuggestions] = useState<any[]>([])
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false)
  const [quotationId, setQuotationId] = useState<string | null>(null)
  
  // Bank accounts and payment method dropdown state
  const { bankAccounts, loading: bankAccountsLoading, refetch: refetchBankAccounts } = useBankAccounts()
  const [paymentMethodDropdownIndex, setPaymentMethodDropdownIndex] = useState(0)

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const { setIsCollapsed } = useSidebar();
  const [wasSidebarCollapsed, setWasSidebarCollapsed] = useState(false);

  useEffect(() => {
    const currentSidebarState = document.body.classList.contains('sidebar-collapsed') ||
      document.documentElement.classList.contains('sidebar-collapsed');
    setWasSidebarCollapsed(currentSidebarState);

    setIsCollapsed(true);

    return () => {
      setIsCollapsed(wasSidebarCollapsed);
    };
  }, [setIsCollapsed, wasSidebarCollapsed]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const quotationParam = urlParams.get('quotation');

      if (quotationParam) {
        try {
          const quotationData = JSON.parse(decodeURIComponent(quotationParam));

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

          setToast({
            message: 'Quotation data loaded successfully! You can now convert it to a sales order.',
            type: 'success'
          });
        } catch (error) {
          setToast({
            message: 'Error loading quotation data. Please fill the form manually.',
            type: 'error'
          });
        }
      }
    }
  }, []);

  useEffect(() => {
    function blockAllArrowScroll(e: KeyboardEvent) {
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

  const unitOptions = ['NONE', 'PCS', 'KG', 'METER', 'LITER', 'BOX', 'DOZEN']
  const taxOptions = ['NONE', 'GST 5%', 'GST 12%', 'GST 18%', 'GST 28%']


  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => ({
        ...item,
        amount: item.qty * item.price
      }))
    }))
  }, [])

  const subtotal = formData.items.reduce((sum, item) => sum + item.amount, 0)
  const discountAmount = formData.discountType === '%'
    ? (subtotal * formData.discount) / 100
    : formData.discount
  const totalAfterDiscount = subtotal - discountAmount
  const taxAmount = formData.tax !== 'NONE'
    ? (totalAfterDiscount * parseInt(formData.tax.split(' ')[1]?.replace('%', '') || '0')) / 100
    : 0
  const grandTotal = totalAfterDiscount + taxAmount

  const calculatePriceForQuantity = (qty: number, itemData: any) => {
    if (!itemData) return 0;

    const quantity = parseFloat(qty.toString()) || 0;
    const minWholesaleQty = itemData.minimumWholesaleQuantity || 0;
    const wholesalePrice = itemData.wholesalePrice || 0;
    const salePrice = itemData.salePrice || 0;

    if (quantity >= minWholesaleQty && wholesalePrice > 0) {
      return wholesalePrice;
    }

    return salePrice;
  };


  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' } | null>(null);

  const addRow = useCallback(() => {
    // Removed validation - users can add new rows without filling the last one
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        { id: Date.now(), item: '', qty: 1, unit: 'NONE', price: 0, amount: 0, customUnit: '' }
      ]
    }));
  }, [formData.items]);

  const removeRow = useCallback((id: number) => {
    if (formData.items.length === 1) return;
    setFormData(prev => ({ ...prev, items: prev.items.filter(item => item.id !== id) }));
  }, [formData.items.length]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'N') {
        event.preventDefault();
        addRow();
      }
      else if (event.ctrlKey && (event.key === '+' || event.key === '=')) {
        event.preventDefault();
        addRow();
      }
      else if (event.ctrlKey && event.key === '-') {
        event.preventDefault();
        if (formData.items.length > 1) {
          const lastItem = formData.items[formData.items.length - 1];
          removeRow(lastItem.id);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [formData.items, addRow, removeRow]);

  const fetchCustomerSuggestions = async () => {
    const token = getToken();
    if (!token) return;
    try {
      const parties = await getCustomerParties(token);
      setCustomerSuggestions(parties || []);
    } catch { }
  };

  const [itemSuggestions, setItemSuggestions] = useState<any[]>([])
  const [showItemSuggestions, setShowItemSuggestions] = useState<{ [id: number]: boolean }>({})
  const [partyBalance, setPartyBalance] = useState<number | null>(null)

  const updateItem = useCallback((id: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.id === id) {
          let updatedItem = { ...item, [field]: value }

          if (field === 'qty') {
            const selectedItem = itemSuggestions.find(i => i.name === item.item);
            if (selectedItem) {
              const minWholesaleQty = selectedItem.minimumWholesaleQuantity || 0;
              const wholesalePrice = selectedItem.wholesalePrice || 0;
              let convertedQty = value;
              if (selectedItem.unit && typeof selectedItem.unit === 'object' && selectedItem.unit.conversionFactor) {
                if (updatedItem.unit === selectedItem.unit.secondary) {
                  convertedQty = value * selectedItem.unit.conversionFactor;
                }
              }

              let finalPrice;
              if (convertedQty >= minWholesaleQty && wholesalePrice > 0) {
                if (updatedItem.unit === selectedItem.unit?.base) {
                  finalPrice = wholesalePrice;
                } else if (updatedItem.unit === selectedItem.unit?.secondary && selectedItem.unit?.conversionFactor) {
                  finalPrice = wholesalePrice * selectedItem.unit.conversionFactor;
                } else {
                  finalPrice = wholesalePrice;
                }
              } else {
                if (updatedItem.unit === selectedItem.unit?.base) {
                  finalPrice = selectedItem.salePrice || 0;
                } else if (updatedItem.unit === selectedItem.unit?.secondary && selectedItem.unit?.conversionFactor) {
                  finalPrice = (selectedItem.salePrice || 0) * selectedItem.unit.conversionFactor;
                } else {
                  finalPrice = selectedItem.salePrice || 0;
                }
              }

              updatedItem.price = finalPrice;
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
  }, [itemSuggestions])

  const fetchItemSuggestions = async () => {
    const token = getToken();
    if (!token) return;
    try {
      const items = await getUserItems(token);
      setItemSuggestions(items || []);
    } catch (error) {
      setItemSuggestions([]);
    }
  };

  useEffect(() => {
    fetchItemSuggestions();
  }, []);

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
      // Convert payment method for backend
      let actualPaymentMethod = formData.paymentMethod;
      if (formData.paymentMethod.startsWith('bank_')) {
        actualPaymentMethod = 'Bank Transfer';
      }

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
        description: formData.description,
        paymentMethod: actualPaymentMethod,
        bankAccountId: formData.bankAccountId,
        bankAccountName: formData.bankAccountName
      };

      const token = getToken();
      if (!token) {
        setError('User not authenticated');
        setIsLoading(false);
        return;
      }

      const result = await createSaleOrder(orderPayload, token);

      if (quotationId && result.success) {
        try {
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

  const handleShare = () => {
    alert('Share functionality to be implemented')
  }


  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [description, setDescription] = useState('');

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;
    const file = event.target.files[0];
    setImageUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setUploadedImage(reader.result as string);
      setImageUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => setUploadedImage(null);



  const [customerDropdownIndex, setCustomerDropdownIndex] = useState(0);

  return (
    <div className="min-h-screen bg-gray-50 p-1 sm:p-2">
      <div className="w-full h-auto bg-white/90 rounded-2xl shadow-2xl border border-gray-100 overflow-hidden mx-auto my-1 sm:my-3">
        <div className="sticky top-0 z-10 bg-white/90 border-b border-gray-200 flex justify-between items-center px-2 sm:px-4 py-4">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Add Sale Order</h1>
          <button
            type="button"
            onClick={() => router.push('/dashboard/sales')}
            className="text-gray-400 hover:text-gray-600 text-xl sm:text-2xl p-1"
            aria-label="Cancel"
          >
            ✕
          </button>
        </div>
        <form className="divide-y divide-gray-200 w-full px-2 sm:px-4 py-6">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
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
                      setCustomerDropdownIndex(0);
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
                      const optionsCount = filtered.length + 1;
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
                            className={`px-4 py-2 cursor-pointer text-blue-600 font-semibold bg-white hover:bg-blue-50 rounded-t-lg ${customerDropdownIndex === 0 ? 'font-semibold text-gray-700' : ''}`}
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

                                  if (elementTop < scrollTop || elementTop + elementHeight > scrollTop + containerHeight) {
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
                                className={`px-4 py-2 bg-white hover:bg-blue-50 cursor-pointer transition-colors ${customerDropdownIndex === idx + 1 ? 'font-semibold text-gray-700' : 'text-gray-700'}`}
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

                                      if (elementTop < scrollTop || elementTop + elementHeight > scrollTop + containerHeight) {
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

          <div className={`bg-white px-6 py-6 w-full rounded-b-2xl`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-blue-800 flex items-center gap-2">
                <span>🛒</span> Items
              </h2>
              <button
                type="button"
                onClick={addRow}
                className="inline-flex items-center gap-2 px-3 py-2 sm:px-5 sm:py-2.5 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition-colors font-semibold text-xs sm:text-sm hover:shadow-lg transform hover:scale-105"
              >
                <span className="text-lg sm:text-xl">+</span> <span className="hidden sm:inline">Add Row</span><span className="sm:hidden">Add</span>
              </button>
            </div>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200 bg-gradient-to-br from-blue-50 to-gray-100 w-full">
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
                      addRow={addRow}
                      formData={formData}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {formData.items.map((item, index) => (
                <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  {/* Item Name - Full Width */}
                  <div className="mb-3">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Item Name</label>
                    <ItemsDropdown
                      items={itemSuggestions}
                      value={item.item}
                      onChange={(val) => updateItem(item.id, 'item', val)}
                      onItemSelect={(selectedItem) => {
                        const unitDisplay = getUnitDisplay(selectedItem.unit);
                        updateItem(item.id, 'unit', unitDisplay);
                        updateItem(item.id, 'price', selectedItem.salePrice || 0);
                        updateItem(item.id, 'qty', '');
                      }}
                      className="w-full"
                      placeholder="Enter item name..."
                      showSuggestions={showItemSuggestions[item.id]}
                      setShowSuggestions={(show) => setShowItemSuggestions((prev: any) => ({ ...prev, [item.id]: show }))}
                    />
                  </div>

                  {/* Quantity and Unit - Side by Side */}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
                      <input
                        type="number"
                        value={item.qty}
                        min={0}
                        onChange={e => {
                          const newQty = e.target.value;
                          updateItem(item.id, 'qty', newQty);
                          
                          if (index === formData.items.length - 1 && newQty) {
                            addRow();
                          }
                        }}
                        className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
                        autoComplete="off"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Unit</label>
                      <UnitsDropdown
                        units={(() => {
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
                        })()}
                        value={(() => {
                          if (!item.item) return 'NONE';
                          
                          const selectedItem = itemSuggestions.find(i => i.name === item.item);
                          if (!selectedItem || !selectedItem.unit) return 'NONE';
                          
                          if (item.unit && item.unit !== 'NONE') {
                            return item.unit;
                          }
                          
                          const unit = selectedItem.unit;
                          if (typeof unit === 'object' && unit.base) {
                            return unit.base || 'NONE';
                          } else if (typeof unit === 'string' && unit.includes(' / ')) {
                            const parts = unit.split(' / ');
                            return parts[0] || 'NONE';
                          } else if (typeof unit === 'string') {
                            return unit || 'NONE';
                          }
                          
                          return 'NONE';
                        })()}
                        onChange={val => {
                          const selectedItem = itemSuggestions.find(i => i.name === item.item);
                          if (selectedItem) {
                            if (item.qty) {
                              let convertedQty = parseFloat(item.qty) || 0;
                              if (selectedItem.unit && typeof selectedItem.unit === 'object' && selectedItem.unit.conversionFactor) {
                                if (val === selectedItem.unit.secondary) {
                                  convertedQty = convertedQty * selectedItem.unit.conversionFactor;
                                }
                              }
                              
                              const minWholesaleQty = selectedItem.minimumWholesaleQuantity || 0;
                              const wholesalePrice = selectedItem.wholesalePrice || 0;
                              
                              let finalPrice;
                              if (convertedQty >= minWholesaleQty && wholesalePrice > 0) {
                                if (val === selectedItem.unit?.base) {
                                  finalPrice = wholesalePrice;
                                } else if (val === selectedItem.unit?.secondary && selectedItem.unit?.conversionFactor) {
                                  finalPrice = wholesalePrice * selectedItem.unit.conversionFactor;
                                } else {
                                  finalPrice = wholesalePrice;
                                }
                              } else {
                                if (val === selectedItem.unit?.base) {
                                  finalPrice = selectedItem.salePrice || 0;
                                } else if (val === selectedItem.unit?.secondary && selectedItem.unit?.conversionFactor) {
                                  finalPrice = (selectedItem.salePrice || 0) * selectedItem.unit.conversionFactor;
                                } else {
                                  finalPrice = selectedItem.salePrice || 0;
                                }
                              }
                              
                              updateItem(item.id, 'price', finalPrice);
                            } else {
                              if (val === selectedItem.unit?.base) {
                                updateItem(item.id, 'price', selectedItem.salePrice || 0);
                              } else if (val === selectedItem.unit?.secondary && selectedItem.unit?.conversionFactor) {
                                updateItem(item.id, 'price', (selectedItem.salePrice || 0) * selectedItem.unit.conversionFactor);
                              } else {
                                updateItem(item.id, 'price', selectedItem.salePrice || 0);
                              }
                            }
                          }
                          
                          updateItem(item.id, 'unit', val);
                        }}
                        dropdownIndex={0}
                        setDropdownIndex={() => {}}
                        optionsCount={1}
                      />
                      {item.unit === 'Custom' && (
                        <input
                          type="text"
                          value={item.customUnit}
                          onChange={e => updateItem(item.id, 'customUnit', e.target.value)}
                          className="mt-2 w-full px-3 py-2 text-sm border-2 border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                          placeholder="Enter custom unit"
                          autoComplete="off"
                        />
                      )}
                    </div>
                  </div>

                  {/* Price per Unit - Full Width */}
                  <div className="mb-3">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Price per Unit</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={item.price}
                        min={0}
                        onChange={e => updateItem(item.id, 'price', e.target.value)}
                        className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
                        autoComplete="off"
                      />
                      {/* Wholesale price indicator */}
                      {(() => {
                        const selectedItem = itemSuggestions.find(i => i.name === item.item);
                        if (selectedItem && item.qty) {
                          const qty = parseFloat(item.qty) || 0;
                          const minWholesaleQty = selectedItem.minimumWholesaleQuantity || 0;
                          const wholesalePrice = selectedItem.wholesalePrice || 0;
                          const currentPrice = parseFloat(item.price) || 0;
                          
                          let convertedQty = qty;
                          if (selectedItem.unit && typeof selectedItem.unit === 'object' && selectedItem.unit.conversionFactor) {
                            if (item.unit === selectedItem.unit.secondary) {
                              convertedQty = qty * selectedItem.unit.conversionFactor;
                            }
                          }
                          
                          let expectedWholesalePrice = wholesalePrice;
                          if (selectedItem.unit && typeof selectedItem.unit === 'object' && selectedItem.unit.conversionFactor) {
                            if (item.unit === selectedItem.unit.secondary) {
                              expectedWholesalePrice = wholesalePrice * selectedItem.unit.conversionFactor;
                            }
                          }
                          
                          if (convertedQty >= minWholesaleQty && wholesalePrice > 0 && Math.abs(currentPrice - expectedWholesalePrice) < 0.01) {
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
                  </div>

                  {/* Final Amount and Actions */}
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-xs text-gray-500">Amount:</span>
                      <span className="ml-2 text-sm font-semibold text-gray-900">
                        PKR {item.amount.toFixed(2)}
                      </span>
                    </div>
                    {removeRow && (
                      <button
                        type="button"
                        onClick={() => removeRow(item.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="Delete row"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

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
                    className={`flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-200 ${imageUploading
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

          <div className="bg-white px-6 py-8 w-full rounded-xl shadow-sm mt-4">
            <div className="flex flex-col lg:flex-row justify-between items-end gap-6">
              {/* Left Side - Discount and Tax */}
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 w-full">
                <div className="w-full sm:w-auto sm:min-w-[200px]">
                  <label className="block text-xs sm:text-sm font-semibold text-blue-700 mb-2 flex items-center gap-1">
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
                          className="w-20 sm:w-24 h-10 sm:h-11 px-2 sm:px-3 text-sm sm:text-base border-2 border-blue-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                        />
                        <CustomDropdown
                          options={[
                            { value: '%', label: '%' },
                            { value: 'PKR', label: '(PKR)' },
                          ]}
                          value={formData.discountType}
                          onChange={e => setFormData(prev => ({ ...prev, discountType: e }))}
                          className="w-20 sm:w-28 min-w-[60px] sm:min-w-[72px] mb-1 h-10 sm:h-11 border-2 border-blue-100 rounded-lg"
                          dropdownIndex={0}
                          setDropdownIndex={() => { }}
                          optionsCount={2}
                        />
                      </div>
                      <div className="text-xs text-gray-500 min-h-[20px] sm:min-h-[24px] mt-1">
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
                <div className="w-full sm:w-auto sm:min-w-[200px]">
                  <label className="block text-xs sm:text-sm font-semibold text-blue-700 mb-2 flex items-center gap-1">
                    <span>🧾</span> Tax
                  </label>
                  <div className="flex flex-row items-center gap-2">
                    <input
                      type="number"
                      name="tax"
                      value={formData.tax}
                      onChange={e => setFormData(prev => ({ ...prev, tax: e.target.value }))}
                      className="w-20 sm:w-24 h-10 sm:h-11 px-2 sm:px-3 text-sm sm:text-base border-2 border-blue-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                    <CustomDropdown
                      options={[
                        { value: '%', label: '%' },
                        { value: 'PKR', label: '(PKR)' },
                      ]}
                      value={formData.taxType}
                      onChange={e => setFormData(prev => ({ ...prev, taxType: e }))}
                      className="w-20 sm:w-28 min-w-[60px] sm:min-w-[72px] mb-1 h-10 sm:h-11 border-2 border-blue-100 rounded-lg"
                      dropdownIndex={0}
                      setDropdownIndex={() => { }}
                      optionsCount={2}
                    />
                  </div>
                  <div className="text-xs text-gray-500 min-h-[20px] sm:min-h-[24px] mt-1">
                    {formData.tax && !isNaN(Number(formData.tax)) ? (
                      <>
                        Tax: {formData.taxType === '%'
                          ? `${formData.tax}% = PKR ${((subtotal - (formData.discountType === '%' ? (subtotal * formData.discount / 100) : Number(formData.discount))) * Number(formData.tax) / 100).toFixed(2)}`
                          : `PKR ${Number(formData.tax).toFixed(2)}`}
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
              {/* Right Side - Payment Method and Totals */}
              <div className="flex flex-col lg:flex-row items-start gap-4 lg:gap-8 w-full">
                {/* Payment Method */}
                <div className="w-full lg:min-w-[280px] lg:max-w-[320px]">
                  <label className="block text-xs sm:text-sm font-semibold text-blue-700 mb-2 flex items-center gap-1">
                    <span>💳</span> Payment Method
                  </label>
                  <div className="flex flex-col">
                    <PaymentMethodDropdown
                      value={formData.paymentMethod}
                      onChange={(val) => {
                        if (val === 'Cash' || val === 'Cheque') {
                          setFormData(prev => ({ 
                            ...prev, 
                            paymentMethod: val,
                            bankAccountId: null as string | null,
                            bankAccountName: ''
                          }));
                        } else if (val.startsWith('bank_')) {
                          const accountId = val.replace('bank_', '');
                          const account = bankAccounts.find(acc => acc._id === accountId);
                          if (account) {
                            setFormData(prev => ({ 
                              ...prev, 
                              paymentMethod: val,
                              bankAccountId: account._id as string | null,
                              bankAccountName: account.accountDisplayName
                            }));
                          }
                        } else {
                          const account = bankAccounts.find(acc => acc.accountDisplayName === val);
                          if (account) {
                            setFormData(prev => ({ 
                              ...prev, 
                              paymentMethod: `bank_${account._id}`,
                              bankAccountId: account._id as string | null,
                              bankAccountName: account.accountDisplayName
                            }));
                          } else {
                            setFormData(prev => ({ 
                              ...prev, 
                              paymentMethod: val,
                              bankAccountId: null as string | null,
                              bankAccountName: ''
                            }));
                          }
                        }
                      }}
                      bankAccounts={bankAccounts}
                      className="mb-1"
                      dropdownIndex={paymentMethodDropdownIndex}
                      setDropdownIndex={setPaymentMethodDropdownIndex}
                      onBankAccountAdded={refetchBankAccounts}
                    />
                    <div className="text-xs text-gray-500 min-h-[20px] sm:min-h-[24px] mt-1"></div>
                  </div>
                </div>
                
                {/* Totals */}
                <div className="w-full lg:min-w-[280px]">
                  <div className="bg-gradient-to-r from-blue-100 to-blue-50 border border-blue-200 rounded-xl px-4 sm:px-8 py-3 sm:py-4 text-right shadow w-full">
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
                      <div className="flex justify-between text-sm sm:text-lg font-bold text-blue-900">
                        <span>Grand Total</span>
                        <span>PKR {(subtotal - (formData.discountType === '%' ? (subtotal * formData.discount / 100) : Number(formData.discount)) + (formData.taxType === '%' ? ((subtotal - (formData.discountType === '%' ? (subtotal * formData.discount / 100) : Number(formData.discount))) * Number(formData.tax) / 100) : Number(formData.tax))).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
        <div className="flex justify-end gap-3 sm:gap-4 px-2 sm:px-4 py-4 sm:py-6 bg-gray-50 border-t border-gray-200 w-full">
          <button
            type="button"
            onClick={handleSave}
            disabled={isLoading || !formData.customer.trim()}
            className={`w-full sm:w-auto px-4 sm:px-8 py-2.5 sm:py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 text-sm sm:text-base ${isLoading ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 sm:h-5 sm:w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <span>Save</span>
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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