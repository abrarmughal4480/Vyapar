"use client";
import React from 'react';

export interface ToggleSwitchProps {
  leftLabel: string;
  rightLabel: string;
  value: string;
  onChange: (value: string) => void;
  leftValue: string;
  rightValue: string;
  className?: string;
  disabled?: boolean;
}

export function ToggleSwitch({
  leftLabel,
  rightLabel,
  value,
  onChange,
  leftValue,
  rightValue,
  className = '',
  disabled = false
}: ToggleSwitchProps) {
  const isRight = value === rightValue;

  return (
    <div className={`flex items-center gap-3 ${disabled ? 'opacity-60 pointer-events-none' : ''} ${className}`}>
      {/* Left Label */}
      <span className={`text-sm font-medium transition-colors ${
        !isRight ? 'text-blue-600' : 'text-gray-600'
      }`}>
        {leftLabel}
      </span>
      
      {/* Toggle Switch */}
      <div className="relative">
        <button
          type="button"
          onClick={() => onChange(isRight ? leftValue : rightValue)}
          disabled={disabled}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            isRight ? 'bg-blue-600' : 'bg-gray-200'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${
              isRight ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
      
      {/* Right Label */}
      <span className={`text-sm font-medium transition-colors ${
        isRight ? 'text-blue-600' : 'text-gray-600'
      }`}>
        {rightLabel}
      </span>
    </div>
  );
}
