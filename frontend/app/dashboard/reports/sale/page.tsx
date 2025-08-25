"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, BarChart3, Printer, Settings, ChevronDown, Eye, Edit, MoreHorizontal, Trash2 } from 'lucide-react';
import { getSalesByUser, getSalesStatsByUser, getSaleById, deleteSale, createSale, updateSale } from '@/http/sales';
import { jwtDecode } from 'jwt-decode';
import PaymentInModal from '../../../components/PaymentInModal';
import ReactDOM from 'react-dom';
import { createPopper } from '@popperjs/core';
import Toast from '../../../components/Toast';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { useRouter } from 'next/navigation';
import { getCurrentUserInfo, canAddData, canEditData, canDeleteData } from '../../../../lib/roleAccessControl';

const SaleInvoicesPage = () => {  const [filterType, setFilterType] = useState('All');
  const [firmFilter, setFirmFilter] = useState('All Firms');
  const [paymentFilter, setPaymentFilter] = useState('All');
  const [amountFilter, setAmountFilter] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showSalePage, setShowSalePage] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [saleStatus, setSaleStatus] = useState('Draft');
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
  const [showMobileMenu, setShowMobileMenu] = useState(false);  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [showItemSuggestions, setShowItemSuggestions] = useState<{[id: number]: boolean}>({});
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const dateDropdownRef = useRef<HTMLDivElement>(null);
  const dateDropdownButtonRef = useRef<HTMLButtonElement>(null);
  const dateRanges = [
    { value: 'All', label: 'All Time' },
    { value: 'Today', label: 'Today' },
    { value: 'Yesterday', label: 'Yesterday' },
    { value: 'This Week', label: 'This Week' },
    { value: 'This Month', label: 'This Month' },
    { value: 'Last Month', label: 'Last Month' },
    { value: 'This Year', label: 'This Year' },
    { value: 'Custom', label: 'Custom Range' },
  ];

  // Demo business ID - in real app this would come from user context
  const businessId = 'demo-business-123';

  // Dummy items list with details
  // const itemsList = [
  //   { name: 'Rice - Basmati 1kg', price: 280, unit: 'KG' },
  //   ...
  // ];
  const [transactions, setTransactions] = useState<any[]>([]);
  const [dbStats, setDbStats] = useState<{ totalGrandTotal: number; totalBalance: number; totalReceived: number } | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [openMenuIdx, setOpenMenuIdx] = useState<number | null>(null);
  const [showPaymentIn, setShowPaymentIn] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const menuButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const getMenuButtonRef = useCallback((idx: number) => (el: HTMLButtonElement | null) => {
    menuButtonRefs.current[idx] = el;
  }, []);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<any>(null);
  
  // Role-based access control
  const [userInfo, setUserInfo] = useState<any>(null)
  const [isClient, setIsClient] = useState(false)

  const router = useRouter();

  // Load transactions and stats on component mount
  useEffect(() => {
    // Set client-side flag for hydration safety
    setIsClient(true);
    
    // Get current user info for role-based access
    const currentUserInfo = getCurrentUserInfo();
    setUserInfo(currentUserInfo);
    
    const fetchSales = async () => {
      setLoading(true);
      try {
        const token =
          (typeof window !== 'undefined' && (localStorage.getItem('token') || localStorage.getItem('vypar_auth_token'))) || '';
        if (!token) {
          setTransactions([]);
          setLoading(false);
          return;
        }
        const decoded: any = jwtDecode(token);
        const userId = decoded._id || decoded.id;
        if (!userId) {
          setTransactions([]);
          setLoading(false);
          return;
        }
        const result = await getSalesByUser(userId, token);
        if (result && result.success && Array.isArray(result.sales)) {
          setTransactions(result.sales);
        } else {
          setTransactions([]);
        }
      } catch (err) {
        setTransactions([]);
      }
      setLoading(false);
    };
    fetchSales();
    loadStats();
    loadCustomers();
  }, []);

  const loadStats = async () => {
    try {
      setStatsLoading(true);
      const token =
        (typeof window !== 'undefined' && (localStorage.getItem('token') || localStorage.getItem('vypar_auth_token'))) || '';
      if (!token) {
        setDbStats({ totalGrandTotal: 0, totalBalance: 0, totalReceived: 0 });
        setStatsLoading(false);
        return;
      }
      const decoded: any = jwtDecode(token);
      const userId = decoded._id || decoded.id;
      if (!userId) {
        setDbStats({ totalGrandTotal: 0, totalBalance: 0, totalReceived: 0 });
        setStatsLoading(false);
        return;
      }
      const result = await getSalesStatsByUser(userId, token);
      if (result && result.success && result.stats) {
        setDbStats(result.stats);
      } else {
        setDbStats({ totalGrandTotal: 0, totalBalance: 0, totalReceived: 0 });
      }
    } catch (error) {
      setDbStats({ totalGrandTotal: 0, totalBalance: 0, totalReceived: 0 });
    }
    setStatsLoading(false);
  };

  const loadCustomers = async () => {
    try {
      setCustomers([]);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };
  const [newSale, setNewSale] = useState<{
    partyName: string;
    phoneNo: string;
    items: { id: number; item: string; qty: string; unit: string; price: string; amount: number }[];
    discount: string;
    discountType: string;
    tax: string;
    paymentType: string;
    editingId: number | null;
  }>({
    partyName: '',
    phoneNo: '',
    items: [
      { id: 1, item: '', qty: '', unit: 'NONE', price: '', amount: 0 },
      { id: 2, item: '', qty: '', unit: 'NONE', price: '', amount: 0 }
    ],
    discount: '',
    discountType: '%',
    tax: 'NONE',
    paymentType: 'Credit',
    editingId: null
  });

  // Reset form to initial state
  const resetForm = () => {
    setNewSale({
      partyName: '',
      phoneNo: '',
      items: [
        { id: 1, item: '', qty: '', unit: 'NONE', price: '', amount: 0 },
        { id: 2, item: '', qty: '', unit: 'NONE', price: '', amount: 0 }
      ],
      discount: '',
      discountType: '%',
      tax: 'NONE',
      paymentType: 'Credit',
      editingId: null
    });
    setDescription('');
    setSaleStatus('Draft');
    setShowCustomerSuggestions(false);
    setUploadedImage(null);
    setImageUploading(false);
  };

  const filteredTransactions = Array.isArray(transactions) ? transactions.filter((transaction: any) => {
    // Search filter
    const matchesSearch = !searchTerm || 
      transaction.partyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.invoiceNo?.includes(searchTerm) ||
      transaction.paymentType?.toLowerCase().includes(searchTerm.toLowerCase());

    // Date filter
    let matchesDate = true;
    if (dateFrom || dateTo) {
      const transactionDate = new Date(transaction.date || transaction.createdAt);
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        matchesDate = matchesDate && transactionDate >= fromDate;
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999); // End of day
        matchesDate = matchesDate && transactionDate <= toDate;
      }
    }

    // Payment filter
    const matchesPayment = paymentFilter === 'All' || 
      transaction.paymentType === paymentFilter;

    // Amount filter
    let matchesAmount = true;
    if (amountFilter !== 'All') {
      const amount = transaction.amount || 0;
      switch (amountFilter) {
        case 'Under 1000':
          matchesAmount = amount < 1000;
          break;
        case '1000-5000':
          matchesAmount = amount >= 1000 && amount <= 5000;
          break;
        case '5000-10000':
          matchesAmount = amount >= 5000 && amount <= 10000;
          break;
        case 'Above 10000':
          matchesAmount = amount > 10000;
          break;
      }
    }

    return matchesSearch && matchesDate && matchesPayment && matchesAmount;
  })
  // Sort by date descending (latest first)
  .sort((a, b) => {
    const dateA = new Date(a.date || a.createdAt);
    const dateB = new Date(b.date || b.createdAt);
    return dateB.getTime() - dateA.getTime();
  }) : [];

  // Calculate totals from filteredTransactions (original data)
  const totalSales = filteredTransactions.reduce((sum: number, t: any) => {
    if (Array.isArray(t.items) && t.items.length > 0) {
      return sum + t.items.reduce((itemSum: number, item: any) => itemSum + (item.amount || 0), 0);
    }
    return sum + (t.amount || 0);
  }, 0);
  const totalReceived = filteredTransactions.reduce((sum: number, t: any) => {
    if (t.paymentType === 'Cash') {
      if (Array.isArray(t.items) && t.items.length > 0) {
        return sum + t.items.reduce((itemSum: number, item: any) => itemSum + (item.amount || 0), 0);
      }
      return sum + (t.amount || 0);
    }
    return sum;
  }, 0);
  const totalBalance = totalSales - totalReceived;

  const handleAddSale = async () => {
    const totalAmount = newSale.items.reduce((sum, item) => sum + item.amount, 0);    const discountAmount = newSale.discountType === '%' 
      ? (totalAmount * parseFloat(newSale.discount || '0')) / 100
      : parseFloat(newSale.discount || '0');
    const finalAmount = totalAmount - discountAmount;
    
    if (!newSale.partyName || finalAmount <= 0) {
      setToast({ message: 'Please fill in party name and add items with valid amounts.', type: 'error' });
      return false;
    }    // Filter out empty items
    const validItems = newSale.items.filter(item => 
      item.item && item.item.trim() && 
      parseFloat(item.qty.toString()) > 0 && 
      parseFloat(item.price.toString()) > 0
    );

    if (validItems.length === 0) {
      setToast({ message: 'Please add at least one valid item.', type: 'error' });
      return false;
    }

    try {
      setLoading(true);
      const saleData = {
        partyName: newSale.partyName,
        phoneNo: newSale.phoneNo,
        items: validItems.map(item => ({
          item: item.item,
          qty: parseFloat(item.qty.toString()) || 0,
          unit: item.unit,
          price: parseFloat(item.price.toString()) || 0,
          amount: item.amount
        })),
        discount: newSale.discount,
        discountType: newSale.discountType,
        tax: newSale.tax,
        paymentType: newSale.paymentType,
        description: description,
        imageUrl: uploadedImage // Add image URL to sale data
      };

      let response;
      
      // Dummy save logic
      console.log('Saving sale:', saleData);
      setSaleStatus('Saved');
      setToast({ message: 'Sale updated successfully!', type: 'success' });
      // Reload transactions and stats
      await loadStats();
      return true;
    } catch (error) {
      console.error('Error saving sale:', error);
      setToast({ message: 'Failed to save sale', type: 'error' });
      return false;
    } finally {
      setLoading(false);
    }
  };
  const handleSave = async () => {
    try {
      setLoading(true);
      const saleData = {
        partyName: newSale.partyName,
        phoneNo: newSale.phoneNo,
        items: newSale.items.filter(item => item.item && item.qty && item.price),
        discount: newSale.discount,
        discountType: newSale.discountType,
        tax: newSale.tax,
        paymentType: newSale.paymentType,
        description: description,
        status: saleStatus,
        imageUrl: uploadedImage
      };
      const token = (typeof window !== 'undefined' && (localStorage.getItem('token') || localStorage.getItem('vypar_auth_token'))) || '';
      if (newSale.editingId) {
        await updateSale(String(newSale.editingId), saleData, token);
        setToast({ message: 'Sale updated successfully!', type: 'success' });
      } else {
        await createSale(saleData, token);
        setToast({ message: 'Sale saved successfully!', type: 'success' });
      }
      resetForm();
      setShowSalePage(false);
      await loadStats();
    } catch (error) {
      setToast({ message: 'Error saving sale', type: 'error' });
      console.error('Error saving sale:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAndClose = async () => {
    await handleSave();
    setShowSalePage(false);
  };

  const addNewRow = () => {
    const newRow = {
      id: newSale.items.length + 1,
      item: '',
      qty: '',
      unit: 'NONE',
      price: '',
      amount: 0
    };
    setNewSale({...newSale, items: [...newSale.items, newRow]});
  };

  const updateItem = (id: number, field: string, value: any) => {
    setNewSale(prev => ({
      ...prev,
      items: prev.items.map(item => 
        item.id === id ? { ...item, [field]: value } : item
      )
    }));
  };
  const handleEmailInvoice = () => {
    // Calculate invoice details
    const totalAmount = calculateTotal();
    const discountAmount = newSale.discountType === '%' 
      ? (totalAmount * parseFloat(newSale.discount || '0')) / 100
      : parseFloat(newSale.discount || '0');
    const finalAmount = totalAmount - discountAmount;
    
    // Get current date
    const currentDate = new Date().toLocaleDateString('en-GB');
    
    // Create detailed message with invoice items
    const itemsList = newSale.items
      .filter(item => item.item && item.qty && item.price)
      .map(item => `• ${item.item} - Qty: ${item.qty} ${item.unit} - Price: PKR ${item.price} - Amount: PKR ${item.amount}`)
      .join('\n');
    
    const detailedMessage = `Dear ${newSale.partyName || 'Customer'},

Greetings! Please find below the details of your invoice:

Invoice Details:
================
Invoice Number: #${transactions.length + 1}
Date: ${currentDate}
Customer: ${newSale.partyName || 'N/A'}
Phone: ${newSale.phoneNo || 'N/A'}
Payment Type: ${newSale.paymentType}

Items:
------
${itemsList}

Summary:
--------
Subtotal: PKR ${totalAmount.toFixed(2)}
${newSale.discount ? `Discount (${newSale.discountType === '%' ? newSale.discount + '%' : 'PKR ' + newSale.discount}): PKR ${discountAmount.toFixed(2)}` : ''}
Total Amount: PKR ${finalAmount.toFixed(2)}

${description ? `\nAdditional Notes:\n${description}` : ''}

Thank you for your business! We appreciate your trust in our services.

Best regards,
Your Business Name`;

    // Pre-fill email data
    setEmailData({
      to: '', // User will fill this
      subject: `Invoice #${transactions.length + 1} - ${newSale.partyName || 'Customer'} - PKR ${finalAmount.toFixed(2)}`,
      message: detailedMessage
    });
    setShowEmailModal(true);
  };
  const handleSendEmail = () => {
    // Create mailto URL with pre-filled data
    const emailTo = encodeURIComponent(emailData.to);
    const emailSubject = encodeURIComponent(emailData.subject);
    const emailBody = encodeURIComponent(emailData.message);
    
    // Create the mailto URL
    const mailtoUrl = `mailto:${emailTo}?subject=${emailSubject}&body=${emailBody}`;
    
    // Open the default email client
    window.open(mailtoUrl, '_self');
    
    // Close the modal
    setShowEmailModal(false);
    
    // Reset the form for next use
    setEmailData({ to: '', subject: '', message: '' });
  };

  // Email validation function
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handlePrintInvoice = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const printContent = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px;">
          <h1>SALE INVOICE</h1>
          <h2>Invoice #${transactions.length + 1}</h2>
          <p>Date: ${new Date().toLocaleDateString('en-GB')}</p>
        </div>
        
        <div style="margin-bottom: 30px;">
          <h3>Bill To:</h3>
          <p><strong>${newSale.partyName || 'Customer Name'}</strong></p>
          <p>Phone: ${newSale.phoneNo || 'N/A'}</p>
          <p>Payment Type: ${newSale.paymentType}</p>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
          <thead>
            <tr style="background-color: #f5f5f5;">
              <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">#</th>
              <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">Item</th>
              <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">Qty</th>
              <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">Unit</th>
              <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">Price</th>
              <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${newSale.items.filter(item => item.item || item.qty || item.price).map((item, index) => `
              <tr>
                <td style="border: 1px solid #ddd; padding: 12px;">${index + 1}</td>
                <td style="border: 1px solid #ddd; padding: 12px;">${item.item || 'N/A'}</td>
                <td style="border: 1px solid #ddd; padding: 12px;">${item.qty || 'N/A'}</td>
                <td style="border: 1px solid #ddd; padding: 12px;">${item.unit || 'N/A'}</td>
                <td style="border: 1px solid #ddd; padding: 12px;">PKR ${item.price || '0'}</td>
                <td style="border: 1px solid #ddd; padding: 12px;">PKR ${item.amount.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div style="text-align: right; margin-bottom: 30px;">
          <p style="font-size: 18px;"><strong>Total Amount: PKR ${calculateTotal().toFixed(2)}</strong></p>
          ${newSale.discount ? `<p>Discount: ${newSale.discount}${newSale.discountType}</p>` : ''}
        </div>
        
        ${description ? `
          <div style="margin-bottom: 20px;">
            <h4>Notes:</h4>
            <p>${description}</p>
          </div>
        ` : ''}
        
        <div style="text-align: center; border-top: 1px solid #ddd; padding-top: 20px; color: #666;">
          <p>Thank you for your business!</p>
        </div>
      </div>
    `;
    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice #${transactions.length + 1}</title>
          <style>
            @media print {
              body { margin: 0; }
              @page { margin: 1cm; }
            }
          </style>
        </head>
        <body>
          ${printContent}
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Sale Invoice</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .invoice-details { margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .total { font-weight: bold; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Sale Invoice</h1>
            <p>Invoice #: INV-${Date.now()}</p>
            <p>Date: ${new Date().toLocaleDateString()}</p>
          </div>
          <div class="invoice-details">
            <p><strong>Customer:</strong> ${newSale.partyName}</p>
            <p><strong>Phone:</strong> ${newSale.phoneNo}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Unit</th>
                <th>Price</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${newSale.items.filter(item => item.item && item.qty && item.price).map(item => `
                <tr>
                  <td>${item.item}</td>
                  <td>${item.qty}</td>
                  <td>${item.unit}</td>
                  <td>PKR${item.price}</td>
                  <td>PKR${item.amount}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="total">
            <p>Total Amount: PKR${calculateTotal()}</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleDuplicateSale = () => {
    setToast({ message: 'Sale duplicated successfully!', type: 'success' });
  };
  const handleSaveAndNew = async () => {
    const success = await handleAddSale();
    if (success) {
      // Reset for new sale
      setNewSale({
        partyName: '',
        phoneNo: '',
        items: [
          { id: 1, item: '', qty: '', unit: 'NONE', price: '', amount: 0 },
          { id: 2, item: '', qty: '', unit: 'NONE', price: '', amount: 0 }
        ],
        discount: '',
        discountType: '%',
        tax: 'NONE',
        paymentType: 'Credit',
        editingId: null
      });
      setDescription('');
      setUploadedImage(null);
      setShowDescription(false);
      setSaleStatus('Draft');
      setToast({ message: 'Sale saved! Ready for new sale.', type: 'success' });
    }
  };
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        setImageUploading(true);
        // Dummy image upload logic
        const result = { success: true, url: URL.createObjectURL(file) };
        
        if (result.success && result.url) {
          setUploadedImage(result.url);
        } else {
          setToast({ message: 'Failed to upload image: Unknown error', type: 'error' });
        }
      } catch (error) {
        console.error('Image upload error:', error);
        setToast({ message: 'Failed to upload image', type: 'error' });
      } finally {
        setImageUploading(false);
      }
    }
  };

  const removeImage = () => {
    setUploadedImage(null);
  };

  const calculateTotal = () => {
    return newSale.items.reduce((sum, item) => sum + item.amount, 0);
  };

  const handleDeleteTransaction = async (id: string) => {
    const transaction = transactions.find((t) => t._id === id || t.id === id);
    setSaleToDelete(transaction);
    setDeleteDialogOpen(true);
  };

  const handleEditTransaction = (transaction: any) => {
    const id = transaction._id || transaction.id;
    router.push(`/dashboard/sale/add?editId=${id}`);
  };

  const handleReceivePayment = (transaction: any) => {
    setSelectedTransaction(transaction);
    setShowPaymentIn(true);
  };

  // Filter helper functions
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
  };

  // Calculate stats from filteredTransactions (filtered sales)
  const filteredStats = {
    totalGrandTotal: filteredTransactions.reduce((sum: number, t: any) => sum + (typeof t.grandTotal === 'number' ? t.grandTotal : (t.amount || 0)), 0),
    totalReceived: filteredTransactions.reduce((sum: number, t: any) => sum + (typeof t.received === 'number' ? t.received : 0), 0),
    totalBalance: filteredTransactions.reduce((sum: number, t: any) => sum + (typeof t.balance === 'number' ? t.balance : 0), 0),
  };

  const handleItemInputFocus = (id: number) => {
    setShowItemSuggestions(prev => ({ ...prev, [id]: true }));
  };
  const handleItemInputBlur = (id: number) => {
    setTimeout(() => setShowItemSuggestions(prev => ({ ...prev, [id]: false })), 200);
  };

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

  // TableActionMenu component for each row
  function TableActionMenu({ transaction, onEdit, onDelete, onReceivePayment }: {
    transaction: any,
    onEdit: () => void,
    onDelete: () => void,
    onReceivePayment: () => void,
  }) {
    const [open, setOpen] = useState(false);
    const btnRef = useRef<HTMLButtonElement | null>(null);
    const dropdownRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
      let popperInstance: any;
      if (open && btnRef.current && dropdownRef.current) {
        popperInstance = createPopper(btnRef.current, dropdownRef.current, {
          placement: 'bottom-end',
          modifiers: [
            { name: 'offset', options: { offset: [0, 8] } },
            { name: 'preventOverflow', options: { boundary: 'viewport' } }
          ]
        });
      }
      return () => {
        if (popperInstance) popperInstance.destroy();
      };
    }, [open]);

    // Close on outside click
    useEffect(() => {
      if (!open) return;
      function handleClick(e: MouseEvent) {
        if (
          dropdownRef.current &&
          !dropdownRef.current.contains(e.target as Node) &&
          btnRef.current &&
          !btnRef.current.contains(e.target as Node)
        ) {
          setOpen(false);
        }
      }
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }, [open]);

    return (
      <>
        <button
          ref={btnRef}
          onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
          className="p-1 focus:outline-none"
          title="More actions"
          style={{ background: 'none', border: 'none', boxShadow: 'none', minWidth: '24px' }}
        >
          <span style={{ fontSize: '18px', lineHeight: '1', letterSpacing: '2px', verticalAlign: 'middle' }}>︙</span>
        </button>
        {open && typeof window !== 'undefined' && ReactDOM.createPortal(
          <div
            ref={dropdownRef}
            className="z-[9999] bg-white border border-gray-200 rounded-lg shadow-lg min-w-[150px] w-[180px] flex flex-col text-left animate-fadeinup"
          >
            <button
              onClick={e => { e.stopPropagation(); setOpen(false); onEdit(); }}
              className="px-4 py-2 hover:bg-gray-200 text-black w-full text-left"
            >
              Edit
            </button>
            <button
              onClick={e => { e.stopPropagation(); setOpen(false); onDelete(); }}
              className="px-4 py-2 hover:bg-gray-200 text-black w-full text-left"
            >
              Delete
            </button>
            <button
              onClick={e => { e.stopPropagation(); setOpen(false); onReceivePayment(); }}
              className="px-4 py-2 hover:bg-gray-200 text-black w-full text-left"
            >
              Receive Payment
            </button>
          </div>,
          document.body
        )}
      </>
    );
  }

  // Add a status badge component
  function PaymentStatusBadge({ status }: { status: string }) {
    let color = '';
    if (status === 'Paid') color = 'bg-green-100 text-green-800';
    else if (status === 'Partial') color = 'bg-orange-100 text-orange-800';
    else color = 'bg-red-100 text-red-800';
    return <span className={`px-3 py-1 text-xs font-semibold rounded-full ${color}`}>{status}</span>;
  }

  return (
    <>
      <div className="p-3 bg-gray-50 min-h-screen">
        {/* Header - sticky, card-like, shadow, rounded (copied from parties page) */}
        <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-md p-3 mb-4 sticky top-0 z-30 border border-gray-100">
          <div className="flex flex-col space-y-3 md:flex-row md:items-center md:justify-between md:space-y-0">
            <div className="text-center md:text-left">
              <h1 className="text-lg md:text-xl font-bold text-gray-900">Sale Invoices</h1>
              <p className="text-xs text-gray-500 mt-1">Manage your sales, invoices, and payments</p>
            </div>
            <div className="flex flex-col md:flex-row gap-2 md:gap-3">
              {isClient && canAddData() ? (
                <button
                  onClick={() => window.location.href = '/dashboard/sale/add'}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg font-medium flex items-center gap-2 transition-colors shadow text-xs"
                  disabled={loading}
                >
                  + Add Sale
                </button>
              ) : (
                <div className="bg-gray-100 text-gray-500 px-3 py-1 rounded-lg font-medium flex items-center gap-2 text-xs">
                  + Add Sale (Restricted)
                </div>
              )}
              <button className="p-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <Settings className="w-3 h-3 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
        {/* Stats Grid (full width, responsive) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
          <div className="bg-gradient-to-br from-blue-100 to-blue-50 p-3 rounded-xl shadow group hover:shadow-md transition-all flex flex-col items-start">
            <div className="w-6 h-6 flex items-center justify-center rounded-lg bg-blue-500 text-white mb-1.5 text-sm">💰</div>
            <div className="text-sm font-bold text-blue-700">
              PKR {Number(filteredStats.totalGrandTotal || 0).toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">Total Sales</div>
          </div>
          <div className="bg-gradient-to-br from-green-100 to-green-50 p-3 rounded-xl shadow group hover:shadow-md transition-all flex flex-col items-start">
            <div className="w-6 h-6 flex items-center justify-center rounded-lg bg-green-500 text-white mb-1.5 text-sm">⬆️</div>
            <div className="text-sm font-bold text-green-700">
              PKR {Number(filteredStats.totalReceived || 0).toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">Total Received</div>
          </div>
          <div className="bg-gradient-to-br from-orange-100 to-orange-50 p-3 rounded-xl shadow group hover:shadow-md transition-all flex flex-col items-start">
            <div className="w-6 h-6 flex items-center justify-center rounded-lg bg-orange-500 text-white mb-1.5 text-sm">🧾</div>
            <div className="text-sm font-bold text-orange-700">
              PKR {Number(filteredStats.totalBalance || 0).toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">Total Balance</div>
          </div>
        </div>

        <>
          {/* Search & Filters Section (full width) */}
          <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow p-3 mb-4 border border-gray-100 z-[1]">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
              {/* Modern Search Bar */}
              <div className="relative w-full md:w-72">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-sm">🔍</span>
                <input
                  type="text"
                  placeholder="Search invoices..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 rounded-lg bg-white/80 shadow focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border border-gray-200 transition-all placeholder-gray-400 text-gray-900 text-sm"
                />
              </div>
              {/* Filter Tabs/Pills */}
              <div className="flex gap-2 md:gap-3">
                {['All', 'Paid', 'Pending', 'Overdue'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setSaleStatus(tab)}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-colors text-xs border-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      saleStatus === tab
                        ? 'bg-blue-600 text-white border-blue-600 shadow scale-105'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-blue-50'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              {/* Enhanced Date Range & Quick Filter Dropdown */}
              <div className="flex flex-col sm:flex-row gap-2 items-center mt-2">
                {/* Modern Dropdown for Date Range */}
                <div ref={dateDropdownRef} className="relative w-full sm:w-40">
                  <button
                    ref={dateDropdownButtonRef}
                    type="button"
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white/80 shadow border border-gray-200 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all group text-xs"
                    onClick={() => setShowDateDropdown((v) => !v)}
                    aria-haspopup="listbox"
                    aria-expanded={showDateDropdown ? 'true' : 'false'}
                  >
                    <span className="truncate">{dateRanges.find(r => r.value === filterType)?.label || 'All Time'}</span>
                    <svg className={`w-3 h-3 ml-1.5 transition-transform ${showDateDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
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
                          className={`px-2.5 py-1 cursor-pointer rounded-md transition-all hover:bg-blue-50 text-xs ${filterType === range.value ? 'font-semibold text-blue-600 bg-blue-100' : 'text-gray-700'}`}
                          onClick={() => {
                            handleFilterTypeChange(range.value);
                            // Auto-fill date pickers for quick ranges
                            const today = new Date();
                            let from = '', to = '';
                            if (range.value === 'Today') {
                              from = to = today.toISOString().slice(0, 10);
                            } else if (range.value === 'Yesterday') {
                              const yest = new Date(today);
                              yest.setDate(today.getDate() - 1);
                              from = to = yest.toISOString().slice(0, 10);
                            } else if (range.value === 'This Week') {
                              const first = new Date(today);
                              first.setDate(today.getDate() - today.getDay());
                              from = first.toISOString().slice(0, 10);
                              to = today.toISOString().slice(0, 10);
                            } else if (range.value === 'This Month') {
                              const first = new Date(today.getFullYear(), today.getMonth(), 1);
                              from = first.toISOString().slice(0, 10);
                              to = today.toISOString().slice(0, 10);
                            } else if (range.value === 'Last Month') {
                              const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                              const last = new Date(today.getFullYear(), today.getMonth(), 0);
                              from = first.toISOString().slice(0, 10);
                              to = last.toISOString().slice(0, 10);
                            } else if (range.value === 'This Year') {
                              const first = new Date(today.getFullYear(), 0, 1);
                              from = first.toISOString().slice(0, 10);
                              to = today.toISOString().slice(0, 10);
                            } else if (range.value === 'All') {
                              from = '';
                              to = '';
                            }
                            if (range.value !== 'Custom') {
                              setDateFrom(from);
                              setDateTo(to);
                            }
                            setShowDateDropdown(false);
                          }}
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
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    if (filterType !== 'Custom') handleFilterTypeChange('Custom');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-white border-2 border-gray-200 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm min-w-[120px] text-xs"
                  placeholder="From Date"
                  disabled={filterType !== 'Custom' && filterType !== 'All'}
                />
                <span className="text-gray-500 text-xs">to</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    if (filterType !== 'Custom') handleFilterTypeChange('Custom');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-white border-2 border-gray-200 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm min-w-[120px] text-xs"
                  placeholder="To Date"
                  disabled={filterType !== 'Custom' && filterType !== 'All'}
                />
              </div>
            </div>
          </div>
          {/* Transactions Section (full width, enhanced) */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 mb-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-3 border-b border-gray-200 gap-2">
              <h2 className="text-sm font-semibold text-gray-900">Transactions</h2>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="w-3 h-3 absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search transactions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-7 pr-2 py-1 border border-gray-300 rounded-md text-xs w-full md:w-44 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>
                <button
                  onClick={handlePrint}
                  className="p-1 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  title="Print"
                >
                  <Printer className="w-3 h-3 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Date</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Invoice no</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Party Name</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Transaction</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Payment Type</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Amount</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Balance</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-6 text-center text-gray-500 text-sm font-medium">
                        {searchTerm
                          ? `No sales found matching "${searchTerm}".`
                          : "No sales found."}
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((transaction, idx) => {
                      // Payment status logic
                      let paymentStatus = 'Unpaid';
                      if (typeof transaction.balance === 'number' && typeof transaction.received === 'number') {
                        if (transaction.balance === 0 && transaction.received > 0) paymentStatus = 'Paid';
                        else if (transaction.received === 0) paymentStatus = 'Unpaid';
                        else if (transaction.balance > 0 && transaction.received > 0) paymentStatus = 'Partial';
                      }
                      return (
                        <tr key={transaction._id || transaction.id || idx} className={`hover:bg-blue-50/40 transition-all ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}> 
                          <td className="px-4 py-3 text-xs text-gray-900 whitespace-nowrap text-center">
                            {transaction.date
                              ? new Date(transaction.date).toLocaleDateString('en-GB')
                              : transaction.createdAt
                                ? new Date(transaction.createdAt).toLocaleDateString('en-GB')
                                : '-'}
                          </td>
                          <td className="px-4 py-3 text-xs text-blue-700 font-bold whitespace-nowrap text-center">
                            {transaction.invoiceNo ? (
                              <a href={`/dashboard/sale/invoice/${transaction._id}`} className="underline hover:text-blue-900">{transaction.invoiceNo}</a>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-900 whitespace-nowrap text-center">{transaction.partyName}</td>
                          <td className="px-4 py-3 text-xs whitespace-nowrap text-center">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${transaction.status === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>{transaction.transaction ? transaction.transaction : 'Sale'}</span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-900 whitespace-nowrap text-center">{transaction.paymentType}</td>
                          <td className="px-4 py-3 text-xs font-semibold text-blue-700 whitespace-nowrap text-center">
                            PKR {typeof transaction.grandTotal === 'number' ? transaction.grandTotal.toLocaleString() : (transaction.amount ? transaction.amount.toLocaleString() : '0')}
                          </td>
                          <td className="px-4 py-3 text-xs font-semibold text-orange-600 whitespace-nowrap text-center">PKR {typeof transaction.balance === 'number' ? transaction.balance.toLocaleString() : '0'}</td>
                          <td className="px-4 py-3 text-xs font-semibold text-center">
                            <PaymentStatusBadge status={paymentStatus} />
                          </td>
                          <td className="px-4 py-3 text-xs font-medium whitespace-nowrap text-center">
                            <div className="flex justify-center gap-2 relative">
                              {/* View button outside dropdown */}
                              <button
                                onClick={() => setToast({ message: 'View invoice feature coming soon!', type: 'success' })}
                                className="px-2 py-1 text-sm text-black"
                                style={{ minWidth: '40px', fontSize: '13px', background: 'none', border: 'none', boxShadow: 'none' }}
                              >
                                View
                              </button>
                              {isClient && (canEditData() || canDeleteData()) ? (
                                <TableActionMenu
                                  transaction={transaction}
                                  onEdit={canEditData() ? () => handleEditTransaction(transaction) : () => {}}
                                  onDelete={canDeleteData() ? () => handleDeleteTransaction(transaction._id || transaction.id) : () => {}}
                                  onReceivePayment={() => handleReceivePayment(transaction)}
                                />
                              ) : (
                                <div className="text-gray-400 text-sm">No actions</div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      </div>
      {/* PaymentInModal integration */}
      <PaymentInModal
        isOpen={showPaymentIn}
        onClose={() => {
          setShowPaymentIn(false);
          loadStats();
        }}
        onSave={async (data) => {
          // Fetch updated sale from API
          try {
            const token = (typeof window !== 'undefined' && (localStorage.getItem('token') || localStorage.getItem('vypar_auth_token'))) || '';
            const saleId = selectedTransaction?._id || selectedTransaction?.id;
            if (!saleId) return;
            const result = await getSaleById(saleId, token);
            if (result && result.success && result.sale) {
              setTransactions((prev) => prev.map((t) => (t._id === saleId || t.id === saleId) ? { ...t, ...result.sale } : t));
            }
          } catch (err) {
            // fallback: just reload all
            loadStats();
          }
          setShowPaymentIn(false);
          setToast({ message: 'Payment received successfully!', type: 'success' });
        }}
        partyName={selectedTransaction?.partyName || ''}
        total={typeof selectedTransaction?.grandTotal === 'number' ? selectedTransaction.grandTotal : 0}
        dueBalance={typeof selectedTransaction?.balance === 'number' ? selectedTransaction.balance : 0}
        saleId={selectedTransaction?._id || selectedTransaction?.id || ''}
      />
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Sale?"
        description={`Are you sure you want to delete sale ${saleToDelete?.invoiceNo || saleToDelete?.id || saleToDelete?._id}? This action cannot be undone.`}
        onCancel={() => { setDeleteDialogOpen(false); setSaleToDelete(null); }}
        onConfirm={async () => {
          if (!saleToDelete) return;
          try {
            setLoading(true);
            const token = (typeof window !== 'undefined' && (localStorage.getItem('token') || localStorage.getItem('vypar_auth_token'))) || '';
            await deleteSale(saleToDelete._id || saleToDelete.id, token);
            // Optimistically remove from local state for instant UI
            setTransactions(prev => prev.filter(t => (t._id || t.id) !== (saleToDelete._id || saleToDelete.id)));
            setToast({ message: 'Sale deleted successfully!', type: 'success' });
            // Then reload from backend for data consistency
            await loadStats();
          } catch (error) {
            setToast({ message: 'Error deleting sale', type: 'error' });
          } finally {
            setLoading(false);
            setDeleteDialogOpen(false);
            setSaleToDelete(null);
          }
        }}
        loading={loading}
      />
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </>
  );
};

export default SaleInvoicesPage;