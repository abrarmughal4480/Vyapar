"use client";
import React, { useState, useEffect } from 'react';
import { Search, BarChart3, Printer, Settings, ChevronDown, Eye, Edit, MoreHorizontal, Trash2 } from 'lucide-react';
import { saleAPI, SaleData } from '../../../lib/api/sale';
import { uploadImageToCloudinary } from '../../../lib/cloudinary';

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
  const [error, setError] = useState('');
  const [customers, setCustomers] = useState([]);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);

  // Demo business ID - in real app this would come from user context
  const businessId = 'demo-business-123';

  // Dummy items list with details
  const itemsList = [
    { name: 'Rice - Basmati 1kg', price: 280, unit: 'KG' },
    { name: 'Wheat Flour 5kg', price: 450, unit: 'KG' },
    { name: 'Sugar 1kg', price: 120, unit: 'KG' },
    { name: 'Cooking Oil 1L', price: 380, unit: 'BOX' },
    { name: 'Tea - Lipton 200g', price: 85, unit: 'PCS' },
    { name: 'Milk Powder 400g', price: 650, unit: 'PCS' },
    { name: 'Chicken 1kg', price: 320, unit: 'KG' },
    { name: 'Beef 1kg', price: 850, unit: 'KG' },
    { name: 'Mutton 1kg', price: 1200, unit: 'KG' },
    { name: 'Fish - Rohu 1kg', price: 420, unit: 'KG' },
    { name: 'Onions 1kg', price: 60, unit: 'KG' },
    { name: 'Potatoes 1kg', price: 45, unit: 'KG' },
    { name: 'Tomatoes 1kg', price: 80, unit: 'KG' },
    { name: 'Garlic 250g', price: 120, unit: 'PCS' },
    { name: 'Ginger 250g', price: 200, unit: 'PCS' },
    { name: 'Bread - Local', price: 25, unit: 'PCS' },
    { name: 'Eggs 12pcs', price: 180, unit: 'BOX' },
    { name: 'Yogurt 1kg', price: 140, unit: 'KG' },
    { name: 'Cheese 200g', price: 250, unit: 'PCS' },
    { name: 'Biscuits - Marie', price: 35, unit: 'PCS' }
  ];  const [transactions, setTransactions] = useState([]);
  const [salesStats, setSalesStats] = useState({
    totalAmount: 0,
    totalReceived: 0,
    totalBalance: 0
  });
  // Load transactions and stats on component mount
  useEffect(() => {
    // Set demo token for API calls
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', 'demo-jwt-token-for-testing');
    }
    
    loadTransactions();
    loadSalesStats();
    loadCustomers();
  }, []);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const response = await saleAPI.getSales(businessId);
      if (response.success) {
        setTransactions(response.data || []);
      } else {
        setError(response.message || 'Failed to load transactions');
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
      setError('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const loadSalesStats = async () => {
    try {
      const response = await saleAPI.getSaleStats(businessId);
      if (response.success) {
        setSalesStats(response.data || { totalAmount: 0, totalReceived: 0, totalBalance: 0 });
      }
    } catch (error) {
      console.error('Error loading sales stats:', error);
    }
  };

  const loadCustomers = async () => {
    try {
      const response = await saleAPI.getCustomers(businessId);
      if (response.success) {
        setCustomers(response.data || []);
      }
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };
  const [newSale, setNewSale] = useState({
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
    editingId: null  });

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

  // Calculate totals from salesStats
  const totalSales = salesStats.totalAmount;
  const totalReceived = salesStats.totalReceived;
  const totalBalance = salesStats.totalBalance;  // Filter transactions based on all filters
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
  }) : [];
  const handleAddSale = async () => {
    const totalAmount = newSale.items.reduce((sum, item) => sum + item.amount, 0);    const discountAmount = newSale.discountType === '%' 
      ? (totalAmount * parseFloat(newSale.discount || '0')) / 100
      : parseFloat(newSale.discount || '0');
    const finalAmount = totalAmount - discountAmount;
    
    if (!newSale.partyName || finalAmount <= 0) {
      alert('Please fill in party name and add items with valid amounts.');
      return false;
    }    // Filter out empty items
    const validItems = newSale.items.filter(item => 
      item.item && item.item.trim() && 
      parseFloat(item.qty.toString()) > 0 && 
      parseFloat(item.price.toString()) > 0
    );

    if (validItems.length === 0) {
      alert('Please add at least one valid item.');
      return false;
    }

    try {
      setLoading(true);
      setError('');      const saleData: SaleData = {
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
      
      // Check if we're editing or creating new
      if (newSale.editingId) {
        response = await saleAPI.updateSale(businessId, newSale.editingId, saleData);
      } else {
        response = await saleAPI.createSale(businessId, saleData);
      }
      
      if (response.success) {
        setSaleStatus('Saved');
        const message = newSale.editingId ? 'Sale updated successfully!' : 'Sale saved successfully!';
        alert(message);
        // Reload transactions and stats
        await loadTransactions();
        await loadSalesStats();
        return true;
      } else {
        setError(response.message || 'Failed to save sale');
        alert('Error: ' + (response.message || 'Failed to save sale'));
        return false;
      }
    } catch (error) {
      console.error('Error saving sale:', error);
      setError('Failed to save sale');
      alert('Error: Failed to save sale');
      return false;
    } finally {
      setLoading(false);
    }
  };
  const handleSave = async () => {
    await handleAddSale();
  };
  const handleSaveAndClose = async () => {
    const success = await handleAddSale();
    if (success) {
      resetForm();
      setShowSalePage(false);
    }
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

  const updateItem = (id, field, value) => {
    const updatedItems = newSale.items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        
        // If item name is selected from the list, auto-fill price and unit
        if (field === 'item') {
          const selectedItem = itemsList.find(listItem => listItem.name === value);
          if (selectedItem) {
            updatedItem.price = selectedItem.price.toString();
            updatedItem.unit = selectedItem.unit;
            // Recalculate amount if qty exists
            const qty = parseFloat(updatedItem.qty) || 0;
            updatedItem.amount = qty * selectedItem.price;
          }
        }
        
        if (field === 'qty' || field === 'price') {
          const qty = parseFloat(updatedItem.qty) || 0;
          const price = parseFloat(updatedItem.price) || 0;
          updatedItem.amount = qty * price;
        }
        return updatedItem;
      }
      return item;
    });
    setNewSale({...newSale, items: updatedItems});
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
      .map(item => `• ${item.item} - Qty: ${item.qty} ${item.unit} - Price: Rs ${item.price} - Amount: Rs ${item.amount}`)
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
Subtotal: Rs ${totalAmount.toFixed(2)}
${newSale.discount ? `Discount (${newSale.discountType === '%' ? newSale.discount + '%' : 'Rs ' + newSale.discount}): Rs ${discountAmount.toFixed(2)}` : ''}
Total Amount: Rs ${finalAmount.toFixed(2)}

