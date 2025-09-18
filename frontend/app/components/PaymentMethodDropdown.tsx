"use client";
import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';

export interface BankAccount {
  _id: string;
  accountDisplayName: string;
  currentBalance: number;
  bankName?: string;
  accountNumber?: string;
}

export interface PaymentMethodDropdownProps {
  value: string;
  onChange: (val: string) => void;
  bankAccounts: BankAccount[];
  className?: string;
  dropdownIndex: number;
  setDropdownIndex: React.Dispatch<React.SetStateAction<number>>;
}

export function PaymentMethodDropdown({ 
  value, 
  onChange, 
  bankAccounts = [],
  className = '',
  dropdownIndex,
  setDropdownIndex
}: PaymentMethodDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  // Create options for payment methods
  const options = React.useMemo(() => {
    const baseOptions = [
      { value: 'Cash', label: 'Cash' },
      { value: 'Cheque', label: 'Cheque' }
    ];
    
    const bankOptions = bankAccounts.map((account, index) => ({
      value: `bank_${account._id || index}`,
      label: account.accountDisplayName
    }));
    
    return [...baseOptions, ...bankOptions];
  }, [bankAccounts]);

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
      const viewportHeight = window.innerHeight;
      const dropdownHeight = Math.min(12 * 16, options.length * 40);
      
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      let top: number;
      if (spaceBelow >= dropdownHeight || spaceBelow >= spaceAbove) {
        top = rect.bottom + window.scrollY + 6;
      } else {
        top = rect.top + window.scrollY - dropdownHeight - 12;
      }
      
      setDropdownStyle({
        position: 'absolute',
        top,
        left: rect.left + window.scrollX + rect.width / 2 - (rect.width + 40) / 2,
        width: rect.width + 40,
        minWidth: rect.width,
        zIndex: 1000,
        maxHeight: '12rem',
        overflowY: 'auto',
      });
    }
  }, [open, options.length]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowDown') {
        e.preventDefault();
        setOpen(true);
        setDropdownIndex(0);
      }
      return;
    }

    if (["ArrowDown", "ArrowUp", "Enter", "Escape", " "].includes(e.key)) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (e.key === 'ArrowDown') {
      const newIndex = Math.min(dropdownIndex + 1, options.length - 1);
      setDropdownIndex(newIndex);
      setTimeout(() => {
        const highlightedElement = document.querySelector(`[data-payment-method-index="${newIndex}"]`) as HTMLElement;
        if (highlightedElement) {
          highlightedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      }, 0);
    } else if (e.key === 'ArrowUp') {
      const newIndex = Math.max(dropdownIndex - 1, 0);
      setDropdownIndex(newIndex);
      setTimeout(() => {
        const highlightedElement = document.querySelector(`[data-payment-method-index="${newIndex}"]`) as HTMLElement;
        if (highlightedElement) {
          highlightedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      }, 0);
    } else if (e.key === 'Enter' || e.key === ' ') {
      if (dropdownIndex >= 0 && dropdownIndex < options.length) {
        const selectedValue = options[dropdownIndex].value;
        if (selectedValue.startsWith('bank_')) {
          const accountId = selectedValue.replace('bank_', '');
          const account = bankAccounts.find(acc => acc._id === accountId || acc.accountDisplayName === accountId);
          onChange(account?.accountDisplayName || selectedValue);
        } else {
          onChange(selectedValue);
        }
        setOpen(false);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const getDisplayValue = () => {
    if (value.startsWith('bank_')) {
      const accountId = value.replace('bank_', '');
      const account = bankAccounts.find(acc => acc._id === accountId || acc.accountDisplayName === accountId);
      return account?.accountDisplayName || value;
    }
    return value;
  };

  return (
    <div ref={ref} className={`relative ${className}`}> 
      <button
        ref={btnRef}
        type="button"
        className={`w-full px-3 py-2 border-2 border-blue-100 rounded-lg bg-white flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-blue-200 appearance-none transition-all ${open ? 'ring-2 ring-blue-300' : ''}`}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          setTimeout(() => setOpen(false), 150);
        }}
        tabIndex={0}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Payment Method"
      >
        <span className="truncate text-left">{getDisplayValue()}</span>
        <span className={`ml-2 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
        </span>
      </button>
      {open && typeof window !== 'undefined' && ReactDOM.createPortal(
        <ul
          style={dropdownStyle}
          className="bg-white border-2 border-blue-100 rounded-lg shadow-lg animate-fadeinup custom-dropdown-scrollbar"
          onMouseDown={e => e.preventDefault()}
          role="listbox"
          aria-label="Payment Method"
        >
          {options.map((opt, idx) => (
            <li
              key={opt.value}
              data-payment-method-index={idx}
              className={`px-4 py-2 cursor-pointer flex items-center gap-2 transition-colors ${value === opt.value ? 'font-semibold text-gray-700 bg-blue-100' : 'text-gray-700'} ${dropdownIndex === idx ? 'font-semibold text-gray-700 bg-blue-50' : 'bg-white hover:bg-blue-50'}`}
              onMouseDown={e => { 
                e.preventDefault(); 
                if (opt.value.startsWith('bank_')) {
                  const accountId = opt.value.replace('bank_', '');
                  const account = bankAccounts.find(acc => acc._id === accountId || acc.accountDisplayName === accountId);
                  onChange(account?.accountDisplayName || opt.value);
                } else {
                  onChange(opt.value);
                }
                setOpen(false); 
                setDropdownIndex(idx); 
              }}
              tabIndex={0}
              onKeyDown={(e: React.KeyboardEvent<HTMLLIElement>) => { 
                if (e.key === 'Enter' || e.key === ' ') { 
                  e.preventDefault();
                  if (opt.value.startsWith('bank_')) {
                    const accountId = opt.value.replace('bank_', '');
                    const account = bankAccounts.find(acc => acc._id === accountId || acc.accountDisplayName === accountId);
                    onChange(account?.accountDisplayName || opt.value);
                  } else {
                    onChange(opt.value);
                  }
                  setOpen(false); 
                  setDropdownIndex(idx); 
                }
              }}
              aria-selected={value === opt.value}
              role="option"
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
