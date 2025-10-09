"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ReactDOM from 'react-dom';
import Toast from '../../components/Toast';
import { Plus, ChevronDown, Calendar, Info, Camera } from 'lucide-react';
import { getToken } from '../../lib/auth';
import { fetchPartiesByUserId, getPartyBalance } from '../../../http/parties';
import { getUserItems } from '../../../http/items';
import { createPurchase, updatePurchase } from '../../../http/purchases';
import { createPurchaseOrder, updatePurchaseOrder, getPurchaseOrderById } from '../../../http/purchaseOrders';
import { createExpense, getExpenseById, updateExpense } from '../../../http/expenses';
import { jwtDecode } from 'jwt-decode';
import { useSearchParams } from 'next/navigation';
import { getPurchaseById } from '../../../http/purchases';
import { useSidebar } from '../../contexts/SidebarContext';
import { UnitsDropdown } from '../../components/UnitsDropdown';
import { ItemsDropdown } from '../../components/ItemsDropdown';
import { CustomDropdown } from '../../components/CustomDropdown';
import { PaymentMethodDropdown } from '../../components/PaymentMethodDropdown';
import { useBankAccounts } from '../../hooks/useBankAccounts';

// Utility functions for unit conversion
const getUnitDisplay = (unit: any) => {
  if (!unit) return 'NONE';
  
  // Handle object format with conversion factor
  if (typeof unit === 'object' && unit.base) {
    const base = unit.base || 'NONE';
    const secondary = unit.secondary && unit.secondary !== 'None' ? unit.secondary : null;
    
    // Return base unit as default (Box), not secondary unit (Carton)
    return base;
  }
  
  // Handle string format like "Piece / Packet"
  if (typeof unit === 'string' && unit.includes(' / ')) {
    const parts = unit.split(' / ');
    // Return the first part (base unit) as default
    return parts[0] || 'NONE';
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
  const purchasePrice = itemData.purchasePrice || 0;
  
  if (quantity >= minWholesaleQty && wholesalePrice > 0) {
    return wholesalePrice;
  }
  
  return purchasePrice;
};

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

// Update Item interface to include 'category' and 'customUnit'
interface Item {
  id: number;
  category: string;
  item: string;
  itemCode: string;
  qty: string;
  unit: string;
  customUnit: string;
  price: string;
  amount: number;
  discountPercentage: string;
  discountAmount: string;
  // Add missing properties for API items
  purchasePrice?: number;
  salePrice?: number;
  wholesalePrice?: number;
  minimumWholesaleQuantity?: number;
  stock?: number;
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
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const editId = searchParams ? searchParams.get('id') : null;
  const [pageTitle, setPageTitle] = useState('Add Purchase Bill');
  const [pageType, setPageType] = useState<'purchase-bill' | 'purchase-order'>('purchase-bill');
  const [originalOrderId, setOriginalOrderId] = useState<string | null>(null);
  const [originalOrderDueDate, setOriginalOrderDueDate] = useState<string | null>(null);
  
  // Import sidebar context
  const { setIsCollapsed } = useSidebar();
  const [wasSidebarCollapsed, setWasSidebarCollapsed] = useState(false);
  
  // Bank accounts hook
  const { bankAccounts, loading: bankAccountsLoading, refetch: refetchBankAccounts } = useBankAccounts();
  const [formData, setFormData] = useState<FormData>({
    billNumber: 'Purchase #1',
    billDate: '19/06/2025',
    party: '',
    phoneNo: '',
    paymentType: 'Credit',
    discount: { percentage: '', amount: '' },
    tax: 'NONE',
    taxAmount: 0,
    description: '',
    images: []
  });

  const [items, setItems] = useState<Item[]>([
    { id: 1, category: 'ALL', item: '', itemCode: '', qty: '', unit: 'NONE', customUnit: '', price: '', amount: 0, discountPercentage: '', discountAmount: '' },
    { id: 2, category: 'ALL', item: '', itemCode: '', qty: '', unit: 'NONE', customUnit: '', price: '', amount: 0, discountPercentage: '', discountAmount: '' }
  ]);

  const [showPartyDropdown, setShowPartyDropdown] = useState<boolean>(false);
  const [showDescription, setShowDescription] = useState<boolean>(false);
  const [showImageSection, setShowImageSection] = useState<boolean>(false);

  const [newPurchase, setNewPurchase] = useState({
    partyName: '',
    partyId: '', // Add party ID to store the selected party's ID
    phoneNo: '',
    billDate: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: new Date().toISOString().split('T')[0],
    items: [
      { id: 1, item: '', itemCode: '', qty: '', unit: 'NONE', customUnit: '', price: '', amount: 0, discountPercentage: '', discountAmount: '' },
      { id: 2, item: '', itemCode: '', qty: '', unit: 'NONE', customUnit: '', price: '', amount: 0, discountPercentage: '', discountAmount: '' }
    ],
    discount: '',
    discountAmount: '',
    discountType: '%',
    tax: '',
    taxAmount: '',
    taxType: '%',
    taxPartyName: '',
    taxPartyId: '',
    paymentType: 'Cash',
    paid: '',
    description: '',
    editingId: editId || null
  });

  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [parties, setParties] = useState<any[]>([]);
  const [allParties, setAllParties] = useState<any[]>([]); // Store all parties for filtering
  const [showPartySuggestions, setShowPartySuggestions] = useState(false);

  const [itemSuggestions, setItemSuggestions] = useState<any[]>([]);
  const [showItemSuggestions, setShowItemSuggestions] = useState<{ [id: number]: boolean }>({});
  const [partyBalance, setPartyBalance] = useState<number|null>(null);
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' } | null>(null);
  const [formErrors, setFormErrors] = useState<any>({});

  const [expenseDropdownStyles, setExpenseDropdownStyles] = useState<{[id: number]: React.CSSProperties}>({});
  const itemInputRefs = useRef<{[id: number]: HTMLInputElement | null}>({});
  const [redirectTo, setRedirectTo] = useState('/dashboard/purchase');
  
  // Add state for add supplier
  const [showAddSupplierInput, setShowAddSupplierInput] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [supplierDropdownIndex, setSupplierDropdownIndex] = useState(-1);
  const supplierInputRef = useRef<HTMLInputElement>(null);
  const supplierDropdownRef = useRef<HTMLUListElement>(null);
  
  
  // Expense category state
  const [expenseCategory, setExpenseCategory] = useState('');
  const [isFromExpenses, setIsFromExpenses] = useState(false);
  const [expenseItemSuggestions, setExpenseItemSuggestions] = useState<string[]>([]);
  const [showExpenseSuggestions, setShowExpenseSuggestions] = useState<{[id: number]: boolean}>({});
  const [showExpenseCategorySuggestions, setShowExpenseCategorySuggestions] = useState(false);
  const [expenseCategoryDropdownStyle, setExpenseCategoryDropdownStyle] = useState<React.CSSProperties>({});
  
  // Expense categories data - will be populated from database + defaults
  const [expenseCategories, setExpenseCategories] = useState<string[]>([
    'Petrol',
    'Rent',
    'Salary',
    'Tea',
    'Transport',
    'Office Supplies',
    'Utilities',
    'Marketing',
    'Travel',
    'Maintenance',
    'Insurance',
    'Legal Fees'
  ]);
  
  // TAC toggle state
  const [tacEnabled, setTacEnabled] = useState(false);
  
  // Tax party selection state
  const [showTaxPartySuggestions, setShowTaxPartySuggestions] = useState(false);
  const [taxPartyDropdownStyle, setTaxPartyDropdownStyle] = useState<React.CSSProperties>({});
  const [taxPartyDropdownIndex, setTaxPartyDropdownIndex] = useState(-1);
  
  // Unit dropdown keyboard navigation
  const [unitDropdownIndex, setUnitDropdownIndex] = useState<{[id: number]: number}>({});
  
  // Fetch expense items and categories from database for suggestions
  const fetchExpenseItemsForSuggestions = async () => {
    try {
      const token = getToken();
      if (!token) return;
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/expenses`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const expenses = data.data || [];
        
        // Extract unique item names from all expenses
        const uniqueItems = [...new Set(expenses.flatMap((expense: any) => 
          expense.items.map((item: any) => item.item)
        ))].filter((item: any) => item && typeof item === 'string' && item.trim() !== '');
        
        // Extract unique categories from all expenses
        const uniqueCategories = [...new Set(expenses.map((expense: any) => 
          expense.expenseCategory
        ))].filter((category: any) => category && typeof category === 'string' && category.trim() !== '');
        
        setExpenseItemSuggestions(uniqueItems as string[]);
        
        // Combine database categories with default categories, removing duplicates
        const allCategories = [...new Set([...expenseCategories, ...uniqueCategories])] as string[];
        setExpenseCategories(allCategories);
      }
    } catch (error) {
      console.error('Error fetching expense items:', error);
    }
  };

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

  // Check if opened from different contexts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const fromContext = urlParams.get('from');
      const orderDataParam = urlParams.get('orderData');
      const convertFromOrder = urlParams.get('convertFromOrder');
      const editMode = urlParams.get('editMode');
      
      if (fromContext === 'expenses') {
        setIsFromExpenses(true);
        setPageTitle('Add Expense');
        // Set default payment method to Cash for expenses (since Credit is not available)
        setNewPurchase(prev => ({ ...prev, paymentType: 'Cash' }));
        // Fetch expense items from database for suggestions
        fetchExpenseItemsForSuggestions();
      } else if (fromContext === 'purchase-order') {
        if (editMode === 'true') {
          setPageTitle('Edit Purchase Order');
        } else {
          setPageTitle('Add Purchase Order');
        }
        setPageType('purchase-order');
        setRedirectTo('/dashboard/purchase-order');
        
        // If order data is provided, populate the form
        if (orderDataParam) {
          try {
            // First try to decode, if that fails, try parsing directly
            let orderData;
            try {
              orderData = JSON.parse(decodeURIComponent(orderDataParam));
            } catch (decodeError) {
              // If decodeURIComponent fails, try parsing the raw parameter
              try {
                orderData = JSON.parse(orderDataParam);
              } catch (parseError) {
                console.error('Failed to parse order data:', parseError);
                console.error('Raw orderDataParam:', orderDataParam);
                // If both fail, use empty data to prevent crash
                orderData = {};
              }
            }
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
                amount: item.amount || 0,
                discountPercentage: item.discountPercentage || '',
                discountAmount: item.discountAmount || ''
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
          const orderData = JSON.parse(decodeURIComponent(orderDataParam));
          setOriginalOrderId(orderData.sourceOrderId || orderData.sourceOrderId || orderData.id || null);
          setOriginalOrderDueDate(orderData.dueDate || null);
          setNewPurchase(prev => ({
            ...prev,
            partyName: orderData.supplierName || '',
            phoneNo: orderData.phoneNo || '',
            items: (orderData.items || []).map((item: any, index: number) => ({
              id: index + 1,
              item: item.item || '',
              itemCode: item.itemCode || '',
              qty: item.qty?.toString() || '',
              unit: item.unit || 'NONE',
              customUnit: item.customUnit || '',
              price: item.price?.toString() || '',
              amount: item.amount || 0,
              discountPercentage: item.discountPercentage || '',
              discountAmount: item.discountAmount || ''
            })) || prev.items,
            discount: orderData.discount || '',
            discountType: orderData.discountType || '%',
            tax: orderData.tax || '',
            taxType: orderData.taxType || '%',
            paymentType: orderData.paymentType || 'Credit',
            paid: orderData.paidAmount || orderData.receivedAmount || orderData.paid || '',
            description: orderData.description || '',
            dueDate: orderData.dueDate ? new Date(orderData.dueDate).toISOString().split('T')[0] : prev.dueDate,
            invoiceDate: orderData.invoiceDate ? new Date(orderData.invoiceDate).toISOString().split('T')[0] : prev.invoiceDate,
            editingId: null
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

  // Add edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [hasProcessedNewSupplier, setHasProcessedNewSupplier] = useState(false);

  // Handle new supplier from parties page
  useEffect(() => {
    if (!searchParams || hasProcessedNewSupplier) return;
    
    const newSupplier = searchParams.get('newSupplier');
    const newSupplierId = searchParams.get('newSupplierId');
    
    if (newSupplier && newSupplierId) {
      // Set the newly added supplier
      setNewPurchase(prev => ({
        ...prev,
        partyName: newSupplier,
        partyId: newSupplierId,
        phoneNo: '' // Reset phone as it might be different
      }));
      
      // Fetch party balance for the new supplier
      fetchPartyBalance(newSupplierId);
      
      // Refresh parties list to include the new supplier
      fetchPartySuggestions();
      
      // Restore the original page type and title
      // Check if we're returning from a purchase order context
      const currentUrlParams = new URLSearchParams(window.location.search);
      const fromContext = currentUrlParams.get('from');
      
      if (fromContext === 'purchase-order') {
        setPageType('purchase-order');
        setPageTitle('Add Purchase Order');
        setRedirectTo('/dashboard/purchase-order');
      } else {
        setPageType('purchase-bill');
        setPageTitle('Add Purchase Bill');
        setRedirectTo('/dashboard/purchase');
      }
      

      
      // Show success message
      setToast({ message: `Supplier "${newSupplier}" added successfully and selected!`, type: 'success' });
      
      // Mark that we've processed the new supplier
      setHasProcessedNewSupplier(true);
      
      // Clear the URL parameters after a delay to ensure the state is set
      setTimeout(() => {
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('newSupplier');
        newUrl.searchParams.delete('newSupplierId');
        window.history.replaceState({}, '', newUrl.toString());
      }, 100);
    }
  }, [searchParams, hasProcessedNewSupplier]);

  // Cleanup expense dropdown styles when component unmounts
  useEffect(() => {
    return () => {
      setExpenseDropdownStyles({});
      setShowExpenseSuggestions({});
      setShowExpenseCategorySuggestions(false);
      setExpenseCategoryDropdownStyle({});
    };
  }, []);

  // Fetch parties and items on component mount
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      await fetchPartySuggestions();
      // Only fetch items if not from expenses page
      if (!isFromExpenses) {
        await fetchItemSuggestions();
      }
      setLoading(false);
    };
    initializeData();
    
  }, [isFromExpenses]);

  useEffect(() => {
    if (editId) {
      setIsEditMode(true);
      
      // Check if we're editing an expense or purchase
      if (isFromExpenses) {
        setPageTitle('Edit Expense');
        const fetchExpenseData = async () => {
          try {
            const token = getToken();
            if (!token) return;
            const result = await getExpenseById(editId);
            if (result && result.success && result.data) {
              const expense = result.data;
              // Map expense data to form fields
              setExpenseCategory(expense.expenseCategory || '');
              setNewPurchase(prev => ({
                ...prev,
                partyName: expense.party || '',
                partyId: expense.partyId || '', // Set party ID for tax calculation
                taxPartyName: expense.party || '', // Set tax party name for tax calculation
                taxPartyId: expense.partyId || '', // Set tax party ID for tax calculation
                phoneNo: expense.phoneNo || '',
                billDate: expense.expenseDate ? new Date(expense.expenseDate).toISOString().split('T')[0] : '',
                invoiceDate: expense.expenseDate ? new Date(expense.expenseDate).toISOString().split('T')[0] : '',
                items: (expense.items || []).map((item: any, idx: number) => ({
                  id: idx + 1,
                  category: expense.expenseCategory || 'ALL',
                  item: item.item || '',
                  itemCode: item.itemCode || '',
                  qty: '1', // Expenses don't have quantity, always 1
                  unit: 'NONE', // Expenses don't have units
                  customUnit: '',
                  price: item.amount?.toString() || '',
                  amount: item.amount || 0,
                  discountPercentage: '',
                  discountAmount: ''
                })),
                discount: '',
                discountAmount: '',
                discountType: '%',
                tax: '',
                taxAmount: '',
                taxType: '%',
                paymentType: expense.paymentMethod || 'Cash',
                paid: expense.receivedAmount?.toString() || '',
                description: expense.description || '',
                editingId: editId
              }));
              
              // Auto-enable tax if party is defined (but not for "Unknown")
              if (expense.party && expense.party.trim() !== '' && expense.party !== 'Unknown') {
                setTacEnabled(true);
              }
              // Expenses don't have images in the current model
            }
          } catch (err) {
            setToast({ message: 'Failed to fetch expense for edit', type: 'error' });
          }
        };
        fetchExpenseData();
      } else if (pageType === 'purchase-order') {
        setPageTitle('Edit Purchase Order');
        const fetchPurchaseOrderData = async () => {
          try {
            const token = getToken();
            if (!token) return;
            const result = await getPurchaseOrderById(editId, token);
            if (result && result.success && result.order) {
              const order = result.order;
              // Map purchase order data to form fields
              setNewPurchase(prev => ({
                ...prev,
                partyName: order.supplierName || '',
                phoneNo: order.supplierPhone || order.phoneNo || '',
                billDate: order.orderDate ? new Date(order.orderDate).toISOString().split('T')[0] : '',
                invoiceDate: order.orderDate ? new Date(order.orderDate).toISOString().split('T')[0] : '',
                dueDate: order.dueDate ? new Date(order.dueDate).toISOString().split('T')[0] : '',
                items: (order.items || []).map((item: any, idx: number) => ({
                  id: idx + 1,
                  category: item.category || 'ALL',
                  item: item.item || '',
                  itemCode: item.itemCode || '',
                  qty: item.qty?.toString() || '',
                  unit: item.unit || 'NONE',
                  customUnit: item.customUnit || '',
                  price: item.price?.toString() || '',
                  amount: item.amount || 0,
                  discountPercentage: item.discountPercentage || '',
                  discountAmount: item.discountAmount || ''
                })),
                discount: order.discount || '',
                discountAmount: order.discountAmount || '',
                discountType: order.discountType || '%',
                tax: order.tax || '',
                taxAmount: order.taxAmount || '',
                taxType: order.taxType || '%',
                paymentType: order.paymentMethod || 'Cash',
                paid: order.paid || '',
                description: order.description || '',
                editingId: editId
              }));
            }
          } catch (err) {
            setToast({ message: 'Failed to fetch purchase order for edit', type: 'error' });
          }
        };
        fetchPurchaseOrderData();
      } else {
        setPageTitle('Edit Purchase Bill');
        const fetchEditData = async () => {
          try {
            const token = getToken();
            if (!token) return;
            const result = await getPurchaseById(editId, token);
            if (result && result.success && result.purchase) {
              // Map API data to form fields
              setNewPurchase(prev => ({
                ...prev,
                partyName: result.purchase.supplierName || '',
                phoneNo: result.purchase.phoneNo || '',
                billDate: result.purchase.createdAt ? new Date(result.purchase.createdAt).toISOString().split('T')[0] : '',
                invoiceDate: result.purchase.createdAt ? new Date(result.purchase.createdAt).toISOString().split('T')[0] : '',
                items: (result.purchase.items || []).map((item: any, idx: number) => ({
                  id: idx + 1,
                  category: item.category || 'ALL',
                  item: item.item || '',
                  itemCode: item.itemCode || '',
                  qty: item.qty?.toString() || '',
                  unit: item.unit || 'NONE',
                  customUnit: item.customUnit || '',
                  price: item.price?.toString() || '',
                  amount: item.amount || 0,
                  discountPercentage: item.discountPercentage || '',
                  discountAmount: item.discountAmount || ''
                })),
                discount: result.purchase.discount || '',
                discountAmount: result.purchase.discountAmount || '',
                discountType: result.purchase.discountType || '%',
                tax: result.purchase.tax || '',
                taxAmount: result.purchase.taxAmount || '',
                taxType: result.purchase.taxType || '%',
                paymentType: result.purchase.paymentMethod || 'Cash',
                paid: result.purchase.paid || '',
                description: result.purchase.description || '',
                editingId: editId
              }));
              if (result.purchase.imageUrl) {
                setUploadedImage(result.purchase.imageUrl);
              }
            }
          } catch (err) {
            setToast({ message: 'Failed to fetch purchase for edit', type: 'error' });
          }
        };
        fetchEditData();
      }
    }
  }, [editId, isFromExpenses, pageType]);


  // Clear party balance when party name changes
  useEffect(() => {
    if (!newPurchase.partyName) {
      setPartyBalance(null);
      return;
    }
    // Use stored party ID if available, otherwise find by name
    if (newPurchase.partyId) {
      if (isFromExpenses) {
        fetchPartyReceivableBalance(newPurchase.partyId);
      } else {
        fetchPartyBalance(newPurchase.partyId);
      }
    } else {
      const matchedParty = parties.find(p => p.name === newPurchase.partyName);
      if (matchedParty) {
        if (isFromExpenses) {
          fetchPartyReceivableBalance(matchedParty._id);
        } else {
          fetchPartyBalance(matchedParty._id);
        }
      }
    }
  }, [newPurchase.partyName, newPurchase.partyId, parties, isFromExpenses]);

  // Handle tax party changes for tax calculation
  useEffect(() => {
    if (!newPurchase.taxPartyName || !tacEnabled) {
      return;
    }
    
    // Find the selected party
    let selectedParty = null;
    if (newPurchase.taxPartyId) {
      selectedParty = parties.find(p => p._id === newPurchase.taxPartyId);
    } else {
      selectedParty = parties.find(p => p.name === newPurchase.taxPartyName);
    }
    
    if (selectedParty) {
      // Fetch party balance
      if (isFromExpenses) {
        fetchPartyReceivableBalance(selectedParty._id);
      } else {
        fetchPartyBalance(selectedParty._id);
      }
      
      // Auto-set tax based on party's GST status
      if (selectedParty.gstNumber && selectedParty.gstNumber.trim() !== '') {
        // If party has GST number, set tax to 18% (standard GST rate)
        setNewPurchase(prev => ({
          ...prev,
          tax: '18',
          taxType: '%'
        }));
      } else {
        // If party doesn't have GST number, set tax to 0%
        setNewPurchase(prev => ({
          ...prev,
          tax: '0',
          taxType: '%'
        }));
      }
    }
  }, [newPurchase.taxPartyName, newPurchase.taxPartyId, parties, isFromExpenses, tacEnabled]);

  // Auto-enable tax when party is selected for expenses (but not for "Unknown")
  useEffect(() => {
    if (isFromExpenses && newPurchase.partyName && newPurchase.partyName !== 'Unknown' && !tacEnabled) {
      setTacEnabled(true);
    }
  }, [isFromExpenses, newPurchase.partyName, tacEnabled]);

  // Auto-switch to Cash when tax is disabled in expense mode
  useEffect(() => {
    if (isFromExpenses && !tacEnabled && newPurchase.paymentType === 'Credit') {
      setNewPurchase(prev => ({ ...prev, paymentType: 'Cash', paid: '' }));
    }
  }, [isFromExpenses, tacEnabled, newPurchase.paymentType]);

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
      customUnit: '',
      price: '',
      amount: 0,
      discountPercentage: '',
      discountAmount: ''
    };
    setItems([...items, newRow]);
  };

  const updateItem = (id: number, field: keyof Item, value: string) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        if (field === 'qty' || field === 'price' || field === 'discountPercentage' || field === 'discountAmount') {
          const qty = parseFloat(updatedItem.qty) || 0;
          const price = parseFloat(updatedItem.price) || 0;
          const originalAmount = qty * price;
          
          // Calculate discount amount
          let discountAmount = 0;
          if (updatedItem.discountPercentage) {
            discountAmount = (originalAmount * parseFloat(updatedItem.discountPercentage)) / 100;
          } else if (updatedItem.discountAmount) {
            discountAmount = parseFloat(updatedItem.discountAmount);
          }
          
          // Final amount after discount
          updatedItem.amount = Math.max(0, originalAmount - discountAmount);
        }
        return updatedItem;
      }
      return item;
    }));
  };

  const calculateTotal = () => {
    return newPurchase.items.reduce((sum, item) => {
      if (isFromExpenses) {
        return sum + (item.amount || 0);
      } else {
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
        return sum + finalAmount;
      }
    }, 0);
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
    if (isFromExpenses) {
      // For expenses, validate expense category and items
      if (!expenseCategory) errors.expenseCategory = 'Expense category is required';
      const validItems = newPurchase.items.filter(item => item.item && parseFloat(item.price) > 0);
      if (validItems.length === 0) errors.items = 'At least one valid expense item is required';
    } else {
      // For purchases, validate supplier and items
      if (!newPurchase.partyName) errors.partyName = 'Supplier is required';
      const validItems = newPurchase.items.filter(item => item.item && parseFloat(item.qty) > 0 && parseFloat(item.price) > 0);
      if (validItems.length === 0) errors.items = 'At least one valid item is required';
      
      // Validate paid amount for credit purchases
      if (newPurchase.paymentType === 'Credit') {
        const paidAmount = Number(newPurchase.paid) || 0;
        if (paidAmount > grandTotal) {
          errors.paid = 'Paid amount cannot exceed total amount';
        }
      }
    }
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
          
          // Always recalculate amount when qty, price, unit, or discount changes
          if (field === 'qty' || field === 'price' || field === 'unit' || field === 'discountPercentage' || field === 'discountAmount') {
            if (isFromExpenses) {
              // For expenses, amount is just the price (no quantity)
              const price = parseFloat(field === 'price' ? value : item.price) || 0;
              updated.amount = price;
            } else {
              // For purchases, amount is qty * price - discount
              const qty = parseFloat(field === 'qty' ? value : item.qty) || 0;
              const price = parseFloat(field === 'price' ? value : item.price) || 0;
              const originalAmount = qty * price;
              
              // Calculate discount amount
              let discountAmount = 0;
              if (updated.discountPercentage) {
                discountAmount = (originalAmount * parseFloat(updated.discountPercentage)) / 100;
              } else if (updated.discountAmount) {
                discountAmount = parseFloat(updated.discountAmount);
              }
              
              // Final amount after discount
              updated.amount = Math.max(0, originalAmount - discountAmount);
            }
          }
          
          return updated;
        }
        return item;
      })
    }));
  };

  const addNewRow = () => {
    const lastItem = newPurchase.items[newPurchase.items.length - 1];
    // Removed validation - users can add new rows without filling the last one
    setNewPurchase(prev => ({
      ...prev,
      items: [
        ...prev.items,
        { id: Date.now(), item: '', itemCode: '', qty: '', unit: 'NONE', customUnit: '', price: '', amount: 0, discountPercentage: '', discountAmount: '' }
      ]
    }));
  };

  const deleteRow = (id: number) => {
    if (newPurchase.items.length === 1) return;
    setNewPurchase(prev => ({ ...prev, items: prev.items.filter(item => item.id !== id) }));
  };

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
        if (newPurchase.items.length > 1) {
          const lastItem = newPurchase.items[newPurchase.items.length - 1];
          deleteRow(lastItem.id);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [newPurchase.items]);

  // Fetch parties from API (stale-while-revalidate)
  const fetchPartySuggestions = async () => {
    try {
      // 1. Try to load from localStorage first
      const cached = localStorage.getItem('vyapar_parties');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            setAllParties(parsed);
            setParties(parsed);
          }
        } catch (e) { /* ignore parse error */ }
      }
      // 2. Fetch from API in background
      const token = getToken();
      if (!token) {
        setToast({ message: 'Authentication required', type: 'error' });
        return;
      }
      const response = await fetchPartiesByUserId(token);
      const partiesData = response.data || response || [];
      setAllParties(partiesData);
      setParties(partiesData);
      localStorage.setItem('vyapar_parties', JSON.stringify(partiesData));
      // console.log('Fetched parties:', partiesData);
    } catch (error) {
      // console.error('Error fetching parties:', error);
      setToast({ message: 'Failed to fetch parties', type: 'error' });
    }
  };

  // Filter parties based on search input
  const filterParties = (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setParties(allParties);
      return;
    }
    
    const filtered = allParties.filter(party => 
      party.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (party.phone && party.phone.includes(searchTerm))
    );
    setParties(filtered);
  };

  // Reset dropdown index when parties change
  useEffect(() => {
    if (showPartySuggestions) {
      setSupplierDropdownIndex(0);
    }
  }, [parties, showPartySuggestions]);

  // Fetch party balance
  const fetchPartyBalance = async (partyId: string) => {
    try {
      const token = getToken();
      if (!token) return;
      const response = await getPartyBalance(partyId, token);
      const balance = response.data?.totalDue || response.totalDue || 0;
      setPartyBalance(balance);

    } catch (error) {
      console.error('Error fetching party balance:', error);
      setPartyBalance(null);
    }
  };

  // Fetch party receivable balance for expenses
  const fetchPartyReceivableBalance = async (partyId: string) => {
    try {
      const token = getToken();
      if (!token) return;
      
      // For expenses, we need to get the party's receivable balance
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/parties/${partyId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.party) {
          // For expenses, openingBalance represents receivable amount
          const receivableBalance = data.party.openingBalance || 0;
          setPartyBalance(receivableBalance);
        }
      }
    } catch (error) {
      console.error('Error fetching party receivable balance:', error);
      setPartyBalance(null);
    }
  };

  // Fetch item suggestions (stale-while-revalidate)
  const fetchItemSuggestions = async () => {
    // 1. Try to load from localStorage first
    const cached = localStorage.getItem('vyapar_items');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          // Normalize cached items to match expected interface
          const normalizedItems = parsed.map((item: any) => ({
            ...item,
            id: item._id || item.id || Math.random().toString(),
            name: item.name || item.itemName || ''
          }));
          setItemSuggestions(normalizedItems);
        }
      } catch (e) { /* ignore parse error */ }
    }
    // 2. Fetch from API in background
    const token = getToken();
    if (!token) {
      // console.log('No token found for fetching items');
      return;
    }
    try {
      const response = await getUserItems(token);
      let items = [];
      if (response && response.success && response.items) {
        items = response.items;
      } else if (Array.isArray(response)) {
        items = response;
      } else if (response && response.data) {
        items = response.data;
      }
      
      // Normalize items to match expected interface
      const normalizedItems = (items || []).map((item: any) => ({
        ...item,
        id: item._id || item.id || Math.random().toString(),
        name: item.name || item.itemName || ''
      }));
      
      setItemSuggestions(normalizedItems);
      localStorage.setItem('vyapar_items', JSON.stringify(normalizedItems));
      // console.log('Processed items:', normalizedItems);
    } catch (error) {
      // console.error('Error fetching items:', error);
      setItemSuggestions([]);
    }
  };

  // Totals calculation
  const subTotal = calculateTotal();
  
  // Calculate original subtotal (before discounts) for proper calculations
  const originalSubTotal = newPurchase.items.reduce((sum, item) => {
    if (isFromExpenses) {
      return sum + (item.amount || 0);
    } else {
      const qty = parseFloat(item.qty) || 0;
      const price = parseFloat(item.price) || 0;
      return sum + (qty * price);
    }
  }, 0);
  
  let discountValue = 0;
  if (newPurchase.discount && !isNaN(Number(newPurchase.discount))) {
    if (newPurchase.discountType === '%') {
      discountValue = originalSubTotal * Number(newPurchase.discount) / 100;
    } else {
      discountValue = Number(newPurchase.discount);
    }
  }
  
  // Calculate total discount from all items
  const totalItemDiscount = newPurchase.items.reduce((total, item) => {
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
  if (newPurchase.tax && !isNaN(Number(newPurchase.tax))) {
    if (newPurchase.taxType === '%') {
      taxValue = (originalSubTotal - totalDiscount) * Number(newPurchase.tax) / 100;
    } else if (newPurchase.taxType === 'PKR') {
      taxValue = Number(newPurchase.tax);
    }
  }
  const grandTotal = Math.max(0, originalSubTotal - totalDiscount + taxValue);

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


      const paidValue = newPurchase.paid !== undefined && newPurchase.paid !== '' ? Number(newPurchase.paid) : 0;
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
            customUnit: item.customUnit || '',
            discountPercentage: item.discountPercentage || '',
            discountAmount: item.discountAmount || ''
          })),
        discount: newPurchase.discount || 0,
        discountType: newPurchase.discountType || '%',
        tax: newPurchase.tax || 0,
        taxType: newPurchase.taxType || '%',
        paymentType: 'Credit', // Always Credit for purchases
        paymentMethod: newPurchase.paymentType || 'Cash', // Use the selected payment method
        bankAccountId: newPurchase.paymentType?.startsWith('bank_') ? newPurchase.paymentType.replace('bank_', '') : null,
        bankAccountName: newPurchase.paymentType?.startsWith('bank_') ? bankAccounts.find(bank => bank._id === newPurchase.paymentType?.replace('bank_', ''))?.accountDisplayName || '' : '',
        paid: paidValue,
        description: newPurchase.description || '',
        imageUrl: uploadedImage || '',
        orderDate: newPurchase.invoiceDate,
        dueDate: newPurchase.dueDate ? new Date(newPurchase.dueDate).toISOString() : null,
        sourceOrderId: originalOrderId // Include the source order ID for conversion
      };



      let response;
      let successMessage;
      let redirectPath;

      if (isFromExpenses) {
        // Create or update expense
        const expenseData = {
          expenseCategory: expenseCategory,
          party: tacEnabled && newPurchase.taxPartyName ? newPurchase.taxPartyName : (newPurchase.partyName || 'Unknown'),
          partyId: newPurchase.partyId || null, // Always send partyId when available
          items: newPurchase.items
            .filter(item => 
              item.item &&
              item.price &&
              !isNaN(Number(item.price))
            )
            .map(item => ({
              item: item.item,
              amount: Number(item.price)
            })),
          totalAmount: grandTotal,
          paymentType: newPurchase.paymentType?.startsWith('bank_') ? 'Cash' : 'Credit', // Cash for bank payments, Credit for others
          paymentMethod: newPurchase.paymentType || 'Cash',
          bankAccountId: newPurchase.paymentType?.startsWith('bank_') ? newPurchase.paymentType.replace('bank_', '') : null,
          bankAccountName: newPurchase.paymentType?.startsWith('bank_') ? bankAccounts.find(bank => bank._id === newPurchase.paymentType?.replace('bank_', ''))?.accountDisplayName || '' : '',
          receivedAmount: newPurchase.paymentType?.startsWith('bank_') ? grandTotal : (Number(newPurchase.paid) || 0), // Full amount for bank payments
          expenseDate: newPurchase.billDate || new Date().toISOString().split('T')[0],
          description: newPurchase.description || ''
        };

        if (isEditMode && editId) {
          // Update existing expense
          console.log('Updating expense with data:', expenseData);
          response = await updateExpense(editId, expenseData);
          successMessage = 'Expense updated successfully!';
        } else {
          // Create new expense
          console.log('Creating expense with data:', expenseData);
          response = await createExpense(expenseData);
          successMessage = 'Expense created successfully!';
        }
        redirectPath = '/dashboard/expenses';
      } else if (pageType === 'purchase-order') {
        // Create or update purchase order
        const orderData = {
          ...commonData,
          orderDate: new Date().toISOString().split('T')[0],
          dueDate: new Date().toISOString().split('T')[0],
          status: 'Created'
        };
        
        if (isEditMode && editId) {
          // Update existing purchase order
          response = await updatePurchaseOrder(token, editId, orderData);
          successMessage = 'Purchase order updated successfully!';
        } else {
          // Create new purchase order
          response = await createPurchaseOrder(token, orderData);
          successMessage = 'Purchase order created successfully!';
        }
        redirectPath = '/dashboard/purchase-order';
      } else {
        // Create or update purchase bill
        if (isEditMode && editId) {
          // Update existing purchase
          response = await updatePurchase(editId, commonData, token);
          successMessage = 'Purchase bill updated successfully!';
          redirectPath = '/dashboard/purchase';
        } else {
          // Create new purchase bill
          response = await createPurchase(commonData, token);
          successMessage = 'Purchase bill created successfully!';
          redirectPath = '/dashboard/purchase';
        }
        
        // If this was a conversion from purchase order, update the original order status and invoice number
        if (originalOrderId) {
          try {
            // Use the actual purchase bill number for invoiceNumber
            const billNumber = response?.purchase?.billNo || response?.billNo || response?.billNumber || response?.id || '';
            
            try {
              const updateResult = await updatePurchaseOrder(token, originalOrderId, { 
                status: 'Completed',
                invoiceNumber: billNumber,
                convertedToInvoice: response?.purchase?._id || response?._id || null,
                dueDate: originalOrderDueDate ? new Date(originalOrderDueDate).toISOString() : (newPurchase.dueDate ? new Date(newPurchase.dueDate).toISOString() : null)
              });
              
              if (updateResult && updateResult.success) {
                successMessage = `Purchase bill ${isEditMode ? 'updated' : 'created'}! Bill No: ${billNumber}. Purchase Order converted successfully.`;
              } else {
                successMessage = `Purchase bill ${isEditMode ? 'updated' : 'created'}! Bill No: ${billNumber}. Note: Could not update purchase order status.`;
              }
            } catch (updateError: any) {
              successMessage = `Purchase bill ${isEditMode ? 'updated' : 'created'}! Bill No: ${billNumber}. Note: Could not update purchase order status.`;
            }
          } catch (error) {
            successMessage = `Purchase bill ${isEditMode ? 'updated' : 'created'}! Bill No: ${response?.purchase?.billNo || response?.billNo || response?.billNumber || ''}. Note: Could not update purchase order status.`;
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

  const [paymentMethodDropdownIndex, setPaymentMethodDropdownIndex] = useState(0);
  const [discountTypeDropdownIndex, setDiscountTypeDropdownIndex] = useState(0);
  const [taxTypeDropdownIndex, setTaxTypeDropdownIndex] = useState(0);
  
  // Additional dropdown state variables for new components
  const [dropdownIndex, setDropdownIndex] = useState(0);
  const [unitsDropdownIndices, setUnitsDropdownIndices] = useState<{[id: number]: number}>({});

  // Add ref for form
  const formRef = useRef<HTMLFormElement>(null);

  // Prevent Enter key from submitting form, allow only Ctrl+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If focus is inside a textarea, ignore Enter
      if (e.key === 'Enter' && document.activeElement && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
      }
      // Ctrl+S to save
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (formRef.current) {
          // Manually trigger submit
          formRef.current.requestSubmit();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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
            <div className="sticky top-0 z-10 bg-white/90 border-b border-gray-200 px-6 py-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-6">
                  <h1 className="text-xl md:text-2xl font-bold text-gray-900">{pageTitle}</h1>
                  {/* Tax Toggle Button - Only for Expenses */}
                  {isFromExpenses && (
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-medium text-gray-700">Tax</span>
                      <button
                        type="button"
                        onClick={() => {
                          const newTaxEnabled = !tacEnabled;
                          setTacEnabled(newTaxEnabled);
                          
                          // If tax is enabled and we're in expenses mode, set payment method to Credit
                          if (newTaxEnabled && isFromExpenses) {
                            setNewPurchase(prev => ({ ...prev, paymentType: 'Credit' }));
                          }
                          
                          console.log('Tax Toggled:', newTaxEnabled);
                        }}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                          tacEnabled ? 'bg-blue-600' : 'bg-gray-300'
                        }`}
                      >
                        <span className="sr-only">Toggle Tax</span>
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            tacEnabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    // If came from expenses, redirect back to expenses page
                    if (isFromExpenses) {
                      router.push('/dashboard/expenses');
                    } else {
                      router.push(redirectTo);
                    }
                  }}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                  aria-label="Cancel"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Supplier and Date Section - match sale add page */}
            <form ref={formRef} onSubmit={handleSubmit} className="divide-y divide-gray-200 w-full" onKeyDown={e => {
              // Prevent Enter from submitting (except in textarea)
              if (e.key === 'Enter' && e.target instanceof HTMLElement && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
              }
            }}>
              <div className="bg-gray-50 px-6 py-6 w-full">
                <div className={`grid gap-6 ${pageType === 'purchase-order' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                  {/* Supplier and Phone - Full width for purchase bills */}
                  {isFromExpenses ? (
                    // Expense Category Field for Expenses Page
                    <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
                      <div>
                        <label className="block text-sm font-medium text-blue-600 mb-2">Expense Category *</label>
                        <div className="relative">
                          <input
                            type="text"
                            name="expenseCategory"
                            value={expenseCategory}
                            onChange={(e) => {
                              setExpenseCategory(e.target.value);
                              // Show suggestions when typing
                              if (e.target.value.trim()) {
                                setShowExpenseCategorySuggestions(true);
                              }
                            }}
                            onFocus={(event) => {
                              setShowExpenseCategorySuggestions(true);
                              // Set dropdown position
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
                              setExpenseCategoryDropdownStyle(style);
                            }}
                            onBlur={() => setTimeout(() => {
                              setShowExpenseCategorySuggestions(false);
                              // Clean up dropdown style
                              setExpenseCategoryDropdownStyle({});
                            }, 200)}
                            className="w-full px-4 py-3 border-2 border-blue-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all duration-200"
                            placeholder="Select expense category"
                            autoComplete="off"
                            onKeyDown={e => {
                              if (!showExpenseCategorySuggestions) return;
                              const optionsCount = expenseCategories.length;
                              if (["ArrowDown", "ArrowUp", "Enter", "Escape"].includes(e.key)) {
                                e.preventDefault();
                                e.stopPropagation();
                              }
                              if (e.key === 'ArrowDown') {
                                setSupplierDropdownIndex(i => Math.min(i + 1, optionsCount - 1));
                              } else if (e.key === 'ArrowUp') {
                                setSupplierDropdownIndex(i => Math.max(i - 1, 0));
                              } else if (e.key === 'Enter') {
                                if (supplierDropdownIndex >= 0 && supplierDropdownIndex < expenseCategories.length) {
                                  setExpenseCategory(expenseCategories[supplierDropdownIndex]);
                                  setShowExpenseCategorySuggestions(false);
                                }
                              } else if (e.key === 'Escape') {
                                setShowExpenseCategorySuggestions(false);
                              }
                            }}
                          />
                          {showExpenseCategorySuggestions && typeof window !== 'undefined' && ReactDOM.createPortal(
                            <ul
                              style={expenseCategoryDropdownStyle}
                              className="bg-white border border-blue-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                              tabIndex={-1}
                              role="listbox"
                            >
                              {expenseCategories.length > 0 ? (
                                expenseCategories
                                  .filter(category => category.toLowerCase().includes(expenseCategory.toLowerCase()))
                                  .map((category, idx) => (
                                    <li
                                      key={idx}
                                      className={`px-4 py-2 hover:bg-blue-100 cursor-pointer transition-colors ${supplierDropdownIndex === idx ? 'bg-blue-100 text-blue-700 font-semibold' : ''}`}
                                      onMouseDown={e => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setExpenseCategory(category);
                                        setShowExpenseCategorySuggestions(false);
                                        // Clean up dropdown style
                                        setExpenseCategoryDropdownStyle({});
                                      }}
                                      ref={el => { if (supplierDropdownIndex === idx && el) el.scrollIntoView({ block: 'nearest' }); }}
                                      role="option"
                                      aria-selected={supplierDropdownIndex === idx}
                                    >
                                      <div className="flex justify-between items-center">
                                        <span className="font-medium text-gray-800">{category}</span>
                                        <span className="text-xs text-gray-500 text-blue-600">Category</span>
                                      </div>
                                    </li>
                                  ))
                              ) : (
                                <li className="px-4 py-3 text-center">
                                  <div className="text-gray-500 text-sm">
                                    <div className="text-gray-400 mb-1">📂</div>
                                    <div>No categories found</div>
                                    <div className="text-xs text-gray-400 mt-1">Create some expenses first</div>
                                  </div>
                                </li>
                              )}
                            </ul>,
                            document.body
                          )}
                        </div>
                      </div>
                      {/* Middle: Select Party Field for Tax (only show when Tax is ON) */}
                      {tacEnabled && (
                        <div>
                          <label className="block text-sm font-medium text-blue-600 mb-2">Select Party</label>
                          <div className="relative">
                            <input
                              type="text"
                              name="taxPartyName"
                              value={newPurchase.taxPartyName || ''}
                              onChange={(e) => {
                                setNewPurchase(prev => ({ ...prev, taxPartyName: e.target.value }));
                                // Show suggestions when typing
                                if (e.target.value.trim()) {
                                  setShowTaxPartySuggestions(true);
                                }
                              }}
                              onFocus={(event) => {
                                setShowTaxPartySuggestions(true);
                                // Set dropdown position
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
                                setTaxPartyDropdownStyle(style);
                              }}
                              onBlur={() => setTimeout(() => {
                                setShowTaxPartySuggestions(false);
                                // Clean up dropdown style
                                setTaxPartyDropdownStyle({});
                              }, 200)}
                              className="w-full px-4 py-3 border-2 border-blue-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all duration-200"
                              placeholder="Select Party"
                              autoComplete="off"
                              onKeyDown={e => {
                                if (!showTaxPartySuggestions) return;
                                const optionsCount = parties.length;
                                if (["ArrowDown", "ArrowUp", "Enter", "Escape"].includes(e.key)) {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }
                                if (e.key === 'ArrowDown') {
                                  setTaxPartyDropdownIndex(i => Math.min(i + 1, optionsCount - 1));
                                } else if (e.key === 'ArrowUp') {
                                  setTaxPartyDropdownIndex(i => Math.max(i - 1, 0));
                                } else if (e.key === 'Enter') {
                                  if (taxPartyDropdownIndex >= 0 && taxPartyDropdownIndex < parties.length) {
                                    const party = parties[taxPartyDropdownIndex];
                                    setNewPurchase(prev => ({ ...prev, taxPartyName: party.name, taxPartyId: party._id, partyId: party._id }));
                                    setShowTaxPartySuggestions(false);
                                    // Fetch party's receivable balance for expenses
                                    if (isFromExpenses) {
                                      fetchPartyReceivableBalance(party._id);
                                    }
                                  }
                                } else if (e.key === 'Escape') {
                                  setShowTaxPartySuggestions(false);
                                }
                              }}
                            />
                            {showTaxPartySuggestions && typeof window !== 'undefined' && ReactDOM.createPortal(
                              <ul
                                style={taxPartyDropdownStyle}
                                className="bg-white border border-blue-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                                tabIndex={-1}
                                role="listbox"
                              >
                                {parties.length > 0 ? (
                                  parties
                                    .filter(party => party.name.toLowerCase().includes((newPurchase.taxPartyName || '').toLowerCase()))
                                    .map((party, idx) => (
                                      <li
                                        key={idx}
                                        className={`px-4 py-2 hover:bg-blue-100 cursor-pointer transition-colors ${taxPartyDropdownIndex === idx ? 'bg-blue-100 text-blue-700 font-semibold' : ''}`}
                                        onMouseDown={e => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          setNewPurchase(prev => ({ ...prev, taxPartyName: party.name, taxPartyId: party._id, partyId: party._id }));
                                          setShowTaxPartySuggestions(false);
                                          // Clean up dropdown style
                                          setTaxPartyDropdownStyle({});
                                          // Fetch party's receivable balance for expenses
                                          if (isFromExpenses) {
                                            fetchPartyReceivableBalance(party._id);
                                          }
                                        }}
                                        ref={el => { if (taxPartyDropdownIndex === idx && el) el.scrollIntoView({ block: 'nearest' }); }}
                                        role="option"
                                        aria-selected={taxPartyDropdownIndex === idx}
                                      >
                                        <div className="flex justify-between items-center">
                                          <span className="font-medium text-gray-800">{party.name}</span>
                                          <span className="text-xs text-gray-500 text-blue-600">Party</span>
                                        </div>
                                      </li>
                                    ))
                                ) : (
                                  <li className="px-4 py-3 text-center">
                                    <div className="text-gray-500 text-sm">
                                      <div className="text-gray-400 mb-1">👥</div>
                                      <div>No parties found</div>
                                      <div className="text-xs text-gray-400 mt-1">Create some parties first</div>
                                    </div>
                                  </li>
                                )}
                              </ul>,
                              document.body
                            )}
                          </div>
                        </div>
                      )}
                      {/* Right: Date Field for Expenses */}
                      <div className="flex flex-col gap-4 items-end justify-start">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
                          <input
                            type="date"
                            name="billDate"
                            value={newPurchase.billDate || new Date().toISOString().split('T')[0]}
                            onChange={handleInputChange}
                            className="w-40 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Original Supplier and Phone Fields
                    <div className={`grid gap-4 ${pageType === 'purchase-order' ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-2'}`}>
                      <div>
                        <label className="block text-sm font-medium text-blue-600 mb-2">Supplier *</label>
                        <div className="relative">
                          <input
                            type="text"
                            name="partyName"
                            value={newPurchase.partyName}
                            onChange={e => {
                              handleInputChange(e);
                              filterParties(e.target.value);
                              setShowPartySuggestions(true);
                              setSupplierDropdownIndex(0);
                            }}
                            onFocus={() => {
                              fetchPartySuggestions();
                              setShowPartySuggestions(true);
                            }}
                            onBlur={() => setTimeout(() => setShowPartySuggestions(false), 200)}
                            className={`w-full px-4 py-3 border-2 rounded-lg transition-all duration-200 ${formErrors.partyName ? 'border-red-300 bg-red-50' : 'border-blue-200 focus:border-blue-500'} focus:ring-2 focus:ring-blue-200 focus:outline-none`}
                            placeholder="Search or enter supplier name"
                            autoComplete="off"
                            ref={supplierInputRef}
                            onKeyDown={e => {
                              if (!showPartySuggestions) return;
                              const optionsCount = parties.length + 1; // +1 for Add Supplier
                              if (["ArrowDown", "ArrowUp", "Enter", "Escape"].includes(e.key)) {
                                e.preventDefault();
                                e.stopPropagation();
                              }
                              if (e.key === 'ArrowDown') {
                                setSupplierDropdownIndex(i => Math.min(i + 1, optionsCount - 1));
                              } else if (e.key === 'ArrowUp') {
                                setSupplierDropdownIndex(i => Math.max(i - 1, 0));
                              } else if (e.key === 'Enter') {
                                if (supplierDropdownIndex === 0) {
                                  // Add Supplier option
                                  // Create dynamic return URL based on current page type
                                  const returnUrl = pageType === 'purchase-order' 
                                    ? '/dashboard/purchaseAdd?from=purchase-order'
                                    : '/dashboard/purchaseAdd';
                                  router.push(`/dashboard/parties?addParty=1&returnUrl=${encodeURIComponent(returnUrl)}`);
                                  setShowPartySuggestions(false);
                                } else if (supplierDropdownIndex > 0 && supplierDropdownIndex <= parties.length) {
                                  // Party selection (adjust index because Add Supplier is at index 0)
                                  const party = parties[supplierDropdownIndex - 1];
                                  setNewPurchase(prev => ({ ...prev, partyName: party.name, partyId: party._id, phoneNo: party.phone || '' }));
                                  setShowPartySuggestions(false);
                                  fetchPartyBalance(party._id);
                                }
                              } else if (e.key === 'Escape') {
                                setShowPartySuggestions(false);
                              }
                            }}
                          />
                          {showPartySuggestions && (
                            <div className="absolute left-0 right-0 mt-1 w-full z-50">
                              {parties.length > 0 ? (
                                <ul
                                  className="bg-white border border-blue-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                                  ref={supplierDropdownRef}
                                  tabIndex={-1}
                                  role="listbox"
                                >
                                  {/* Add Supplier option at the top */}
                                  <li
                                    className={`px-4 py-2 cursor-pointer text-blue-600 font-semibold hover:bg-blue-50 rounded-t-lg ${supplierDropdownIndex === 0 ? 'bg-blue-100 text-blue-700' : ''}`}
                                    onMouseDown={e => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      // Create dynamic return URL based on current page type
                                      const returnUrl = pageType === 'purchase-order' 
                                        ? '/dashboard/purchaseAdd?from=purchase-order'
                                        : '/dashboard/purchaseAdd';
                                      router.push(`/dashboard/parties?addParty=1&returnUrl=${encodeURIComponent(returnUrl)}`);
                                      setShowPartySuggestions(false);
                                    }}
                                    ref={el => { if (supplierDropdownIndex === 0 && el) el.scrollIntoView({ block: 'nearest' }); }}
                                    role="option"
                                    aria-selected={supplierDropdownIndex === 0}
                                  >
                                    + Add Supplier
                                  </li>
                                  {parties.map((party, idx) => (
                                    <li
                                      key={party._id}
                                      className={`px-4 py-2 hover:bg-blue-100 cursor-pointer transition-colors ${supplierDropdownIndex === idx + 1 ? 'bg-blue-100 text-blue-700 font-semibold' : ''}`}
                                      onMouseDown={e => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setNewPurchase(prev => ({ ...prev, partyName: party.name, partyId: party._id, phoneNo: party.phone || '' }));
                                        setShowPartySuggestions(false);
                                        fetchPartyBalance(party._id);
                                      }}
                                      ref={el => { if (supplierDropdownIndex === idx + 1 && el) el.scrollIntoView({ block: 'nearest' }); }}
                                      role="option"
                                      aria-selected={supplierDropdownIndex === idx + 1}
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
                            {isFromExpenses ? 'Receivable Balance' : 'Balance'}: PKR {Math.abs(partyBalance).toLocaleString()}
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
                  )}
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
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition-colors font-semibold text-sm hover:shadow-lg transform hover:scale-105"
                  >
                    <span className="text-xl">+</span> Add Row
                  </button>
                </div>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200 bg-gradient-to-br from-blue-50 to-gray-100">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10">
                      <tr className="border-b border-gray-200 bg-blue-100">
                        <th className="text-left py-3 px-2 font-semibold text-gray-700 w-8">#</th>
                        <th className="text-left py-3 px-2 font-semibold text-gray-700">ITEM</th>
                        {!isFromExpenses && <th className="text-left py-3 px-2 font-semibold text-gray-700 w-20">QTY</th>}
                        {!isFromExpenses && <th className="text-left py-3 px-2 font-semibold text-gray-700 w-32">UNIT</th>}
                        <th className="text-left py-3 px-2 font-semibold text-gray-700 w-32">{isFromExpenses ? 'PRICE' : 'PRICE/UNIT'}</th>
                        {!isFromExpenses && pageType === 'purchase-bill' && (
                          <th className="text-left py-3 px-2 font-semibold text-gray-700 w-80">
                            <div className="grid grid-cols-2 gap-1 text-center">
                              <div className="col-span-2 text-sm font-semibold">DISCOUNT</div>
                              <div className="text-xs font-normal text-gray-600 border-r border-gray-300 pr-1">%</div>
                              <div className="text-xs font-normal text-gray-600 pl-1">AMOUNT</div>
                            </div>
                          </th>
                        )}
                        <th className="text-left py-3 px-2 font-semibold text-gray-700 w-32">AMOUNT</th>
                        <th className="text-left py-3 px-2 font-semibold text-gray-700 w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {newPurchase.items.map((item, index) => {




                        // Get the current unit value for the dropdown
                        const getCurrentUnitValue = () => {
                          if (!item.item) return 'NONE';
                          
                          const selectedItem = itemSuggestions.find(i => i.name === item.item);
                          if (!selectedItem || !selectedItem.unit) return 'NONE';
                          
                          // If the current unit is a display string, extract the base unit
                          if (item.unit && item.unit.includes(' / ')) {
                            const parts = item.unit.split(' / ');
                            return parts[0] || 'NONE';
                          }
                          
                          // If it's a single unit, return it
                          if (item.unit && item.unit !== 'NONE') {
                            return item.unit;
                          }
                          
                          // Default to base unit from item data
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
                            key={item.id}
                            className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-blue-50'} hover:bg-blue-100 transition-colors`}
                          >
                            <td className="py-2 px-2 font-medium">{index + 1}</td>
                            <td className="py-2 px-2">
                              {!isFromExpenses ? (
                                <ItemsDropdown
                                  items={itemSuggestions}
                                  value={item.item}
                                  onChange={(val) => handleItemChange(item.id, 'item', val)}
                                  onItemSelect={(selectedItem: any) => {
                                    const unitDisplay = getUnitDisplay(selectedItem.unit);
                                    handleItemChange(item.id, 'unit', unitDisplay);
                                    
                                    // Set price based on the selected unit
                                    let initialPrice = selectedItem.purchasePrice || 0;
                                    if (selectedItem.unit && typeof selectedItem.unit === 'object' && selectedItem.unit.conversionFactor) {
                                      // purchasePrice is for base unit (Box), so use it directly for base unit
                                      if (unitDisplay === selectedItem.unit.base) {
                                        // For base unit, use the price directly
                                        initialPrice = selectedItem.purchasePrice || 0;
                                      } else if (unitDisplay === selectedItem.unit.secondary) {
                                        // For secondary unit, multiply by conversion factor
                                        initialPrice = (selectedItem.purchasePrice || 0) * selectedItem.unit.conversionFactor;
                                      }
                                    }
                                    
                                    handleItemChange(item.id, 'price', initialPrice);
                                    handleItemChange(item.id, 'qty', '');
                                  }}
                                  showSuggestions={showItemSuggestions[item.id] || false}
                                  setShowSuggestions={(show) => setShowItemSuggestions(prev => ({ ...prev, [item.id]: show }))}
                                  placeholder="Enter item name..."
                                />
                              ) : (
                                <input
                                  type="text"
                                  value={item.item}
                                  onChange={e => {
                                    handleItemChange(item.id, 'item', e.target.value);
                                  }}
                                  onFocus={(event: React.FocusEvent<HTMLInputElement>) => {
                                    // For expenses, show expense suggestions with proper positioning
                                    setShowExpenseSuggestions(prev => ({ ...prev, [item.id]: true }));
                                    
                                    // Set dropdown position like purchase items
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
                                    setExpenseDropdownStyles(prev => ({ ...prev, [item.id]: style }));
                                  }}
                                  onBlur={() => setTimeout(() => {
                                    setShowExpenseSuggestions(prev => ({ ...prev, [item.id]: false }));
                                    // Clean up dropdown style
                                    setExpenseDropdownStyles(prev => {
                                      const newStyles = { ...prev };
                                      delete newStyles[item.id];
                                      return newStyles;
                                    });
                                  }, 200)}
                                  className="w-full px-3 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
                                  placeholder="Enter expense item..."
                                  onKeyDown={(e => {
                                    // Handle expense item suggestions keyboard navigation
                                    if (["ArrowDown", "ArrowUp", "Enter", "Escape"].includes(e.key)) {
                                      e.preventDefault();
                                      e.stopPropagation();
                                    }
                                    
                                    const filtered = expenseItemSuggestions.filter(i => i.toLowerCase().includes(item.item.toLowerCase()));
                                    
                                    // For expense items, we don't need keyboard navigation since ItemsDropdown handles it
                                    // Just handle Enter key for auto-completion
                                    if (e.key === 'Enter') {
                                      // Auto-complete with first suggestion if available
                                      const filtered = expenseItemSuggestions.filter(i => i.toLowerCase().includes(item.item.toLowerCase()));
                                      if (filtered.length > 0) {
                                        handleItemChange(item.id, 'item', filtered[0]);
                                        setShowExpenseSuggestions(prev => ({ ...prev, [item.id]: false }));
                                        // Clean up dropdown style
                                        setExpenseDropdownStyles(prev => {
                                          const newStyles = { ...prev };
                                          delete newStyles[item.id];
                                          return newStyles;
                                        });
                                      }
                                    }
                                  })}
                                />
                              )}

                              
                              {/* Expense Item Suggestions */}
                              {isFromExpenses && showExpenseSuggestions[item.id] && typeof window !== 'undefined' && ReactDOM.createPortal(
                                <ul style={expenseDropdownStyles[item.id] || {}} className="bg-white border border-blue-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                  {expenseItemSuggestions.length > 0 ? (
                                    // Show filtered suggestions
                                    expenseItemSuggestions
                                      .filter(suggestion => suggestion.toLowerCase().includes(item.item.toLowerCase()))
                                      .map((suggestion, idx) => (
                                        <li
                                          key={idx}
                                          className="px-4 py-2 hover:bg-blue-100 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0"
                                          onMouseDown={e => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleItemChange(item.id, 'item', suggestion);
                                            setShowExpenseSuggestions(prev => ({ ...prev, [item.id]: false }));
                                            // Clean up dropdown style
                                            setExpenseDropdownStyles(prev => {
                                              const newStyles = { ...prev };
                                              delete newStyles[item.id];
                                              return newStyles;
                                            });
                                          }}
                                          role="option"
                                        >
                                          <div className="flex justify-between items-center">
                                            <span className="font-medium text-gray-800">{suggestion}</span>
                                            <span className="text-xs text-gray-500 text-blue-600">Expense Item</span>
                                          </div>
                                        </li>
                                      ))
                                  ) : (
                                    // Show "No items found" message
                                    <li className="px-4 py-3 text-center">
                                      <div className="text-gray-500 text-sm">
                                        <div className="text-gray-400 mb-1">📦</div>
                                        <div>No expense items found</div>
                                        <div className="text-xs text-gray-400 mt-1">Create some expenses first</div>
                                      </div>
                                    </li>
                                  )}
                                </ul>,
                                document.body
                              )}
                            </td>
                            {!isFromExpenses && (
                              <td className="py-2 px-2">
                                <input
                                  type="number"
                                  value={item.qty}
                                  min={0}
                                  onChange={e => {
                                    handleItemChange(item.id, 'qty', e.target.value);
                                    // If this is the last row and qty is not empty, add a new row
                                    if (
                                      index === newPurchase.items.length - 1 &&
                                      e.target.value
                                    ) {
                                      // Add a new row
                                      addNewRow();
                                    }
                                  }}
                                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
                                />
                              </td>
                            )}
                            {!isFromExpenses && (
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
                                    
                                    // Always add NONE as a fallback option
                                    if (units.length === 0) {
                                      units.push('NONE');
                                    }
                                    
                                    return units;
                                  })()}
                                  value={getCurrentUnitValue()}
                                  onChange={val => {
                                    // Get the selected item data for conversion
                                    const selectedItem = itemSuggestions.find(i => i.name === item.item);
                                    if (selectedItem) {
                                      // Don't convert quantity - keep it the same
                                      // Only update price based on the new unit
                                      let newPrice = item.price || 0;
                                      
                                      if (selectedItem.unit && typeof selectedItem.unit === 'object' && selectedItem.unit.conversionFactor) {
                                        if (val === selectedItem.unit.base) {
                                          // Converting to base unit - use base price
                                          newPrice = selectedItem.purchasePrice || 0;
                                        } else if (val === selectedItem.unit.secondary) {
                                          // Converting to secondary unit - multiply by conversion factor
                                          newPrice = (selectedItem.purchasePrice || 0) * selectedItem.unit.conversionFactor;
                                        }
                                      }
                                      
                                      // Apply the new price
                                      handleItemChange(item.id, 'price', newPrice);
                                    }
                                    
                                    // Update the unit
                                    handleItemChange(item.id, 'unit', val);
                                  }}
                                  dropdownIndex={unitsDropdownIndices[item.id] || 0}
                                  setDropdownIndex={(value: React.SetStateAction<number>) => {
                                    if (typeof value === 'function') {
                                      setUnitsDropdownIndices(prev => ({ ...prev, [item.id]: value(prev[item.id] || 0) }));
                                    } else {
                                      setUnitsDropdownIndices(prev => ({ ...prev, [item.id]: value }));
                                    }
                                  }}
                                  optionsCount={(() => {
                                    const units: any[] = [];
                                    if (item.item) {
                                      const selectedItem = itemSuggestions.find(i => i.name === item.item);
                                      if (selectedItem && selectedItem.unit) {
                                        units.push(selectedItem.unit);
                                      }
                                    }
                                    
                                    // Always add NONE as a fallback option
                                    if (units.length === 0) {
                                      units.push('NONE');
                                    }
                                    
                                    // Calculate actual options count based on how UnitsDropdown processes units
                                    let count = 0;
                                    units.forEach(unit => {
                                      if (typeof unit === 'string') {
                                        count++;
                                      } else if (unit.base) {
                                        count++;
                                        if (unit.secondary && unit.secondary !== 'None') {
                                          count++;
                                        }
                                      }
                                    });
                                    
                                    // Add Custom option
                                    count++;
                                    
                                    return count;
                                  })()}
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
                            )}
                            <td className="py-2 px-2">
                              <input
                                type="number"
                                value={item.price}
                                min={0}
                                onChange={e => {
                                  handleItemChange(item.id, 'price', e.target.value);
                                  // Auto-add new row for expenses when typing price in last row
                                  if (isFromExpenses && e.target.value) {
                                    const currentItems = newPurchase.items;
                                    const isLastRow = index === currentItems.length - 1;
                                    if (isLastRow) {
                                      // Last row has price, add new row
                                      setTimeout(() => {
                                        setNewPurchase(prev => ({
                                          ...prev,
                                          items: [
                                            ...prev.items,
                                            { id: Date.now(), item: '', itemCode: '', qty: '', unit: 'NONE', customUnit: '', price: '', amount: 0, discountPercentage: '', discountAmount: '' }
                                          ]
                                        }));
                                      }, 100);
                                    }
                                  }
                                }}
                                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
                              />
                            </td>
                            {!isFromExpenses && pageType === 'purchase-bill' && (
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
                            )}
                            <td className="py-2 px-2">
                              <span className="text-gray-900 font-semibold">
                                {(() => {
                                  if (isFromExpenses) {
                                    return isNaN(item.amount) ? '0.00' : item.amount.toFixed(2);
                                  } else {
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
                                    
                                    return `${finalAmount.toFixed(2)} ${item.unit === 'Custom' && item.customUnit ? item.customUnit : item.unit !== 'NONE' ? item.unit : ''}`;
                                  }
                                })()}
                              </span>
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

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4">
                  {newPurchase.items.map((item, index) => {
                    // Get the current unit value for the dropdown
                    const getCurrentUnitValue = () => {
                      if (!item.item) return 'NONE';
                      
                      const selectedItem = itemSuggestions.find(i => i.name === item.item);
                      if (!selectedItem || !selectedItem.unit) return 'NONE';
                      
                      // If the current unit is a display string, extract the base unit
                      if (item.unit && item.unit.includes(' / ')) {
                        const parts = item.unit.split(' / ');
                        return parts[0] || 'NONE';
                      }
                      
                      // If it's a single unit, return it
                      if (item.unit && item.unit !== 'NONE') {
                        return item.unit;
                      }
                      
                      // Default to base unit from item data
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
                      <div key={item.id} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                        {/* Row Number */}
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-sm font-semibold text-gray-600">#{index + 1}</span>
                          {newPurchase.items.length > 1 && (
                            <button
                              type="button"
                              className="text-red-600 hover:text-red-700 px-2 py-1 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 transition-colors text-sm"
                              onClick={() => deleteRow(item.id)}
                              title="Delete row"
                            >
                              Delete
                            </button>
                          )}
                        </div>

                        {/* Item Name - Full Width */}
                        <div className="mb-3">
                          <label className="block text-xs font-medium text-blue-600 mb-1">Item Name</label>
                          {!isFromExpenses ? (
                            <ItemsDropdown
                              items={itemSuggestions}
                              value={item.item}
                              onChange={(val) => handleItemChange(item.id, 'item', val)}
                              onItemSelect={(selectedItem: any) => {
                                const unitDisplay = getUnitDisplay(selectedItem.unit);
                                handleItemChange(item.id, 'unit', unitDisplay);
                                
                                // Set price based on the selected unit
                                let initialPrice = selectedItem.purchasePrice || 0;
                                if (selectedItem.unit && typeof selectedItem.unit === 'object' && selectedItem.unit.conversionFactor) {
                                  // purchasePrice is for base unit (Box), so use it directly for base unit
                                  if (unitDisplay === selectedItem.unit.base) {
                                    // For base unit, use the price directly
                                    initialPrice = selectedItem.purchasePrice || 0;
                                  } else if (unitDisplay === selectedItem.unit.secondary) {
                                    // For secondary unit, multiply by conversion factor
                                    initialPrice = (selectedItem.purchasePrice || 0) * selectedItem.unit.conversionFactor;
                                  }
                                }
                                
                                handleItemChange(item.id, 'price', initialPrice);
                                handleItemChange(item.id, 'qty', '');
                              }}
                              showSuggestions={showItemSuggestions[item.id] || false}
                              setShowSuggestions={(show) => setShowItemSuggestions(prev => ({ ...prev, [item.id]: show }))}
                              placeholder="Enter item name..."
                            />
                          ) : (
                            <input
                              type="text"
                              value={item.item}
                              onChange={e => {
                                handleItemChange(item.id, 'item', e.target.value);
                              }}
                              onFocus={(event: React.FocusEvent<HTMLInputElement>) => {
                                // For expenses, show expense suggestions with proper positioning
                                setShowExpenseSuggestions(prev => ({ ...prev, [item.id]: true }));
                                
                                // Set dropdown position like purchase items
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
                                setExpenseDropdownStyles(prev => ({ ...prev, [item.id]: style }));
                              }}
                              onBlur={() => setTimeout(() => {
                                setShowExpenseSuggestions(prev => ({ ...prev, [item.id]: false }));
                                // Clean up dropdown style
                                setExpenseDropdownStyles(prev => {
                                  const newStyles = { ...prev };
                                  delete newStyles[item.id];
                                  return newStyles;
                                });
                              }, 200)}
                              className="w-full px-3 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
                              placeholder="Enter expense item..."
                            />
                          )}
                        </div>

                        {/* Quantity and Unit - Second Line */}
                        {!isFromExpenses && (
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Quantity</label>
                              <input
                                type="number"
                                value={item.qty}
                                min={0}
                                onChange={e => {
                                  handleItemChange(item.id, 'qty', e.target.value);
                                  // If this is the last row and qty is not empty, add a new row
                                  if (
                                    index === newPurchase.items.length - 1 &&
                                    e.target.value
                                  ) {
                                    // Add a new row
                                    addNewRow();
                                  }
                                }}
                                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Unit</label>
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
                                  
                                  // Always add NONE as a fallback option
                                  if (units.length === 0) {
                                    units.push('NONE');
                                  }
                                  
                                  return units;
                                })()}
                                value={getCurrentUnitValue()}
                                onChange={val => {
                                  // Get the selected item data for conversion
                                  const selectedItem = itemSuggestions.find(i => i.name === item.item);
                                  if (selectedItem) {
                                    // Don't convert quantity - keep it the same
                                    // Only update price based on the new unit
                                    let newPrice = item.price || 0;
                                    
                                    if (selectedItem.unit && typeof selectedItem.unit === 'object' && selectedItem.unit.conversionFactor) {
                                      if (val === selectedItem.unit.base) {
                                        // Converting to base unit - use base price
                                        newPrice = selectedItem.purchasePrice || 0;
                                      } else if (val === selectedItem.unit.secondary) {
                                        // Converting to secondary unit - multiply by conversion factor
                                        newPrice = (selectedItem.purchasePrice || 0) * selectedItem.unit.conversionFactor;
                                      }
                                    }
                                    
                                    // Apply the new price
                                    handleItemChange(item.id, 'price', newPrice);
                                  }
                                  
                                  // Update the unit
                                  handleItemChange(item.id, 'unit', val);
                                }}
                                dropdownIndex={unitsDropdownIndices[item.id] || 0}
                                setDropdownIndex={(value: React.SetStateAction<number>) => {
                                  if (typeof value === 'function') {
                                    setUnitsDropdownIndices(prev => ({ ...prev, [item.id]: value(prev[item.id] || 0) }));
                                  } else {
                                    setUnitsDropdownIndices(prev => ({ ...prev, [item.id]: value }));
                                  }
                                }}
                                optionsCount={(() => {
                                  const units: any[] = [];
                                  if (item.item) {
                                    const selectedItem = itemSuggestions.find(i => i.name === item.item);
                                    if (selectedItem && selectedItem.unit) {
                                      units.push(selectedItem.unit);
                                    }
                                  }
                                  
                                  // Always add NONE as a fallback option
                                  if (units.length === 0) {
                                    units.push('NONE');
                                  }
                                  
                                  // Calculate actual options count based on how UnitsDropdown processes units
                                  let count = 0;
                                  units.forEach(unit => {
                                    if (typeof unit === 'string') {
                                      count++;
                                    } else if (unit.base) {
                                      count++;
                                      if (unit.secondary && unit.secondary !== 'None') {
                                        count++;
                                      }
                                    }
                                  });
                                  
                                  // Add Custom option
                                  count++;
                                  
                                  return count;
                                })()}
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
                            </div>
                          </div>
                        )}

                        {/* Price per Unit - Third Line */}
                        <div className="mb-3">
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            {isFromExpenses ? 'Price' : 'Price per Unit'}
                          </label>
                          <input
                            type="number"
                            value={item.price}
                            min={0}
                            onChange={e => {
                              handleItemChange(item.id, 'price', e.target.value);
                              // Auto-add new row for expenses when typing price in last row
                              if (isFromExpenses && e.target.value) {
                                const currentItems = newPurchase.items;
                                const isLastRow = index === currentItems.length - 1;
                                if (isLastRow) {
                                  // Last row has price, add new row
                                  setTimeout(() => {
                                    setNewPurchase(prev => ({
                                      ...prev,
                                      items: [
                                        ...prev.items,
                                        { id: Date.now(), item: '', itemCode: '', qty: '', unit: 'NONE', customUnit: '', price: '', amount: 0, discountPercentage: '', discountAmount: '' }
                                      ]
                                    }));
                                  }, 100);
                                }
                              }
                            }}
                            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
                          />
                        </div>

                        {/* Discount and Amount - Fourth Line */}
                        {!isFromExpenses && pageType === 'purchase-bill' && (
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Discount %</label>
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
                                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all text-center"
                                placeholder="0.00"
                                autoComplete="off"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Discount Amount</label>
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
                                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all text-center"
                                placeholder="0.00"
                                autoComplete="off"
                              />
                            </div>
                          </div>
                        )}

                        {/* Final Amount */}
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-600">Amount:</span>
                            <span className="text-lg font-bold text-blue-700">
                              {(() => {
                                if (isFromExpenses) {
                                  return isNaN(item.amount) ? '0.00' : item.amount.toFixed(2);
                                } else {
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
                                  
                                  return `PKR ${finalAmount.toFixed(2)} ${item.unit === 'Custom' && item.customUnit ? item.customUnit : item.unit !== 'NONE' ? item.unit : ''}`;
                                }
                              })()}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {formErrors.items && <p className="text-xs text-red-500 mt-2">{formErrors.items}</p>}
              </div>
              {/* Image Upload & Description Section (match sale) */}
              {!isFromExpenses && (
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
              )}
              {/* Summary Section (match sale) */}
              <div className="bg-white px-6 py-8 w-full rounded-xl shadow-sm mt-4">
                <div className="flex flex-col md:flex-row justify-between items-end gap-6">
                  {/* Left Side - Discount and Tax */}
                  <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 w-full">
                    {/* Discount */}
                    {!isFromExpenses && (
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
                                value={newPurchase.discount}
                                onChange={e => setNewPurchase({ ...newPurchase, discount: e.target.value })}
                                className="w-20 sm:w-24 h-10 sm:h-11 px-2 sm:px-3 text-sm sm:text-base border-2 border-blue-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                              />
                              <CustomDropdown
                                options={[
                                  { value: '%', label: '%' },
                                  { value: 'PKR', label: 'PKR' }
                                ]}
                                value={newPurchase.discountType}
                                onChange={val => setNewPurchase({ ...newPurchase, discountType: val })}
                                className="w-20 sm:w-28 min-w-[60px] sm:min-w-[72px] mb-1 h-10 sm:h-11"
                                dropdownIndex={discountTypeDropdownIndex}
                                setDropdownIndex={setDiscountTypeDropdownIndex}
                                optionsCount={2}
                              />
                            </div>
                            <div className="text-xs text-gray-500 min-h-[20px] sm:min-h-[24px] mt-1">
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
                    )}
                    {/* Tax */}
                    {!isFromExpenses && (
                      <div className="w-full sm:w-auto sm:min-w-[200px]">
                        <label className="block text-xs sm:text-sm font-semibold text-blue-700 mb-2 flex items-center gap-1">
                          <span>🧾</span> Tax
                        </label>
                        <div className="flex flex-row items-center gap-2">
                          <input
                            type="number"
                            name="tax"
                            value={newPurchase.tax}
                            onChange={e => setNewPurchase({ ...newPurchase, tax: e.target.value })}
                            className="w-20 sm:w-24 h-10 sm:h-11 px-2 sm:px-3 text-sm sm:text-base border-2 border-blue-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                          />
                          <CustomDropdown
                            options={[
                              { value: '%', label: '%' },
                              { value: 'PKR', label: 'PKR' }
                            ]}
                            value={newPurchase.taxType}
                            onChange={val => setNewPurchase({ ...newPurchase, taxType: val })}
                            className="w-20 sm:w-28 min-w-[60px] sm:min-w-[72px] mb-1 h-10 sm:h-11"
                            dropdownIndex={taxTypeDropdownIndex}
                            setDropdownIndex={setTaxTypeDropdownIndex}
                            optionsCount={2}
                          />
                        </div>
                        <div className="text-xs text-gray-500 min-h-[20px] sm:min-h-[24px] mt-1">
                          {newPurchase.tax && !isNaN(Number(newPurchase.tax)) ? (
                            <>
                              Tax: {newPurchase.taxType === '%'
                                ? `${newPurchase.tax}% = PKR${taxValue.toFixed(2)}`
                                : `PKR${taxValue.toFixed(2)}`}
                            </>
                          ) : null}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Right Side - Payment Method and Totals */}
                  <div className="flex flex-col lg:flex-row items-start gap-4 lg:gap-8 w-full">
                    {/* Payment Method */}
                    <div className="w-full lg:min-w-[280px] lg:max-w-[320px]">
                      <label className="block text-xs sm:text-sm font-semibold text-blue-700 mb-2 flex items-center gap-1">
                        <span>💳</span> Payment Method
                      </label>
                      <PaymentMethodDropdown
                        value={newPurchase.paymentType}
                        onChange={val => {
                          // Handle different payment method types
                          if (val === 'Cash' || val === 'Cheque') {
                            setNewPurchase(prev => ({ 
                              ...prev, 
                              paymentType: val
                            }));
                          } else {
                            // Bank account selected - find the bank account ID
                            const bankAccount = bankAccounts.find(bank => bank.accountDisplayName === val);
                            if (bankAccount) {
                              setNewPurchase(prev => ({ 
                                ...prev, 
                                paymentType: `bank_${bankAccount._id}`
                              }));
                            } else {
                              setNewPurchase(prev => ({ 
                                ...prev, 
                                paymentType: val
                              }));
                            }
                          }
                        }}
                        bankAccounts={bankAccounts}
                        className="mb-1 w-full"
                        dropdownIndex={paymentMethodDropdownIndex}
                        setDropdownIndex={setPaymentMethodDropdownIndex}
                        onBankAccountAdded={refetchBankAccounts}
                      />
                      
                      {/* Paid Amount Field - Always Show */}
                      <div className="mt-3">
                        <label className="block text-xs font-medium text-green-700 mb-1">
                          {isFromExpenses ? 'Received Amount' : 'Paid Amount'}
                        </label>
                        <input
                          type="number"
                          name="paid"
                          value={newPurchase.paid}
                          min={0}
                          max={grandTotal}
                          onChange={e => setNewPurchase(prev => ({ ...prev, paid: e.target.value }))}
                          className={`w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base border-2 rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 ${
                            formErrors.paid ? 'border-red-300 bg-red-50 focus:ring-red-200' : 'border-green-200 focus:ring-green-200'
                          }`}
                          placeholder={`Enter ${isFromExpenses ? 'amount received' : 'amount paid'} (max PKR ${grandTotal.toFixed(2)})`}
                          onBlur={(e) => {
                            const paidAmount = Number(e.target.value);
                            if (paidAmount > grandTotal) {
                              setNewPurchase(prev => ({ ...prev, paid: grandTotal.toString() }));
                              setToast({ message: 'Paid amount cannot exceed total amount', type: 'error' });
                            }
                          }}
                          autoComplete="off"
                        />
                        {formErrors.paid && <p className="text-xs text-red-500 mt-1">{formErrors.paid}</p>}
                      </div>
                    </div>
                    
                    {/* Totals */}
                    <div className="w-full lg:min-w-[280px]">
                      <label className="block text-xs sm:text-sm font-semibold text-blue-700 mb-2 flex items-center gap-1">
                        <span>💰</span> {isFromExpenses ? 'Total' : 'Totals'}
                      </label>
                      {isFromExpenses ? (
                        // Simple total for expenses
                        <div className="bg-gradient-to-r from-blue-100 to-blue-50 border border-blue-200 rounded-xl px-4 sm:px-8 py-3 sm:py-4 text-right shadow w-full">
                          <div className="flex justify-between text-sm sm:text-lg font-bold text-blue-900">
                            <span>Total Amount</span>
                            <span>PKR {isFromExpenses ? subTotal.toFixed(2) : originalSubTotal.toFixed(2)}</span>
                          </div>
                            {/* Credit Information for Expenses - Always Show */}
                            {newPurchase.paid && Number(newPurchase.paid) > 0 && (
                              <>
                                <div className="border-t border-blue-200 my-2"></div>
                                <div className="flex justify-between text-xs sm:text-sm text-green-700">
                                  <span>Received Amount</span>
                                  <span>PKR {Number(newPurchase.paid).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-xs sm:text-sm text-red-700 font-semibold">
                                  <span>Credit Amount</span>
                                  <span>PKR {(subTotal - Number(newPurchase.paid)).toFixed(2)}</span>
                                </div>
                              </>
                            )}
                        </div>
                      ) : (
                        // Full totals for purchases
                        <div className="bg-gradient-to-r from-blue-100 to-blue-50 border border-blue-200 rounded-xl px-4 sm:px-8 py-3 sm:py-4 text-right shadow w-full">
                          <div className="flex flex-col gap-1">
                            <div className="flex justify-between text-xs text-gray-600">
                              <span>Sub Total</span>
                              <span>PKR {originalSubTotal.toFixed(2)}</span>
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
                            
                            {/* Credit Information - Always Show */}
                            {newPurchase.paid && Number(newPurchase.paid) > 0 && (
                              <>
                                <div className="border-t border-blue-200 my-2"></div>
                                <div className="flex justify-between text-sm text-green-700">
                                  <span>{isFromExpenses ? 'Received Amount' : 'Amount Paid'}</span>
                                  <span>PKR {Number(newPurchase.paid).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm text-red-700 font-semibold">
                                  <span>Credit Amount</span>
                                  <span>PKR {(grandTotal - Number(newPurchase.paid)).toFixed(2)}</span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      )}
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
                      <span>{isFromExpenses ? 'Add Expense' : (isEditMode ? 'Update Purchase' : 'Add Purchase')}</span>
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
