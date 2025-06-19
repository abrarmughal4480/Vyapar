'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Header() {
  const [businessName, setBusinessName] = useState('My Business');
  const router = useRouter();

  useEffect(() => {
    const name = localStorage.getItem('businessName');
    if (name) setBusinessName(name);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('businessName');
    router.push('/');
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">V</span>
          </div>
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
