"use client";
import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';

export type DropdownOption = { value: string; label: string };

export interface CustomDropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (val: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  dropdownIndex: number;
  setDropdownIndex: React.Dispatch<React.SetStateAction<number>>;
  optionsCount: number;
}

export function CustomDropdown({ 
  options, 
  value, 
  onChange, 
  className = '', 
  placeholder = 'Select', 
  disabled = false, 
  dropdownIndex, 
  setDropdownIndex, 
  optionsCount 
}: CustomDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

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
      const dropdownHeight = Math.min(12 * 16, options.length * 40); // 12rem max, or items * 40px
      
      // Check if dropdown would go below viewport
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      let top: number;
      if (spaceBelow >= dropdownHeight || spaceBelow >= spaceAbove) {
        // Position below input
        top = rect.bottom + window.scrollY + 6;
      } else {
        // Position above input with more space
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
    if (disabled) return;
    
    if (!open) {
      // When dropdown is closed, open it with Space, Enter, or ArrowDown
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowDown') {
        e.preventDefault();
        setOpen(true);
        setDropdownIndex(0);
      }
      return;
    }

    // When dropdown is open, handle navigation
    if (["ArrowDown", "ArrowUp", "Enter", "Escape", " "].includes(e.key)) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (e.key === 'ArrowDown') {
      const newIndex = Math.min(dropdownIndex + 1, optionsCount - 1);
      setDropdownIndex(newIndex);
      // Scroll to show highlighted item
      setTimeout(() => {
        const highlightedElement = document.querySelector(`[data-dropdown-index="${newIndex}"]`) as HTMLElement;
        if (highlightedElement) {
          highlightedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      }, 0);
    } else if (e.key === 'ArrowUp') {
      const newIndex = Math.max(dropdownIndex - 1, 0);
      setDropdownIndex(newIndex);
      // Scroll to show highlighted item
      setTimeout(() => {
        const highlightedElement = document.querySelector(`[data-dropdown-index="${newIndex}"]`) as HTMLElement;
        if (highlightedElement) {
          highlightedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      }, 0);
    } else if (e.key === 'Enter' || e.key === ' ') {
      if (dropdownIndex >= 0 && dropdownIndex < options.length) {
        onChange(options[dropdownIndex].value);
        setOpen(false);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={ref} className={`relative ${disabled ? 'opacity-60 pointer-events-none' : ''} ${className}`}> 
      <button
        ref={btnRef}
        type="button"
        className={`w-full px-3 py-2 border-2 border-blue-100 rounded-lg bg-white flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-blue-200 appearance-none transition-all ${open ? 'ring-2 ring-blue-300' : ''}`}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          // Close dropdown when button loses focus (moving to another field)
          setTimeout(() => setOpen(false), 150);
        }}
        disabled={disabled}
        tabIndex={0}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={placeholder}
      >
        <span className="truncate text-left">{options.find((o: DropdownOption) => o.value === value)?.label || placeholder}</span>
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
          aria-label={placeholder}
        >
          {options.map((opt: DropdownOption, idx: number) => (
            <li
              key={opt.value}
              data-dropdown-index={idx}
              className={`px-4 py-2 cursor-pointer flex items-center gap-2 transition-colors ${value === opt.value ? 'font-semibold text-gray-700 bg-blue-100' : 'text-gray-700'} ${dropdownIndex === idx ? 'font-semibold text-gray-700 bg-blue-50' : 'bg-white hover:bg-blue-50'}`}
              onMouseDown={e => { e.preventDefault(); onChange(opt.value); setOpen(false); setDropdownIndex(idx); }}
              tabIndex={0}
              onKeyDown={(e: React.KeyboardEvent<HTMLLIElement>) => { 
                if (e.key === 'Enter' || e.key === ' ') { 
                  e.preventDefault();
                  onChange(opt.value); 
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
