"use client";
import React, { useState, useEffect, useRef, RefObject, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Printer } from 'lucide-react';
import Toast from '../../../components/Toast';
import { CustomDropdown, type DropdownOption } from '../../../components/CustomDropdown';
import { ItemsDropdown, type Item } from '../../../components/ItemsDropdown';
import { UnitsDropdown, type Unit } from '../../../components/UnitsDropdown';
import { useBankAccounts } from '../../../hooks/useBankAccounts';
import { ToggleSwitch } from '../../../components/ToggleSwitch';
import { PaymentMethodDropdown } from '../../../components/PaymentMethodDropdown';
import ReactDOM from 'react-dom';
import { createSale, updateSale, getSaleById } from '../../../../http/sales';
import { getCustomerParties, getPartyBalance } from '../../../../http/parties';
import { getUserItems } from '../../../../http/items';
import api from '../../../../http/api';
import { API_ENDPOINTS } from '../../../../lib/api';
import { useSidebar } from '../../../contexts/SidebarContext';
// Import any other needed components or hooks

interface SaleItem {
  id: number;
  item: string;
  qty: string;
  unit: string;
  price: string;
  amount: number;
  customUnit: string;
  discountPercentage: string;
  discountAmount: string;
  // Batch information for profit calculation
  consumedBatches?: Array<{
    quantity: number;
    purchasePrice: number;
  }>;
  totalCost?: number;
}





function getUnitDisplay(unit: any) {
  if (!unit) return 'NONE';
  
  // Handle the unit structure from backend
  if (typeof unit === 'object' && unit.base) {
    const base = unit.base || 'NONE';
    const secondary = unit.secondary && unit.secondary !== 'None' ? unit.secondary : null;
    
    // Return base unit as default (Box), not secondary unit (Carton)
    return base;
  }
  
  // Handle string format like "Piece / Packet"
  if (typeof unit === 'string') {
    if (unit.includes(' / ')) {
      const parts = unit.split(' / ');
      // Return the first part (base unit) as default
      return parts[0] || 'NONE';
    }
    return unit || 'NONE';
  }
  
  return 'NONE';
}

// Function to get unit conversion data
function getUnitConversionData(unit: any) {
  if (!unit) return null;
  
  // Handle object format with conversion factor
  if (typeof unit === 'object' && unit.base) {
    return {
      base: unit.base,
      secondary: unit.secondary,
      conversionFactor: unit.conversionFactor || 1
    };
  }
  
  // Handle string format like "Piece / Packet"
  if (typeof unit === 'string' && unit.includes(' / ')) {
    const parts = unit.split(' / ');
    // For string format, we'll need to get conversion factor from the item data
    return {
      base: parts[0],
      secondary: parts[1],
      conversionFactor: 1 // Default conversion factor, will be updated from item data
    };
  }
  
  return null;
}

// Function to convert quantity based on unit change
function convertQuantity(currentQty: string, currentUnit: string, newUnit: string, itemData: any): string {
  if (!currentQty || !currentUnit || !newUnit || currentUnit === newUnit) {
    return currentQty;
  }
  
  const qty = parseFloat(currentQty);
  if (isNaN(qty)) return currentQty;
  
  // Get unit conversion data from item - use original unit object if available
  const unitData = getUnitConversionData(itemData.unit);
  if (!unitData) return currentQty;
  
  // Use the actual conversion factor from item data if available
  const conversionFactor = itemData.unit && typeof itemData.unit === 'object' ? 
    itemData.unit.conversionFactor : unitData.conversionFactor;
  
  // Convert from base to secondary or vice versa
  if (newUnit === unitData.base && currentUnit === unitData.secondary) {
    // Converting from secondary to base (multiply by conversion factor)
    const convertedQty = qty * conversionFactor;
    return Math.round(convertedQty).toString();
  } else if (newUnit === unitData.secondary && currentUnit === unitData.base) {
    // Converting from base to secondary (divide by conversion factor)
    const convertedQty = qty / conversionFactor;
    return Math.round(convertedQty).toString();
  }
  
  return currentQty;
}

