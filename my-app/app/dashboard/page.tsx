'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import EnhancedModal from '@/components/EnhancedModal';
import LoadingOverlay from '@/components/LoadingOverlay';
import { 
  BarChart3, 
  DollarSign, 
  Package, 
  Users, 
  TrendingUp, 
  Bell, 
  Settings, 
  LogOut,
  Plus,
  Eye,
  Calendar,
  FileText,
  ShoppingCart,
  Sparkles,
  ArrowUpRight,
  Activity,
  Zap
} from 'lucide-react';

// Define your types here
type User = {
  name: string;
  email?: string;
  businessId: string;
};

type BusinessStats = {
  totalSales: number;
  totalPurchases: number;
  totalCustomers: number;
  itemsInStock: number;
  pendingPayments: number;
  lowStockItems: number;
  monthlyProfit: number;
  totalInvoices: number;
};

type DashboardFormData = {
  saleInvoice: { customer: string; amount: string; items: string };
  purchaseBill: { supplier: string; amount: string; items: string };
  addItem: { name: string; salePrice: string; purchasePrice: string; stock: string };
  addParty: { name: string; phone: string; type: string; address: string };
  paymentIn: { party: string; amount: string; mode: string; description: string };
  paymentOut: { party: string; amount: string; mode: string; description: string };
  quickExpense: { category: string; amount: string; description: string };
  stockAdjustment: { item: string; quantity: string; reason: string };
};

