"use client"

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { makePayment, getPurchasesByUser, makeBulkPaymentToParty } from '@/http/purchases';
import Toast from './Toast';
import { fetchPartiesByUserId } from '@/http/parties';
import { Settings } from 'lucide-react';
import { jwtDecode } from 'jwt-decode';

interface PaymentOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  partyName: string;
  total: number;
  dueBalance: number;
  purchaseId?: string; // Made optional for party payments
  onSave?: (data: any) => void;
  showDiscount?: boolean; // New prop to control discount field visibility
}

const paymentTypeOptions = [
  { value: 'Cash', label: 'Cash' },
  { value: 'Cheque', label: 'Cheque' },
];

function PaymentTypeDropdown({ value, onChange }: { value: string; onChange: (val: string) => void }) {
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
        <span className="truncate">{paymentTypeOptions.find((o) => o.value === value)?.label || 'Select'}</span>
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
          {paymentTypeOptions.map((opt) => (
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

const PaymentOutModal: React.FC<PaymentOutModalProps> = ({ isOpen, onClose, partyName: initialPartyName, total, dueBalance, purchaseId, onSave, showDiscount = true }) => {
  const [paymentType, setPaymentType] = useState('Cash');
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

  // Function to fetch and calculate party totals
  const fetchPartyTotals = async (partyName: string) => {
    if (!partyName) {
      setPartyTotal(0);
      setPartyDueBalance(0);
      return;
    }

    try {
      const token = (typeof window !== 'undefined' && (localStorage.getItem('token') || localStorage.getItem('vypar_auth_token'))) || '';
      if (!token) return;

      // Get userId from token
      let userId = '';
      try {
        const decoded: any = jwtDecode(token);
        userId = decoded.userId || decoded._id || decoded.id || '';
      } catch (e) {
        console.error('JWT decode error:', e);
        return;
      }

      if (!userId) return;

      // Fetch all purchases for this user
      const result = await getPurchasesByUser(userId, token);
      if (result && result.success && Array.isArray(result.purchases)) {
        // Filter purchases for the selected party
        const partyPurchases = result.purchases.filter((purchase: any) => 
          purchase.supplierName?.toLowerCase() === partyName.toLowerCase()
        );

        // Calculate totals
        const totalGrandTotal = partyPurchases.reduce((sum: number, purchase: any) => 
          sum + (typeof purchase.grandTotal === 'number' ? purchase.grandTotal : 0), 0
        );
        
        const totalDueBalance = partyPurchases.reduce((sum: number, purchase: any) => 
          sum + (typeof purchase.balance === 'number' ? purchase.balance : 0), 0
        );

        setPartyTotal(totalGrandTotal);
        setPartyDueBalance(totalDueBalance);
      }
    } catch (err) {
      console.error('Error fetching party totals:', err);
      setPartyTotal(0);
      setPartyDueBalance(0);
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
      // Also fetch totals for initial party if provided
      if (initialPartyName) {
        fetchPartyTotals(initialPartyName);
      }
    }
  }, [isOpen, initialPartyName]);

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

  // Fetch party totals when selectedParty changes
  useEffect(() => {
    if (selectedParty?.name) {
      fetchPartyTotals(selectedParty.name);
    } else {
      setPartyTotal(0);
      setPartyDueBalance(0);
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
    const amount = parseFloat(paidAmount) || 0;
    const discountAmount = parseFloat(discount) || 0;
    
    // Calculate the actual due balance after discount
    let actualDueBalance = selectedParty ? partyDueBalance : dueBalance;
    if (discountAmount > 0) {
      if (discountType === 'percentage') {
        const discountInPkr = actualDueBalance * discountAmount / 100;
        actualDueBalance = Math.max(0, actualDueBalance - discountInPkr);
      } else {
        actualDueBalance = Math.max(0, actualDueBalance - discountAmount);
      }
    }
    
    // If discount reduces balance to 0, set received amount to 0
    let finalPaidAmount = amount;
    if (discountAmount > 0) {
      if (discountType === 'percentage') {
        const discountInPkr = actualDueBalance * discountAmount / 100;
        if (discountInPkr >= actualDueBalance) {
          finalPaidAmount = 0; // Discount covers entire balance
        } else {
          finalPaidAmount = Math.max(0, amount - discountInPkr);
        }
      } else {
        if (discountAmount >= actualDueBalance) {
          finalPaidAmount = 0; // Discount covers entire balance
        } else {
          finalPaidAmount = Math.max(0, amount - discountAmount);
        }
      }
    }
    
    // Calculate excess amount (if paid amount is more than due balance)
    const excessAmount = Math.max(0, finalPaidAmount - actualDueBalance);
    
    // Allow 0 amount if discount covers everything, otherwise require positive amount
    if (finalPaidAmount < 0 || (finalPaidAmount === 0 && discountAmount === 0)) {
      setToast({ message: 'Please enter a valid payment amount or discount', type: 'error' });
      return;
    }
    
    // Validate against party due balance for party payments (after discount)
    if (selectedParty && !purchaseId) {
      const currentBalance = selectedParty ? partyDueBalance : dueBalance;
      const balanceAfterDiscount = discountAmount > 0 ? 
        (discountType === 'percentage' ? 
          currentBalance - (currentBalance * discountAmount / 100) : 
          currentBalance - discountAmount) : 
        currentBalance;
    }
    
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('vypar_auth_token') || '';
      
      // Check if we're making a bulk payment to party or individual purchase payment
      if (selectedParty && selectedParty.name && !purchaseId) {
        // NEW: Bulk payment to party
        const paymentData = {
          supplierName: selectedParty.name,
          amount: finalPaidAmount,
          discount: discountAmount > 0 ? discountAmount : undefined,
          discountType: discountAmount > 0 ? (discountType === 'percentage' ? '%' : 'PKR') : undefined,
          paymentType,
          description: `Bulk payment for ${selectedParty.name}`,
          imageUrl: imagePreview || ''
        };
        
        const result = await makeBulkPaymentToParty(paymentData, token);
        if (result && result.success) {
          let message = result.message || 'Bulk payment successful!';
          if (discountAmount > 0) {
            message += ` (${discountType === 'percentage' ? discountAmount + '%' : 'PKR ' + discountAmount} discount)`;
          }
          if (finalPaidAmount === 0) {
            message += ' - Full amount covered by discount';
          }
          
          // Add message about excess amount being set as opening balance
          if (excessAmount > 0) {
            message += ` - PKR ${excessAmount.toLocaleString()} set as credit`;
          }
          
          setToast({ message, type: 'success' });
          // Refresh party totals after payment
          await fetchPartyTotals(selectedParty.name);
          if (onSave) onSave({ 
            partyName: selectedParty.name, 
            paymentType, 
            date, 
            total: partyTotal, 
            dueBalance: partyDueBalance, 
            paidAmount: finalPaidAmount, 
            discount: discountAmount,
            discountType,
            image,
            bulkPayment: true,
            updatedPurchases: result.updatedPurchases,
            excessAmount: excessAmount > 0 ? excessAmount : undefined
          });
          onClose();
        } else {
          setToast({ message: result?.message || 'Bulk payment failed', type: 'error' });
        }
      } else if (purchaseId) {
        // OLD: Individual purchase payment
        const paymentData = {
          purchaseId,
          amount: finalPaidAmount,
          discount: discountAmount > 0 ? discountAmount : undefined,
          discountType: discountAmount > 0 ? (discountType === 'percentage' ? '%' : 'PKR') : undefined,
          paymentType,
          description: `Payment for ${selectedParty?.name || ''}`,
          imageUrl: imagePreview || ''
        };
        
        const result = await makePayment(paymentData, token);
        if (result && result.success) {
          let message = 'Payment successful!';
          if (discountAmount > 0) {
            message += ` (${discountType === 'percentage' ? discountAmount + '%' : 'PKR ' + discountAmount} discount)`;
          }
          if (excessAmount > 0) {
            message += ` - PKR ${excessAmount.toLocaleString()} set as credit`;
          }
          
          setToast({ message, type: 'success' });
          if (onSave) onSave({ 
            partyName: selectedParty?.name || '', 
            paymentType, 
            date, 
            total, 
            dueBalance, 
            paidAmount: finalPaidAmount, 
            discount: discountAmount,
            discountType,
            image,
            excessAmount: excessAmount > 0 ? excessAmount : undefined
          });
          onClose();
        } else {
          setToast({ message: result?.message || 'Payment failed', type: 'error' });
        }
      } else {
        setToast({ message: 'Please select a party', type: 'error' });
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      setToast({ message: err?.message || 'Payment failed', type: 'error' });
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: 32,
      overflow: 'visible',
    }}>
      <div style={{
        background: 'white',
        borderRadius: 18,
        boxShadow: '0 10px 40px rgba(0,0,0,0.18)',
        width: 900,
        maxWidth: '100%',
        padding: 0,
        overflow: 'visible',
        position: 'relative',
        display: 'flex',
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '32px 40px 0 40px' }}>
            <div>
              <h2 style={{ fontSize: 26, fontWeight: 700, color: '#1e293b', letterSpacing: '-0.5px' }}>
                {purchaseId ? 'Make Payment' : 'Make Party Payment'}
              </h2>
              <p style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>
                {purchaseId ? 'Payment for specific purchase' : 'Payment will be distributed across all due purchases'}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <button onClick={() => setShowSettings(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 26, marginRight: 8 }} title="Settings">
                <Settings size={26} />
              </button>
              <button onClick={onClose} style={{ fontSize: 28, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>✕</button>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap', padding: '32px 40px 0 40px' }}>
            {/* Left Side */}
            <div style={{ flex: 1, minWidth: 240 }}>
              {/* Party selection field with live suggestions */}
              <div className="mb-4" style={{ position: 'relative' }}>
                <label className="block text-gray-700 font-medium mb-1">Party</label>
                <input
                  ref={partyInputRef}
                  type="text"
                  value={partySearch}
                  onChange={e => { setPartySearch(e.target.value); setShowPartyDropdown(true); }}
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
                        fetchPartyTotals(selectedPartyFromList.name);
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
                        fetchPartyTotals(party.name);
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
                <PaymentTypeDropdown value={paymentType} onChange={setPaymentType} />
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
              <div style={{ background: '#f8fafc', borderRadius: 14, padding: 28, marginBottom: 22, border: '1.5px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.01)' }}>
                <div style={{ fontSize: 13, color: '#64748b', fontWeight: 700, marginBottom: 6, letterSpacing: '0.5px' }}>Party Total</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#2563eb', marginBottom: 18 }}>PKR {(selectedParty ? partyTotal : total).toLocaleString()}</div>
                <div style={{ fontSize: 13, color: '#64748b', fontWeight: 700, marginBottom: 6, letterSpacing: '0.5px' }}>Party Due Balance</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#ea580c' }}>PKR {(selectedParty ? partyDueBalance : dueBalance).toLocaleString()}</div>
                
                {/* Show message when no due balance */}
                {(selectedParty ? partyDueBalance : dueBalance) === 0 && (
                  <div style={{ 
                    marginTop: 16, 
                    padding: 12, 
                    background: '#f0f9ff', 
                    border: '1px solid #0ea5e9', 
                    borderRadius: 8, 
                    fontSize: 13, 
                    color: '#0369a1',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}>
                    <span>💡</span>
                    <span>No outstanding balance. You can still make payments to set credit.</span>
                  </div>
                )}
                
                {showDiscount && discount && parseFloat(discount) > 0 && (
                  <>
                    <div style={{ fontSize: 13, color: '#64748b', fontWeight: 700, marginBottom: 6, letterSpacing: '0.5px', marginTop: 18 }}>After Discount</div>
                    <div style={{ fontSize: 18, fontWeight: 600, color: '#059669', marginBottom: 8 }}>
                      PKR {(() => {
                        const discountAmount = parseFloat(discount) || 0;
                        const currentBalance = selectedParty ? partyDueBalance : dueBalance;
                        if (discountType === 'percentage') {
                          const discountInPkr = currentBalance * discountAmount / 100;
                          return Math.max(0, currentBalance - discountInPkr).toLocaleString();
                        } else {
                          return Math.max(0, currentBalance - discountAmount).toLocaleString();
                        }
                      })()}
                    </div>
                  </>
                )}
              </div>
              {showDiscount && (
                <div>
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
              <div>
                <label style={{ display: 'block', fontSize: 15, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Paid Amount</label>
                <input type="number" value={paidAmount} onChange={e => setPaidAmount(e.target.value)} style={{ width: '100%', padding: 12, border: '1.5px solid #e2e8f0', borderRadius: 8, background: '#fff', color: '#334155', fontSize: 15, fontWeight: 500 }} placeholder="Enter amount paid" />
                {/* Show excess amount indicator */}
                {paidAmount && parseFloat(paidAmount) > 0 && (() => {
                  const amount = parseFloat(paidAmount) || 0;
                  const discountAmount = parseFloat(discount) || 0;
                  let actualDueBalance = selectedParty ? partyDueBalance : dueBalance;
                  
                  if (discountAmount > 0) {
                    if (discountType === 'percentage') {
                      const discountInPkr = actualDueBalance * discountAmount / 100;
                      actualDueBalance = Math.max(0, actualDueBalance - discountInPkr);
                    } else {
                      actualDueBalance = Math.max(0, actualDueBalance - discountAmount);
                    }
                  }
                  
                  const excess = Math.max(0, amount - actualDueBalance);
                  if (excess > 0) {
                    return (
                      <div style={{ 
                        marginTop: 8, 
                        padding: 8, 
                        background: '#fef3c7', 
                        border: '1px solid #f59e0b', 
                        borderRadius: 6, 
                        fontSize: 13, 
                        color: '#92400e',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}>
                        <span>💰</span>
                        <span>Excess amount of <strong>PKR {excess.toLocaleString()}</strong> will be set as credit</span>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '32px 40px', borderTop: '1.5px solid #e2e8f0', marginTop: 32 }}>
            <button onClick={onClose} style={{ padding: '12px 24px', border: '1.5px solid #e2e8f0', borderRadius: 8, background: '#f1f5f9', color: '#334155', marginRight: 14, fontWeight: 600, fontSize: 15, cursor: 'pointer', transition: 'background 0.2s' }}>Cancel</button>
            <button onClick={handleSave} style={{ padding: '12px 32px', borderRadius: 8, background: '#2563eb', color: 'white', fontWeight: 700, border: 'none', fontSize: 15, cursor: 'pointer', transition: 'background 0.2s' }}>Save</button>
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
  );
};

export default PaymentOutModal; 