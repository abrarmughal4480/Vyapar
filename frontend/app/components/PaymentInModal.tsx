"use client"

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { receivePayment, receivePartyPayment } from '@/http/sales';
import Toast from './Toast';
import { fetchPartiesByUserId, getPartyBalance } from '@/http/parties';

interface PaymentInModalProps {
  isOpen: boolean;
  onClose: () => void;
  partyName: string;
  total: number;
  dueBalance: number;
  saleId: string;
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

const PaymentInModal: React.FC<PaymentInModalProps> = ({ isOpen, onClose, partyName, total, dueBalance, saleId, onSave, showDiscount = true }) => {
  const [paymentType, setPaymentType] = useState('Cash');
  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  });
  const [receivedAmount, setReceivedAmount] = useState('');
  const [discount, setDiscount] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'pkr'>('pkr');
  const [calculatedTotal, setCalculatedTotal] = useState(total);
  const [calculatedDueBalance, setCalculatedDueBalance] = useState(dueBalance);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string>('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [partySearch, setPartySearch] = useState(partyName || '');
  const [partySuggestions, setPartySuggestions] = useState<any[]>([]);
  const [showPartyDropdown, setShowPartyDropdown] = useState(false);
  const [selectedParty, setSelectedParty] = useState<any>(null);
  const [partyTotalDue, setPartyTotalDue] = useState<number>(0);
  const [partyGrandTotal, setPartyGrandTotal] = useState<number>(0);
  const partyInputRef = React.useRef<HTMLInputElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{top: number, left: number, width: number}>({top: 0, left: 0, width: 0});
  const [partyDropdownIndex, setPartyDropdownIndex] = useState(-1);

  // Update partySearch if partyName prop changes (e.g. when modal is reused for different transactions)
  useEffect(() => {
    if (isOpen) {
      setPartySearch(partyName || '');
    }
  }, [partyName, isOpen]);

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

  // Fetch parties for suggestions
  useEffect(() => {
    if (!isOpen) return;
    const fetchParties = async () => {
      const token = (typeof window !== 'undefined' && (localStorage.getItem('token') || localStorage.getItem('vypar_auth_token'))) || '';
      if (!token) return;
      try {
        const res = await fetchPartiesByUserId(token);
        if (res && res.success && Array.isArray(res.data)) {
          setPartySuggestions(res.data.filter((p: any) => {
            const type = (p.partyType || '').toLowerCase();
            return type === 'customer' || type === 'both';
          }));
        } else {
          setPartySuggestions([]);
        }
      } catch {
        setPartySuggestions([]);
      }
    };
    fetchParties();
  }, [isOpen]);

  const filteredPartySuggestions = partySuggestions.filter(p =>
    !partySearch || p.name.toLowerCase().includes(partySearch.toLowerCase())
  );

  useEffect(() => {
    if (showPartyDropdown) setPartyDropdownIndex(0);
  }, [showPartyDropdown, partySearch]);

  useEffect(() => {
    if (showPartyDropdown && partyInputRef.current) partyInputRef.current.focus();
  }, [showPartyDropdown]);

  // Position dropdown below input
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

  // Fetch party balance when party is selected
  const fetchPartyBalance = async (party: any) => {
    if (!party || !party._id) return;
    const token = (typeof window !== 'undefined' && (localStorage.getItem('token') || localStorage.getItem('vypar_auth_token'))) || '';
    if (!token) return;
    
    try {
      const balanceData = await getPartyBalance(party._id, token);
      if (balanceData && balanceData.success) {
        // Set party's total grand total and total balance from all sales
        setPartyGrandTotal(balanceData.data.salesGrandTotal || 0);
        setPartyTotalDue(balanceData.data.salesBalance || 0);
      }
    } catch (error) {
      console.error('Error fetching party balance:', error);
      setPartyGrandTotal(0);
      setPartyTotalDue(0);
    }
  };

  // Reset party balance when modal opens
  useEffect(() => {
    if (isOpen) {
      setPartyGrandTotal(total); // Default to passed total
      setPartyTotalDue(dueBalance); // Default to passed dueBalance
      setCalculatedTotal(total);
      setCalculatedDueBalance(dueBalance);
      // Reset date to today when modal opens
      const today = new Date();
      setDate(today.toISOString().slice(0, 10));
    }
  }, [isOpen, total, dueBalance]);

  // Calculate discount and update totals
  const calculateDiscount = (discountValue: string, type: 'percentage' | 'pkr') => {
    const discountAmount = parseFloat(discountValue) || 0;
    let newTotal = total;
    let newDueBalance = dueBalance;

    if (type === 'percentage') {
      // Calculate percentage discount
      const discountInPkr = (total * discountAmount) / 100;
      newTotal = total - discountInPkr;
      newDueBalance = dueBalance - discountInPkr;
    } else {
      // Fixed PKR discount
      newTotal = total - discountAmount;
      newDueBalance = dueBalance - discountAmount;
    }

    // Ensure values don't go below 0
    newTotal = Math.max(0, newTotal);
    newDueBalance = Math.max(0, newDueBalance);

    setCalculatedTotal(newTotal);
    setCalculatedDueBalance(newDueBalance);
  };

  // Update calculations when discount changes
  useEffect(() => {
    calculateDiscount(discount, discountType);
  }, [discount, discountType, total, dueBalance]);

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
    const amount = parseFloat(receivedAmount) || 0;
    const discountAmount = parseFloat(discount) || 0;
    const token = (typeof window !== 'undefined' && (localStorage.getItem('token') || localStorage.getItem('vypar_auth_token'))) || '';
    
    // If discount reduces balance to 0, set received amount to 0
    let finalReceivedAmount = amount;
    if (discountAmount > 0) {
      if (discountType === 'percentage') {
        const discountInPkr = (selectedParty ? partyTotalDue : dueBalance) * discountAmount / 100;
        if (discountInPkr >= (selectedParty ? partyTotalDue : dueBalance)) {
          finalReceivedAmount = 0; // Discount covers entire balance
        }
      } else {
        if (discountAmount >= (selectedParty ? partyTotalDue : dueBalance)) {
          finalReceivedAmount = 0; // Discount covers entire balance
        }
      }
    }
    
    try {
      let result;
      
      if (selectedParty) {
        // If party is selected, use party payment (updates multiple sales)
        result = await receivePartyPayment(
          selectedParty.name, 
          finalReceivedAmount, 
          token, 
          discountAmount > 0 ? discountAmount : undefined,
          discountAmount > 0 ? (discountType === 'percentage' ? '%' : 'PKR') : undefined,
          paymentType, 
          date
        );
      } else {
        // If no party selected, use individual sale payment
        result = await receivePayment(
          saleId, 
          finalReceivedAmount, 
          token,
          discountAmount > 0 ? discountAmount : undefined,
          discountAmount > 0 ? (discountType === 'percentage' ? '%' : 'PKR') : undefined,
          paymentType, 
          date
        );
      }
      
      if (result && result.success) {
        if (onSave) onSave({ 
          partyName: selectedParty?.name || partySearch, 
          paymentType, 
          date, 
          total: calculatedTotal, 
          dueBalance: calculatedDueBalance, 
          receivedAmount: finalReceivedAmount, 
          discount: discountAmount,
          discountType,
          image 
        });
        onClose();
        
        // Show success message with details
        if (selectedParty && result.updatedSales) {
          let message = `Payment received! Updated ${result.updatedSales} sale(s)`;
          if (result.discountApplied) {
            message += ` with ${result.discountType === '%' ? result.discountValue + '%' : 'PKR ' + result.discountValue} discount`;
          }
          if (finalReceivedAmount === 0) {
            message += ' - Full amount covered by discount';
          }
          setToast({ 
            message, 
            type: 'success' 
          });
        } else if (finalReceivedAmount === 0) {
          setToast({ 
            message: 'Full amount covered by discount - No payment needed', 
            type: 'success' 
          });
        }
      } else {
        setToast({ message: result?.message || 'Failed to receive payment', type: 'error' });
      }
    } catch (err: any) {
      setToast({ message: err?.message || 'Failed to receive payment', type: 'error' });
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
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '32px 40px 0 40px' }}>
          <h2 style={{ fontSize: 26, fontWeight: 700, color: '#1e293b', letterSpacing: '-0.5px' }}>Receive Payment</h2>
          <button onClick={onClose} style={{ fontSize: 28, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>✕</button>
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
                placeholder="Search or select customer..."
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
                      const party = filteredPartySuggestions[partyDropdownIndex];
                      setSelectedParty(party);
                      setPartySearch(party.name);
                      setShowPartyDropdown(false);
                      fetchPartyBalance(party);
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
                      fetchPartyBalance(party);
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
              <div style={{ fontSize: 13, color: '#64748b', fontWeight: 700, marginBottom: 6, letterSpacing: '0.5px' }}>
                {selectedParty ? `${selectedParty.name} - Total Sales` : 'This Sale Total'}
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#2563eb', marginBottom: 18 }}>
                PKR {(selectedParty ? partyGrandTotal : total).toLocaleString()}
                {showDiscount && discount && (
                  <div style={{ fontSize: 16, color: '#64748b', fontWeight: 500, marginTop: 4 }}>
                    After Discount: PKR {(selectedParty ? partyGrandTotal : calculatedTotal).toLocaleString()}
                  </div>
                )}
              </div>
              <div style={{ fontSize: 13, color: '#64748b', fontWeight: 700, marginBottom: 6, letterSpacing: '0.5px' }}>
                {selectedParty ? `${selectedParty.name} - Outstanding Balance` : 'Outstanding Balance'}
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#ea580c' }}>
                PKR {(selectedParty ? partyTotalDue : dueBalance).toLocaleString()}
                {showDiscount && discount && (
                  <div style={{ fontSize: 16, color: '#64748b', fontWeight: 500, marginTop: 4 }}>
                    After Discount: PKR {(selectedParty ? partyTotalDue : calculatedDueBalance).toLocaleString()}
                  </div>
                )}
              </div>
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
              <label style={{ display: 'block', fontSize: 15, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Received Amount</label>
              <input type="number" value={receivedAmount} onChange={e => setReceivedAmount(e.target.value)} style={{ width: '100%', padding: 12, border: '1.5px solid #e2e8f0', borderRadius: 8, background: '#fff', color: '#334155', fontSize: 15, fontWeight: 500 }} placeholder="Enter amount received" />
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '32px 40px', borderTop: '1.5px solid #e2e8f0', marginTop: 32 }}>
          <button onClick={onClose} style={{ padding: '12px 24px', border: '1.5px solid #e2e8f0', borderRadius: 8, background: '#f1f5f9', color: '#334155', marginRight: 14, fontWeight: 600, fontSize: 15, cursor: 'pointer', transition: 'background 0.2s' }}>Cancel</button>
          <button onClick={handleSave} style={{ padding: '12px 32px', borderRadius: 8, background: '#2563eb', color: 'white', fontWeight: 700, border: 'none', fontSize: 15, cursor: 'pointer', transition: 'background 0.2s' }}>Save</button>
        </div>
      </div>
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
};

export default PaymentInModal; 