'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
  businessName?: string;
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
  const [user, setUser] = useState<User | null>(null);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // API call with real authentication
  const makeApiCall = useCallback(async (endpoint: string, options: RequestInit = {}): Promise<any> => {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...options.headers,
        },
      });
      
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
  }, [API_BASE_URL]);

  // Simplified stats fetch - with error handling
  const fetchDashboardStats = useCallback(async () => {
    try {
      const salesData = await makeApiCall(`/dashboard/stats`);
      const customerData = await makeApiCall(`/parties/count`);
      const itemData = await makeApiCall(`/items/count`);

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
  }, [makeApiCall]);

  // Enhanced initialization with real auth check
  useEffect(() => {
    const initialize = async () => {
      console.log('Dashboard initializing...');
      await fetchDashboardStats();
    };

    initialize();
  }, [fetchDashboardStats]);

  // Fetch logged-in user details
  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const res = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        }
      } catch (err) {
        console.error('Failed to fetch user:', err);
      }
    };
    fetchUser();
  }, [API_BASE_URL]);

  // Simplified helper functions - with error handling
  const fetchSales = async (): Promise<any[]> => {
    try {
      const result = await makeApiCall(`/sale`, { method: 'GET' });
      return result.data || [];
    } catch (error) {
      console.error('Failed to fetch sales:', error);
      return [];
    }
  };

  const updateItem = async (itemId: string, updateData: any): Promise<any> => {
    try {
      const result = await makeApiCall(`/items/${itemId}`, {
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
    try {
      await makeApiCall(`/parties/${partyId}`, {
        method: 'DELETE',
      });
      return true;
    } catch (error) {
      console.error('Failed to delete party:', error);
      return false;
    }
  };

  // Enhanced stats array with modern styling
  const dashboardStats = [
    { 
      title: 'Total Revenue', 
      value: `PKR ${(businessStats.totalSales ?? 0).toLocaleString()}`, 
      change: '+12%', 
      icon: DollarSign, 
      color: 'text-emerald-600',
      bgGradient: 'from-emerald-500 to-teal-600',
      bgLight: 'bg-emerald-50',
      trend: 'up'
    },
    { 
      title: 'Total Orders', 
      value: `${(businessStats.totalInvoices ?? 0).toLocaleString()}`, 
      change: '+8%', 
      icon: ShoppingCart, 
      color: 'text-blue-600',
      bgGradient: 'from-blue-500 to-indigo-600',
      bgLight: 'bg-blue-50',
      trend: 'up'
    },
    { 
      title: 'Products', 
      value: `${(businessStats.itemsInStock ?? 0).toLocaleString()}`, 
      change: '+3%', 
      icon: Package, 
      color: 'text-purple-600',
      bgGradient: 'from-purple-500 to-violet-600',
      bgLight: 'bg-purple-50',
      trend: 'up'
    },
    { 
      title: 'Customers', 
      value: `${(businessStats.totalCustomers ?? 0).toLocaleString()}`, 
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
      <header className="relative bg-white/70 backdrop-blur-xl shadow-lg border-b border-white/20 w-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform duration-200">
                <span className="text-xl font-bold text-white">DD</span>
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full animate-pulse"></div>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                Devease Digital Dashboard
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
                  <span className="text-white font-semibold text-sm">{user ? user.name[0] : 'U'}</span>
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-gray-900">{user ? user.businessName : 'Business'}</p>
                <p className="text-xs text-gray-500">{user ? user.email : 'user@email.com'}</p>
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
      </header>

      {/* Main Content */}
      <main className="relative w-full px-2 sm:px-4 md:px-6 lg:px-8 py-6 md:py-8">
        {/* Enhanced Welcome Section */}
        <div className="mb-12">
          <div className="flex items-center space-x-3 mb-4">
            <Sparkles className="w-8 h-8 text-yellow-500 animate-pulse" />
            <h2 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent">
              Welcome back, {user ? user.businessName : 'Business'}!
            </h2>
          </div>
          <p className="text-xl text-gray-600 ml-11">Here's what's happening with your business today.</p>
        </div>

        {/* Enhanced Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8 md:mb-12 w-full">
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
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-yellow-300 animate-pulse" />
              </div>
              <h3 className="text-3xl font-bold">Welcome to Devease Digital Dashboard!</h3>
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

    </div>
  );
}