const quickActions = [
  {
    title: 'New Sale Invoice',
    icon: '💰',
    color: 'from-emerald-500 to-teal-600',
    hoverColor: 'hover:from-emerald-600 hover:to-teal-700',
    textColor: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    modalKey: 'saleInvoice',
    path: '/dashboard/sale'
  },
  {
    title: 'New Purchase Bill',
    icon: '🛒',
    color: 'from-blue-500 to-indigo-600',
    hoverColor: 'hover:from-blue-600 hover:to-indigo-700',
    textColor: 'text-blue-600',
    bgColor: 'bg-blue-50',
    modalKey: 'purchaseBill',
    path: '/dashboard/purchase'
  },
  {
    title: 'Add Item',
    icon: '📦',
    color: 'from-purple-500 to-violet-600',
    hoverColor: 'hover:from-purple-600 hover:to-violet-700',
    textColor: 'text-purple-600',
    bgColor: 'bg-purple-50',
    modalKey: 'addItem',
    path: '/dashboard/items'
  },
  {
    title: 'Add Party',
    icon: '👥',
    color: 'from-orange-500 to-red-500',
    hoverColor: 'hover:from-orange-600 hover:to-red-600',
    textColor: 'text-orange-600',
    bgColor: 'bg-orange-50',
    modalKey: 'addParty',
    path: '/dashboard/parties'
  },
  {
    title: 'Payment In',
    icon: '⬆️',
    color: 'from-rose-500 to-pink-600',
    hoverColor: 'hover:from-rose-600 hover:to-pink-700',
    textColor: 'text-rose-600',
    bgColor: 'bg-rose-50',
    modalKey: 'paymentIn',
    path: '/dashboard/payments'
  },
  {
    title: 'Payment Out',
    icon: '⬇️',
    color: 'from-amber-500 to-yellow-600',
    hoverColor: 'hover:from-amber-600 hover:to-yellow-700',
    textColor: 'text-amber-600',
    bgColor: 'bg-amber-50',
    modalKey: 'paymentOut',
    path: '/dashboard/expences'
  },
  {
    title: 'Quick Expense',
    icon: '💸',
    color: 'from-pink-500 to-rose-600',
    hoverColor: 'hover:from-pink-600 hover:to-rose-700',
    textColor: 'text-pink-600',
    bgColor: 'bg-pink-50',
    modalKey: 'quickExpense',
    path: '/dashboard/expenses'
  },
  {
    title: 'Stock Adjustment',
    icon: '📊',
    color: 'from-indigo-500 to-purple-600',
    hoverColor: 'hover:from-indigo-600 hover:to-purple-700',
    textColor: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    modalKey: 'stockAdjustment',
    path: '/dashboard/inventory'
  },
];

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [businessStats, setBusinessStats] = useState<BusinessStats>({
    totalSales: 0,
    totalPurchases: 0,
    totalCustomers: 0,
    itemsInStock: 0,
    pendingPayments: 0,
    lowStockItems: 0,
    monthlyProfit: 0,
    totalInvoices: 0
  });
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState<DashboardFormData>({
    saleInvoice: { customer: '', amount: '', items: '' },
    purchaseBill: { supplier: '', amount: '', items: '' },
    addItem: { name: '', salePrice: '', purchasePrice: '', stock: '' },
    addParty: { name: '', phone: '', type: 'Customer', address: '' },
    paymentIn: { party: '', amount: '', mode: 'Cash', description: '' },
    paymentOut: { party: '', amount: '', mode: 'Cash', description: '' },
    quickExpense: { category: '', amount: '', description: '' },
    stockAdjustment: { item: '', quantity: '', reason: '' }
  });

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // Enhanced auth check that uses real authentication
  const checkAuth = useCallback(() => {
    const token = localStorage.getItem('token') || localStorage.getItem('vypar_auth_token');
    const userData = localStorage.getItem('user') || localStorage.getItem('vypar_user_session');
    
    if (!token || !userData) {
      console.log('No authentication found, redirecting to login');
      router.push('/login');
      return null;
    }

    try {
      const parsedUser = JSON.parse(userData);
      
      // Validate required user data
      if (!parsedUser.id || !parsedUser.email || !parsedUser.businessId) {
        console.log('Invalid user data, redirecting to login');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('vypar_auth_token');
        localStorage.removeItem('vypar_user_session');
        localStorage.removeItem('businessId');
        router.push('/login');
        return null;
      }
      
      console.log('Auth check successful:', parsedUser.name || parsedUser.email);
      return {
        token,
        user: parsedUser,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };
    } catch (error) {
      console.log('Error parsing user data, redirecting to login');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('vypar_auth_token');
      localStorage.removeItem('vypar_user_session');
      localStorage.removeItem('businessId');
      router.push('/login');
      return null;
    }
  }, [router]);

  // API call with real authentication
  const makeApiCall = useCallback(async (endpoint: string, options: RequestInit = {}): Promise<any> => {
    const auth = checkAuth();
    if (!auth) return null;
    
    const url = `${API_BASE_URL}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
      
      if (response.status === 401) {
        console.log('Authentication failed, redirecting to login');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('vypar_auth_token');
        localStorage.removeItem('vypar_user_session');
        localStorage.removeItem('businessId');
        router.push('/login');
        return null;
      }
      
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // Use status message if can't parse error
        }
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      console.log('Real API Response:', data);
      return data;
    } catch (error) {
      console.error('Real API call failed:', error);
      throw error;
    }
  }, [API_BASE_URL, checkAuth, router]);

  // Add missing handleInputChange function
  const handleInputChange = (modalKey: keyof DashboardFormData, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [modalKey]: {
        ...prev[modalKey],
        [field]: value
      }
    }));
  };

  // Add missing handleQuickAction function
  const handleQuickAction = (action: any) => {
    setActiveModal(action.modalKey);
  };

  // Enhanced Add Party handler with proper API integration
  const handleFormSubmit = async (modalKey: keyof DashboardFormData) => {
    setModalLoading(true);
    
    const auth = checkAuth();
    if (!auth) {
      setModalLoading(false);
      return;
    }

    let endpoint = '';
    let payload = {};
    let successMessage = '';

    try {
      switch (modalKey) {
        case 'addParty': {
          const data = formData.addParty;
          
          // Validate required fields
          if (!data.name.trim()) {
            alert('Party name is required');
            setModalLoading(false);
            return;
          }
          
          endpoint = `/parties/${auth.user.businessId}`;
          payload = {
            name: data.name.trim(),
            phone: data.phone || '',
            type: data.type,
            address: data.address || '',
            email: '', 
            gstNumber: '', 
            balance: 0,
            isActive: true
          };
          successMessage = `Party "${data.name}" added successfully!`;
          break;
        }
        case 'saleInvoice': {
          const data = formData.saleInvoice;
          endpoint = `/sale/${auth.user.businessId}`;
          payload = {
            customer: data.customer,
            amount: parseFloat(data.amount) || 0,
            items: data.items,
            date: new Date().toISOString().split('T')[0]
          };
          successMessage = 'Sale invoice created successfully!';
          break;
        }
        case 'purchaseBill': {
          const data = formData.purchaseBill;
          endpoint = `/purchase/${auth.user.businessId}`;
          payload = {
            supplier: data.supplier,
            amount: parseFloat(data.amount) || 0,
            items: data.items,
            date: new Date().toISOString().split('T')[0]
          };
          successMessage = 'Purchase bill created successfully!';
          break;
        }
        case 'addItem': {
          const data = formData.addItem;
          endpoint = `/items/${auth.user.businessId}`;
          payload = {
            name: data.name,
            salePrice: parseFloat(data.salePrice) || 0,
            purchasePrice: parseFloat(data.purchasePrice) || 0,
            stock: parseInt(data.stock) || 0
          };
          successMessage = 'Item added successfully!';
          break;
        }
        case 'paymentIn': {
          const data = formData.paymentIn;
          endpoint = `/cash-bank/transactions/${auth.user.businessId}`;
          payload = {
            type: 'Payment In',
            party: data.party,
            amount: parseFloat(data.amount) || 0,
            mode: data.mode,
            description: data.description,
            date: new Date().toISOString().split('T')[0],
            accountId: 1
          };
          successMessage = 'Payment recorded successfully!';
          break;
        }
        case 'paymentOut': {
          const data = formData.paymentOut;
          endpoint = `/cash-bank/transactions/${auth.user.businessId}`;
          payload = {
            type: 'Payment Out',
            party: data.party,
            amount: parseFloat(data.amount) || 0,
            mode: data.mode,
            description: data.description,
            date: new Date().toISOString().split('T')[0],
            accountId: 1
          };
          successMessage = 'Payment recorded successfully!';
          break;
        }
        case 'quickExpense': {
          const data = formData.quickExpense;
          endpoint = `/expenses/${auth.user.businessId}`;
          payload = {
            category: data.category,
            amount: parseFloat(data.amount) || 0,
            description: data.description,
            date: new Date().toISOString().split('T')[0]
          };
          successMessage = 'Expense recorded successfully!';
          break;
        }
        case 'stockAdjustment': {
          const data = formData.stockAdjustment;
          endpoint = `/inventory/adjustment/${auth.user.businessId}`;
          payload = {
            item: data.item,
            quantity: parseInt(data.quantity) || 0,
            reason: data.reason,
            date: new Date().toISOString().split('T')[0]
          };
          successMessage = 'Stock adjusted successfully!';
          break;
        }
      }

      console.log('Sending to real API:', { endpoint, payload });

      const result = await makeApiCall(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      console.log('Real API result:', result);

      // Only proceed if we got a successful response
      if (result && result.success) {
        // Show success message
        alert(successMessage);
        
        // Close modal and reset form
        setActiveModal(null);
        
        // Reset form
        setFormData(prev => {
          const newData = { ...prev };
          
          if (modalKey === 'addParty') {
            newData.addParty = { name: '', phone: '', type: 'Customer', address: '' };
          } else if (modalKey === 'paymentIn' || modalKey === 'paymentOut') {
            newData[modalKey] = { party: '', amount: '', mode: 'Cash', description: '' };
          } else {
            const currentForm = newData[modalKey];
            Object.keys(currentForm).forEach(key => {
              (currentForm as any)[key] = '';
            });
          }
          
          return newData;
        });
        
        // Refresh dashboard stats
        await fetchDashboardStats();
        
        // Navigate to relevant page
        if (modalKey === 'addParty') {
          setTimeout(() => {
            router.push('/dashboard/parties');
          }, 1000);
        } else {
          const action = quickActions.find(a => a.modalKey === modalKey);
          if (action) {
            setTimeout(() => {
              router.push(action.path);
            }, 1000);
          }
        }
      } else {
        throw new Error('API returned unsuccessful response');
      }
    } catch (error) {
      console.error('Real API call failed:', error);
      alert(`Failed to save data: ${(error as Error).message}`);
    }
    
    setModalLoading(false);
  };

  // Simplified stats fetch - with error handling
  const fetchDashboardStats = useCallback(async () => {
    const auth = checkAuth();
    if (!auth) return;

    try {
      const salesData = await makeApiCall(`/dashboard/stats/${auth.user.businessId}`);
      const customerData = await makeApiCall(`/parties/${auth.user.businessId}/count`);
      const itemData = await makeApiCall(`/items/${auth.user.businessId}/count`);

      setBusinessStats({
        totalSales: salesData?.data?.totalSales || 0,
        totalPurchases: salesData?.data?.totalPurchases || 0,
        totalCustomers: customerData?.data?.count || 0,
        itemsInStock: itemData?.data?.count || 0,
        pendingPayments: salesData?.data?.pendingPayments || 0,
        lowStockItems: salesData?.data?.lowStockItems || 0,
        monthlyProfit: salesData?.data?.monthlyProfit || 0,
        totalInvoices: salesData?.data?.totalInvoices || 0
      });
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
      // Keep default stats if API fails
    }
  }, [makeApiCall, checkAuth]);

  // Enhanced initialization with real auth check
  useEffect(() => {
    const initialize = async () => {
      console.log('Dashboard initializing...');
      setIsLoading(true);
      
      const auth = checkAuth();
      if (auth) {
        console.log('Auth successful, setting user:', auth.user);
        setUser(auth.user);
        await fetchDashboardStats();
      }
      
      setIsLoading(false);
    };

    initialize();
  }, [checkAuth, fetchDashboardStats]);

  // Simplified helper functions - with error handling
  const fetchSales = async (): Promise<any[]> => {
    const auth = checkAuth();
    if (!auth) return [];
    try {
      const result = await makeApiCall(`/sale/${auth.user.businessId}`, { method: 'GET' });
      return result.data || [];
    } catch (error) {
      console.error('Failed to fetch sales:', error);
      return [];
    }
  };

  const updateItem = async (itemId: string, updateData: any): Promise<any> => {
    const auth = checkAuth();
    if (!auth) return null;
    try {
      const result = await makeApiCall(`/items/${auth.user.businessId}/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });
      return result.data;
    } catch (error) {
      console.error('Failed to update item:', error);
      return null;
    }
  };

  const deleteParty = async (partyId: string): Promise<boolean> => {
    const auth = checkAuth();
    if (!auth) return false;
    try {
      await makeApiCall(`/parties/${auth.user.businessId}/${partyId}`, {
        method: 'DELETE',
      });
      return true;
    } catch (error) {
      console.error('Failed to delete party:', error);
      return false;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-10 -left-10 w-72 h-72 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
          <div className="absolute -top-10 -right-10 w-72 h-72 bg-gradient-to-br from-purple-400/20 to-pink-600/20 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-10 left-20 w-72 h-72 bg-gradient-to-br from-pink-400/20 to-red-600/20 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
        </div>
        
        <div className="text-center space-y-8 z-10">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
            <div className="absolute inset-0 w-20 h-20 border-4 border-purple-200 border-b-purple-600 rounded-full animate-spin mx-auto" style={{animationDirection: 'reverse'}}></div>
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Loading Dashboard
            </h1>
            <p className="text-xl text-gray-600 animate-pulse">Setting up your business command center...</p>
          </div>
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20">
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
              <Zap className="w-4 h-4 text-yellow-500 animate-pulse" />
              <span>Backend Server: {API_BASE_URL}</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">If this takes too long, please check if the backend is running on port 3001</p>
          </div>
        </div>
        
        <style jsx>{`
          @keyframes blob {
            0% { transform: translate(0px, 0px) scale(1); }
            33% { transform: translate(30px, -50px) scale(1.1); }
            66% { transform: translate(-20px, 20px) scale(0.9); }
            100% { transform: translate(0px, 0px) scale(1); }
          }
          .animate-blob {
            animation: blob 7s infinite;
          }
          .animation-delay-2000 {
            animation-delay: 2s;
          }
          .animation-delay-4000 {
            animation-delay: 4s;
          }
        `}</style>
      </div>
    );
  }

  // Check if user is loaded before rendering main content
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-pink-50 to-orange-50 flex items-center justify-center">
        <div className="text-center bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-red-200">
          <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl">⚠️</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Error</h2>
          <p className="text-gray-600">Unable to load user data</p>
        </div>
      </div>
    );
  }

  // Enhanced stats array with modern styling
  const dashboardStats = [
    { 
      title: 'Total Revenue', 
      value: `₹${businessStats.totalSales.toLocaleString()}`, 
      change: '+12%', 
      icon: DollarSign, 
      color: 'text-emerald-600',
      bgGradient: 'from-emerald-500 to-teal-600',
      bgLight: 'bg-emerald-50',
      trend: 'up'
    },
    { 
      title: 'Total Orders', 
      value: `${businessStats.totalInvoices.toLocaleString()}`, 
      change: '+8%', 
      icon: ShoppingCart, 
      color: 'text-blue-600',
      bgGradient: 'from-blue-500 to-indigo-600',
      bgLight: 'bg-blue-50',
      trend: 'up'
    },
    { 
      title: 'Products', 
      value: `${businessStats.itemsInStock.toLocaleString()}`, 
      change: '+3%', 
      icon: Package, 
      color: 'text-purple-600',
      bgGradient: 'from-purple-500 to-violet-600',
      bgLight: 'bg-purple-50',
      trend: 'up'
    },
    { 
      title: 'Customers', 
      value: `${businessStats.totalCustomers.toLocaleString()}`, 
      change: '+15%', 
      icon: Users, 
      color: 'text-orange-600',
      bgGradient: 'from-orange-500 to-red-500',
      bgLight: 'bg-orange-50',
      trend: 'up'
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-10 -left-10 w-72 h-72 bg-gradient-to-br from-blue-400/10 to-purple-600/10 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
        <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-br from-purple-400/10 to-pink-600/10 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-1/2 w-72 h-72 bg-gradient-to-br from-pink-400/10 to-indigo-600/10 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
      </div>

      {/* Enhanced Header */}
      <header className="relative bg-white/70 backdrop-blur-xl shadow-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform duration-200">
                  <span className="text-xl font-bold text-white">V</span>
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  Vypar Dashboard
                </h1>
                <p className="text-sm text-gray-500 hidden sm:block">Business Management System</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button className="relative p-3 text-gray-600 hover:text-indigo-600 transition-colors duration-200 hover:bg-indigo-50 rounded-xl">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-3 h-3 bg-gradient-to-r from-red-500 to-pink-500 rounded-full animate-ping"></span>
                <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full"></span>
              </button>
              <button className="p-3 text-gray-600 hover:text-indigo-600 transition-colors duration-200 hover:bg-indigo-50 rounded-xl">
                <Settings className="w-5 h-5" />
              </button>
              <div className="flex items-center space-x-3 bg-white/50 backdrop-blur-sm rounded-2xl px-4 py-2 border border-white/20">
                <div className="relative">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 via-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-white font-semibold text-sm">{user.name?.charAt(0) || 'U'}</span>
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-500">{user.email || 'No email'}</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  localStorage.removeItem('token');
                  localStorage.removeItem('user');
                  localStorage.removeItem('vypar_auth_token');
                  localStorage.removeItem('vypar_user_session');
                  localStorage.removeItem('businessId');
                  router.push('/');
                }}
                className="p-3 text-gray-600 hover:text-red-600 transition-colors duration-200 hover:bg-red-50 rounded-xl group"
                title="Logout"
              >
                <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Enhanced Welcome Section */}
        <div className="mb-12">
          <div className="flex items-center space-x-3 mb-4">
            <Sparkles className="w-8 h-8 text-yellow-500 animate-pulse" />
            <h2 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent">
              Welcome back, {user.name}!
            </h2>
          </div>
          <p className="text-xl text-gray-600 ml-11">Here's what's happening with your business today.</p>
        </div>

        {/* Enhanced Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {dashboardStats.map((stat, index) => (
            <div 
              key={index} 
              className="group relative bg-white/70 backdrop-blur-xl rounded-3xl shadow-lg border border-white/20 p-8 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-900 group-hover:scale-105 transition-transform duration-200">
                    {stat.value}
                  </p>
                  <div className="flex items-center space-x-2">
                    <div className={`flex items-center space-x-1 px-2 py-1 rounded-full ${stat.bgLight}`}>
                      <ArrowUpRight className={`w-3 h-3 ${stat.color}`} />
                      <span className={`text-sm font-semibold ${stat.color}`}>{stat.change}</span>
                    </div>
                    <span className="text-xs text-gray-500">from last month</span>
                  </div>
                </div>
                <div className="relative">
                  <div className={`w-16 h-16 bg-gradient-to-br ${stat.bgGradient} rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-300`}>
                    <stat.icon className="w-8 h-8 text-white" />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-2xl"></div>
                </div>
              </div>
              
              {/* Animated background gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.bgGradient} rounded-3xl opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
            </div>
          ))}
        </div>

        {/* Enhanced Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Enhanced Quick Actions Card */}
          <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-lg border border-white/20 p-8">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Quick Actions</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickAction(action)}
                  className={`group relative overflow-hidden bg-gradient-to-br ${action.color} p-4 rounded-2xl text-white shadow-lg hover:shadow-xl transform hover:scale-105 ${action.hoverColor} transition-all duration-300`}
                >
                  <div className="relative z-10">
                    <div className="text-2xl mb-2 group-hover:scale-110 transition-transform duration-200">
                      {action.icon}
                    </div>
                    <span className="text-sm font-semibold block leading-tight">
                      {action.title}
                    </span>
                  </div>
                  
                  {/* Animated background effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="absolute -top-10 -right-10 w-20 h-20 bg-white/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
                </button>
              ))}
            </div>
          </div>

          {/* Enhanced Recent Activity */}
          <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-lg border border-white/20 p-8">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Recent Activity</h3>
            </div>
            <div className="space-y-6">
              <div className="flex items-start space-x-4 group hover:bg-emerald-50 p-3 rounded-2xl transition-colors duration-200">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-200">
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">Payment received</p>
                  <p className="text-xs text-gray-500 mt-1">₹15,000 from Kumar Electronics</p>
                  <p className="text-xs text-emerald-600 mt-1">2 minutes ago</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4 group hover:bg-blue-50 p-3 rounded-2xl transition-colors duration-200">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-200">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">Invoice created</p>
                  <p className="text-xs text-gray-500 mt-1">INV-001 for ₹8,500</p>
                  <p className="text-xs text-blue-600 mt-1">15 minutes ago</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4 group hover:bg-purple-50 p-3 rounded-2xl transition-colors duration-200">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-200">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">Product updated</p>
                  <p className="text-xs text-gray-500 mt-1">Stock level for Laptop increased</p>
                  <p className="text-xs text-purple-600 mt-1">1 hour ago</p>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Chart placeholder */}
          <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-lg border border-white/20 p-8">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Sales Overview</h3>
            </div>
            <div className="relative h-48 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-2xl flex items-center justify-center overflow-hidden">
              {/* Animated background pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600" style={{
                  maskImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, black 10px, black 20px)',
                  WebkitMaskImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, black 10px, black 20px)'
                }}></div>
              </div>
              
              <div className="text-center z-10">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-bounce">
                  <BarChart3 className="w-8 h-8 text-white" />
                </div>
                <p className="text-sm font-medium text-gray-600">Interactive Chart</p>
                <p className="text-xs text-gray-500 mt-1">Coming Soon</p>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Welcome Banner */}
        <div className="relative bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-3xl p-10 text-white overflow-hidden">
          {/* Animated background elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full -translate-x-32 -translate-y-32 animate-pulse"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/5 rounded-full translate-x-48 translate-y-48"></div>
            <div className="absolute top-1/2 left-1/2 w-32 h-32 bg-white/10 rounded-full -translate-x-16 -translate-y-16 animate-ping"></div>
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-yellow-300 animate-pulse" />
              </div>
              <h3 className="text-3xl font-bold">Welcome to Vypar Dashboard!</h3>
            </div>
            
            <p className="text-lg text-indigo-100 mb-8 max-w-3xl">
              You've successfully logged in. This is your business command center where you can manage 
              inventory, create invoices, track customers, and monitor your business performance with advanced analytics.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 hover:bg-white/20 transition-colors duration-300 group">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200">
                  <FileText className="w-6 h-6" />
                </div>
                <h4 className="font-semibold text-lg mb-2">Smart Invoicing</h4>
                <p className="text-sm text-indigo-100">Create professional invoices with automated calculations and payment tracking</p>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 hover:bg-white/20 transition-colors duration-300 group">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200">
                  <Package className="w-6 h-6" />
                </div>
                <h4 className="font-semibold text-lg mb-2">Inventory Control</h4>
                <p className="text-sm text-indigo-100">Manage your products, track stock levels, and get low-stock alerts</p>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 hover:bg-white/20 transition-colors duration-300 group">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <h4 className="font-semibold text-lg mb-2">Business Analytics</h4>
                <p className="text-sm text-indigo-100">Track performance with detailed reports and business insights</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Enhanced Modal Styles */}
      <style jsx global>{`
        .modal-overlay {
          backdrop-filter: blur(8px);
          background: rgba(0, 0, 0, 0.3);
        }
        
        .modal-content {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        
        .animate-blob {
          animation: blob 7s infinite;
        }
        
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>

      {/* All modals remain the same but with enhanced input styling */}
      <EnhancedModal
        isOpen={activeModal === 'saleInvoice'}
        onClose={() => setActiveModal(null)}
        title="Quick Sale Invoice"
      >
        <LoadingOverlay show={modalLoading} message="Creating Invoice..." />
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Customer Name</label>
            <input
              type="text"
              value={formData.saleInvoice.customer}
              onChange={(e) => handleInputChange('saleInvoice', 'customer', e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white/50 backdrop-blur-sm"
              placeholder="Enter customer name"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Invoice Amount</label>
            <input
              type="number"
              value={formData.saleInvoice.amount}
              onChange={(e) => handleInputChange('saleInvoice', 'amount', e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white/50 backdrop-blur-sm"
              placeholder="₹ 0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Items Description</label>
            <textarea
              value={formData.saleInvoice.items}
              onChange={(e) => handleInputChange('saleInvoice', 'items', e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white/50 backdrop-blur-sm"
              rows={3}
              placeholder="Describe items sold"
            />
          </div>
          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={() => handleFormSubmit('saleInvoice')}
              disabled={modalLoading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 font-semibold shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              Create Invoice
            </button>
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl hover:from-gray-600 hover:to-gray-700 font-semibold shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              Cancel
            </button>
          </div>
        </div>
      </EnhancedModal>

      <EnhancedModal
        isOpen={activeModal === 'purchaseBill'}
        onClose={() => setActiveModal(null)}
        title="Quick Purchase Bill"
      >
        <LoadingOverlay show={modalLoading} message="Creating Purchase..." />
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Supplier Name</label>
            <input
              type="text"
              value={formData.purchaseBill.supplier}
              onChange={(e) => handleInputChange('purchaseBill', 'supplier', e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white/50 backdrop-blur-sm"
              placeholder="Enter supplier name"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Bill Amount</label>
            <input
              type="number"
              value={formData.purchaseBill.amount}
              onChange={(e) => handleInputChange('purchaseBill', 'amount', e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white/50 backdrop-blur-sm"
              placeholder="₹ 0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Items Description</label>
            <textarea
              value={formData.purchaseBill.items}
              onChange={(e) => handleInputChange('purchaseBill', 'items', e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white/50 backdrop-blur-sm"
              rows={3}
              placeholder="Describe items purchased"
            />
          </div>
          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={() => handleFormSubmit('purchaseBill')}
              disabled={modalLoading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 font-semibold shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              Create Purchase
            </button>
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl hover:from-gray-600 hover:to-gray-700 font-semibold shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              Cancel
            </button>
          </div>
        </div>
      </EnhancedModal>

      <EnhancedModal
        isOpen={activeModal === 'addItem'}
        onClose={() => setActiveModal(null)}
        title="Add New Item"
      >
        <LoadingOverlay show={modalLoading} message="Adding Item..." />
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Item Name</label>
            <input
              type="text"
              value={formData.addItem.name}
              onChange={(e) => handleInputChange('addItem', 'name', e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-white/50 backdrop-blur-sm"
              placeholder="Enter item name"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Sale Price</label>
              <input
                type="number"
                value={formData.addItem.salePrice}
                onChange={(e) => handleInputChange('addItem', 'salePrice', e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-white/50 backdrop-blur-sm"
                placeholder="₹ 0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Purchase Price</label>
              <input
                type="number"
                value={formData.addItem.purchasePrice}
                onChange={(e) => handleInputChange('addItem', 'purchasePrice', e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-white/50 backdrop-blur-sm"
                placeholder="₹ 0.00"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Stock Quantity</label>
            <input
              type="number"
              value={formData.addItem.stock}
              onChange={(e) => handleInputChange('addItem', 'stock', e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-white/50 backdrop-blur-sm"
              placeholder="0"
            />
          </div>
          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={() => handleFormSubmit('addItem')}
              disabled={modalLoading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl hover:from-purple-700 hover:to-violet-700 disabled:opacity-50 font-semibold shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              Add Item
            </button>
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl hover:from-gray-600 hover:to-gray-700 font-semibold shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              Cancel
            </button>
          </div>
        </div>
      </EnhancedModal>

      <EnhancedModal
        isOpen={activeModal === 'addParty'}
        onClose={() => setActiveModal(null)}
        title="Add New Party"
      >
        <LoadingOverlay show={modalLoading} message="Adding Party..." />
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Party Name</label>
            <input
              type="text"
              value={formData.addParty.name}
              onChange={(e) => handleInputChange('addParty', 'name', e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 bg-white/50 backdrop-blur-sm"
              placeholder="Enter party name"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
              <input
                type="tel"
                value={formData.addParty.phone}
                onChange={(e) => handleInputChange('addParty', 'phone', e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 bg-white/50 backdrop-blur-sm"
                placeholder="+91 98765 43210"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Type</label>
              <select
                value={formData.addParty.type}
                onChange={(e) => handleInputChange('addParty', 'type', e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 bg-white/50 backdrop-blur-sm"
              >
                <option value="Customer">Customer</option>
                <option value="Supplier">Supplier</option>
                <option value="Both">Both</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Address (Optional)</label>
            <textarea
              value={formData.addParty.address}
              onChange={(e) => handleInputChange('addParty', 'address', e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 bg-white/50 backdrop-blur-sm"
              rows={2}
              placeholder="Enter address"
            />
          </div>
          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={() => handleFormSubmit('addParty')}
              disabled={modalLoading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl hover:from-orange-700 hover:to-red-700 disabled:opacity-50 font-semibold shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              Add Party
            </button>
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl hover:from-gray-600 hover:to-gray-700 font-semibold shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              Cancel
            </button>
          </div>
        </div>
      </EnhancedModal>

      <EnhancedModal
        isOpen={activeModal === 'paymentIn'}
        onClose={() => setActiveModal(null)}
        title="Payment In"
      >
        <LoadingOverlay show={modalLoading} message="Recording Payment..." />
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Party Name</label>
            <input
              type="text"
              value={formData.paymentIn.party}
              onChange={(e) => handleInputChange('paymentIn', 'party', e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 bg-white/50 backdrop-blur-sm"
              placeholder="Enter party name"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Amount</label>
              <input
                type="number"
                value={formData.paymentIn.amount}
                onChange={(e) => handleInputChange('paymentIn', 'amount', e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 bg-white/50 backdrop-blur-sm"
                placeholder="₹ 0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Mode</label>
              <select
                value={formData.paymentIn.mode}
                onChange={(e) => handleInputChange('paymentIn', 'mode', e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 bg-white/50 backdrop-blur-sm"
              >
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="UPI">UPI</option>
                <option value="Card">Card</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Description (Optional)</label>
            <textarea
              value={formData.paymentIn.description}
              onChange={(e) => handleInputChange('paymentIn', 'description', e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 bg-white/50 backdrop-blur-sm"
              rows={2}
              placeholder="Payment description"
            />
          </div>
          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={() => handleFormSubmit('paymentIn')}
              disabled={modalLoading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 font-semibold shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              Record Payment
            </button>
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl hover:from-gray-600 hover:to-gray-700 font-semibold shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              Cancel
            </button>
          </div>
        </div>
      </EnhancedModal>

      <EnhancedModal
        isOpen={activeModal === 'paymentOut'}
        onClose={() => setActiveModal(null)}
        title="Payment Out"
      >
        <LoadingOverlay show={modalLoading} message="Recording Payment..." />
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Party Name</label>
            <input
              type="text"
              value={formData.paymentOut.party}
              onChange={(e) => handleInputChange('paymentOut', 'party', e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 bg-white/50 backdrop-blur-sm"
              placeholder="Enter party name"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Amount</label>
              <input
                type="number"
                value={formData.paymentOut.amount}
                onChange={(e) => handleInputChange('paymentOut', 'amount', e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 bg-white/50 backdrop-blur-sm"
                placeholder="₹ 0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Mode</label>
              <select
                value={formData.paymentOut.mode}
                onChange={(e) => handleInputChange('paymentOut', 'mode', e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 bg-white/50 backdrop-blur-sm"
              >
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="UPI">UPI</option>
                <option value="Card">Card</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Description (Optional)</label>
            <textarea
              value={formData.paymentOut.description}
              onChange={(e) => handleInputChange('paymentOut', 'description', e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 bg-white/50 backdrop-blur-sm"
              rows={2}
              placeholder="Payment description"
            />
          </div>
          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={() => handleFormSubmit('paymentOut')}
              disabled={modalLoading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl hover:from-red-700 hover:to-pink-700 disabled:opacity-50 font-semibold shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              Record Payment
            </button>
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl hover:from-gray-600 hover:to-gray-700 font-semibold shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              Cancel
            </button>
          </div>
        </div>
      </EnhancedModal>

      <EnhancedModal
        isOpen={activeModal === 'quickExpense'}
        onClose={() => setActiveModal(null)}
        title="Record Quick Expense"
      >
        <LoadingOverlay show={modalLoading} message="Recording Expense..." />
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Expense Category</label>
            <select
              value={formData.quickExpense.category}
              onChange={(e) => handleInputChange('quickExpense', 'category', e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200 bg-white/50 backdrop-blur-sm"
            >
              <option value="">Select Category</option>
              <option value="Office Supplies">Office Supplies</option>
              <option value="Transportation">Transportation</option>
              <option value="Utilities">Utilities</option>
              <option value="Marketing">Marketing</option>
              <option value="Rent">Rent</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Amount</label>
            <input
              type="number"
              value={formData.quickExpense.amount}
              onChange={(e) => handleInputChange('quickExpense', 'amount', e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200 bg-white/50 backdrop-blur-sm"
              placeholder="₹ 0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
            <textarea
              value={formData.quickExpense.description}
              onChange={(e) => handleInputChange('quickExpense', 'description', e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200 bg-white/50 backdrop-blur-sm"
              rows={3}
              placeholder="Expense description"
            />
          </div>
          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={() => handleFormSubmit('quickExpense')}
              disabled={modalLoading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-pink-600 to-rose-600 text-white rounded-xl hover:from-pink-700 hover:to-rose-700 disabled:opacity-50 font-semibold shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              Record Expense
            </button>
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl hover:from-gray-600 hover:to-gray-700 font-semibold shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              Cancel
            </button>
          </div>
        </div>
      </EnhancedModal>

      <EnhancedModal
        isOpen={activeModal === 'stockAdjustment'}
        onClose={() => setActiveModal(null)}
        title="Stock Adjustment"
      >
        <LoadingOverlay show={modalLoading} message="Adjusting Stock..." />
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Item Name</label>
            <input
              type="text"
              value={formData.stockAdjustment.item}
              onChange={(e) => handleInputChange('stockAdjustment', 'item', e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white/50 backdrop-blur-sm"
              placeholder="Enter item name"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Quantity Adjustment</label>
            <input
              type="number"
              value={formData.stockAdjustment.quantity}
              onChange={(e) => handleInputChange('stockAdjustment', 'quantity', e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white/50 backdrop-blur-sm"
              placeholder="Enter quantity (+/-)"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Reason</label>
            <select
              value={formData.stockAdjustment.reason}
              onChange={(e) => handleInputChange('stockAdjustment', 'reason', e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white/50 backdrop-blur-sm"
            >
              <option value="">Select Reason</option>
              <option value="Damaged">Damaged</option>
              <option value="Lost">Lost</option>
              <option value="Found">Found</option>
              <option value="Returned">Returned</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={() => handleFormSubmit('stockAdjustment')}
              disabled={modalLoading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 font-semibold shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              Adjust Stock
            </button>
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl hover:from-gray-600 hover:to-gray-700 font-semibold shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              Cancel
            </button>
          </div>
        </div>
      </EnhancedModal>

    </div>
  );
}