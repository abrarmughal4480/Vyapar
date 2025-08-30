"use client";
import React, { useState, useEffect, useRef, RefObject } from 'react';
import { useRouter } from 'next/navigation';
import { Printer, Settings, MoreHorizontal } from 'lucide-react';
import Toast from '../../../components/Toast';
import ReactDOM from 'react-dom';
import { getCustomerParties, getPartyBalance } from '../../../../http/parties';
import { getUserItems } from '../../../../http/items';
import { createCreditNote } from '../../../../http/credit-notes';
import { useSidebar } from '../../../contexts/SidebarContext';
import { UnitsDropdown } from '../../../components/UnitsDropdown';
import { ItemsDropdown } from '../../../components/ItemsDropdown';
import { CustomDropdown } from '../../../components/CustomDropdown';

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

interface CreditNoteItem {
  id: number;
  item: string;
  qty: string;
  unit: string;
  price: string;
  amount: number;
  customUnit: string;
}

type DropdownOption = { value: string; label: string };

function ItemRow({
  item,
  index,
  handleItemChange,
  showItemSuggestions,
  setShowItemSuggestions,
  itemSuggestions,
  deleteRow,
  newCreditNote,
  addNewRow,
  unitsDropdownIndex,
  setUnitsDropdownIndex
}: {
  item: CreditNoteItem;
  index: number;
  handleItemChange: (id: number, field: string, value: any) => void;
  showItemSuggestions: { [id: number]: boolean };
  setShowItemSuggestions: React.Dispatch<React.SetStateAction<{ [id: number]: boolean }>>;
  itemSuggestions: any[];
  deleteRow: (id: number) => void;
  newCreditNote: any;
  addNewRow: () => void;
  unitsDropdownIndex: number;
  setUnitsDropdownIndex: React.Dispatch<React.SetStateAction<number>>;
}) {


  return (
    <tr
      className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-blue-50'} hover:bg-blue-100 transition-colors`}
    >
      <td className="py-2 px-2 font-medium">{index + 1}</td>
      <td className="py-2 px-2">
        <ItemsDropdown
          items={itemSuggestions}
          value={item.item}
          onChange={val => handleItemChange(item.id, 'item', val)}
          onItemSelect={(selectedItem) => {
            const unitDisplay = getUnitDisplay(selectedItem.unit);
            handleItemChange(item.id, 'unit', unitDisplay);
            
            let initialPrice = selectedItem.salePrice || 0;
            if (selectedItem.unit && typeof selectedItem.unit === 'object' && selectedItem.unit.conversionFactor) {
              if (unitDisplay === selectedItem.unit.base) {
                initialPrice = selectedItem.salePrice || 0;
              } else if (unitDisplay === selectedItem.unit.secondary) {
                initialPrice = (selectedItem.salePrice || 0) * selectedItem.unit.conversionFactor;
              }
            }
            
            // Don't apply wholesale price immediately - only when quantity meets minimum requirement
            // The wholesale price will be applied when quantity changes via calculatePriceForQuantity function
            
            handleItemChange(item.id, 'price', initialPrice);
            handleItemChange(item.id, 'qty', '1');
            
            // Now calculate the correct price based on the initial quantity of 1
            const newPrice = calculatePriceForQuantity(1, selectedItem);
            if (newPrice !== initialPrice) {
              // Convert price based on selected unit if it's different
              if (unitDisplay === selectedItem.unit?.base) {
                handleItemChange(item.id, 'price', newPrice);
              } else if (unitDisplay === selectedItem.unit?.secondary) {
                handleItemChange(item.id, 'price', newPrice * (selectedItem.unit?.conversionFactor || 1));
              } else {
                handleItemChange(item.id, 'price', newPrice);
              }
            }
          }}
          showSuggestions={showItemSuggestions[item.id]}
          setShowSuggestions={(show) => setShowItemSuggestions(prev => ({ ...prev, [item.id]: show }))}
        />
      </td>
      <td className="py-2 px-2">
        <input
          type="number"
          value={item.qty}
          min={0}
          onChange={e => {
            const newQty = e.target.value;
            handleItemChange(item.id, 'qty', newQty);
            
            // Recalculate price based on new quantity for wholesale pricing
            if (item.item && newQty) {
              const selectedItem = itemSuggestions.find(i => i.name === item.item);
              if (selectedItem) {
                const newPrice = calculatePriceForQuantity(parseFloat(newQty) || 0, selectedItem);
                
                // Convert price based on selected unit
                if (item.unit === selectedItem.unit?.base) {
                  handleItemChange(item.id, 'price', newPrice);
                } else if (item.unit === selectedItem.unit?.secondary) {
                  handleItemChange(item.id, 'price', newPrice * (selectedItem.unit?.conversionFactor || 1));
                } else {
                  handleItemChange(item.id, 'price', newPrice);
                }
              }
            }
            
            if (
              index === newCreditNote.items.length - 1 &&
              newQty &&
              !newCreditNote.items.some((row: { qty?: string }, idx: number) => idx > index && !row.qty)
            ) {
              addNewRow();
            }
          }}
          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
          autoComplete="off"
        />
      </td>
      <td className="py-2 px-2">
        <UnitsDropdown
          units={(() => {
            const units: any[] = [];
            
            // Add base and secondary units if they exist in the item data
            if (item.item) {
              const selectedItem = itemSuggestions.find(i => i.name === item.item);
              if (selectedItem && selectedItem.unit) {
                units.push(selectedItem.unit);
              }
            }
            
            return units;
          })()}
          value={item.unit}
          onChange={val => {
            const selectedItem = itemSuggestions.find(i => i.name === item.item);
            if (selectedItem) {
              if (item.qty) {
                // First calculate the price based on quantity (this handles wholesale vs regular pricing)
                const basePrice = calculatePriceForQuantity(parseFloat(item.qty) || 0, selectedItem);
                
                // Now convert the price to the appropriate unit
                let finalPrice = basePrice;
                if (val === selectedItem.unit?.base) {
                  // Converting to base unit - use the price as calculated
                  finalPrice = basePrice;
                } else if (val === selectedItem.unit?.secondary) {
                  // Converting to secondary unit - multiply by conversion factor
                  finalPrice = basePrice * (selectedItem.unit?.conversionFactor || 1);
                }
                
                handleItemChange(item.id, 'price', finalPrice);
              } else {
                // No quantity set, just use sale price converted to appropriate unit
                let finalPrice = selectedItem.salePrice || 0;
                if (val === selectedItem.unit?.base) {
                  finalPrice = selectedItem.salePrice || 0;
                } else if (val === selectedItem.unit?.secondary) {
                  finalPrice = (selectedItem.salePrice || 0) * (selectedItem.unit?.conversionFactor || 1);
                }
                handleItemChange(item.id, 'price', finalPrice);
              }
            }
            handleItemChange(item.id, 'unit', val);
          }}
          dropdownIndex={unitsDropdownIndex}
          setDropdownIndex={setUnitsDropdownIndex}
          optionsCount={(() => {
            if (item.item) {
              const selectedItem = itemSuggestions.find(i => i.name === item.item);
              if (selectedItem && selectedItem.unit) {
                const unit = selectedItem.unit;
                if (typeof unit === 'object' && unit.base) {
                  return (unit.secondary && unit.secondary !== 'None' ? 2 : 1) + 1; // +1 for Custom option
                } else if (typeof unit === 'string' && unit.includes(' / ')) {
                  return 3; // 2 parts + Custom
                } else {
                  return 2; // 1 unit + Custom
                }
              }
            }
            return 1; // Just NONE
          })()}
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
            value={item.price}
            min={0}
            onChange={e => handleItemChange(item.id, 'price', e.target.value)}
            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
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
              
              // Convert quantity to base unit for comparison with minimum wholesale quantity
              let convertedQty = qty;
              if (selectedItem.unit && typeof selectedItem.unit === 'object' && selectedItem.unit.conversionFactor) {
                if (item.unit === selectedItem.unit.base) {
                  // Already in base unit, no conversion needed
                  convertedQty = qty;
                } else if (item.unit === selectedItem.unit.secondary) {
                  // Convert from secondary to base unit
                  convertedQty = qty * selectedItem.unit.conversionFactor;
                }
              } else if (typeof selectedItem.unit === 'string' && selectedItem.unit.includes(' / ')) {
                const parts = selectedItem.unit.split(' / ');
                if (parts.length === 2) {
                  if (item.unit === parts[0]) {
                    // Base unit, no conversion
                    convertedQty = qty;
                  } else if (item.unit === parts[1]) {
                    // Secondary unit, convert to base (assuming 10x conversion)
                    convertedQty = qty * 10;
                  }
                }
              }
              
              // Check if converted quantity meets minimum wholesale requirement
              if (convertedQty >= minWholesaleQty && wholesalePrice > 0) {
                // Calculate what the wholesale price should be for the current unit
                let expectedWholesalePrice = wholesalePrice;
                if (selectedItem.unit && typeof selectedItem.unit === 'object' && selectedItem.unit.conversionFactor) {
                  if (item.unit === selectedItem.unit.base) {
                    expectedWholesalePrice = wholesalePrice;
                  } else if (item.unit === selectedItem.unit.secondary) {
                    expectedWholesalePrice = wholesalePrice * selectedItem.unit.conversionFactor;
                  }
                } else if (typeof selectedItem.unit === 'string' && selectedItem.unit.includes(' / ')) {
                  const parts = selectedItem.unit.split(' / ');
                  if (parts.length === 2) {
                    if (item.unit === parts[0]) {
                      expectedWholesalePrice = wholesalePrice;
                    } else if (item.unit === parts[1]) {
                      expectedWholesalePrice = wholesalePrice * 10;
                    }
                  }
                }
                
                // Check if current price matches expected wholesale price
                if (Math.abs(currentPrice - expectedWholesalePrice) < 0.01) {
                  return (
                    <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full shadow-sm">
                      Wholesale
                    </div>
                  );
                }
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
        {newCreditNote.items.length > 1 && (
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

const CreateCreditNotePage = () => {
  const router = useRouter();
  const [newCreditNote, setNewCreditNote] = useState({
    partyName: '',
    phoneNo: '',
    items: [
      { id: 1, item: '', qty: '', unit: 'NONE', customUnit: '', price: '', amount: 0 }
    ],
    discount: '',
    discountType: '%',
    tax: '',
    taxType: '%',
    reason: 'Return',
    paid: '',
    editingId: null
  });
  const [showDescription, setShowDescription] = useState(false);
  const [description, setDescription] = useState('');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [showItemSuggestions, setShowItemSuggestions] = useState<{[id: number]: boolean}>({});
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' } | null>(null);
  const [formErrors, setFormErrors] = useState<any>({});
  const [customerSuggestions, setCustomerSuggestions] = useState<any[]>([]);
  const [itemSuggestions, setItemSuggestions] = useState<any[]>([]);
  const [partyBalance, setPartyBalance] = useState<number|null>(null);
  const [customerHighlightedIndex, setCustomerHighlightedIndex] = useState(0);
  
  // Dropdown state variables
  const [dropdownIndex, setDropdownIndex] = useState(0);
  const [unitsDropdownIndices, setUnitsDropdownIndices] = useState<{[id: number]: number}>({});
  
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

  // Fetch items on component mount
  useEffect(() => {
    const initializeData = async () => {
      await fetchItemSuggestions();
    };
    initializeData();
  }, []);

  // Validation
  const validateForm = () => {
    const errors: any = {};
    if (!newCreditNote.partyName) errors.partyName = 'Customer is required';
    const validItems = newCreditNote.items.filter(item => item.item && parseFloat(item.qty) > 0 && parseFloat(item.price) > 0);
    if (validItems.length === 0) errors.items = 'At least one valid item is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewCreditNote(prev => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (id: number, field: string, value: any) => {
    console.log(`handleItemChange called: id=${id}, field=${field}, value=${value}`);
    setNewCreditNote(prev => {
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
      console.log('New credit note state:', updated);
      return updated;
    });
  };

  const addNewRow = () => {
    setNewCreditNote((prev: any) => ({
      ...prev,
      items: [
        ...prev.items,
        { id: Date.now(), item: '', qty: '', unit: 'NONE', customUnit: '', price: '', amount: 0 }
      ]
    }));
  };

  const deleteRow = (id: number) => {
    if (newCreditNote.items.length === 1) return;
    setNewCreditNote(prev => ({ ...prev, items: prev.items.filter(item => item.id !== id) }));
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

  const calculateTotal = () => newCreditNote.items.reduce((sum, item) => sum + (item.amount || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    try {
      const token =
        (typeof window !== 'undefined' && (localStorage.getItem('token') || localStorage.getItem('vypar_auth_token'))) || '';
      const filteredItems = newCreditNote.items.filter(
        item =>
          item.item &&
          item.qty &&
          item.price &&
          !isNaN(Number(item.qty)) &&
          !isNaN(Number(item.price))
      );
      const creditNoteData = {
        ...newCreditNote,
        items: filteredItems.map(item => ({
          ...item,
          qty: Number(item.qty),
          price: Number(item.price)
        })),
        description,
        imageUrl: uploadedImage || undefined,
        tax: newCreditNote.tax === 'NONE' || newCreditNote.tax === '' ? 0 : Number(newCreditNote.tax),
        discount: newCreditNote.discount === '' ? 0 : Number(newCreditNote.discount),
        paid: newCreditNote.paid === '' ? 0 : Number(newCreditNote.paid),
      };
      const result = await createCreditNote(creditNoteData, token);
      if (result && result.success) {
        setToast({ message: 'Credit note created successfully!', type: 'success' });
        setLoading(false);
        setTimeout(() => router.push('/dashboard/credit-note'), 1500);
      } else {
        setToast({ message: result?.message || 'Failed to create credit note', type: 'error' });
        setLoading(false);
      }
    } catch (err: any) {
      setToast({ message: err.message || 'Failed to create credit note', type: 'error' });
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

  // Fetch party balance when partyName changes
  useEffect(() => {
    const fetchBalance = async () => {
      if (!newCreditNote.partyName) {
        setPartyBalance(null);
        return;
      }
      const token =
        (typeof window !== 'undefined' && (localStorage.getItem('token') || localStorage.getItem('vypar_auth_token'))) || '';
      try {
        const balance = await getPartyBalance(newCreditNote.partyName, token);
        setPartyBalance(balance);
      } catch (err) {
        setPartyBalance(null);
      }
    };
    fetchBalance();
  }, [newCreditNote.partyName]);

  // Totals calculation
  const subTotal = calculateTotal();
  let discountValue = 0;
  if (newCreditNote.discount && !isNaN(Number(newCreditNote.discount))) {
    if (newCreditNote.discountType === '%') {
      discountValue = subTotal * Number(newCreditNote.discount) / 100;
    } else {
      discountValue = Number(newCreditNote.discount);
    }
  }
  let taxValue = 0;
  if (newCreditNote.tax && !isNaN(Number(newCreditNote.tax))) {
    if (newCreditNote.taxType === '%') {
      taxValue = (subTotal - discountValue) * Number(newCreditNote.tax) / 100;
    } else if (newCreditNote.taxType === 'PKR') {
      taxValue = Number(newCreditNote.tax);
    }
  }
  const grandTotal = Math.max(0, subTotal - discountValue + taxValue);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-2 sm:px-4 md:px-8">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <div className="w-full h-auto bg-white/90 rounded-2xl shadow-2xl border border-gray-100 overflow-hidden mx-auto my-6">
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-white/90 border-b border-gray-200 flex justify-between items-center px-6 py-4">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Create Credit Note</h1>
          <button
            type="button"
            onClick={() => router.push('/dashboard/credit-note')}
            className="text-gray-400 hover:text-gray-600 text-2xl"
            aria-label="Cancel"
          >
            ✕
          </button>
        </div>
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
                    value={newCreditNote.partyName}
                    onChange={handleInputChange}
                    onFocus={() => {
                      fetchCustomerSuggestions();
                      setShowCustomerSuggestions(true);
                      setCustomerHighlightedIndex(0);
                    }}
                    onBlur={() => setTimeout(() => setShowCustomerSuggestions(false), 200)}
                    onKeyDown={e => {
                      if (!showCustomerSuggestions) return;
                      const optionsCount = customerSuggestions.length;
                      if (["ArrowDown", "ArrowUp", "Enter", "Escape"].includes(e.key)) {
                        e.preventDefault();
                        e.stopPropagation();
                      }
                      if (e.key === 'ArrowDown') {
                        setCustomerHighlightedIndex(i => Math.min(i + 1, optionsCount - 1));
                      } else if (e.key === 'ArrowUp') {
                        setCustomerHighlightedIndex(i => Math.max(i - 1, 0));
                      } else if (e.key === 'Enter') {
                        const selected = customerSuggestions[customerHighlightedIndex];
                        if (selected) {
                          setNewCreditNote(prev => ({ ...prev, partyName: selected.name, phoneNo: selected.phone }));
                          setShowCustomerSuggestions(false);
                        }
                      } else if (e.key === 'Escape') {
                        setShowCustomerSuggestions(false);
                      } else if (e.key.length === 1 && /[a-zA-Z0-9]/.test(e.key)) {
                        // Type to search
                        const nextTerm = (newCreditNote.partyName + e.key).toLowerCase();
                        const foundIdx = customerSuggestions.findIndex(opt => opt.name.toLowerCase().startsWith(nextTerm));
                        if (foundIdx !== -1) setCustomerHighlightedIndex(foundIdx);
                      }
                    }}
                    className={`w-full px-4 py-3 border-2 rounded-lg transition-all duration-200 ${formErrors.partyName ? 'border-red-300 bg-red-50' : 'border-blue-200 focus:border-blue-500'} focus:ring-2 focus:ring-blue-200 focus:outline-none`}
                    placeholder="Search or enter customer name"
                    autoComplete="off"
                  />
                  {showCustomerSuggestions && (
                    <div className="absolute left-0 right-0 mt-1 w-full z-50">
                      {customerSuggestions.length > 0 ? (
                        <ul className="bg-white border border-blue-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {customerSuggestions.map((c, idx) => (
                            <li
                              key={c._id}
                              className={`px-4 py-2 hover:bg-blue-100 cursor-pointer transition-colors ${customerHighlightedIndex === idx ? 'bg-blue-200 text-blue-900' : ''}`}
                              onMouseDown={() => {
                                setNewCreditNote(prev => ({ ...prev, partyName: c.name, phoneNo: c.phone }));
                                setShowCustomerSuggestions(false);
                              }}
                              ref={el => { if (customerHighlightedIndex === idx && el) el.scrollIntoView({ block: 'nearest' }); }}
                              tabIndex={-1}
                              aria-selected={customerHighlightedIndex === idx}
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
                  value={newCreditNote.phoneNo}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                  placeholder="Phone number"
                  autoComplete="off"
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
              {/*
              <button
                type="button"
                onClick={addNewRow}
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
                  {newCreditNote.items.map((item, index) => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      index={index}
                      handleItemChange={handleItemChange}
                      showItemSuggestions={showItemSuggestions}
                      setShowItemSuggestions={setShowItemSuggestions}
                      itemSuggestions={itemSuggestions}
                      deleteRow={deleteRow}
                      newCreditNote={newCreditNote}
                      addNewRow={addNewRow}
                      unitsDropdownIndex={unitsDropdownIndices[item.id] || 0}
                      setUnitsDropdownIndex={(value: React.SetStateAction<number>) => {
                        if (typeof value === 'number') {
                          setUnitsDropdownIndices(prev => ({ ...prev, [item.id]: value }));
                        } else {
                          setUnitsDropdownIndices(prev => ({ ...prev, [item.id]: value(prev[item.id] || 0) }));
                        }
                      }}
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
                  placeholder="Add any additional notes or description for this credit note..."
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
                        value={newCreditNote.discount}
                        onChange={handleInputChange}
                        className="w-24 h-11 px-3 border-2 border-blue-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                        autoComplete="off"
                      />
                      <CustomDropdown
                        options={[
                          { value: '%', label: '%' },
                          { value: 'PKR', label: '(PKR)' }
                        ]}
                        value={newCreditNote.discountType}
                        onChange={val => setNewCreditNote(prev => ({ ...prev, discountType: val }))}
                        className="w-28 min-w-[72px] mb-1 h-11"
                        dropdownIndex={dropdownIndex}
                        setDropdownIndex={setDropdownIndex}
                        optionsCount={2}
                      />
                    </div>
                    <div className="text-xs text-gray-500 min-h-[24px] mt-1">
                      {newCreditNote.discount && !isNaN(Number(newCreditNote.discount)) ? (
                        <>
                          Discount: 
                          {newCreditNote.discountType === '%'
                            ? `${newCreditNote.discount}% = PKR ${discountValue.toFixed(2)}`
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
                    value={newCreditNote.tax}
                    onChange={handleInputChange}
                    className="w-24 h-11 px-3 border-2 border-blue-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                    autoComplete="off"
                  />
                  <CustomDropdown
                    options={[
                      { value: '%', label: '%' },
                      { value: 'PKR', label: '(PKR)' }
                    ]}
                    value={newCreditNote.taxType || '%'}
                    onChange={val => setNewCreditNote(prev => ({ ...prev, taxType: val }))}
                    className="w-28 min-w-[72px] mb-1 h-11"
                    dropdownIndex={dropdownIndex}
                    setDropdownIndex={setDropdownIndex}
                    optionsCount={2}
                  />
                </div>
                <div className="text-xs text-gray-500 min-h-[24px] mt-1">
                  {newCreditNote.tax && !isNaN(Number(newCreditNote.tax)) ? (
                    <>
                      Tax: {newCreditNote.taxType === '%'
                        ? `${newCreditNote.tax}% = PKR ${taxValue.toFixed(2)}`
                        : `PKR ${taxValue.toFixed(2)}`}
                    </>
                  ) : null}
                </div>
              </div>
              {/* Reason */}
              <div>
                <label className="block text-sm font-semibold text-blue-700 mb-2 flex items-center gap-1">
                  <span>📝</span> Reason
                </label>
                <div className="flex flex-col">
                  <CustomDropdown
                    options={[
                      { value: 'Return', label: 'Return' },
                      { value: 'Damage', label: 'Damage' },
                      { value: 'Quality Issue', label: 'Quality Issue' },
                      { value: 'Other', label: 'Other' }
                    ]}
                    value={newCreditNote.reason}
                    onChange={val => setNewCreditNote(prev => ({ ...prev, reason: val }))}
                    className="mb-1"
                    dropdownIndex={dropdownIndex}
                    setDropdownIndex={setDropdownIndex}
                    optionsCount={4}
                  />
                  <div className="text-xs text-gray-500 min-h-[24px] mt-1">
                    {/* Reserved for future info text, keeps alignment consistent */}
                  </div>
                </div>
              </div>
              {/* Paid Amount */}
              <div>
                <label className="block text-sm font-semibold text-blue-700 mb-2 flex items-center gap-1">
                  <span>💰</span> Paid Amount
                </label>
                <div className="flex flex-col">
                  <input
                    type="number"
                    name="paid"
                    value={newCreditNote.paid}
                    onChange={handleInputChange}
                    placeholder="Enter paid amount"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 placeholder-gray-400"
                  />
                  <div className="text-xs text-gray-500 min-h-[24px] mt-1">
                    Amount already paid by customer
                  </div>
                </div>
              </div>
              {/* Totals */}
              <div className="md:col-span-1 md:col-start-4 flex flex-col items-end gap-2">
                <div className="bg-gradient-to-r from-blue-100 to-blue-50 border border-blue-200 rounded-xl px-8 py-4 text-right shadow w-full min-w-[220px] ml-auto">
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
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <span>Create Credit Note</span>
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

export default CreateCreditNotePage;