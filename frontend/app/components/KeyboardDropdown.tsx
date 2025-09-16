"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';

interface DropdownOption {
  value: string;
  label: string;
  [key: string]: any;
}

interface KeyboardDropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  disabled?: boolean;
  searchable?: boolean;
  onOpen?: () => void;
  renderOption?: (option: DropdownOption, isSelected: boolean, isFocused: boolean) => React.ReactNode;
  getOptionLabel?: (option: DropdownOption) => string;
  getOptionValue?: (option: DropdownOption) => string;
}

const KeyboardDropdown: React.FC<KeyboardDropdownProps> = ({
  options,
  value,
  onChange,
  placeholder = "Select option...",
  label,
  className = "",
  disabled = false,
  searchable = false,
  onOpen,
  renderOption,
  getOptionLabel = (option) => option.label,
  getOptionValue = (option) => option.value
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter options based on search term
  const filteredOptions = options.filter(option => 
    getOptionLabel(option).toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get selected option
  const selectedOption = options.find(option => getOptionValue(option) === value);

  // Auto-scroll to focused item
  const scrollToFocused = useCallback(() => {
    if (listRef.current && focusedIndex >= 0) {
      const focusedElement = listRef.current.children[focusedIndex] as HTMLElement;
      if (focusedElement) {
        focusedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        });
      }
    }
  }, [focusedIndex]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (disabled) return;

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setFocusedIndex(0);
        } else if (focusedIndex >= 0 && focusedIndex < filteredOptions.length) {
          const selectedOption = filteredOptions[focusedIndex];
          onChange(getOptionValue(selectedOption));
          setIsOpen(false);
          setFocusedIndex(-1);
          setSearchTerm("");
        }
        break;

      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setFocusedIndex(0);
        } else {
          setFocusedIndex(prev => Math.min(prev + 1, filteredOptions.length - 1));
        }
        break;

      case 'ArrowUp':
        e.preventDefault();
        if (isOpen) {
          setFocusedIndex(prev => Math.max(prev - 1, 0));
        }
        break;

      case 'Escape':
        setIsOpen(false);
        setFocusedIndex(-1);
        setSearchTerm("");
        break;

      case 'Tab':
        setIsOpen(false);
        setFocusedIndex(-1);
        setSearchTerm("");
        break;
    }
  }, [isOpen, focusedIndex, filteredOptions, onChange, disabled, getOptionValue]);

  // Handle option selection
  const handleOptionSelect = (option: DropdownOption) => {
    onChange(getOptionValue(option));
    setIsOpen(false);
    setFocusedIndex(-1);
    setSearchTerm("");
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setFocusedIndex(0);
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setFocusedIndex(-1);
        setSearchTerm("");
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Scroll to focused item when focused index changes
  useEffect(() => {
    if (isOpen) {
      scrollToFocused();
    }
  }, [focusedIndex, isOpen, scrollToFocused]);

  // Reset focused index when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setFocusedIndex(0);
      // Call onOpen callback if provided
      if (onOpen) {
        onOpen();
      }
    }
  }, [isOpen, onOpen]);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      
      <div className="relative">
        {searchable ? (
          <input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={isOpen ? searchTerm : (selectedOption ? getOptionLabel(selectedOption) : "")}
            onChange={handleSearchChange}
            onKeyDown={handleKeyDown}
            onClick={() => {
              if (!disabled) {
                setIsOpen(!isOpen);
                setFocusedIndex(0);
              }
            }}
            className="w-full pl-4 pr-10 py-2.5 rounded-full bg-white/80 shadow focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border border-gray-200 transition-all placeholder-gray-400 text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
            disabled={disabled}
          />
        ) : (
          <button
            type="button"
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-full bg-white/80 shadow border border-gray-200 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
            onClick={() => {
              if (!disabled) {
                setIsOpen(!isOpen);
                setFocusedIndex(0);
              }
            }}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            aria-haspopup="listbox"
            aria-expanded={isOpen}
          >
            <span className="truncate">
              {selectedOption ? getOptionLabel(selectedOption) : placeholder}
            </span>
            <ChevronDown 
              className={`w-5 h-5 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
            />
          </button>
        )}

        {isOpen && (
          <ul
            ref={listRef}
            className="absolute z-[100] bg-white rounded-xl shadow-lg border border-gray-100 py-1 max-h-60 overflow-auto animate-fadeinup w-full"
            style={{ top: '110%', left: 0 }}
            role="listbox"
            tabIndex={-1}
          >
            {filteredOptions.length === 0 ? (
              <li className="px-4 py-2 text-gray-500 text-sm">
                No options found
              </li>
            ) : (
              filteredOptions.map((option, index) => {
                const isSelected = getOptionValue(option) === value;
                const isFocused = index === focusedIndex;

                return (
                  <li
                    key={`${getOptionValue(option)}-${index}`}
                    className={`px-4 py-2 cursor-pointer rounded-lg transition-all ${
                      isFocused ? 'bg-blue-50 text-blue-700 font-semibold' :
                      isSelected ? 'font-semibold text-blue-600 bg-blue-100' :
                      'text-gray-700 hover:bg-blue-50'
                    }`}
                    onClick={() => handleOptionSelect(option)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleOptionSelect(option);
                      } else if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setFocusedIndex(prev => Math.min(prev + 1, filteredOptions.length - 1));
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setFocusedIndex(prev => Math.max(prev - 1, 0));
                      } else if (e.key === 'Escape') {
                        setIsOpen(false);
                        setFocusedIndex(-1);
                        setSearchTerm("");
                      }
                    }}
                    role="option"
                    aria-selected={isSelected}
                    tabIndex={0}
                  >
                    {renderOption ? renderOption(option, isSelected, isFocused) : getOptionLabel(option)}
                  </li>
                );
              })
            )}
          </ul>
        )}
      </div>
    </div>
  );
};

export default KeyboardDropdown; 