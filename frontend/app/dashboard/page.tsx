'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
  AlertTriangle,
  HelpCircle,
  Mail,
  Phone
} from 'lucide-react';
import { fetchDashboardStats, fetchSalesOverviewForUser, fetchRecentActivityForUser } from '@/http/api';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import EnhancedModal from '../../components/EnhancedModal';
import { getCurrentUserInfo, canAccessDashboard, isAdminUser } from '../../lib/roleAccessControl';

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
  cashInHand?: number;
  cashInBank?: number;
  bankAccountsCount?: number;
  bankAccounts?: Array<{name: string; balance: number}>;
  totalExpenses?: number;
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

// Optimized number formatting utility for large amounts
const formatLargeAmount = (amount: number): string => {
  if (amount === 0) return 'PKR 0';
  
  // For amounts in lakhs and crores, use abbreviated format
  if (amount >= 10000000) { // 1 crore
    return `PKR ${(amount / 10000000).toFixed(2)} Cr`;
  } else if (amount >= 100000) { // 1 lakh
    return `PKR ${(amount / 100000).toFixed(2)} L`;
  } else if (amount >= 1000) { // 1 thousand
    return `PKR ${(amount / 1000).toFixed(1)} K`;
  } else {
    return `PKR ${amount.toLocaleString()}`;
  }
};

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
  const [userRole, setUserRole] = useState<string>('user');
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
  const [showLicenseGenerator, setShowLicenseGenerator] = useState(false);
  const [userRoleFromAPI, setUserRoleFromAPI] = useState<string>('');
  const [userEmailFromAPI, setUserEmailFromAPI] = useState<string>('');
  const [showSalesOverview, setShowSalesOverview] = useState(true);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showRevenueBreakdownModal, setShowRevenueBreakdownModal] = useState(false);
  const [revenueBreakdown, setRevenueBreakdown] = useState<any>(null);
  const [showResetUserModal, setShowResetUserModal] = useState(false);
  const [resetUserEmail, setResetUserEmail] = useState('');
  const [isResettingUser, setIsResettingUser] = useState(false);
  const [showConfirmationStep, setShowConfirmationStep] = useState(false);
  const [resetConfirmationText, setResetConfirmationText] = useState('');

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // Check license generator permission based on user role from API
  useEffect(() => {
    if (userRoleFromAPI === 'superadmin') {
      console.log('🔍 License Generator Check - User Email:', userEmailFromAPI);
      console.log('🔑 License Generator: Show button for superadmin user');
      
      // Show license generator for any superadmin user
      setShowLicenseGenerator(true);
    } else {
      console.log('❌ User is not superadmin, role:', userRoleFromAPI, 'email:', userEmailFromAPI);
      setShowLicenseGenerator(false);
    }
  }, [userRoleFromAPI, userEmailFromAPI]);

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
          // Store revenue breakdown for popup
          if (result.data.revenueBreakdown) {
            setRevenueBreakdown(result.data.revenueBreakdown);
          }
        }
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user && user._id) {
          // For users who joined a company, we need to use the joined company's ID
          // For individual users, use their own _id
          let dataId;
          if (user.businessId && user.context === 'company') {
            // User joined a company - use the joined company's ID
            dataId = user.businessId;
            setShowSalesOverview(false);
            console.log('🚫 Hiding sales overview for company user');
          } else {
            // Individual user - use their own ID
            dataId = user._id;
            setShowSalesOverview(true);
            console.log('✅ Showing sales overview for individual user');
          }
          
          console.log('🔍 Fetching data for:', {
            userId: user._id,
            dataId: dataId,
            userEmail: user.email,
            context: user.context,
            businessId: user.businessId
          });
          
          const data = await fetchSalesOverviewForUser(token);
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
          // Fetch recent activity using the correct ID
          const activityRes = await fetchRecentActivityForUser(token);
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
          
          // Get user role from the API response or localStorage
          let role = 'user';
          if (data.user && data.user.role) {
            role = data.user.role;
          } else {
            // Fallback to localStorage
            const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
            role = storedUser.role || 'user';
          }
          
          console.log('🔐 Dashboard User Role:', {
            email: data.user?.email,
            role: role,
            fromAPI: !!data.user?.role,
            fromLocalStorage: !data.user?.role
          });
          
          setUserRole(role);
          setUserRoleFromAPI(role); // Set this for license generator check
          setUserEmailFromAPI(data.user?.email || ''); // Set user email from API
        }
      } catch (err) {
        console.error('Failed to fetch user:', err);
      }
    };
    fetchUser();
  }, [API_BASE_URL]);

  useEffect(() => {
    const fetchStockSummary = async () => {
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
          const stockData = result.data || { items: [] };
          setStockSummary(stockData);
        }
      } catch (e) {
        console.error('Failed to fetch stock summary:', e);
        setStockSummary({ items: [] });
      }
    };

    fetchStockSummary();
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

  // Support functions
  const openSupportModal = () => {
    setShowSupportModal(true);
  };

  const handleEmailSupport = () => {
    const subject = encodeURIComponent('Devease Digital Dashboard Support Request');
    const body = encodeURIComponent(`Hello Devease Support Team,\n\nI need assistance with the Devease Digital Dashboard.\n\nBusiness Name: ${user?.businessName || 'N/A'}\nUser Email: ${user?.email || 'N/A'}\n\nIssue Description:\n\nBest regards,\n${user?.name || 'User'}`);
    window.open(`mailto:deveasedigital@gmail.com?subject=${subject}&body=${body}`, '_blank');
  };

  const handleCallSupport = () => {
    window.open('tel:+923326282035', '_blank');
  };

  const openResetUserModal = () => {
    setShowResetUserModal(true);
    setShowConfirmationStep(false);
    setResetUserEmail('');
    setResetConfirmationText('');
    document.body.style.overflow = 'hidden';
  };

  const proceedToConfirmation = () => {
    if (!resetUserEmail.trim()) {
      alert('Please enter an email address');
      return;
    }
    setShowConfirmationStep(true);
  };

  const handleResetUser = async () => {
    if (resetConfirmationText !== 'RESET') {
      alert('Please type "RESET" to confirm');
      return;
    }

    setIsResettingUser(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/admin/reset-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email: resetUserEmail.trim() })
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        alert(`✅ User ${resetUserEmail} has been reset successfully!\n\nAll business data has been cleared but the account is preserved.`);
        setResetUserEmail('');
        setResetConfirmationText('');
        setShowConfirmationStep(false);
        setShowResetUserModal(false);
        document.body.style.overflow = 'auto';
      } else if (response.status === 401) {
        alert(`❌ Session expired. Please refresh the page and try again.`);
        // Optionally redirect to login
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        alert(`❌ Failed to reset user: ${result.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error resetting user:', error);
      alert('❌ Error resetting user. Please try again.');
    } finally {
      setIsResettingUser(false);
    }
  };

  const closeResetModal = () => {
    setShowResetUserModal(false);
    setShowConfirmationStep(false);
    setResetUserEmail('');
    setResetConfirmationText('');
    document.body.style.overflow = 'auto';
  };

  const openReceivableModal = async () => {
    setShowReceivableModal(true);
    document.body.style.overflow = 'hidden';
    setLoadingReceivables(true);
    try {
      let token: string | undefined = undefined;
      if (typeof window !== 'undefined') {
        const t = localStorage.getItem('token');
        token = t !== null ? t : undefined;
      }
      // Use the new party balances API instead of the old receivables API
      const response = await fetch(`${API_BASE_URL}/dashboard/party-balances`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setReceivables(result.data.receivables || []);
        } else {
          setReceivables([]);
        }
      } else {
        setReceivables([]);
      }
    } catch (e) {
      setReceivables([]);
    }
    setLoadingReceivables(false);
  };

  const openPayableModal = async () => {
    setShowPayableModal(true);
    document.body.style.overflow = 'hidden';
    setLoadingPayables(true);
    try {
      let token: string | undefined = undefined;
      if (typeof window !== 'undefined') {
        const t = localStorage.getItem('token');
        token = t !== null ? t : undefined;
      }
      // Use the new party balances API instead of the old payables API
      const response = await fetch(`${API_BASE_URL}/dashboard/party-balances`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setPayables(result.data.payables || []);
        } else {
          setPayables([]);
        }
      } else {
        setPayables([]);
      }
    } catch (e) {
      setPayables([]);
    }
    setLoadingPayables(false);
  };

  const openStockSummaryModal = async () => {
    setShowStockSummaryModal(true);
    document.body.style.overflow = 'hidden';
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

  const openRevenueBreakdownModal = () => {
    setShowRevenueBreakdownModal(true);
    document.body.style.overflow = 'hidden';
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
      trend: businessStats.revenueChange !== undefined ? (businessStats.revenueChange >= 0 ? 'up' : 'down') : 'up',
      onClick: undefined
    },
    {
      title: 'Stock Value',
      value: `PKR ${(businessStats.totalStockValue ?? 0).toLocaleString()}`,
      change: `${businessStats.totalOrdersChange !== undefined ? (businessStats.totalOrdersChange >= 0 ? '+' : '') + businessStats.totalOrdersChange.toFixed(1) + '%' : ''}`,
      icon: Package,
      color: businessStats.totalOrdersChange !== undefined ? (businessStats.totalOrdersChange >= 0 ? 'text-blue-600' : 'text-red-600') : 'text-blue-600',
      bgGradient: 'from-blue-500 to-indigo-600',
      bgLight: 'bg-blue-50',
      trend: businessStats.totalOrdersChange !== undefined ? (businessStats.totalOrdersChange >= 0 ? 'up' : 'down') : 'up',
      onClick: () => {
        router.push('/dashboard/items');
      },
    },
    {
      title: 'Low Stock Summary',
      value: `${stockSummary.items?.length || 0}`,
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
    // New Stat: Cash In Hand
    {
      title: 'Cash In Hand',
      value: `PKR ${(businessStats.cashInHand ?? 0).toLocaleString()}`,
      change: '',
      icon: DollarSign,
      color: 'text-purple-600',
      bgGradient: 'from-purple-500 to-indigo-600',
      bgLight: 'bg-purple-50',
      trend: 'up',
      onClick: () => {
        router.push('/dashboard/cash-in-hand');
      },
    },
    // New Stat: Cash In Bank
    {
      title: 'Cash In Bank',
      value: `PKR ${(businessStats.cashInBank ?? 0).toLocaleString()}`,
      change: `${businessStats.bankAccountsCount || 0} accounts`,
      icon: Activity,
      color: 'text-blue-600',
      bgGradient: 'from-blue-500 to-cyan-600',
      bgLight: 'bg-blue-50',
      trend: 'up',
      onClick: () => {
        router.push('/dashboard/cash-bank');
      },
    },
    // New Stat: Total Expenses
    {
      title: 'Total Expenses',
      value: `PKR ${(businessStats.totalExpenses ?? 0).toLocaleString()}`,
      change: '',
      icon: ShoppingCart,
      color: 'text-amber-600',
      bgGradient: 'from-amber-500 to-yellow-600',
      bgLight: 'bg-amber-50',
      trend: 'down',
      onClick: () => {
        router.push('/dashboard/expenses');
      },
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

  // Role-based access control for dashboard redirect
  useEffect(() => {
    const checkRoleAndRedirect = () => {
      const userInfo = getCurrentUserInfo();
      if (userInfo && userInfo.role) {
        setUserRole(userInfo.role);
        setUserRoleFromAPI(userInfo.role); // Set this for license generator check
        setUserEmailFromAPI(userInfo.email || ''); // Set user email from API

        // Check if user can access dashboard
        if (!canAccessDashboard()) {
          console.log(`🚫 Dashboard Access DENIED: Redirecting ${userInfo.role} (${userInfo.email}) to parties page.`);
          router.push('/dashboard/parties');
          return;
        } else {
          console.log(`✅ Dashboard Access GRANTED: ${userInfo.role} (${userInfo.email}) can access dashboard.`);
        }
      } else {
        // If no user info available, allow access (fallback for Default Admin)
        console.log('⚠️ No user info available, allowing dashboard access as fallback');
      }
      setIsCheckingAccess(false);
    };
    checkRoleAndRedirect();
  }, [router]);

  // Show loading while checking access
  if (isCheckingAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden" style={{ zoom: '0.9' }}>
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-10 -left-10 w-72 h-72 bg-gradient-to-br from-blue-400/10 to-purple-600/10 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
        <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-br from-purple-400/10 to-pink-600/10 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-1/2 w-72 h-72 bg-gradient-to-br from-pink-400/10 to-indigo-600/10 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
      </div>

      {/* Enhanced Header */}
      <header className="relative bg-white/70 backdrop-blur-xl shadow-lg border-b border-white/20 w-full px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-3 sm:py-0 sm:h-20 gap-3 sm:gap-0">
          {/* Logo and Title Section */}
          <div className="flex items-center space-x-3 sm:space-x-4 w-full sm:w-auto">
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform duration-200">
                <span className="text-lg sm:text-xl font-bold text-white">DD</span>
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-emerald-500 rounded-full animate-pulse"></div>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent leading-tight">
                Devease Digital Dashboard
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">Business Management System</p>
            </div>
          </div>

          {/* Action Buttons Section */}
          <div className="flex items-center justify-end space-x-2 sm:space-x-3 w-full sm:w-auto">
            {/* Support Button - Mobile Optimized */}
            <button
              onClick={openSupportModal}
              className="flex items-center justify-center sm:justify-start space-x-1 sm:space-x-2 px-2 sm:px-3 md:px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg sm:rounded-xl hover:from-blue-600 hover:to-cyan-700 transition-all duration-200 shadow-lg hover:shadow-xl group flex-1 sm:flex-none"
              title="Get Support"
            >
              <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform duration-200" />
              <span className="text-xs sm:text-sm font-semibold hidden xs:block">Support</span>
            </button>

            {/* License Key Generator Button - Only for Superadmin */}
            {showLicenseGenerator && (
              <button
                onClick={() => router.push('/dashboard/license-generator')}
                className="flex items-center justify-center sm:justify-start space-x-1 sm:space-x-2 px-2 sm:px-3 md:px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg sm:rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl group flex-1 sm:flex-none"
                title="License Key Generator"
              >
                <span className="text-base sm:text-lg">🔑</span>
                <span className="text-xs sm:text-sm font-semibold hidden xs:block">License</span>
              </button>
            )}

            {/* Reset User Button - Only for Admin */}
            {isAdminUser() && (
              <button
                onClick={openResetUserModal}
                className="flex items-center justify-center sm:justify-start space-x-1 sm:space-x-2 px-2 sm:px-3 md:px-4 py-2 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-lg sm:rounded-xl hover:from-red-700 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl group flex-1 sm:flex-none"
                title="Reset User Data"
              >
                <span className="text-base sm:text-lg">🔄</span>
                <span className="text-xs sm:text-sm font-semibold hidden xs:block">Reset User</span>
              </button>
            )}

            {/* User Profile Section */}
            <div className="flex items-center space-x-2 sm:space-x-3 bg-white/50 backdrop-blur-sm rounded-xl sm:rounded-2xl px-2 sm:px-3 md:px-4 py-2 border border-white/20">
              <div className="relative flex-shrink-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-indigo-400 via-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg cursor-pointer"
                  onClick={() => router.push('/dashboard/profile')}>
                  <span className="text-white font-semibold text-xs sm:text-sm">{user ? user.name[0] : 'U'}</span>
                </div>
                <div className="absolute -bottom-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-green-500 rounded-full border-2 border-white"></div>
              </div>
              <div className="hidden sm:block">
                <p className="text-xs sm:text-sm font-semibold text-gray-900 truncate max-w-24 lg:max-w-32">{user ? user.businessName : 'Business'}</p>
                <p className="text-xs text-gray-500 cursor-pointer truncate max-w-24 lg:max-w-32" onClick={() => router.push('/dashboard/profile')}>{user ? user.email : 'user@email.com'}</p>
              </div>
            </div>

            {/* Logout Button */}
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
              className="p-2 sm:p-3 text-gray-600 hover:text-red-600 transition-colors duration-200 hover:bg-red-50 rounded-lg sm:rounded-xl group flex-shrink-0"
              title="Logout"
            >
              <LogOut className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform duration-200" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative w-full px-2 sm:px-4 md:px-6 lg:px-8 py-4 md:py-6">
        {/* Enhanced Welcome Section */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center space-x-2 sm:space-x-3 mb-2 sm:mb-3">
            <Sparkles className="w-5 h-5 sm:w-7 sm:h-7 text-yellow-500 animate-pulse" />
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent leading-tight">
              Welcome back, {user ? user.businessName : 'Business'}!
            </h2>
          </div>
          <p className="text-sm sm:text-lg text-gray-600 ml-7 sm:ml-10">Here's what's happening with your business today.</p>
        </div>

        {/* Enhanced Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5 mb-6 md:mb-10 w-full">
          {dashboardStats.map((stat, index) => (
            <div
              key={index}
              className={`group relative bg-white/70 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-lg border border-white/20 p-4 sm:p-6 hover:shadow-2xl hover:-translate-y-1 sm:hover:-translate-y-2 transition-all duration-300 ${stat.onClick !== undefined ? 'cursor-pointer' : ''}`}
              onClick={stat.onClick}
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2 sm:space-y-3 flex-1 min-w-0 mb-3 sm:mb-0">
                  <p className="text-xs sm:text-sm font-medium text-gray-600 uppercase tracking-wide">{stat.title}</p>
                  <p className="text-sm sm:text-lg md:text-xl lg:text-2xl font-bold text-gray-900 group-hover:scale-105 transition-transform duration-200 break-all leading-tight">
                    {stat.value}
                  </p>
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2">
                    <div className={`flex items-center space-x-1 px-1.5 sm:px-2 py-1 rounded-full ${stat.bgLight}`}>
                      <stat.icon className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${stat.color}`} />
                      <span className={`text-xs sm:text-sm font-semibold ${stat.color}`}>{stat.change}</span>
                    </div>
                    <span className="text-xs text-gray-500">from last month</span>
                  </div>
                </div>
                <div className="relative flex-shrink-0 self-center sm:self-start">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 bg-gradient-to-br ${stat.bgGradient} rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-300`}>
                    <stat.icon className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white" />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-xl sm:rounded-2xl"></div>
                </div>
              </div>

              {/* Animated background gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.bgGradient} rounded-2xl sm:rounded-3xl opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
            </div>
          ))}
        </div>

        {/* Enhanced Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-10">
          {/* Enhanced Quick Actions Card */}
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-lg border border-white/20 p-4 sm:p-6">
            <div className="flex items-center space-x-2 sm:space-x-3 mb-4 sm:mb-5">
              <div className="w-7 h-7 sm:w-9 sm:h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg sm:rounded-xl flex items-center justify-center">
                <Zap className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-gray-900">Quick Actions</h3>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  className={`group relative overflow-hidden bg-gradient-to-br ${action.color} p-2 sm:p-3 rounded-xl sm:rounded-2xl text-white shadow-lg hover:shadow-xl transform hover:scale-105 ${action.hoverColor} transition-all duration-300`}
                  onClick={() => router.push(action.path)}
                >
                  <div className="relative z-10">
                    <div className="text-lg sm:text-xl mb-1 group-hover:scale-110 transition-transform duration-200">
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
          {showSalesOverview && (
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
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <CartesianGrid strokeDasharray="3 3" />
                      <Tooltip formatter={(value: any) => `PKR ${value.toLocaleString()}`} />
                      <Area type="monotone" dataKey="netSales" stroke="#6366f1" fillOpacity={1} fill="url(#colorSales)" name="Net Sales" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
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
        onClose={() => {
          setShowReceivableModal(false);
          document.body.style.overflow = 'auto';
        }}
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
                      document.body.style.overflow = 'auto';
                      router.push(`/dashboard/parties?search=${encodeURIComponent(party.name)}`);
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-gray-900 block">{party.name}</span>
                    </div>
                    <span className="text-green-600 font-semibold">PKR {party.amount?.toLocaleString() || '0'}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </EnhancedModal>
      <EnhancedModal
        isOpen={showPayableModal}
        onClose={() => {
          setShowPayableModal(false);
          document.body.style.overflow = 'auto';
        }}
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
                      document.body.style.overflow = 'auto';
                      router.push(`/dashboard/parties?search=${encodeURIComponent(party.name)}`);
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-gray-900 block">{party.name}</span>
                    </div>
                    <span className="text-red-600 font-semibold">PKR {party.amount?.toLocaleString() || '0'}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </EnhancedModal>
      <EnhancedModal
        isOpen={showStockSummaryModal}
        onClose={() => {
          setShowStockSummaryModal(false);
          document.body.style.overflow = 'auto';
        }}
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
                  let stockText = (item.currentStock ?? 0).toString();

                  if (item.issueType === 'negative') {
                    stockColor = 'text-red-800';
                    stockText = `-${Math.abs(item.currentStock ?? 0)}`;
                  } else if (item.issueType === 'outOfStock') {
                    stockColor = 'text-red-600';
                    stockText = '0';
                  } else if (item.issueType === 'lowStock') {
                    stockColor = 'text-orange-600';
                    stockText = (item.currentStock ?? 0).toString();
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

      {/* Revenue Breakdown Modal */}
      <EnhancedModal
        isOpen={showRevenueBreakdownModal}
        onClose={() => {
          setShowRevenueBreakdownModal(false);
          document.body.style.overflow = 'auto';
        }}
        title="Revenue Breakdown & Calculations"
      >
        {revenueBreakdown ? (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-4 rounded-xl border border-emerald-200">
                <h3 className="font-semibold text-emerald-800 mb-2">Total Sales</h3>
                <p className="text-2xl font-bold text-emerald-600">PKR {revenueBreakdown.totalSales?.toLocaleString() || '0'}</p>
              </div>
              <div className="bg-gradient-to-br from-red-50 to-pink-50 p-4 rounded-xl border border-red-200">
                <h3 className="font-semibold text-red-800 mb-2">Credit Notes</h3>
                <p className="text-2xl font-bold text-red-600">PKR {revenueBreakdown.totalCreditNotes?.toLocaleString() || '0'}</p>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200">
                <h3 className="font-semibold text-blue-800 mb-2">Net Revenue</h3>
                <p className="text-2xl font-bold text-blue-600">PKR {revenueBreakdown.netRevenue?.toLocaleString() || '0'}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-violet-50 p-4 rounded-xl border border-purple-200">
                <h3 className="font-semibold text-purple-800 mb-2">Revenue Change</h3>
                <p className={`text-2xl font-bold ${revenueBreakdown.revenueChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {revenueBreakdown.revenueChange >= 0 ? '+' : ''}{revenueBreakdown.revenueChange?.toFixed(2) || '0'}%
                </p>
              </div>
            </div>

            {/* Revenue Formula */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">Revenue Formula</h3>
              
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-6 rounded-xl border border-emerald-200">
                <div className="text-center">
                  <h4 className="text-2xl font-bold text-emerald-800 mb-2">Revenue = Total Sales - Credit Notes</h4>
                  <p className="text-emerald-600">This is how your revenue is calculated</p>
                </div>
              </div>
            </div>

            {/* Sales List */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">Sales List (Used for Revenue Calculation)</h3>
              
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {revenueBreakdown.salesList?.length > 0 ? (
                  revenueBreakdown.salesList.map((sale: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{sale.partyName || 'Unknown Customer'}</p>
                          <p className="text-sm text-gray-500">Invoice: {sale.invoiceNo || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-blue-600">PKR {sale.grandTotal?.toLocaleString() || '0'}</p>
                        <p className="text-xs text-gray-400">
                          {sale.createdAt ? new Date(sale.createdAt).toLocaleDateString() : 'Unknown Date'}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-gray-500">No sales data available</div>
                )}
              </div>
            </div>

            {/* Credit Notes List */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">Credit Notes List (Deducted from Revenue)</h3>
              
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {revenueBreakdown.creditNotesList?.length > 0 ? (
                  revenueBreakdown.creditNotesList.map((creditNote: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-pink-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{creditNote.partyName || 'Unknown Customer'}</p>
                          <p className="text-sm text-gray-500">Credit Note: {creditNote.creditNoteNo || 'N/A'}</p>
                          <p className="text-xs text-gray-500">Type: {creditNote.type || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-red-600">PKR {creditNote.grandTotal?.toLocaleString() || '0'}</p>
                        <p className="text-xs text-gray-400">
                          {creditNote.createdAt ? new Date(creditNote.createdAt).toLocaleDateString() : 'Unknown Date'}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-gray-500">No credit notes available</div>
                )}
              </div>
            </div>

            {/* Revenue Calculations */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">Revenue Calculations</h3>
              
              <div className="space-y-3">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-lg font-semibold text-blue-800">{revenueBreakdown.calculations?.salesBreakdown}</p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <p className="text-lg font-semibold text-red-800">{revenueBreakdown.calculations?.creditNotesBreakdown}</p>
                </div>
                <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
                  <p className="text-lg font-semibold text-emerald-800">{revenueBreakdown.calculations?.netRevenueBreakdown}</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <p className="text-lg font-semibold text-purple-800">{revenueBreakdown.calculations?.revenueChangePercentage}</p>
                </div>
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                  <p className="text-lg font-semibold text-amber-800">{revenueBreakdown.calculations?.monthlyComparison}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading revenue breakdown...</p>
          </div>
        )}
      </EnhancedModal>

      {/* Support Modal */}
      <EnhancedModal
        isOpen={showSupportModal}
        onClose={() => setShowSupportModal(false)}
        title="Support"
      >
        <div className="space-y-4">
          {/* Email Support */}
          <button
            onClick={handleEmailSupport}
            className="w-full flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Mail className="w-5 h-5 text-blue-600" />
            <div className="text-left">
              <div className="font-medium text-gray-900">Email Support</div>
                              <div className="text-sm text-gray-600">deveasedigital@gmail.com</div>
            </div>
          </button>

          {/* Phone Support */}
          <button
            onClick={handleCallSupport}
            className="w-full flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Phone className="w-5 h-5 text-green-600" />
            <div className="text-left">
              <div className="font-medium text-gray-900">Call Support</div>
                              <div className="text-sm text-gray-600">+92 332 6282035</div>
            </div>
          </button>

          {/* Support Hours */}
          <div className="pt-2 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              <div className="font-medium mb-1">Support Hours:</div>
              <div>Mon-Fri: 9:00 AM - 6:00 PM (PKT)</div>
              <div>Sat: 10:00 AM - 4:00 PM (PKT)</div>
              <div>Sun: Closed</div>
            </div>
          </div>
        </div>
      </EnhancedModal>

      {/* Reset User Modal */}
      <EnhancedModal
        isOpen={showResetUserModal}
        onClose={closeResetModal}
        title="Reset User Data"
      >
        <div className="space-y-6">
          {/* Step 1: Email Input */}
          {!showConfirmationStep && (
            <>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertTriangle className="w-5 h-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-red-800 mb-2">⚠️ DANGER: Irreversible Action</h3>
                    <p className="text-sm text-red-700 mb-2">
                      This will permanently delete ALL business data for the specified user:
                    </p>
                    <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                      <li>All sales invoices and transactions</li>
                      <li>All purchase bills and records</li>
                      <li>All inventory items and stock data</li>
                      <li>All customer/party information</li>
                      <li>All financial records and reports</li>
                      <li>All expenses and payments</li>
                    </ul>
                    <p className="text-sm text-red-700 mt-2 font-semibold">
                      The user account will be preserved but all business data will be lost forever.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="resetEmail" className="block text-sm font-medium text-gray-700 mb-2">
                  User Email Address to Reset
                </label>
                <input
                  type="email"
                  id="resetEmail"
                  value={resetUserEmail}
                  onChange={(e) => setResetUserEmail(e.target.value)}
                  placeholder="Enter user email address"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  disabled={isResettingUser}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Make sure you have the correct email address
                </p>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={proceedToConfirmation}
                  disabled={isResettingUser || !resetUserEmail.trim()}
                  className="flex-1 bg-gradient-to-r from-red-600 to-pink-600 text-white py-2 px-4 rounded-lg hover:from-red-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
                >
                  <span className="mr-2">⚠️</span>
                  Proceed to Confirmation
                </button>
                <button
                  onClick={closeResetModal}
                  disabled={isResettingUser}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  Cancel
                </button>
              </div>
            </>
          )}

          {/* Step 2: Confirmation */}
          {showConfirmationStep && (
            <>
              <div className="bg-red-100 border-2 border-red-300 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <AlertTriangle className="w-6 h-6 text-red-600 mr-2" />
                  <h3 className="font-bold text-red-800 text-lg">Final Confirmation Required</h3>
                </div>
                <div className="bg-white rounded-lg p-3 border border-red-200">
                  <p className="text-sm text-gray-700 mb-2">
                    You are about to reset all data for:
                  </p>
                  <p className="font-bold text-red-600 text-lg">{resetUserEmail}</p>
                </div>
              </div>

              <div>
                <label htmlFor="confirmationText" className="block text-sm font-medium text-gray-700 mb-2">
                  Type <span className="font-bold text-red-600">RESET</span> to confirm this action:
                </label>
                <input
                  type="text"
                  id="confirmationText"
                  value={resetConfirmationText}
                  onChange={(e) => setResetConfirmationText(e.target.value.toUpperCase())}
                  placeholder="Type RESET here"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-center font-mono text-lg"
                  disabled={isResettingUser}
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={handleResetUser}
                  disabled={isResettingUser || resetConfirmationText !== 'RESET'}
                  className="flex-1 bg-gradient-to-r from-red-600 to-pink-600 text-white py-3 px-4 rounded-lg hover:from-red-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center font-semibold"
                >
                  {isResettingUser ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Resetting User Data...
                    </>
                  ) : (
                    <>
                      <span className="mr-2">🔥</span>
                      CONFIRM RESET USER DATA
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowConfirmationStep(false)}
                  disabled={isResettingUser}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  Back
                </button>
              </div>
            </>
          )}
        </div>
      </EnhancedModal>
    </div>
  );
}