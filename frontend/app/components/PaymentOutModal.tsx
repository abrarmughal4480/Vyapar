"use client"

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { makePayment, getPurchasesByUser, makeBulkPaymentToParty, editPaymentOut } from '@/http/purchases';
import Toast from './Toast';
import { fetchPartiesByUserId, getPartyBalance } from '@/http/parties';
import { Settings } from 'lucide-react';
import { jwtDecode } from 'jwt-decode';
import { useBankAccounts } from '../hooks/useBankAccounts';

interface PaymentOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  partyName: string;
  total: number;
  dueBalance: number;
  paidAmount?: number; // Add paid amount prop for edit mode
  purchaseId?: string; // Made optional for party payments
  paymentId?: string; // Add payment ID for edit mode
  onSave?: (data: any) => void;
  showDiscount?: boolean; // New prop to control discount field visibility
  showPartyBalance?: boolean; // New prop to control party balance display
  showRemainingAmount?: boolean; // New prop to control remaining amount display
  isEditMode?: boolean; // New prop to enable edit mode
}

const getPaymentTypeOptions = (bankAccounts: any[]) => [
  { value: 'Cash', label: 'Cash' },
  { value: 'Cheque', label: 'Cheque' },
  ...bankAccounts.map(bank => ({
    value: `bank_${bank._id}`,
    label: bank.accountDisplayName
  }))
];

