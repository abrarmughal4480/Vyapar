'use client';
import { useRouter } from 'next/navigation';

const quickActions = [
  {
    id: 'add-sale',
    title: 'Add Sale',
    description: 'Record new sale',
    icon: '💳',
    color: 'bg-green-500',
    path: '/dashboard/sales/add'
  },
  {
    id: 'add-product',
    title: 'Add Product',
    description: 'Add inventory item',
    icon: '📦',
    color: 'bg-blue-500',
    path: '/dashboard/inventory/add'
  },
  {
    id: 'add-customer',
    title: 'Add Customer',
    description: 'New customer entry',
    icon: '👤',
    color: 'bg-purple-500',
    path: '/dashboard/customers/add'
  },
  {
    id: 'view-reports',
    title: 'View Reports',
    description: 'Business analytics',
    icon: '📊',
    color: 'bg-orange-500',
    path: '/dashboard/reports'
  }
];

export default function QuickActions() {
  const router = useRouter();

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
      
      <div className="grid grid-cols-2 gap-4">
        {quickActions.map((action) => (
          <button
            key={action.id}
            onClick={() => router.push(action.path)}
            className="p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all text-left group"
          >
            <div className="flex items-start space-x-3">
              <div className={`w-10 h-10 ${action.color} rounded-lg flex items-center justify-center text-white text-lg`}>
                {action.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                  {action.title}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {action.description}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Additional Quick Stats */}
      <div className="mt-6 pt-6 border-t border-gray-100">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Today's Summary</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">₹25,430</div>
            <div className="text-xs text-gray-500">Sales</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">47</div>
            <div className="text-xs text-gray-500">Orders</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">12</div>
            <div className="text-xs text-gray-500">New Items</div>
          </div>
        </div>
      </div>
    </div>
  );
}