// Function to convert price based on unit change
function convertPrice(currentPrice: string, currentUnit: string, newUnit: string, itemData: any): string {
  if (!currentPrice || !currentUnit || !newUnit || currentUnit === newUnit) {
    return currentPrice;
  }
  
  const price = parseFloat(currentPrice);
  if (isNaN(price)) return currentPrice;
  
  // Get unit conversion data from item
  const unitData = getUnitConversionData(itemData.unit);
  if (!unitData) return currentPrice;
  
  // Use the actual conversion factor from item data if available
  const conversionFactor = itemData.unit && typeof itemData.unit === 'object' ? 
    itemData.unit.conversionFactor : unitData.conversionFactor;
  
  // Convert price based on unit change
  if (newUnit === unitData.base && currentUnit === unitData.secondary) {
    // Converting from secondary to base (divide price by conversion factor)
    const convertedPrice = price / conversionFactor;
    return (Math.round(convertedPrice * 100) / 100).toFixed(2); // Round to 2 decimal places
  } else if (newUnit === unitData.secondary && currentUnit === unitData.base) {
    // Converting from base to secondary (multiply price by conversion factor)
    const convertedPrice = price * conversionFactor;
    return (Math.round(convertedPrice * 100) / 100).toFixed(2); // Round to 2 decimal places
  }
  
  return currentPrice;
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
  addNewRow,
  calculatePriceForQuantity
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
  calculatePriceForQuantity: (qty: number, itemData: any) => number;
}) {
  // Add state for unit dropdown highlight
  const [unitDropdownIndex, setUnitDropdownIndex] = React.useState(0);

  const handleFocus = () => {
    fetchItemSuggestions();
    setShowItemSuggestions((prev: any) => ({ ...prev, [item.id]: true }));
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

  // Get the current unit value for the dropdown
  const getCurrentUnitValue = () => {
    if (!item.item) return 'NONE';
    
    const selectedItem = itemSuggestions.find(i => i.name === item.item);
    if (!selectedItem || !selectedItem.unit) return 'NONE';
    
    // Return the actual current unit value, not the default
    if (item.unit && item.unit !== 'NONE') {
      return item.unit;
    }
    
    // Only default to base unit if no unit is set
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
  };

  return (
    <tr
      className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-blue-50'} hover:bg-blue-100 transition-colors`}
    >
      <td className="py-2 px-2 font-medium">{index + 1}</td>
      <td className="py-2 px-2">
        <ItemsDropdown
          items={itemSuggestions}
          value={item.item}
          onChange={(val) => handleItemChange(item.id, 'item', val)}
          onItemSelect={(selectedItem) => {
            const unitDisplay = getUnitDisplay(selectedItem.unit);
            handleItemChange(item.id, 'unit', unitDisplay);
            
            // Set price based on the selected unit and wholesale logic
            let initialPrice = selectedItem.salePrice || 0;
            
            if (selectedItem.unit && typeof selectedItem.unit === 'object' && selectedItem.unit.base && selectedItem.unit.secondary) {
              // salePrice is for secondary unit (Carton), so convert to base unit (Box) since we're showing base unit
              if (unitDisplay === selectedItem.unit.base && selectedItem.unit.conversionFactor) {
                initialPrice = (selectedItem.salePrice || 0) / selectedItem.unit.conversionFactor;
              }
            }
            
            
            handleItemChange(item.id, 'price', initialPrice);
            handleItemChange(item.id, 'qty', ''); // Leave quantity empty
          }}
          className="w-full"
          placeholder="Enter item name..."
          showSuggestions={showItemSuggestions[item.id]}
          setShowSuggestions={(show) => setShowItemSuggestions((prev: any) => ({ ...prev, [item.id]: show }))}
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
            
            // Add new row if this is the last row and quantity is entered
            if (
              index === newSale.items.length - 1 &&
              newQty
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
          units={unitOptions}
          value={getCurrentUnitValue()}
          onChange={val => {
            const selectedItem = itemSuggestions.find(i => i.name === item.item);
            if (selectedItem) {
              // Don't convert quantity - keep it the same
              // Only update price based on the new unit and current quantity
              if (item.qty) {
                // Convert current quantity to base unit for wholesale check
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
                  // Apply wholesale pricing
                  if (val === selectedItem.unit?.base) {
                    finalPrice = wholesalePrice;
                  } else if (val === selectedItem.unit?.secondary && selectedItem.unit?.conversionFactor) {
                    finalPrice = wholesalePrice * selectedItem.unit.conversionFactor;
                  } else {
                    finalPrice = wholesalePrice;
                  }
                } else {
                  // Apply regular sale pricing
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
                // If no quantity, just set the sale price converted to appropriate unit
                if (val === selectedItem.unit?.base) {
                  handleItemChange(item.id, 'price', selectedItem.salePrice || 0);
                } else if (val === selectedItem.unit?.secondary && selectedItem.unit?.conversionFactor) {
                  handleItemChange(item.id, 'price', (selectedItem.salePrice || 0) * selectedItem.unit.conversionFactor);
                } else {
                  handleItemChange(item.id, 'price', selectedItem.salePrice || 0);
                }
              }
            }
            
            // Update the unit
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
              
              // Convert quantity to base unit for comparison
              let convertedQty = qty;
              if (selectedItem.unit && typeof selectedItem.unit === 'object' && selectedItem.unit.conversionFactor) {
                if (item.unit === selectedItem.unit.secondary) {
                  convertedQty = qty * selectedItem.unit.conversionFactor;
                }
              }
              
              // Calculate expected wholesale price for current unit
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
        <div className="grid grid-cols-2 gap-1">
          <div className="relative">
            <input
              type="number"
              value={item.discountPercentage || ''}
              min={0}
              onChange={e => {
                const value = e.target.value;
                const qty = parseFloat(item.qty) || 1; // Default to 1 if empty
                const price = parseFloat(item.price) || 0;
                const totalAmount = qty * price;
                
                // Calculate amount when percentage changes
                const percentage = parseFloat(value) || 0;
                const calculatedAmount = (totalAmount * percentage) / 100;
                
                // Update both fields simultaneously
                handleItemChange(item.id, 'discountPercentage', value);
                handleItemChange(item.id, 'discountAmount', calculatedAmount.toFixed(2));
              }}
              className="w-full px-2 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all text-center"
              placeholder="0.00"
              autoComplete="off"
            />
          </div>
          <div className="relative">
            <input
              type="number"
              value={item.discountAmount || ''}
              min={0}
              onChange={e => {
                const value = e.target.value;
                const qty = parseFloat(item.qty) || 1; // Default to 1 if empty
                const price = parseFloat(item.price) || 0;
                const totalAmount = qty * price;
                
                // Calculate percentage when amount changes
                const amount = parseFloat(value) || 0;
                const calculatedPercentage = totalAmount > 0 ? (amount / totalAmount) * 100 : 0;
                
                // Update both fields simultaneously
                handleItemChange(item.id, 'discountAmount', value);
                handleItemChange(item.id, 'discountPercentage', calculatedPercentage.toFixed(2));
              }}
              className="w-full px-2 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all text-center"
              placeholder="0.00"
              autoComplete="off"
            />
          </div>
        </div>
      </td>
      <td className="py-2 px-2">
        <span className="text-gray-900 font-semibold">
          {(() => {
            const qty = parseFloat(item.qty) || 0;
            const price = parseFloat(item.price) || 0;
            const originalAmount = qty * price;
            
            // Calculate discount amount
            let discountAmount = 0;
            if (item.discountPercentage) {
              discountAmount = (originalAmount * parseFloat(item.discountPercentage)) / 100;
            } else if (item.discountAmount) {
              discountAmount = parseFloat(item.discountAmount);
            }
            
            // Final amount after discount
            const finalAmount = Math.max(0, originalAmount - discountAmount);
            
            return `${finalAmount.toFixed(2)} ${item.unit === 'Custom' && item.customUnit ? item.customUnit : item.unit !== 'NONE' ? (typeof item.unit === 'object' ? getUnitDisplay(item.unit) : item.unit) : ''}`;
          })()}
        </span>
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

// Component that handles search params
const AddSalePageWithSearchParams = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { bankAccounts } = useBankAccounts();
  const [viewMode, setViewMode] = useState<'credit' | 'cash'>('credit');
  const [newSale, setNewSale] = useState({
    partyName: '',
    phoneNo: '',
    items: [
      { id: 1, item: '', qty: '', unit: 'NONE', customUnit: '', price: '', amount: 0, discountPercentage: '', discountAmount: '' }
    ],
    discount: '',
    discountType: '%',
    tax: '',
    taxType: '%',
    paymentType: 'Credit',
    paymentMethod: 'Cash',
    bankAccountId: null as string | null,
    bankAccountName: '',
    receivedAmount: '', // <-- Add this line
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
  const [addSaleLoading, setAddSaleLoading] = useState(false);
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
  // Add state for customer dropdown highlight
  const [customerDropdownIndex, setCustomerDropdownIndex] = useState(0);
  
  // Add state for other dropdowns
  const [discountTypeDropdownIndex, setDiscountTypeDropdownIndex] = useState(0);
  const [taxTypeDropdownIndex, setTaxTypeDropdownIndex] = useState(0);
  const [paymentTypeDropdownIndex, setPaymentTypeDropdownIndex] = useState(0);
  
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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'N') {
        event.preventDefault();
        addNewRow();
      }
      else if (event.ctrlKey && (event.key === '+' || event.key === '=')) {
        event.preventDefault();
        addNewRow();
      }
      else if (event.ctrlKey && event.key === '-') {
        event.preventDefault();
        if (newSale.items.length > 1) {
          const lastItem = newSale.items[newSale.items.length - 1];
          deleteRow(lastItem.id);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [newSale.items]);

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
            
            // If quantity is changing, recalculate price based on wholesale logic
            if (field === 'qty') {
              // Find the selected item to check wholesale pricing
              const selectedItem = itemSuggestions.find(i => i.name === item.item);
              if (selectedItem) {
                // First check if wholesale pricing should be applied
                const minWholesaleQty = selectedItem.minimumWholesaleQuantity || 0;
                const wholesalePrice = selectedItem.wholesalePrice || 0;
                
                // Convert quantity to base unit for comparison
                let convertedQty = value;
                if (selectedItem.unit && typeof selectedItem.unit === 'object' && selectedItem.unit.conversionFactor) {
                  if (updated.unit === selectedItem.unit.secondary) {
                    convertedQty = value * selectedItem.unit.conversionFactor;
                  }
                }
                
                let finalPrice;
                if (convertedQty >= minWholesaleQty && wholesalePrice > 0) {
                  // Apply wholesale pricing
                  if (updated.unit === selectedItem.unit?.base) {
                    finalPrice = wholesalePrice;
                  } else if (updated.unit === selectedItem.unit?.secondary && selectedItem.unit?.conversionFactor) {
                    finalPrice = wholesalePrice * selectedItem.unit.conversionFactor;
                  } else {
                    finalPrice = wholesalePrice;
                  }
                } else {
                  // Apply regular sale pricing
                  if (updated.unit === selectedItem.unit?.base) {
                    finalPrice = selectedItem.salePrice || 0;
                  } else if (updated.unit === selectedItem.unit?.secondary && selectedItem.unit?.conversionFactor) {
                    finalPrice = (selectedItem.salePrice || 0) * selectedItem.unit.conversionFactor;
                  } else {
                    finalPrice = selectedItem.salePrice || 0;
                  }
                }
                
                updated.price = finalPrice;
                console.log(`Wholesale price calculation: qty=${value}, convertedQty=${convertedQty}, minWholesaleQty=${minWholesaleQty}, wholesalePrice=${wholesalePrice}, finalPrice=${finalPrice}`);
              }
            }
            
            // Always recalculate amount when qty, price, or unit changes
            if (field === 'qty' || field === 'price' || field === 'unit') {
              const qty = parseFloat(field === 'qty' ? value : item.qty) || 0;
              // Use the updated price if it was just calculated (for wholesale), otherwise use the current price
              const price = parseFloat(field === 'price' ? value : (field === 'qty' ? updated.price : item.price)) || 0;
              updated.amount = qty * price;
              console.log(`Amount calculation: qty=${qty}, price=${price}, amount=${updated.amount}`);
            }
            
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
      const subTotal = calculateTotal();
      let discountValue = 0;
      if (newSale.discount && !isNaN(Number(newSale.discount))) {
        if (newSale.discountType === '%') {
          discountValue = subTotal * Number(newSale.discount) / 100;
        } else {
          discountValue = Number(newSale.discount);
        }
      }
      
      // Calculate total discount from all items
      const totalItemDiscount = newSale.items.reduce((total, item) => {
        let itemDiscount = 0;
        if (item.discountPercentage) {
          const qty = parseFloat(item.qty) || 0;
          const price = parseFloat(item.price) || 0;
          itemDiscount = (qty * price * parseFloat(item.discountPercentage)) / 100;
        } else if (item.discountAmount) {
          itemDiscount = parseFloat(item.discountAmount) || 0;
        }
        return total + itemDiscount;
      }, 0);
      
      // Total discount is item discounts + global discount
      const totalDiscount = totalItemDiscount + discountValue;
      
      // Tax calculation
      let taxValue = 0;
      if (newSale.tax && !isNaN(Number(newSale.tax))) {
        if (newSale.taxType === '%') {
          taxValue = (subTotal - totalDiscount) * Number(newSale.tax) / 100;
        } else if (newSale.taxType === 'PKR') {
          taxValue = Number(newSale.tax);
        }
      }
      const grandTotal = Math.max(0, subTotal - totalDiscount + taxValue);

      const saleData = {
        ...newSale,
        items: filteredItems.map((item: any) => ({
          ...item,
          // Ensure batch information is preserved for profit calculation
          consumedBatches: item.consumedBatches || [],
          totalCost: item.totalCost || 0
        })),
        description,
        imageUrl: uploadedImage,
        tax: newSale.tax === 'NONE' || newSale.tax === '' ? 0 : newSale.tax,
        receivedAmount: newSale.paymentType === 'Cash' ? grandTotal : newSale.receivedAmount,
        paymentMethod: newSale.paymentMethod || 'Cash',
        bankAccountId: newSale.bankAccountId || null,
        bankAccountName: newSale.bankAccountName || '',
        sourceOrderId, // Include the original order ID
        sourceOrderNumber // Include the original order number
      };
      let result;
      console.log('Saving sale with editingId:', newSale.editingId);
      console.log('Sale data:', saleData);
      console.log('Items with batch info:', saleData.items.map(item => ({
        item: item.item,
        consumedBatches: item.consumedBatches,
        totalCost: item.totalCost
      })));
      
      if (newSale.editingId) {
        console.log('Updating existing sale with ID:', newSale.editingId);
        result = await updateSale(newSale.editingId, saleData, token);
      } else {
        console.log('Creating new sale');
        result = await createSale(saleData, token);
      }
      if (result.success && result.sale && result.sale._id) {
        setInvoiceNo(result.sale.invoiceNo || null);
        
        // Check if party was auto-created
        if (result.partyCreated) {
          setToast({ 
            message: `Party "${newSale.partyName}" was automatically created and sale saved! Invoice No: ${result.sale.invoiceNo || ''}`, 
            type: 'success' 
          });
        }
        
        // If this was converted from a quotation, update the quotation status
        if (quotationId) {
          try {
            // Import the function to update quotation status
            const { updateQuotationStatus } = await import('../../../../http/quotations');
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
            const { updateSaleOrderStatus } = await import('../../../../http/saleOrders');
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
            const { updateDeliveryChallanStatus } = await import('../../../../http/deliveryChallan');
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
        
        // Redirect to invoice page for printing (both editing and creating)
        setTimeout(() => router.push(`/dashboard/invoices?saleId=${result.sale._id}&invoiceNo=${result.sale.invoiceNo}`), 1500);
        return;
      }
      if (result.success) {
        setToast({ message: 'Sale saved successfully!', type: 'success' });
        setLoading(false);
        // Redirect to invoice page for printing (both editing and creating)
        setTimeout(() => router.push('/dashboard/invoices'), 1200);
      } else {
        setToast({ message: result.message || 'Failed to save sale', type: 'error' });
        setLoading(false);
      }
    } catch (err: any) {
      setToast({ message: err.message || 'Failed to save sale', type: 'error' });
      setLoading(false);
    }
  };

  // Separate function for Add Sale button (without invoice redirect)
  const handleAddSale = async () => {
    if (!validateForm()) return;
    setAddSaleLoading(true);
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
      const subTotal = calculateTotal();
      let discountValue = 0;
      if (newSale.discount && !isNaN(Number(newSale.discount))) {
        if (newSale.discountType === '%') {
          discountValue = subTotal * Number(newSale.discount) / 100;
        } else {
          discountValue = Number(newSale.discount);
        }
      }
      
      // Calculate total discount from all items
      const totalItemDiscount = newSale.items.reduce((total, item) => {
        let itemDiscount = 0;
        if (item.discountPercentage) {
          const qty = parseFloat(item.qty) || 0;
          const price = parseFloat(item.price) || 0;
          itemDiscount = (qty * price * parseFloat(item.discountPercentage)) / 100;
        } else if (item.discountAmount) {
          itemDiscount = parseFloat(item.discountAmount) || 0;
        }
        return total + itemDiscount;
      }, 0);
      
      // Total discount is item discounts + global discount
      const totalDiscount = totalItemDiscount + discountValue;
      
      // Tax calculation
      let taxValue = 0;
      if (newSale.tax && !isNaN(Number(newSale.tax))) {
        if (newSale.taxType === '%') {
          taxValue = (subTotal - totalDiscount) * Number(newSale.tax) / 100;
        } else if (newSale.taxType === 'PKR') {
          taxValue = Number(newSale.tax);
        }
      }
      const grandTotal = Math.max(0, subTotal - totalDiscount + taxValue);

      const saleData = {
        ...newSale,
        items: filteredItems.map((item: any) => ({
          ...item,
          // Ensure batch information is preserved for profit calculation
          consumedBatches: item.consumedBatches || [],
          totalCost: item.totalCost || 0
        })),
        description,
        imageUrl: uploadedImage,
        tax: newSale.tax === 'NONE' || newSale.tax === '' ? 0 : newSale.tax,
        receivedAmount: newSale.paymentType === 'Cash' ? grandTotal : newSale.receivedAmount,
        paymentMethod: newSale.paymentMethod || 'Cash',
        bankAccountId: newSale.bankAccountId || null,
        bankAccountName: newSale.bankAccountName || '',
        sourceOrderId,
        sourceOrderNumber
      };
      
      let result;
      console.log('AddSale - Items with batch info:', saleData.items.map(item => ({
        item: item.item,
        consumedBatches: item.consumedBatches,
        totalCost: item.totalCost
      })));
      
      if (newSale.editingId) {
        result = await updateSale(newSale.editingId, saleData, token);
      } else {
        result = await createSale(saleData, token);
      }
      
      if (result.success && result.sale && result.sale._id) {
        if (result.partyCreated) {
          setToast({ 
            message: `Party "${newSale.partyName}" was automatically created and sale ${newSale.editingId ? 'updated' : 'saved'}! Invoice No: ${result.sale.invoiceNo || ''}`, 
            type: 'success' 
          });
        } else {
          if (newSale.editingId) {
            setToast({ message: `Sale updated successfully! Invoice No: ${result.sale.invoiceNo || ''}`, type: 'success' });
          } else {
            setToast({ message: `Sale saved successfully! Invoice No: ${result.sale.invoiceNo || ''}`, type: 'success' });
          }
        }
        // Redirect to sale page
        setTimeout(() => router.push('/dashboard/sale'), 1500);
      } else {
        setToast({ message: result.message || 'Failed to save sale', type: 'error' });
      }
    } catch (err: any) {
      setToast({ message: err.message || 'Failed to save sale', type: 'error' });
    } finally {
      setAddSaleLoading(false);
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
            paymentMethod: parsedData.paymentMethod === 'Bank Transfer' && parsedData.bankAccountId 
              ? `bank_${parsedData.bankAccountId}` 
              : parsedData.paymentMethod || 'Cash',
            bankAccountId: parsedData.bankAccountId || null as string | null,
            bankAccountName: parsedData.bankAccountName || '',
            receivedAmount: parsedData.received || '',
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
      
      if (!token) {
        setPartyBalance(null);
        return;
      }
      
      try {
        const balance = await getPartyBalance(newSale.partyName, token);
        // Handle case where balance might be null or undefined
        setPartyBalance(balance || null);
      } catch (err: any) {
        console.warn('Could not fetch party balance:', err.message || err);
        setPartyBalance(null);
        // Don't show error toast for balance fetch failures as it's not critical
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
  
  // Calculate total discount from all items
  const totalItemDiscount = newSale.items.reduce((total, item) => {
    let itemDiscount = 0;
    if (item.discountPercentage) {
      const qty = parseFloat(item.qty) || 0;
      const price = parseFloat(item.price) || 0;
      itemDiscount = (qty * price * parseFloat(item.discountPercentage)) / 100;
    } else if (item.discountAmount) {
      itemDiscount = parseFloat(item.discountAmount) || 0;
    }
    return total + itemDiscount;
  }, 0);
  
  // Total discount is item discounts + global discount
  const totalDiscount = totalItemDiscount + discountValue;
  
  // Tax calculation
  let taxValue = 0;
  if (newSale.tax && !isNaN(Number(newSale.tax))) {
    if (newSale.taxType === '%') {
      taxValue = (subTotal - totalDiscount) * Number(newSale.tax) / 100;
    } else if (newSale.taxType === 'PKR') {
      taxValue = Number(newSale.tax);
    }
  }
  const grandTotal = Math.max(0, subTotal - totalDiscount + taxValue);
  
  // UI
  useEffect(() => {
    const editId = searchParams?.get('editId');
    console.log('Edit ID from search params:', editId);
    
    if (editId) {
      const token = localStorage.getItem('token') || '';
      console.log('Fetching sale data for edit ID:', editId);
      
      getSaleById(editId, token).then(async (result) => {
        console.log('Sale data fetch result:', result);
        
        if (result && result.success && result.sale) {
          const saleData = result.sale;
          console.log('Setting sale data for editing:', saleData);
          
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
              amount: item.amount || 0,
              // Preserve batch information for profit calculation
              consumedBatches: item.consumedBatches || [],
              totalCost: item.totalCost || 0
            })) : [],
            discount: saleData.discount || '',
            discountType: saleData.discountType || '%',
            tax: saleData.tax || '',
            taxType: saleData.taxType || '%',
            paymentType: saleData.paymentType || 'Credit', // Use actual paymentType from sale data
            paymentMethod: saleData.paymentMethod === 'Bank Transfer' && saleData.bankAccountId 
              ? `bank_${saleData.bankAccountId}` 
              : saleData.paymentMethod || 'Cash',
            bankAccountId: saleData.bankAccountId || null as string | null,
            bankAccountName: saleData.bankAccountName || '',
            receivedAmount: saleData.received || '', // Use correct field name from backend
            editingId: saleData._id || saleData.id || null
          });
          
          // Set viewMode based on paymentType for toggle display
          const paymentType = saleData.paymentType || 'Credit';
          if (paymentType === 'Credit') {
            setViewMode('credit');
          } else {
            setViewMode('cash');
          }
          
          console.log('Set editingId to:', saleData._id || saleData.id || null);
          setDescription(saleData.description || '');
          setUploadedImage(saleData.imageUrl || null);
          setSaleStatus(saleData.status || 'Draft');
          
          // Fetch party balance for the edited sale
          if (saleData.partyName) {
            try {
              const balance = await getPartyBalance(saleData.partyName, token);
              setPartyBalance(balance);
            } catch (err) {
              console.error('Error fetching party balance for edit:', err);
              setPartyBalance(null);
            }
          }
        } else {
          console.error('Failed to fetch sale data:', result);
        }
      }).catch(error => {
        console.error('Error fetching sale data:', error);
      });
    }
  }, [searchParams]);

  // Fetch all customers once on mount
  useEffect(() => {
    const fetchAllCustomers = async () => {
      const token =
        (typeof window !== 'undefined' && (localStorage.getItem('token') || localStorage.getItem('vypar_auth_token'))) || '';
      const customers = await getCustomerParties(token);
      setCustomers(customers);
    };
    fetchAllCustomers();
  }, []);

  // Filtered suggestions update as user types
  useEffect(() => {
    if (!newSale.partyName) {
      setCustomerSuggestions(customers);
      return;
    }
    const filtered = customers.filter(c =>
      c.name && c.name.toLowerCase().includes(newSale.partyName.toLowerCase())
    );
    setCustomerSuggestions(filtered);
  }, [newSale.partyName, customers]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-2 sm:px-4 md:px-8">
      <div className="w-full h-auto bg-white/90 rounded-2xl shadow-2xl border border-gray-100 overflow-hidden mx-auto my-6">
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-white/90 border-b border-gray-200 px-6 py-4">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-4">
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">
                {newSale.editingId ? 'Edit Sale' : 'Add Sale'}
              </h1>
              <ToggleSwitch
                leftLabel="Credit"
                rightLabel="Cash"
                value={viewMode}
                onChange={(value) => {
                  setViewMode(value as 'credit' | 'cash');
                  if (value === 'credit') {
                    setNewSale(prev => ({ 
                      ...prev, 
                      paymentType: 'Credit'
                      // Keep paymentMethod, bankAccountId, bankAccountName unchanged
                      // These are for how received amount is paid, not the sale type
                    }));
                  } else {
                    setNewSale(prev => ({ 
                      ...prev, 
                      paymentType: 'Cash'
                      // Keep paymentMethod, bankAccountId, bankAccountName unchanged
                      // These are for how received amount is paid, not the sale type
                    }));
                  }
                }}
                leftValue="credit"
                rightValue="cash"
              />
            </div>
            <button
              type="button"
              onClick={() => router.push('/dashboard/sale')}
              className="text-gray-400 hover:text-gray-600 text-2xl"
              aria-label="Cancel"
            >
              ✕
            </button>
          </div>
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
                    value={newSale.partyName}
                    onChange={e => {
                      handleInputChange(e);
                      setShowCustomerSuggestions(true);
                      setCustomerDropdownIndex(0); // reset highlight
                    }}
                    onFocus={() => {
                      setShowCustomerSuggestions(true);
                    }}
                    onBlur={() => setTimeout(() => setShowCustomerSuggestions(false), 200)}
                    className={`w-full px-4 py-3 border-2 rounded-lg transition-all duration-200 ${formErrors.partyName ? 'border-red-300 bg-red-50' : 'border-blue-200 focus:border-blue-500'} focus:ring-2 focus:ring-blue-200 focus:outline-none`}
                    placeholder="Search or enter customer name"
                    autoComplete="off"
                    onKeyDown={e => {
                      if (!showCustomerSuggestions) return;
                      const optionsCount = customerSuggestions.length + 1; // +1 for Add Customer
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
                          router.push('/dashboard/parties?addParty=1&returnUrl=' + encodeURIComponent('/dashboard/sale/add'));
                          setShowCustomerSuggestions(false);
                        } else {
                          const c = customerSuggestions[customerDropdownIndex - 1];
                          if (c) {
                            setNewSale(prev => ({ ...prev, partyName: c.name, phoneNo: c.phone }));
                            setShowCustomerSuggestions(false);
                          }
                        }
                      } else if (e.key === 'Escape') {
                        setShowCustomerSuggestions(false);
                      }
                    }}
                  />
                  {showCustomerSuggestions && (
                    <div className="absolute left-0 right-0 mt-1 w-full z-50">
                      {(customerSuggestions.length > 0 || true) ? (
                        <ul className="bg-white border border-blue-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {/* Add Customer option at the top */}
                          <li
                            className={`px-4 py-2 cursor-pointer text-blue-600 font-semibold hover:bg-blue-50 rounded-t-lg ${customerDropdownIndex === 0 ? 'bg-blue-100 text-blue-700' : ''}`}
                            onMouseDown={e => {
                              e.preventDefault();
                              e.stopPropagation();
                              router.push('/dashboard/parties?addParty=1&returnUrl=' + encodeURIComponent('/dashboard/sale/add'));
                              setShowCustomerSuggestions(false);
                            }}
                            ref={el => { if (customerDropdownIndex === 0 && el) el.scrollIntoView({ block: 'nearest' }); }}
                            role="option"
                            aria-selected={customerDropdownIndex === 0}
                          >
                            + Add Customer
                          </li>
                          {customerSuggestions.map((c, idx) => (
                            <li
                              key={c._id}
                              className={`px-4 py-2 hover:bg-blue-100 cursor-pointer transition-colors ${customerDropdownIndex === idx + 1 ? 'bg-blue-100 text-blue-700 font-semibold' : ''}`}
                              onMouseDown={e => {
                                e.preventDefault();
                                e.stopPropagation();
                                setNewSale(prev => ({ ...prev, partyName: c.name, phoneNo: c.phone }));
                                setShowCustomerSuggestions(false);
                              }}
                              ref={el => { if (customerDropdownIndex === idx + 1 && el) el.scrollIntoView({ block: 'nearest' }); }}
                              role="option"
                              aria-selected={customerDropdownIndex === idx + 1}
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
              <button
                type="button"
                onClick={addNewRow}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition-colors font-semibold text-sm hover:shadow-lg transform hover:scale-105"
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
                    <th className="text-left py-3 px-2 font-semibold text-gray-700 w-80">
                      <div className="grid grid-cols-2 gap-1 text-center">
                        <div className="col-span-2 text-sm font-semibold">DISCOUNT</div>
                        <div className="text-xs font-normal text-gray-600 border-r border-gray-300 pr-1">%</div>
                        <div className="text-xs font-normal text-gray-600 pl-1">AMOUNT</div>
                      </div>
                    </th>
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
                      calculatePriceForQuantity={calculatePriceForQuantity}
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
                        autoComplete="off"
                      />
                      <CustomDropdown
                        options={[
                          { value: '%', label: '%' },
                          { value: 'PKR', label: '(PKR)' }
                        ]}
                        value={newSale.discountType}
                        onChange={val => setNewSale(prev => ({ ...prev, discountType: val }))}
                        className="w-28 min-w-[72px] mb-1 h-11"
                        dropdownIndex={discountTypeDropdownIndex}
                        setDropdownIndex={setDiscountTypeDropdownIndex}
                        optionsCount={2}
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
                    autoComplete="off"
                  />
                  <CustomDropdown
                    options={[
                      { value: '%', label: '%' },
                      { value: 'PKR', label: '(PKR)' }
                    ]}
                    value={newSale.taxType || '%'}
                    onChange={val => setNewSale(prev => ({ ...prev, taxType: val }))}
                    className="w-28 min-w-[72px] mb-1 h-11"
                    dropdownIndex={taxTypeDropdownIndex}
                    setDropdownIndex={setTaxTypeDropdownIndex}
                    optionsCount={2}
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
              {/* Payment Method */}
              <div>
                <label className="block text-sm font-semibold text-blue-700 mb-2 flex items-center gap-1">
                  <span>💳</span> Select Payment Method
                </label>
                <div className="flex flex-col">
                  <PaymentMethodDropdown
                    value={newSale.paymentMethod}
                    onChange={(val) => {
                      // Handle different payment method types
                      if (val === 'Cash' || val === 'Cheque') {
                        setNewSale(prev => ({ 
                          ...prev, 
                          paymentMethod: val,
                          bankAccountId: null as string | null,
                          bankAccountName: ''
                        }));
                      } else if (val.startsWith('bank_')) {
                        // Bank account selected
                        const accountId = val.replace('bank_', '');
                        const account = bankAccounts.find(acc => acc._id === accountId);
                        if (account) {
                          setNewSale(prev => ({ 
                            ...prev, 
                            paymentMethod: val, // Keep the bank_ identifier for display
                            bankAccountId: account._id as string | null,
                            bankAccountName: account.accountDisplayName
                          }));
                        }
                      } else {
                        // Fallback for display names
                        const account = bankAccounts.find(acc => acc.accountDisplayName === val);
                        if (account) {
                          setNewSale(prev => ({ 
                            ...prev, 
                            paymentMethod: `bank_${account._id}`, // Convert to bank_ format
                            bankAccountId: account._id as string | null,
                            bankAccountName: account.accountDisplayName
                          }));
                        } else {
                          setNewSale(prev => ({ 
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
                    dropdownIndex={paymentTypeDropdownIndex}
                    setDropdownIndex={setPaymentTypeDropdownIndex}
                  />
                  {viewMode === 'credit' && (
                    <div className="mt-2">
                      <label className="block text-xs font-medium text-green-700 mb-1">Received Amount</label>
                      <input
                        type="number"
                        name="receivedAmount"
                        value={newSale.receivedAmount}
                        min={0}
                        max={grandTotal}
                        onChange={e => setNewSale(prev => ({ ...prev, receivedAmount: e.target.value }))}
                        className="w-full px-3 py-2 border-2 border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-200"
                        placeholder={`Enter amount received (max PKR ${grandTotal.toFixed(2)})`}
                        autoComplete="off"
                      />
                    </div>
                  )}
                  <div className="text-xs text-gray-500 min-h-[24px] mt-1">
                    {/* Reserved for future info text, keeps alignment consistent */}
                  </div>
                </div>
              </div>
              {/* Totals */}
              <div className="md:col-span-1 flex flex-col items-end gap-2 mr-4">
                <div className="bg-gradient-to-r from-blue-100 to-blue-50 border border-blue-200 rounded-xl px-8 py-4 text-right shadow w-full min-w-[220px] ml-auto">
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>Sub Total</span>
                      <span>PKR {subTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>Global Discount</span>
                      <span>- PKR {discountValue.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>Item Discounts</span>
                      <span>- PKR {totalItemDiscount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>Total Discount</span>
                      <span>- PKR {totalDiscount.toFixed(2)}</span>
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
                    
                    {/* Credit Information - Grand Total se minus nahi hoti */}
                    {newSale.paymentType === 'Credit' && newSale.receivedAmount && Number(newSale.receivedAmount) > 0 && (
                      <>
                        <div className="border-t border-blue-200 my-2"></div>
                        <div className="flex justify-between text-sm text-green-700">
                          <span>Amount Received</span>
                          <span>PKR {Number(newSale.receivedAmount).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-red-700 font-semibold">
                          <span>Credit Amount</span>
                          <span>PKR {(grandTotal - Number(newSale.receivedAmount)).toFixed(2)}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-4 px-6 py-6 bg-gray-50 border-t border-gray-200 w-full">
            <button
              type="button"
              onClick={() => router.push('/dashboard/sale')}
              className="px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2 bg-gray-600 text-white hover:bg-gray-700"
            >
              <span>Cancel</span>
            </button>
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
                  <span>{newSale.editingId ? 'Update Sale & Print' : 'Add Sale & Print'}</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleAddSale}
              disabled={addSaleLoading}
              className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
                addSaleLoading 
                  ? 'bg-gray-400 text-white cursor-not-allowed' 
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {addSaleLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <span>{newSale.editingId ? 'Update Sale' : 'Add Sale'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Main component with Suspense boundary
const AddSalePage = () => {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <AddSalePageWithSearchParams />
    </Suspense>
  );
};

export default AddSalePage; 