function PaymentTypeDropdown({ value, onChange, bankAccounts }: { value: string; onChange: (val: string) => void; bankAccounts: any[] }) {
  const [open, setOpen] = useState(false);
  const btnRef = React.useRef<HTMLButtonElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!btnRef.current) return;
      if (!(event.target instanceof Node)) return;
      if (!btnRef.current.contains(event.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  React.useEffect(() => {
    if (open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: 'absolute',
        top: rect.bottom + window.scrollY + 6,
        left: rect.left + window.scrollX,
        width: rect.width,
        zIndex: 1000,
        maxHeight: '12rem',
        overflowY: 'auto',
      });
    }
  }, [open]);

  return (
    <div style={{ position: 'relative' }}>
      <button
        ref={btnRef}
        type="button"
        className="w-full px-4 py-2.5 rounded-full bg-white/80 shadow border border-gray-200 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all group flex items-center justify-between"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open ? 'true' : 'false'}
        style={{ fontWeight: 500, fontSize: 15, minHeight: 44 }}
      >
        <span className="truncate">{getPaymentTypeOptions(bankAccounts).find((o) => o.value === value)?.label || 'Select'}</span>
        <svg className={`w-5 h-5 ml-2 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
      </button>
      {open && (
        <ul
          className="absolute z-[9999] bg-white rounded-xl shadow-lg border border-gray-100 py-1 max-h-60 overflow-auto animate-fadeinup"
          style={{
            top: '110%',
            left: 0,
            width: '100%',
            position: 'absolute',
          }}
          tabIndex={-1}
          role="listbox"
        >
          {getPaymentTypeOptions(bankAccounts).map((opt) => (
            <li
              key={opt.value}
              className={`px-4 py-2 cursor-pointer rounded-lg transition-all hover:bg-blue-50 ${value === opt.value ? 'font-semibold text-blue-600' : 'text-gray-700'}`}
              onMouseDown={e => { e.preventDefault(); onChange(opt.value); setOpen(false); }}
              role="option"
              aria-selected={value === opt.value}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const PaymentOutModal: React.FC<PaymentOutModalProps> = ({ isOpen, onClose, partyName: initialPartyName, total, dueBalance, paidAmount: initialPaidAmount, purchaseId, paymentId, onSave, showDiscount = true, showPartyBalance = true, showRemainingAmount = true, isEditMode = false }) => {
  const [paymentType, setPaymentType] = useState('Cash');
  const { bankAccounts } = useBankAccounts();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paidAmount, setPaidAmount] = useState('');
  const [discount, setDiscount] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'pkr'>('pkr');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string>('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [partySearch, setPartySearch] = useState(initialPartyName || '');
  const [partySuggestions, setPartySuggestions] = useState<any[]>([]);
  const [showPartyDropdown, setShowPartyDropdown] = useState(false);
  const [selectedParty, setSelectedParty] = useState<any>(null);
  const partyInputRef = React.useRef<HTMLInputElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{top: number, left: number, width: number}>({top: 0, left: 0, width: 0});
  const [partyDropdownIndex, setPartyDropdownIndex] = useState(-1);
  const [showSettings, setShowSettings] = useState(false);
  const [partyTotal, setPartyTotal] = useState(0);
  const [partyDueBalance, setPartyDueBalance] = useState(0);
  const [partyOpeningBalance, setPartyOpeningBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Function to fetch party opening balance
  const fetchPartyBalance = async (partyName: string) => {
    if (!partyName) {
      setPartyOpeningBalance(0);
      return;
    }

    try {
      const token = (typeof window !== 'undefined' && (localStorage.getItem('token') || localStorage.getItem('vypar_auth_token'))) || '';
      if (!token) return;

      // Get party balance data which includes opening balance
      const party = await fetchPartiesByUserId(token);
      if (party && party.success && Array.isArray(party.data)) {
        const selectedPartyData = party.data.find((p: any) => 
          p.name?.toLowerCase() === partyName.toLowerCase()
        );
        if (selectedPartyData && selectedPartyData._id) {
          const balanceData = await getPartyBalance(selectedPartyData._id, token);
          if (balanceData && balanceData.success) {
            setPartyOpeningBalance(balanceData.data.openingBalance || 0);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching party opening balance:', err);
      setPartyOpeningBalance(0);
    }
  };

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Sync partySearch with initialPartyName every time modal opens or initialPartyName changes
  useEffect(() => {
    if (isOpen) {
      setPartySearch(initialPartyName || '');
      // If initialPartyName is provided, set it as selected party
      if (initialPartyName) {
        setSelectedParty({ name: initialPartyName, _id: 'temp' });
        fetchPartyBalance(initialPartyName);
      } else {
        setSelectedParty(null);
      }
      // Pre-fill paid amount with initial paid amount or due balance
      if (initialPaidAmount && initialPaidAmount > 0) {
        setPaidAmount(initialPaidAmount.toString());
      } else if (dueBalance && dueBalance > 0) {
        setPaidAmount(dueBalance.toString());
      }
      // Reset date to current when modal opens (only for new payments)
      if (!isEditMode) {
        const now = new Date();
        setDate(now.toISOString().slice(0, 10));
      }
    }
  }, [isOpen, initialPartyName, dueBalance, initialPaidAmount, isEditMode]);

  // Handle edit mode - set date from existing payment data
  useEffect(() => {
    if (isEditMode && isOpen) {
      // For edit mode, we should get the payment data from the backend
      // For now, we'll use the current date, but this should be updated
      // when we have the actual payment data
      const now = new Date();
      setDate(now.toISOString().slice(0, 10));
    }
  }, [isEditMode, isOpen]);

  // Fetch supplier parties for suggestions
  useEffect(() => {
    if (!isOpen) return;
    const fetchParties = async () => {
      const token = (typeof window !== 'undefined' && (localStorage.getItem('token') || localStorage.getItem('vypar_auth_token'))) || '';
      if (!token) return;
      try {
        const res = await fetchPartiesByUserId(token);
        if (res && res.success && Array.isArray(res.data)) {
          setPartySuggestions(res.data); // <-- Show all parties, no filter
        } else {
          setPartySuggestions([]);
        }
      } catch (err) {
        setPartySuggestions([]);
      }
    };
    fetchParties();
  }, [isOpen]);

  const filteredPartySuggestions = partySuggestions.filter(p =>
    !partySearch || p.name.toLowerCase().includes(partySearch.toLowerCase())
  );

  useEffect(() => {
    if (showPartyDropdown && partyInputRef.current) partyInputRef.current.focus();
  }, [showPartyDropdown]);

  useEffect(() => {
    if (showPartyDropdown && partyInputRef.current) {
      const rect = partyInputRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  }, [showPartyDropdown]);

  useEffect(() => {
    if (showPartyDropdown) setPartyDropdownIndex(0);
  }, [showPartyDropdown, partySearch]);

  // Fetch party balance when selectedParty changes
  useEffect(() => {
    if (selectedParty?.name) {
      fetchPartyBalance(selectedParty.name);
    } else {
      setPartyOpeningBalance(0);
    }
  }, [selectedParty]);

  if (!isOpen) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setImage(file);
    setImageName(file ? file.name : '');
    if (file) {
      setImagePreview(URL.createObjectURL(file));
    } else {
      setImagePreview(null);
    }
  };

  const handleRemoveImage = () => {
    setImage(null);
    setImagePreview(null);
    setImageName('');
  };

  const handleSave = async () => {
    // Prevent multiple clicks
    if (isLoading) return;
    
    const amount = parseFloat(paidAmount) || 0;
    const discountAmount = parseFloat(discount) || 0;
    
    if (!selectedParty) {
      setToast({ message: 'Please select a party', type: 'error' });
      return;
    }
    
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('vypar_auth_token') || '';
      let result;
      
      if (isEditMode && paymentId) {
        // Edit existing payment
        const paymentData = {
          supplierName: selectedParty.name,
          amount: amount,
          paymentType,
          paymentDate: date, // Use only date
          description: `Payment edited for ${selectedParty.name}`,
          imageUrl: imagePreview || '',
          discount: discountAmount > 0 ? discountAmount : 0,
          discountType: discountAmount > 0 ? (discountType === 'percentage' ? '%' : 'PKR') : 'PKR'
        };
        
        result = await editPaymentOut(paymentId, paymentData, token);
      } else if (purchaseId) {
        // Use individual purchase payment (updates specific purchase and party balance)
        const paymentData = {
          purchaseId: purchaseId,
          amount: amount,
          paymentType,
          paymentDate: date, // Use only date
          description: `Payment for ${selectedParty.name}`,
          imageUrl: imagePreview || ''
        };
        
        result = await makePayment(paymentData, token);
      } else {
        // Use bulk party payment (updates party balance only)
        const paymentData = {
          supplierName: selectedParty.name,
          amount: amount,
          discount: discountAmount > 0 ? discountAmount : undefined,
          discountType: discountAmount > 0 ? (discountType === 'percentage' ? '%' : 'PKR') : undefined,
          paymentType,
          paymentDate: date, // Use only date
          description: `Payment for ${selectedParty.name}`,
          imageUrl: imagePreview || ''
        };
        
        result = await makeBulkPaymentToParty(paymentData, token);
      }
      
      if (result && result.success) {
        let message = isEditMode ? `Payment and purchase bill updated for ${selectedParty.name}!` : `Payment made to ${selectedParty.name}!`;
        if (discountAmount > 0) {
          message += ` (${discountType === 'percentage' ? discountAmount + '%' : 'PKR ' + discountAmount} discount)`;
        }
        
        setToast({ message, type: 'success' });
        if (onSave) onSave({ 
          partyName: selectedParty.name, 
          paymentType, 
          date, 
          paidAmount: amount, 
          discount: discountAmount,
          discountType,
          image,
          purchaseId
        });
        onClose();
      } else {
        setToast({ message: result?.message || 'Payment failed', type: 'error' });
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      setToast({ message: err?.message || 'Payment failed', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 32,
        overflow: 'auto',
      }}>
      <div style={{
        background: 'white',
        borderRadius: 18,
        boxShadow: '0 10px 40px rgba(0,0,0,0.18)',
        width: 900,
        maxWidth: '100%',
        maxHeight: '90vh',
        padding: 0,
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Fixed Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: '32px 40px 24px 40px',
          background: 'white',
          zIndex: 10,
          borderBottom: '1px solid #f1f5f9',
          flexShrink: 0
        }}>
          <div>
            <h2 style={{ fontSize: 26, fontWeight: 700, color: '#1e293b', letterSpacing: '-0.5px', margin: 0 }}>
              {isEditMode ? 'Edit Payment' : (purchaseId ? 'Make Payment' : 'Make Party Payment')}
            </h2>
            <p style={{ fontSize: 14, color: '#64748b', marginTop: 4, margin: 0 }}>
              {isEditMode ? 'Edit existing payment details' : (purchaseId ? 'Payment for specific purchase' : 'Payment will be applied to party balance')}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button onClick={() => setShowSettings(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 26, marginRight: 8 }} title="Settings">
              <Settings size={26} />
            </button>
            <button onClick={onClose} style={{ fontSize: 28, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>✕</button>
          </div>
        </div>
        
        {/* Scrollable Body */}
        <div style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: '32px 40px 0 40px',
          minHeight: 0
        }}>
          <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap' }}>
            {/* Left Side */}
            <div style={{ flex: 1, minWidth: 240 }}>
              {/* Party selection field with live suggestions */}
              <div className="mb-4" style={{ position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label className="block text-gray-700 font-medium">Party</label>
                  {showPartyBalance && selectedParty && partyOpeningBalance !== 0 && (
                    <div style={{ 
                      fontSize: 14, 
                      fontWeight: 600, 
                      color: partyOpeningBalance >= 0 ? '#059669' : '#dc2626',
                      background: partyOpeningBalance >= 0 ? '#f0fdf4' : '#fef2f2',
                      padding: '4px 8px',
                      borderRadius: 6,
                      border: `1px solid ${partyOpeningBalance >= 0 ? '#bbf7d0' : '#fecaca'}`
                    }}>
                      Balance: PKR {partyOpeningBalance.toLocaleString()}
                    </div>
                  )}
                </div>
                <input
                  ref={partyInputRef}
                  type="text"
                  value={selectedParty ? selectedParty.name : partySearch}
                  onChange={e => { 
                    setPartySearch(e.target.value); 
                    setShowPartyDropdown(true);
                    // Clear selected party when typing
                    if (selectedParty && e.target.value !== selectedParty.name) {
                      setSelectedParty(null);
                    }
                  }}
                  onFocus={() => setShowPartyDropdown(true)}
                  onBlur={() => setTimeout(() => setShowPartyDropdown(false), 200)}
                  placeholder="Search or select supplier..."
                  className="w-full px-4 py-3 border-2 border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500 transition-all"
                  autoComplete="off"
                  onKeyDown={e => {
                    if (!showPartyDropdown) return;
                    if (e.key === 'ArrowDown') {
                      setPartyDropdownIndex(i => Math.min(i + 1, filteredPartySuggestions.length - 1));
                    } else if (e.key === 'ArrowUp') {
                      setPartyDropdownIndex(i => Math.max(i - 1, 0));
                    } else if (e.key === 'Enter') {
                      if (filteredPartySuggestions[partyDropdownIndex]) {
                        const selectedPartyFromList = filteredPartySuggestions[partyDropdownIndex];
                        setSelectedParty(selectedPartyFromList);
                        setPartySearch(selectedPartyFromList.name);
                        setShowPartyDropdown(false);
                        fetchPartyBalance(selectedPartyFromList.name);
                      }
                    } else if (e.key === 'Escape') {
                      setShowPartyDropdown(false);
                    }
                  }}
                />
              </div>
              {/* Render dropdown in portal for robust positioning */}
              {showPartyDropdown && filteredPartySuggestions.length > 0 && ReactDOM.createPortal(
                <ul
                  className="absolute z-[9999] bg-white rounded-xl shadow-lg border border-gray-100 py-1 max-h-60 overflow-auto animate-fadeinup"
                  style={{
                    top: dropdownPos.top,
                    left: dropdownPos.left,
                    width: dropdownPos.width,
                    position: 'absolute',
                  }}
                  tabIndex={-1}
                  role="listbox"
                >
                  {filteredPartySuggestions.map((party, idx) => (
                    <li
                      key={party._id}
                      className={`px-4 py-2 cursor-pointer rounded-lg transition-all ${partyDropdownIndex === idx ? 'bg-blue-100 text-blue-700 font-semibold' : 'hover:bg-blue-50 text-gray-700'}`}
                      onMouseDown={e => {
                        e.preventDefault();
                        setSelectedParty(party);
                        setPartySearch(party.name);
                        setShowPartyDropdown(false);
                        fetchPartyBalance(party.name);
                      }}
                      role="option"
                      aria-selected={partyDropdownIndex === idx}
                      ref={el => {
                        if (partyDropdownIndex === idx && el) el.scrollIntoView({ block: 'nearest' });
                      }}
                    >
                      {party.name}
                    </li>
                  ))}
                </ul>,
                document.body
              )}
              <div style={{ marginBottom: 22, position: 'relative' }}>
                <label style={{ display: 'block', fontSize: 15, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Payment Type</label>
                <PaymentTypeDropdown value={paymentType} onChange={setPaymentType} bankAccounts={bankAccounts} />
              </div>
              <div style={{ marginBottom: 22 }}>
                <label style={{ display: 'block', fontSize: 15, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Date</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: '100%', padding: 12, border: '1.5px solid #e2e8f0', borderRadius: 8, background: '#fff', color: '#334155', fontSize: 15, fontWeight: 500 }} />
              </div>
              <div style={{ marginBottom: 22 }}>
                <label style={{ display: 'block', fontSize: 15, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Add Image (Proof/Receipt)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <label style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '10px 18px',
                    background: '#f1f5f9',
                    color: '#2563eb',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: 8,
                    fontWeight: 600,
                    fontSize: 15,
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}>
                    <span style={{ fontSize: 18, marginRight: 8 }}>📷</span> Choose Image
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      style={{ display: 'none' }}
                    />
                  </label>
                  {imageName && (
                    <span style={{ color: '#334155', fontSize: 14, fontWeight: 500, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{imageName}</span>
                  )}
                  {image && (
                    <button onClick={handleRemoveImage} style={{ marginLeft: 4, background: 'none', border: 'none', color: '#e11d48', fontSize: 20, cursor: 'pointer', lineHeight: 1 }} title="Remove image">✕</button>
                  )}
                </div>
                {imagePreview && (
                  <div style={{ marginTop: 12, position: 'relative', display: 'inline-block' }}>
                    <img src={imagePreview} alt="Proof" style={{ maxHeight: 90, borderRadius: 8, border: '1.5px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }} />
                  </div>
                )}
              </div>
            </div>
            {/* Right Side */}
            <div style={{ flex: 1, minWidth: 240, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            </div>
          </div>
          <div style={{ padding: '0 40px 24px 40px', marginTop: 32 }}>
            <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap' }}>
              {/* Left Side - Empty for spacing */}
              <div style={{ flex: 1, minWidth: 240 }}></div>
              {/* Right Side - Amount field */}
              <div style={{ flex: 1, minWidth: 240, marginTop: -48 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontSize: 15, fontWeight: 600, color: '#334155' }}>Paid Amount</label>
                  {showRemainingAmount && (
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#059669' }}>Remaining: PKR {Math.max(0, (dueBalance || 0) - (parseFloat(paidAmount) || 0))}</span>
                  )}
                </div>
                <input type="number" value={paidAmount} onChange={e => setPaidAmount(e.target.value)} style={{ width: '100%', padding: 12, border: '1.5px solid #e2e8f0', borderRadius: 8, background: '#fff', color: '#334155', fontSize: 15, fontWeight: 500 }} placeholder="Enter amount paid" />
                
                {/* Discount Field */}
                {showDiscount && (
                  <div style={{ marginTop: 8 }}>
                    <label style={{ display: 'block', fontSize: 15, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Discount</label>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input 
                        type="number" 
                        value={discount} 
                        onChange={e => setDiscount(e.target.value)} 
                        style={{ 
                          flex: 1, 
                          padding: 12, 
                          border: '1.5px solid #e2e8f0', 
                          borderRadius: 8, 
                          background: '#fff', 
                          color: '#334155', 
                          fontSize: 15, 
                          fontWeight: 500 
                        }} 
                        placeholder="Enter discount" 
                      />
                      <select 
                        value={discountType} 
                        onChange={e => setDiscountType(e.target.value as 'percentage' | 'pkr')}
                        style={{ 
                          padding: 12, 
                          border: '1.5px solid #e2e8f0', 
                          borderRadius: 8, 
                          background: '#fff', 
                          color: '#334155', 
                          fontSize: 15, 
                          fontWeight: 500,
                          minWidth: 80
                        }}
                      >
                        <option value="pkr">PKR</option>
                        <option value="percentage">%</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
           <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 40px 32px 40px' }}>
             <button 
               onClick={onClose} 
               disabled={isLoading}
               style={{ 
                 padding: '12px 24px', 
                 border: '1.5px solid #e2e8f0', 
                 borderRadius: 8, 
                 background: isLoading ? '#f8fafc' : '#f1f5f9', 
                 color: isLoading ? '#94a3b8' : '#334155', 
                 marginRight: 14, 
                 fontWeight: 600, 
                 fontSize: 15, 
                 cursor: isLoading ? 'not-allowed' : 'pointer', 
                 transition: 'background 0.2s',
                 opacity: isLoading ? 0.6 : 1
               }}
             >
               Cancel
             </button>
             <button 
               onClick={handleSave} 
               disabled={isLoading}
               style={{ 
                 padding: '12px 32px', 
                 borderRadius: 8, 
                 background: isLoading ? '#94a3b8' : '#2563eb', 
                 color: 'white', 
                 fontWeight: 700, 
                 border: 'none', 
                 fontSize: 15, 
                 cursor: isLoading ? 'not-allowed' : 'pointer', 
                 transition: 'background 0.2s',
                 opacity: isLoading ? 0.8 : 1,
                 display: 'flex',
                 alignItems: 'center',
                 gap: 8
               }}
             >
               {isLoading && (
                 <div style={{
                   width: 16,
                   height: 16,
                   border: '2px solid transparent',
                   borderTop: '2px solid white',
                   borderRadius: '50%',
                   animation: 'spin 1s linear infinite'
                 }} />
               )}
               {isLoading ? 'Saving...' : (isEditMode ? 'Update Payment' : 'Save')}
             </button>
           </div>
        </div>
        {/* Settings Drawer */}
        {showSettings && (
          <div style={{
            width: 340,
            background: '#f8fafc',
            borderLeft: '1.5px solid #e2e8f0',
            height: '100%',
            position: 'absolute',
            right: 0,
            top: 0,
            zIndex: 10000,
            boxShadow: '-2px 0 12px rgba(0,0,0,0.04)',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 24px 0 24px' }}>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b' }}>Settings</h3>
              <button onClick={() => setShowSettings(false)} style={{ fontSize: 24, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>✕</button>
            </div>
            <div style={{ padding: 24, color: '#334155', fontSize: 16 }}>
              Add your settings here...
            </div>
          </div>
        )}
      </div>
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
    </>
  );
};

export default PaymentOutModal; 