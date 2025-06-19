'use client';

import { usePathname, useRouter } from 'next/navigation';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: '🏠', path: '/dashboard' },
  { id: 'parties', label: 'Parties', icon: '👥', path: '/dashboard/parties' },
  { id: 'sale', label: 'Sale', icon: '💰', path: '/dashboard/sale' },
  { id: 'items', label: 'Items', icon: '📦', path: '/dashboard/items' },
  { id: 'reports', label: 'Reports', icon: '📊', path: '/dashboard/reports' },
];

export default function BottomNavigation() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 py-1 lg:hidden">
      <div className="flex justify-around items-center">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => router.push(item.path)}
            className={`flex flex-col items-center py-2 px-2 rounded-lg transition-colors ${
              pathname === item.path
                ? 'text-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span className="text-lg mb-1">{item.icon}</span>
            <span className="text-xs font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
