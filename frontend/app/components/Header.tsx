'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { performLogout } from '../../lib/logout';

export default function Header() {
  const [businessName, setBusinessName] = useState('My Business');
  const router = useRouter();

  useEffect(() => {
    const name = localStorage.getItem('businessName');
    if (name) setBusinessName(name);
  }, []);

  const handleLogout = async () => {
    await performLogout();
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <img src="/devease_logo.svg" alt="Logo" className="w-8 h-8 object-contain rounded-lg bg-white" />
          <div>
            <h1 className="font-semibold text-gray-900">{businessName}</h1>
            <p className="text-xs text-gray-500">Business Dashboard</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button className="p-2 hover:bg-gray-100 rounded-lg">🔔</button>
          <button
            onClick={handleLogout}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            🚪
          </button>
        </div>
      </div>
    </header>
  );
}