${description ? `\nAdditional Notes:\n${description}` : ''}

Thank you for your business! We appreciate your trust in our services.

Best regards,
Your Business Name`;

    // Pre-fill email data
    setEmailData({
      to: '', // User will fill this
      subject: `Invoice #${transactions.length + 1} - ${newSale.partyName || 'Customer'} - Rs ${finalAmount.toFixed(2)}`,
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
    // Create a print-friendly version
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
                <td style="border: 1px solid #ddd; padding: 12px;">Rs ${item.price || '0'}</td>
                <td style="border: 1px solid #ddd; padding: 12px;">Rs ${item.amount.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div style="text-align: right; margin-bottom: 30px;">
          <p style="font-size: 18px;"><strong>Total Amount: Rs ${calculateTotal().toFixed(2)}</strong></p>
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
    
    const printWindow = window.open('', '_blank');
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

  const handleDuplicateSale = () => {
    alert('Sale duplicated successfully!');
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
        paymentType: 'Credit'
      });
      setDescription('');
      setUploadedImage(null);
      setShowDescription(false);
      setSaleStatus('Draft');
      alert('Sale saved! Ready for new sale.');
    }
  };
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        setImageUploading(true);
        const result = await uploadImageToCloudinary(file);
        
        if (result.success && result.url) {
          setUploadedImage(result.url);
        } else {
          alert('Failed to upload image: ' + (result.error || 'Unknown error'));
        }
      } catch (error) {
        console.error('Image upload error:', error);
        alert('Failed to upload image');
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
  };  const handleDeleteTransaction = async (id) => {
    // Add confirmation dialog
    const confirmed = window.confirm('Are you sure you want to delete this sale? This action cannot be undone.');
    if (!confirmed) return;

    try {
      setLoading(true);
      const response = await saleAPI.deleteSale(businessId, id);
      if (response.success) {
        // Reload transactions and stats
        await loadTransactions();
        await loadSalesStats();
        alert('Sale deleted successfully!');
      } else {
        alert('Error: ' + (response.message || 'Failed to delete sale'));
      }
    } catch (error) {
      console.error('Error deleting sale:', error);
      alert('Error: Failed to delete sale');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Date,Invoice No,Party Name,Transaction,Payment Type,Amount,Balance\n"
      + transactions.map(t => 
          `${t.date},${t.invoiceNo},${t.partyName},${t.transaction},${t.paymentType},${t.amount},${t.balance}`
        ).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "sale_invoices.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };  const handleEditTransaction = async (transaction: any) => {
    try {
      // Load the full transaction details
      const response = await saleAPI.getSaleById(businessId, transaction.id);
      if (response.success) {
        const saleData = response.data;
        
        // The backend already returns parsed data, no need to JSON.parse again
        // saleData.items is already an array of items
        const items = Array.isArray(saleData.items) ? saleData.items : [];
        
        // Convert backend items format to frontend format
        const formattedItems = items.map((item: any, index: number) => ({
          id: index + 1,
          item: item.name || item.item || '',
          qty: item.qty?.toString() || '',
          unit: item.unit || 'NONE',
          price: item.price?.toString() || '',
          amount: item.amount || 0
        }));
        
        // Ensure we have at least 2 items for the form
        while (formattedItems.length < 2) {
          formattedItems.push({
            id: formattedItems.length + 1,
            item: '',
            qty: '',
            unit: 'NONE',
            price: '',
            amount: 0
          });
        }
        
        // Populate the form with existing data including editingId
        setNewSale({
          partyName: saleData.customerName || '',
          phoneNo: saleData.phoneNo || '',
          items: formattedItems,
          discount: saleData.discount || '',
          discountType: saleData.discountType || '%',
          tax: saleData.tax || 'NONE',
          paymentType: saleData.paymentType || 'Credit',
          editingId: transaction.id // Set editing ID in same call
        });
          setDescription(saleData.description || '');
        setUploadedImage(saleData.imageUrl || null); // Load image URL when editing
        setSaleStatus('Draft');
        setShowSalePage(true);
      }
    } catch (error) {
      console.error('Error loading transaction for edit:', error);
      alert('Error loading transaction details');
    }
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

  // Calculate filtered stats
  const filteredStats = {
    totalAmount: filteredTransactions.reduce((sum: number, t: any) => sum + (t.amount || 0), 0),
    totalReceived: filteredTransactions.reduce((sum: number, t: any) => 
      sum + (t.paymentType === 'Cash' ? (t.amount || 0) : 0), 0),
    totalBalance: filteredTransactions.reduce((sum: number, t: any) => 
      sum + (t.paymentType === 'Credit' ? (t.amount || 0) : 0), 0),
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {!showSalePage ? (
        <div className="max-w-7xl mx-auto p-4 md:p-6">          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
              Sale Invoices
              <ChevronDown className="w-5 h-5 text-gray-500" />
            </h1>
            <div className="flex gap-3 ml-auto">              <button
                onClick={() => {
                  resetForm();
                  setShowSalePage(true);
                }}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
                disabled={loading}
              >
                + Add Sale
              </button>
              <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <Settings className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {/* Loading Indicator */}
          {loading && (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
              <span className="ml-2 text-gray-600">Loading...</span>
            </div>
          )}        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <span className="font-medium text-gray-700">Filter by:</span>
            
            {/* Date Filter */}
            <select
              value={filterType}
              onChange={(e) => handleFilterTypeChange(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 min-w-[120px]"
            >
              <option value="All">All Time</option>
              <option value="Today">Today</option>
              <option value="Yesterday">Yesterday</option>
              <option value="This Week">This Week</option>
              <option value="This Month">This Month</option>
              <option value="Last Month">Last Month</option>
              <option value="This Year">This Year</option>
              <option value="Custom">Custom Range</option>
            </select>
            
            {/* Custom Date Range */}
            {(filterType === 'Custom' || dateFrom || dateTo) && (
              <>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2"
                  placeholder="From Date"
                />
                <span className="text-gray-500">To</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2"
                  placeholder="To Date"
                />
              </>
            )}
            
            {/* Payment Type Filter */}
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 min-w-[120px]"
            >
              <option value="All">All Payment Types</option>
              <option value="Cash">Cash</option>
              <option value="Credit">Credit</option>
              <option value="Online">Online</option>
            </select>
            
            {/* Amount Filter */}
            <select
              value={amountFilter}
              onChange={(e) => setAmountFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 min-w-[140px]"
            >
              <option value="All">All Amounts</option>
              <option value="Under 1000">Under Rs 1,000</option>
              <option value="1000-5000">Rs 1,000 - 5,000</option>
              <option value="5000-10000">Rs 5,000 - 10,000</option>
              <option value="Above 10000">Above Rs 10,000</option>
            </select>
          </div>
          
          {/* Filter Summary and Clear */}
          <div className="flex justify-between items-center text-sm">
            <div className="text-gray-600">
              Showing {filteredTransactions.length} of {transactions.length} transactions
              {(searchTerm || filterType !== 'All' || paymentFilter !== 'All' || amountFilter !== 'All') && (
                <span className="ml-2">
                  • Filters applied: 
                  {searchTerm && ` Search`}
                  {filterType !== 'All' && ` Date`}
                  {paymentFilter !== 'All' && ` Payment`}
                  {amountFilter !== 'All' && ` Amount`}
                </span>
              )}
            </div>
            
            {/* Clear Filters Button */}
            {(searchTerm || filterType !== 'All' || paymentFilter !== 'All' || amountFilter !== 'All' || dateFrom || dateTo) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterType('All');
                  setPaymentFilter('All');
                  setAmountFilter('All');
                  setDateFrom('');
                  setDateTo('');
                }}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Clear All Filters
              </button>
            )}
          </div>
        </div>        {/* Stats Card */}
        <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
          {(searchTerm || filterType !== 'All' || paymentFilter !== 'All' || amountFilter !== 'All' || dateFrom || dateTo) ? (
            /* Filtered Stats */
            <>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <div className="text-sm text-gray-600 mb-1">Filtered Sales Amount</div>
                  <div className="text-3xl font-bold text-blue-600">Rs {filteredStats.totalAmount.toLocaleString()}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">Total (All Time)</div>
                  <div className="text-lg font-semibold text-gray-700">Rs {totalSales.toLocaleString()}</div>
                </div>
              </div>
              <div className="flex flex-col md:flex-row gap-6 text-sm text-gray-600">
                <span>Filtered Received: <strong className="text-green-600">Rs {filteredStats.totalReceived.toLocaleString()}</strong></span>
                <span>Filtered Balance: <strong className="text-orange-600">Rs {filteredStats.totalBalance.toLocaleString()}</strong></span>
              </div>
            </>
          ) : (
            /* Overall Stats */
            <>
              <div className="text-sm text-gray-600 mb-2">Total Sales Amount</div>
              <div className="text-3xl font-bold text-gray-900 mb-4">Rs {totalSales.toLocaleString()}</div>
              <div className="flex flex-col md:flex-row gap-6 text-sm text-gray-600">
                <span>Received: <strong className="text-gray-900">Rs {totalReceived.toLocaleString()}</strong></span>
                <span>Balance: <strong className="text-gray-900">Rs {totalBalance.toLocaleString()}</strong></span>
              </div>
            </>
          )}
        </div>

        {/* Transactions Section */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 border-b border-gray-200 gap-4">
            <h2 className="text-lg font-semibold text-gray-900">Transactions</h2>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm w-full md:w-64"
                />
              </div>
              <button
                onClick={handleExport}
                className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                title="Export"
              >
                <BarChart3 className="w-4 h-4 text-gray-600" />
              </button>
              <button
                onClick={handlePrint}
                className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                title="Print"
              >
                <Printer className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Invoice no</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Party Name</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Transaction</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Payment Type</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Amount</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Balance</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{transaction.date}</td>
                    <td className="px-4 py-3">
                      <a href="#" className="text-blue-600 hover:underline font-medium text-sm">
                        {transaction.invoiceNo}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{transaction.partyName}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                        {transaction.transaction}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        transaction.paymentType === 'Cash' 
                          ? 'bg-yellow-100 text-yellow-800'
                          : transaction.paymentType === 'Credit'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {transaction.paymentType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-green-600">
                      Rs {transaction.amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-red-600">
                      Rs {transaction.balance.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          className="p-1 hover:bg-gray-100 rounded transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4 text-gray-600" />
                        </button>
                        <button
                          onClick={() => handleEditTransaction(transaction)}
                          className="p-1 hover:bg-gray-100 rounded transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4 text-gray-600" />
                        </button>                        <button
                          onClick={() => handleDeleteTransaction(transaction.id)}
                          className="p-1 hover:bg-red-100 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredTransactions.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No transactions found matching your search.
            </div>
          )}
        </div>
      </div>
      ) : (
        /* Sale Form Page */
        <div className="max-w-6xl mx-auto p-4 md:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center gap-4">              <button
                onClick={() => {
                  resetForm();
                  setShowSalePage(false);
                }}
                className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 transition-colors"
                title="Back to Sales List"
              >
                <span className="text-xl text-gray-600">←</span>
              </button>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold text-gray-900">
                  {newSale.editingId ? `Edit Sale` : `Sale #${transactions.length + 1}`}
                </h1>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  saleStatus === 'Draft' ? 'bg-yellow-100 text-yellow-800' :
                  saleStatus === 'Saved' ? 'bg-green-100 text-green-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {saleStatus}
                </span>
              </div>
              <button 
                onClick={handleDuplicateSale}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 hover:bg-blue-100 transition-colors"
                title="Duplicate Sale"
              >
                <span className="text-blue-600 text-lg">+</span>
              </button>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <button 
                onClick={handlePrintInvoice}
                className="hidden sm:flex px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors items-center gap-1"
                title="Print Invoice"
              >
                <Printer className="w-4 h-4" />
                <span className="hidden md:inline">Print</span>
              </button>
              <button 
                onClick={handleEmailInvoice}
                className="hidden sm:flex px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors items-center gap-1"
                title="Email Invoice"
              >
                <span>📧</span>
                <span className="hidden md:inline">Email</span>
              </button>
              
              {/* Mobile Menu Button */}
              <div className="relative sm:hidden">
                <button 
                  className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  onClick={() => setShowMobileMenu(!showMobileMenu)}
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
                {showMobileMenu && (
                  <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-10 min-w-[120px]">
                    <button 
                      onClick={() => {
                        handlePrintInvoice();
                        setShowMobileMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Printer className="w-4 h-4" />
                      Print
                    </button>
                    <button 
                      onClick={() => {
                        handleEmailInvoice();
                        setShowMobileMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                    >
                      📧 Email
                    </button>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <button 
                  className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 transition-colors"
                  title="Settings"
                >
                  <Settings className="w-4 h-4 text-gray-600" />
                </button>
                <div className="relative">
                  <button 
                    className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 transition-colors"
                    title="Notifications"
                  >
                    <span className="text-gray-600">🔔</span>
                  </button>
                  <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    0
                  </div>
                </div>                <button
                  onClick={() => {
                    resetForm();
                    setShowSalePage(false);
                  }}
                  className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 transition-colors ml-2"
                  title="Close"
                >
                  <span className="text-xl text-gray-600">×</span>
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            {/* Sale Type Toggle */}
            <div className="flex items-center gap-4 mb-6">
              <span className="font-medium text-gray-900">Sale</span>
              <div className="flex items-center bg-gray-100 rounded-full p-1">
                <button
                  onClick={() => setNewSale({...newSale, paymentType: 'Credit'})}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    newSale.paymentType === 'Credit' 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Credit
                </button>
                <button
                  onClick={() => setNewSale({...newSale, paymentType: 'Cash'})}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    newSale.paymentType === 'Cash' 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Cash
                </button>
              </div>
            </div>            {/* Customer Details */}
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              <div className="relative">                <input
                  type="text"
                  placeholder="Search by Name/Phone *"
                  value={newSale.partyName}
                  onChange={(e) => {
                    setNewSale({...newSale, partyName: e.target.value});
                    setShowCustomerSuggestions(true);
                  }}
                  onFocus={() => setShowCustomerSuggestions(true)}
                  onClick={() => setShowCustomerSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowCustomerSuggestions(false), 200)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                
                {/* Customer Suggestions Dropdown */}
                {showCustomerSuggestions && customers.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {customers
                      .filter((customer: any) => 
                        newSale.partyName === '' || 
                        customer.name.toLowerCase().includes(newSale.partyName.toLowerCase()) ||
                        (customer.phone && customer.phone.includes(newSale.partyName))
                      )
                      .map((customer: any, index: number) => (
                        <div
                          key={index}
                          onClick={() => {
                            setNewSale({
                              ...newSale, 
                              partyName: customer.name,
                              phoneNo: customer.phone || ''
                            });
                            setShowCustomerSuggestions(false);
                          }}
                          className="px-3 py-2 cursor-pointer hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-gray-900">{customer.name}</div>
                          {customer.phone && (
                            <div className="text-sm text-gray-600">{customer.phone}</div>
                          )}                        </div>
                      ))
                    }
                  </div>
                )}
              </div>
              <input
                type="text"
                placeholder="Phone No."
                value={newSale.phoneNo}
                onChange={(e) => setNewSale({...newSale, phoneNo: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="text-right md:col-start-2">
                <div className="text-sm text-gray-600 mb-1">Invoice Number</div>
                <div className="font-semibold">{transactions.length + 1}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600 mb-1">Invoice Date</div>
                <div className="font-semibold">{new Date().toLocaleDateString('en-GB')}</div>
              </div>
            </div>

            {/* Items Table */}
            <div className="overflow-x-auto mb-6">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 font-medium text-gray-700 w-8">#</th>
                    <th className="text-left py-3 font-medium text-gray-700">ITEM</th>
                    <th className="text-left py-3 font-medium text-gray-700 w-20">QTY</th>
                    <th className="text-left py-3 font-medium text-gray-700 w-32">UNIT</th>
                    <th className="text-left py-3 font-medium text-gray-700 w-32">PRICE/UNIT</th>
                    <th className="text-left py-3 font-medium text-gray-700 w-32">AMOUNT</th>
                    <th className="text-left py-3 font-medium text-gray-700 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {newSale.items.map((item, index) => (
                    <tr key={item.id} className="border-b border-gray-100">
                      <td className="py-3">{index + 1}</td>
                      <td className="py-3">
                        <input
                          type="text"
                          value={item.item}
                          onChange={(e) => updateItem(item.id, 'item', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="Enter item name..."
                        />
                      </td>
                      <td className="py-3">
                        <input
                          type="number"
                          value={item.qty}
                          onChange={(e) => updateItem(item.id, 'qty', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="py-3">
                        <select
                          value={item.unit}
                          onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="NONE">NONE</option>
                          <option value="KG">KG</option>
                          <option value="PCS">PCS</option>
                          <option value="BOX">BOX</option>
                        </select>
                      </td>
                      <td className="py-3">
                        <input
                          type="number"
                          value={item.price}
                          onChange={(e) => updateItem(item.id, 'price', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="py-3">
                        <span className="text-gray-900">{item.amount.toFixed(2)}</span>
                      </td>
                      <td className="py-3">
                        <button className="text-blue-600 hover:text-blue-700">
                          +
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              onClick={addNewRow}
              className="text-blue-600 hover:text-blue-700 font-medium mb-6"
            >
              ADD ROW
            </button>

            {/* Total Section */}
            <div className="flex justify-end mb-6">
              <div className="w-80">
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="font-medium">TOTAL</span>
                  <span className="font-medium">{calculateTotal().toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Additional Options */}
            <div className="space-y-4 mb-6">
              <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                <button 
                  onClick={() => setShowDescription(!showDescription)}
                  className={`flex items-center justify-center sm:justify-start gap-2 px-4 py-2 border rounded-lg transition-all duration-200 ${
                    showDescription 
                      ? 'border-blue-500 bg-blue-50 text-blue-700' 
                      : 'border-gray-300 text-gray-600 hover:border-gray-400 hover:bg-gray-50'
                  }`}
                >
                  <span>📝</span>
                  <span className="font-medium">
                    {showDescription ? 'Hide Description' : 'Add Description'}
                  </span>
                </button>
                
                <div className="relative">                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    id="imageUpload"
                    disabled={imageUploading}
                  />
                  <label
                    htmlFor="imageUpload"
                    className={`flex items-center justify-center sm:justify-start gap-2 px-4 py-2 border rounded-lg cursor-pointer transition-all duration-200 ${
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
                </div>

                {uploadedImage && (
                  <button
                    onClick={removeImage}
                    className="flex items-center justify-center sm:justify-start gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-all duration-200"
                  >
                    <span>🗑️</span>
                    <span className="font-medium">Remove Image</span>
                  </button>
                )}
              </div>

              {/* Description Textarea */}
              {showDescription && (
                <div className="animate-in slide-in-from-top duration-300">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description / Notes
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add any additional notes or description for this sale..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={3}
                  />
                </div>
              )}

              {/* Image Preview */}
              {uploadedImage && (
                <div className="animate-in slide-in-from-top duration-300">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Uploaded Image
                  </label>
                  <div className="relative inline-block">
                    <img
                      src={uploadedImage}
                      alt="Uploaded preview"
                      className="max-w-full sm:max-w-xs max-h-32 object-cover border border-gray-300 rounded-lg shadow-sm"
                    />
                    <button
                      onClick={removeImage}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 transition-colors"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Discount and Tax */}
            <div className="flex flex-wrap gap-4 items-end mb-8">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Discount</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={newSale.discount}
                    onChange={(e) => setNewSale({...newSale, discount: e.target.value})}
                    className="w-24 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <select
                    value={newSale.discountType}
                    onChange={(e) => setNewSale({...newSale, discountType: e.target.value})}
                    className="px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="%">%</option>
                    <option value="Rs">(Rs)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Tax</label>
                <select
                  value={newSale.tax}
                  onChange={(e) => setNewSale({...newSale, tax: e.target.value})}
                  className="px-3 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="NONE">NONE</option>
                  <option value="GST">GST</option>
                  <option value="VAT">VAT</option>
                </select>
              </div>
              <div className="ml-auto">
                <span className="text-2xl font-bold">{calculateTotal().toFixed(0)}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-end gap-3">
              <button 
                onClick={() => setShowSalePage(false)}
                className="w-full sm:w-auto px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors order-2 sm:order-1"
              >
                Cancel
              </button>
              <button className="w-full sm:w-auto px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors order-3 sm:order-2">
                Share
              </button>
              <button
                onClick={handleSaveAndNew}
                className="w-full sm:w-auto px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors order-4 sm:order-3"
              >
                Save & New
              </button>              <button
                onClick={handleSave}
                disabled={loading}
                className={`w-full sm:w-auto px-6 py-2 rounded-lg transition-colors order-1 sm:order-4 ${
                  saleStatus === 'Saved' 
                    ? 'bg-green-600 text-white hover:bg-green-700' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {loading ? (newSale.editingId ? 'Updating...' : 'Saving...') : 
                 saleStatus === 'Saved' ? 'Saved ✓' : 
                 newSale.editingId ? 'Update' : 'Save'}
              </button>
              <button
                onClick={handleSaveAndClose}
                disabled={loading}
                className={`w-full sm:w-auto px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors order-5 sm:order-5 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {newSale.editingId ? 'Update & Close' : 'Save & Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Email Invoice</h3>
              <button
                onClick={() => setShowEmailModal(false)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  To Email Address *
                </label>
                <input
                  type="email"
                  value={emailData.to}
                  onChange={(e) => setEmailData({...emailData, to: e.target.value})}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                    emailData.to && !isValidEmail(emailData.to) 
                      ? 'border-red-300 focus:ring-red-500' 
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
                  placeholder="customer@example.com"
                  required
                />
                {emailData.to && !isValidEmail(emailData.to) && (
                  <p className="text-red-500 text-sm mt-1">Please enter a valid email address</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  value={emailData.subject}
                  onChange={(e) => setEmailData({...emailData, subject: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message
                </label>
                <textarea
                  value={emailData.message}
                  onChange={(e) => setEmailData({...emailData, message: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={4}
                />
              </div>
              
              <div className="bg-gray-50 p-3 rounded-md">
                <p className="text-sm text-gray-600 mb-1">
                  <strong>Invoice Details:</strong>
                </p>                <p className="text-sm text-gray-600">
                  Invoice #{transactions.length + 1} • {newSale.partyName || 'Customer'} • Rs {calculateTotal().toFixed(2)}
                </p>
              </div>
              
              <div className="bg-blue-50 p-3 rounded-md">
                <p className="text-sm text-blue-600">
                  📧 Clicking "Send Email" will open your default email application with all the details pre-filled.
                </p>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowEmailModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>              <button
                onClick={handleSendEmail}
                disabled={!emailData.to || !isValidEmail(emailData.to)}
                className={`flex-1 px-4 py-2 rounded-md transition-colors ${
                  !emailData.to || !isValidEmail(emailData.to)
                    ? 'bg-gray-400 text-white cursor-not-allowed' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Send Email
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SaleInvoicesPage;