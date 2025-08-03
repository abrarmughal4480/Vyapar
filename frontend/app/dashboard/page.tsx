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
  LogOut,
  Plus,
  Eye,
  Calendar,
  FileText,
  ShoppingCart,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Zap,
  AlertTriangle
} from 'lucide-react';
import { fetchDashboardStats, fetchSalesOverview, fetchRecentActivity } from '@/http/api';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import EnhancedModal from '../../components/EnhancedModal';
import { getReceivables, getPayables } from '@/http/parties';

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
  lowStockItems?: number;
  monthlyProfit: number;
  totalInvoices: number;
  totalRevenue?: number;
  revenueChange?: number;
  totalOrdersChange?: number;
  productsChange?: number;
  customersChange?: number;
  totalOrders?: number;
  totalReceivable?: number;
  totalPayable?: number;
  totalStockValue?: number;
  outOfStockItems?: number;
  negativeStockItems?: number;
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
    path: '/dashboard/sale/add'
  },
  {
    title: 'New Purchase Bill',
    icon: '🛒',
    color: 'from-blue-500 to-indigo-600',
    hoverColor: 'hover:from-blue-600 hover:to-indigo-700',
    textColor: 'text-blue-600',
    bgColor: 'bg-blue-50',
    modalKey: 'purchaseBill',
    path: '/dashboard/purchaseAdd'
  },
  {
    title: 'Add Item',
    icon: '📦',
    color: 'from-purple-500 to-violet-600',
    hoverColor: 'hover:from-purple-600 hover:to-violet-700',
    textColor: 'text-purple-600',
    bgColor: 'bg-purple-50',
    modalKey: 'addItem',
    path: '/dashboard/items/add-item' // updated path
  },
  {
    title: 'Add Party',
    icon: '👥',
    color: 'from-orange-500 to-red-500',
    hoverColor: 'hover:from-orange-600 hover:to-red-600',
    textColor: 'text-orange-600',
    bgColor: 'bg-orange-50',
    modalKey: 'addParty',
    path: '/dashboard/parties?addParty=1'
  },
  {
    title: 'Payment In',
    icon: '⬆️',
    color: 'from-rose-500 to-pink-600',
    hoverColor: 'hover:from-rose-600 hover:to-pink-700',
    textColor: 'text-rose-600',
    bgColor: 'bg-rose-50',
    modalKey: 'paymentIn',
    path: '/dashboard/payment-in?openPaymentModal=true'
  },
  {
    title: 'Payment Out',
    icon: '⬇️',
    color: 'from-amber-500 to-yellow-600',
    hoverColor: 'hover:from-amber-600 hover:to-yellow-700',
    textColor: 'text-amber-600',
    bgColor: 'bg-amber-50',
    modalKey: 'paymentOut',
    path: '/dashboard/payment-out?openPaymentModal=true'
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
  const [salesOverview, setSalesOverview] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [showReceivableModal, setShowReceivableModal] = useState(false);
  const [showPayableModal, setShowPayableModal] = useState(false);
  const [receivables, setReceivables] = useState<any[]>([]);
  const [payables, setPayables] = useState<any[]>([]);
  const [loadingReceivables, setLoadingReceivables] = useState(false);
  const [loadingPayables, setLoadingPayables] = useState(false);
  const [showStockSummaryModal, setShowStockSummaryModal] = useState(false);
  const [stockSummary, setStockSummary] = useState<any>({ items: [] });
  const [loadingStockSummary, setLoadingStockSummary] = useState(false);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // Enhanced initialization with real auth check
  useEffect(() => {
    const getStats = async () => {
      try {
        let token: string | undefined = undefined;
        if (typeof window !== 'undefined') {
          const t = localStorage.getItem('token');
          token = t !== null ? t : undefined;
        }
        // Fetch dashboard stats and sales overview for area chart
        const result = await fetchDashboardStats(token);
        if (result && result.success && result.data) {
          console.log('Dashboard Stats Received:', result.data);
          setBusinessStats((prev) => ({
            ...prev,
            ...result.data,
          }));
        }
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user && user._id) {
          const data = await fetchSalesOverview(user._id, token);
          if (data && data.success && data.overview && Array.isArray(data.overview)) {
            // Format for recharts: label as date, value as netSales
            const formatted = data.overview.map((item: any) => ({
              name: item.date,
              netSales: item.netSales,
              totalSales: item.totalSales,
              totalCredit: item.totalCredit
            }));
            setSalesOverview(formatted);
          }
          // Fetch recent activity
          const activityRes = await fetchRecentActivity(user._id, token);
          if (activityRes && activityRes.success && Array.isArray(activityRes.activities)) {
            setRecentActivity(activityRes.activities);
          }
        }
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      }
    };
    getStats();
  }, []);

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
      const response = await fetch(`${API_BASE_URL}/sale`, { method: 'GET' });
      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.error('Failed to fetch sales:', error);
      return [];
    }
  };

  const updateItem = async (itemId: string, updateData: any): Promise<any> => {
    try {
      const response = await fetch(`${API_BASE_URL}/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Failed to update item:', error);
      return null;
    }
  };

  const deleteParty = async (partyId: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/parties/${partyId}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('Failed to delete party:', error);
      return false;
    }
  };

  const openReceivableModal = async () => {
    setShowReceivableModal(true);
    setLoadingReceivables(true);
    try {
      let token: string | undefined = undefined;
      if (typeof window !== 'undefined') {
        const t = localStorage.getItem('token');
        token = t !== null ? t : undefined;
      }
      const data = await getReceivables(token || '');
      setReceivables(data || []);
    } catch (e) {
      setReceivables([]);
    }
    setLoadingReceivables(false);
  };
  const openPayableModal = async () => {
    setShowPayableModal(true);
    setLoadingPayables(true);
    try {
      let token: string | undefined = undefined;
      if (typeof window !== 'undefined') {
        const t = localStorage.getItem('token');
        token = t !== null ? t : undefined;
      }
      const data = await getPayables(token || '');
      setPayables(data || []);
    } catch (e) {
      setPayables([]);
    }
    setLoadingPayables(false);
  };

  const openStockSummaryModal = async () => {
    setShowStockSummaryModal(true);
    setLoadingStockSummary(true);
    try {
      let token: string | undefined = undefined;
      if (typeof window !== 'undefined') {
        const t = localStorage.getItem('token');
        token = t !== null ? t : undefined;
      }
      const response = await fetch(`${API_BASE_URL}/dashboard/stock-summary`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const result = await response.json();
        setStockSummary(result.data || { items: [] });
      }
    } catch (e) {
      setStockSummary({ items: [] });
    }
    setLoadingStockSummary(false);
  };



  // Enhanced stats array with modern styling
  const dashboardStats = [
    { 
      title: 'Total Revenue', 
      value: `PKR ${(businessStats.totalRevenue ?? 0).toLocaleString()}`, 
      change: `${businessStats.revenueChange !== undefined ? (businessStats.revenueChange >= 0 ? '+' : '') + businessStats.revenueChange.toFixed(1) + '%' : ''}`, 
      icon: DollarSign, 
      color: businessStats.revenueChange !== undefined ? (businessStats.revenueChange >= 0 ? 'text-emerald-600' : 'text-red-600') : 'text-emerald-600',
      bgGradient: 'from-emerald-500 to-teal-600',
      bgLight: 'bg-emerald-50',
      trend: businessStats.revenueChange !== undefined ? (businessStats.revenueChange >= 0 ? 'up' : 'down') : 'up'
    },
    { 
      title: 'Stock Value', 
      value: `PKR ${(businessStats.totalStockValue ?? 0).toLocaleString()}`, 
      change: `${businessStats.totalOrdersChange !== undefined ? (businessStats.totalOrdersChange >= 0 ? '+' : '') + businessStats.totalOrdersChange.toFixed(1) + '%' : ''}`, 
      icon: Package, 
      color: businessStats.totalOrdersChange !== undefined ? (businessStats.totalOrdersChange >= 0 ? 'text-blue-600' : 'text-red-600') : 'text-blue-600',
      bgGradient: 'from-blue-500 to-indigo-600',
      bgLight: 'bg-blue-50',
      trend: businessStats.totalOrdersChange !== undefined ? (businessStats.totalOrdersChange >= 0 ? 'up' : 'down') : 'up'
    },
    {
      title: 'Low Stock Summary',
      value: `${(businessStats.lowStockItems ?? 0) + (businessStats.outOfStockItems ?? 0) + (businessStats.negativeStockItems ?? 0)}`,
      change: '',
      icon: AlertTriangle,
      color: 'text-orange-600',
      bgGradient: 'from-orange-500 to-red-600',
      bgLight: 'bg-orange-50',
      trend: 'down',
      onClick: openStockSummaryModal,
    },
    // New Stat: Total Receivable
    {
      title: 'Total Receivable',
      value: `PKR ${(businessStats.totalReceivable ?? 0).toLocaleString()}`,
      change: '',
      icon: ArrowUpRight, // Up arrow for incoming money
      color: 'text-green-600',
      bgGradient: 'from-green-500 to-emerald-600',
      bgLight: 'bg-green-50',
      trend: 'up',
      onClick: openReceivableModal,
    },
    // New Stat: Total Payable
    {
      title: 'Total Payable',
      value: `PKR ${(businessStats.totalPayable ?? 0).toLocaleString()}`,
      change: '',
      icon: ArrowDownRight, // Down arrow for outgoing money
      color: 'text-red-600',
      bgGradient: 'from-red-500 to-pink-600',
      bgLight: 'bg-red-50',
      trend: 'down',
      onClick: openPayableModal,
    },
  ];

  // Icon map for activity types
  const activityIcons: Record<string, any> = {
    'Sale': DollarSign,
    'Purchase': ShoppingCart,
    'Credit Note': FileText,
    'Delivery Challan': Package,
    'Estimate': FileText,
    'Item': Package,
    'Party': Users,
  };
  // Color map for activity types
  const activityColors: Record<string, string> = {
    'Sale': 'from-emerald-500 to-teal-600',
    'Purchase': 'from-blue-500 to-indigo-600',
    'Credit Note': 'from-rose-500 to-pink-600',
    'Delivery Challan': 'from-purple-500 to-violet-600',
    'Estimate': 'from-indigo-500 to-purple-600',
    'Item': 'from-amber-500 to-yellow-500',
    'Party': 'from-orange-500 to-red-500',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden" style={{ zoom: '0.9' }}>
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
            <div className="flex items-center space-x-3 bg-white/50 backdrop-blur-sm rounded-2xl px-4 py-2 border border-white/20">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 via-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg cursor-pointer"
                  onClick={() => router.push('/dashboard/profile')}>
                  <span className="text-white font-semibold text-sm">{user ? user.name[0] : 'U'}</span>
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-gray-900">{user ? user.businessName : 'Business'}</p>
                <p className="text-xs text-gray-500 cursor-pointer" onClick={() => router.push('/dashboard/profile')}>{user ? user.email : 'user@email.com'}</p>
              </div>
            </div>

            <button 
              onClick={() => {
                localStorage.removeItem('isAuthenticated');
                localStorage.removeItem('businessName');
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                localStorage.removeItem('devease_auth_token');
                localStorage.removeItem('devease_user_session');
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
      <main className="relative w-full px-2 sm:px-4 md:px-6 lg:px-8 py-4 md:py-6">
        {/* Enhanced Welcome Section */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-3">
            <Sparkles className="w-7 h-7 text-yellow-500 animate-pulse" />
            <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent">
              Welcome back, {user ? user.businessName : 'Business'}!
            </h2>
          </div>
          <p className="text-lg text-gray-600 ml-10">Here's what's happening with your business today.</p>
        </div>

        {/* Enhanced Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5 mb-6 md:mb-10 w-full">
          {dashboardStats.map((stat, index) => (
            <div
              key={index}
              className={`group relative bg-white/70 backdrop-blur-xl rounded-3xl shadow-lg border border-white/20 p-6 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 ${stat.onClick ? 'cursor-pointer' : ''}`}
              onClick={stat.onClick}
            >
              <div className="flex items-start justify-between">
                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 group-hover:scale-105 transition-transform duration-200">
                    {stat.value}
                  </p>
                  <div className="flex items-center space-x-2">
                    <div className={`flex items-center space-x-1 px-2 py-1 rounded-full ${stat.bgLight}`}>
                      <stat.icon className={`w-3 h-3 ${stat.color}`} />
                      <span className={`text-sm font-semibold ${stat.color}`}>{stat.change}</span>
                    </div>
                    <span className="text-xs text-gray-500">from last month</span>
                  </div>
                </div>
                <div className="relative">
                  <div className={`w-14 h-14 bg-gradient-to-br ${stat.bgGradient} rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-300`}>
                    <stat.icon className="w-7 h-7 text-white" />
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          {/* Enhanced Quick Actions Card */}
          <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-lg border border-white/20 p-6">
            <div className="flex items-center space-x-3 mb-5">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Quick Actions</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  className={`group relative overflow-hidden bg-gradient-to-br ${action.color} p-3 rounded-2xl text-white shadow-lg hover:shadow-xl transform hover:scale-105 ${action.hoverColor} transition-all duration-300`}
                  onClick={() => router.push(action.path)}
                >
                  <div className="relative z-10">
                    <div className="text-xl mb-1 group-hover:scale-110 transition-transform duration-200">
                      {action.icon}
                    </div>
                    <span className="text-xs font-semibold block leading-tight">
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

          {/* Enhanced Recent Activity (dynamic) */}
          <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-lg border border-white/20 p-6">
            <div className="flex items-center space-x-3 mb-5">
              <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                <Activity className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Recent Activity</h3>
            </div>
            <div className="space-y-4">
              {recentActivity.length === 0 && (
                <div className="text-gray-500 text-sm">No recent activity</div>
              )}
              {recentActivity.map((act, idx) => {
                const Icon = activityIcons[act.type] || FileText;
                const bgColor = activityColors[act.type] || 'from-gray-400 to-gray-600';
                // Professional label and details
                let mainLabel = '';
                let subLabel = '';
                if (act.type === 'Party') {
                  mainLabel = act.party || 'Party created';
                  subLabel = 'Party created';
                } else if (act.type === 'Item') {
                  mainLabel = act.party || 'Item added';
                  subLabel = 'Item added';
                } else {
                  mainLabel = `${act.type}${act.refNo ? ` (${act.refNo})` : ''}`;
                  subLabel = act.party ? act.party : '';
                }
                return (
                  <div key={idx} className={`flex items-start space-x-3 group hover:bg-emerald-50 p-2 rounded-2xl transition-colors duration-200`}>
                    <div className={`w-10 h-10 bg-gradient-to-br ${bgColor} rounded-2xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-200`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{mainLabel}</p>
                      <p className="text-xs text-gray-500 mt-1">{subLabel}{act.amount && act.type !== 'Party' && act.type !== 'Item' ? ` • PKR ${act.amount.toLocaleString()}` : ''}</p>
                      {/* For Party: only show if nonzero. For Item: always show, default 0 */}
                      {act.type === 'Party' && act.amount && act.amount !== 0 && (
                        <p className="text-xs text-gray-500 mt-1">Opening Balance: PKR {act.amount.toLocaleString()}</p>
                      )}
                      {act.type === 'Item' && (
                        <p className="text-xs text-gray-500 mt-1">Opening Stock: {act.amount ?? 0}</p>
                      )}
                      <p className="text-xs text-emerald-600 mt-1">{act.date ? new Date(act.date).toLocaleString() : ''}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Enhanced Chart placeholder (replace this with real area chart) */}
          <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-lg border border-white/20 p-6 flex flex-col justify-between">
            <div className="flex items-center space-x-3 mb-5">
              <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Sales Overview (Last 30 Days)</h3>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <div className="relative h-40 w-full bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-2xl flex items-center justify-center overflow-hidden">
                <ResponsiveContainer width="100%" height={150}>
                  <AreaChart data={salesOverview} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }}/>
                    <YAxis tick={{ fontSize: 12 }}/>
                    <CartesianGrid strokeDasharray="3 3" />
                    <Tooltip formatter={(value: any) => `PKR ${value.toLocaleString()}`}/>
                    <Area type="monotone" dataKey="netSales" stroke="#6366f1" fillOpacity={1} fill="url(#colorSales)" name="Net Sales" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Welcome Banner */}
        {false && (
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
        )}
      </main>



      {/* Most Used Reports Section */}
      <div className="mb-10 px-2 sm:px-4 md:px-6 lg:px-8">
        <h2 className="text-xl font-bold mb-3 text-gray-800">Most Used Reports</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <button
              className="group bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl p-5 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex flex-col items-center justify-center"
              onClick={() => router.push('/dashboard/reports/sale')}
            >
              <BarChart3 className="w-7 h-7 mb-1" />
              <span className="font-semibold text-base">Sale Report</span>
            </button>
            <button
              className="group bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-2xl p-5 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex flex-col items-center justify-center"
              onClick={() => router.push('/dashboard/reports/all-transactions')}
            >
              <FileText className="w-7 h-7 mb-1" />
              <span className="font-semibold text-base">All Transactions</span>
            </button>
            <button
              className="group bg-gradient-to-br from-purple-500 to-violet-600 text-white rounded-2xl p-5 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex flex-col items-center justify-center"
              onClick={() => router.push('/dashboard/reports/day-book')}
            >
              <Calendar className="w-7 h-7 mb-1" />
              <span className="font-semibold text-base">Daybook Report</span>
            </button>
            <button
              className="group bg-gradient-to-br from-orange-500 to-red-500 text-white rounded-2xl p-5 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex flex-col items-center justify-center"
              onClick={() => router.push('/dashboard/reports/party-statement')}
            >
              <Users className="w-7 h-7 mb-1" />
              <span className="font-semibold text-base">Party Statement</span>
            </button>
        </div>
      </div>

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

      {/* Modals for Receivables/Payables/Stock Summary */}
      <EnhancedModal
        isOpen={showReceivableModal}
        onClose={() => setShowReceivableModal(false)}
        title="Total Receivable List"
      >
        {loadingReceivables ? (
          <div className="text-center py-4">Loading...</div>
        ) : (
          <div>
            {receivables.length === 0 ? (
              <div className="text-gray-500 text-sm">No receivables found.</div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {receivables.map((party) => (
                  <li
                    key={party._id}
                    className="py-2 flex justify-between items-center cursor-pointer hover:bg-emerald-50 px-2 rounded"
                    onClick={() => {
                      setShowReceivableModal(false);
                      router.push(`/dashboard/parties?search=${encodeURIComponent(party.name)}`);
                    }}
                  >
                    <span className="font-medium text-gray-900">{party.name}</span>
                    <span className="text-green-600 font-semibold">PKR {party.amount.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </EnhancedModal>
      <EnhancedModal
        isOpen={showPayableModal}
        onClose={() => setShowPayableModal(false)}
        title="Total Payable List"
      >
        {loadingPayables ? (
          <div className="text-center py-4">Loading...</div>
        ) : (
          <div>
            {payables.length === 0 ? (
              <div className="text-gray-500 text-sm">No payables found.</div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {payables.map((party) => (
                  <li
                    key={party._id}
                    className="py-2 flex justify-between items-center cursor-pointer hover:bg-red-50 px-2 rounded"
                    onClick={() => {
                      setShowPayableModal(false);
                      router.push(`/dashboard/parties?search=${encodeURIComponent(party.name)}`);
                    }}
                  >
                    <span className="font-medium text-gray-900">{party.name}</span>
                    <span className="text-red-600 font-semibold">PKR {party.amount.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </EnhancedModal>
      <EnhancedModal
        isOpen={showStockSummaryModal}
        onClose={() => setShowStockSummaryModal(false)}
        title="Low Stock Summary"
      >
        {loadingStockSummary ? (
          <div className="text-center py-4">Loading...</div>
        ) : (
          <div>
            {stockSummary.items?.length === 0 ? (
              <div className="text-gray-500 text-sm">No stock issues found.</div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {stockSummary.items?.map((item: any, index: number) => {
                  let stockColor = 'text-gray-600';
                  let stockText = item.currentStock.toString();
                  
                  if (item.issueType === 'negative') {
                    stockColor = 'text-red-800';
                    stockText = `-${Math.abs(item.currentStock)}`;
                  } else if (item.issueType === 'outOfStock') {
                    stockColor = 'text-red-600';
                    stockText = '0';
                  } else if (item.issueType === 'lowStock') {
                    stockColor = 'text-orange-600';
                    stockText = item.currentStock.toString();
                  }
                  
                  return (
                    <li key={index} className="py-2 flex justify-between items-center hover:bg-gray-50 px-2 rounded">
                      <span className="font-medium text-gray-900">{item.name}</span>
                      <span className={`font-semibold ${stockColor}`}>
                        {stockText}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </EnhancedModal>
    </div>
  );
}