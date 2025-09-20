"use client";
import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';

export interface Item {
  id: string;
  name: string;
  salePrice?: number;
  purchasePrice?: number;
  stock?: number;
  unit?: any;
  wholesalePrice?: number;
  minimumWholesaleQuantity?: number;
}

export interface ItemsDropdownProps {
  items: Item[];
  value: string;
  onChange: (val: string) => void;
  onItemSelect?: (item: Item) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  showSuggestions?: boolean;
  setShowSuggestions?: (show: boolean) => void;
}

export function ItemsDropdown({ 
  items, 
  value, 
  onChange, 
  onItemSelect,
  className = '', 
  placeholder = 'Select Item', 
  disabled = false,
  showSuggestions = false,
  setShowSuggestions
}: ItemsDropdownProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  // Use showSuggestions prop to control dropdown visibility
  const isOpen = showSuggestions;

  // Filter items based on search term
  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!ref.current) return;
      if (!(event.target instanceof Node)) return;
      if (!ref.current.contains(event.target as Node)) {
        if (setShowSuggestions) setShowSuggestions(false);
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, setShowSuggestions]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const dropdownHeight = Math.min(12 * 16, filteredItems.length * 40); // 12rem max, or items * 40px
      
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
        left: rect.left + window.scrollX,
        width: rect.width,
        minWidth: rect.width,
        zIndex: 9999,
        maxHeight: '12rem',
        overflowY: 'auto',
      });
    }
  }, [isOpen, filteredItems.length]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    
    if (!isOpen) {
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowDown') {
        e.preventDefault();
        if (setShowSuggestions) setShowSuggestions(true);
        setHighlightedIndex(0);
        if (inputRef.current) inputRef.current.focus();
      }
      return;
    }

    if (["ArrowDown", "ArrowUp", "Enter", "Escape", " "].includes(e.key)) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (e.key === 'ArrowDown') {
      const newIndex = Math.min(highlightedIndex + 1, filteredItems.length - 1);
      setHighlightedIndex(newIndex);
      // Scroll to show highlighted item
      setTimeout(() => {
        const highlightedElement = document.querySelector(`[data-dropdown-index="${newIndex}"]`) as HTMLElement;
        if (highlightedElement) {
          highlightedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      }, 0);
    } else if (e.key === 'ArrowUp') {
      const newIndex = Math.max(highlightedIndex - 1, 0);
      setHighlightedIndex(newIndex);
      // Scroll to show highlighted item
      setTimeout(() => {
        const highlightedElement = document.querySelector(`[data-dropdown-index="${newIndex}"]`) as HTMLElement;
        if (highlightedElement) {
          highlightedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      }, 0);
    } else if (e.key === 'Enter' || e.key === ' ') {
      if (highlightedIndex >= 0 && highlightedIndex < filteredItems.length) {
        const selectedItem = filteredItems[highlightedIndex];
        onChange(selectedItem.name);
        if (onItemSelect) onItemSelect(selectedItem);
        if (setShowSuggestions) setShowSuggestions(false);
      }
    } else if (e.key === 'Escape') {
      if (setShowSuggestions) setShowSuggestions(false);
    }
  };

  const handleItemClick = (item: Item) => {
    onChange(item.name);
    if (onItemSelect) onItemSelect(item);
    if (setShowSuggestions) setShowSuggestions(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    setHighlightedIndex(0);
    
    if (newValue !== value) {
      onChange(newValue);
    }
    
    if (!isOpen) {
      if (setShowSuggestions) setShowSuggestions(true);
    }
  };

  const handleInputFocus = () => {
    if (setShowSuggestions) setShowSuggestions(true);
  };



  return (
    <div ref={ref} className={`relative ${disabled ? 'opacity-60 pointer-events-none' : ''} ${className}`}> 
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onClick={handleInputFocus}
          onBlur={() => {
            // Close dropdown when input loses focus (moving to another field)
            setTimeout(() => {
              if (setShowSuggestions) setShowSuggestions(false);
            }, 150);
          }}
          onKeyDown={handleKeyDown}
          className="w-full px-3 py-2 border-2 border-blue-100 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      
      {isOpen && typeof window !== 'undefined' && ReactDOM.createPortal(
        <ul
          style={dropdownStyle}
          className="bg-white border-2 border-blue-100 rounded-lg shadow-lg custom-dropdown-scrollbar"
          onMouseDown={e => e.preventDefault()}
          role="listbox"
          aria-label={placeholder}
        >
          {filteredItems.length > 0 ? (
            filteredItems.map((item, idx) => (
              <li
                key={item.id || `${item.name}-${idx}`}
                data-dropdown-index={idx}
                className={`px-2 py-2 cursor-pointer transition-colors ${value === item.name ? 'font-semibold text-gray-700 bg-blue-100' : 'text-gray-700'} ${highlightedIndex === idx ? 'font-semibold text-gray-700 bg-blue-50' : 'bg-white hover:bg-blue-50'}`}
                onMouseDown={e => { e.preventDefault(); handleItemClick(item); }}
                tabIndex={0}
                onKeyDown={(e: React.KeyboardEvent<HTMLLIElement>) => { 
                  if (e.key === 'Enter' || e.key === ' ') { 
                    e.preventDefault();
                    handleItemClick(item);
                  }
                }}
                aria-selected={value === item.name}
                role="option"
              >
                <div className="w-full text-xs sm:text-sm font-medium text-gray-900 mb-1">
                  {item.name}
                </div>
                <div className="flex items-center justify-end text-xs text-gray-500 whitespace-nowrap mr-2">
                  {item.purchasePrice && (
                    <span className="text-xs">P: {item.purchasePrice}</span>
                  )}
                  {item.salePrice && (
                    <>
                      {item.purchasePrice && <span className="mx-1">•</span>}
                      <span className="text-xs">S: {item.salePrice}</span>
                    </>
                  )}
                  {(item.stock !== undefined || item.unit) && (
                    <>
                      {(item.purchasePrice || item.salePrice) && <span className="mx-1">•</span>}
                      <span className="text-xs">
                        {item.stock !== undefined && `Q:${item.stock}`}
                        {item.stock !== undefined && item.unit && ' '}
                        {item.unit && (typeof item.unit === 'object' ? (item.unit.base || item.unit.secondary || 'Unit') : item.unit)}
                      </span>
                    </>
                  )}
                </div>
              </li>
            ))
          ) : (
            <li className="px-4 py-2 text-gray-500 text-center">No items found</li>
          )}
        </ul>,
        document.body
      )}
    </div>
  );
}
