'use client';

import { ReactNode } from 'react';

interface EnhancedModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export default function EnhancedModal({ isOpen, onClose, title, children }: EnhancedModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 transition-all duration-300 overflow-y-auto">
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-4xl min-w-[320px] md:min-w-[650px] max-h-[90vh] overflow-hidden border border-gray-200 transition-all duration-300 flex flex-col"
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-2xl flex-shrink-0">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-red-500 text-3xl font-bold rounded-full w-10 h-10 flex items-center justify-center transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-200"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="p-6 relative bg-white rounded-b-2xl overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
