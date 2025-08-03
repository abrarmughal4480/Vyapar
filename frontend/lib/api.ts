// API Configuration
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// API endpoints
export const API_ENDPOINTS = {
  // Auth
  LOGIN: `${API_BASE_URL}/api/auth/login`,
  REGISTER: `${API_BASE_URL}/api/auth/register`,
  LOGOUT: `${API_BASE_URL}/api/auth/logout`,
  
  // Parties
  PARTIES: `${API_BASE_URL}/api/parties`,
  PARTY_BALANCE: `${API_BASE_URL}/api/parties/balance`,
  
  // Items
  ITEMS: `${API_BASE_URL}/api/items`,
  
  // Sales
  SALES: `${API_BASE_URL}/api/sales`,
  NEXT_INVOICE_NO: `${API_BASE_URL}/api/sales/next-invoice-no`,
  
  // Sales Orders
  SALES_ORDERS: `${API_BASE_URL}/api/sales-orders`,
  
  // Purchases
  PURCHASES: `${API_BASE_URL}/api/purchases`,
  
  // Purchase Orders
  PURCHASE_ORDERS: `${API_BASE_URL}/api/purchase-orders`,
  
  // Quotations
  QUOTATIONS: `${API_BASE_URL}/api/quotations`,
  
  // Delivery Challans
  DELIVERY_CHALLANS: `${API_BASE_URL}/api/delivery-challans`,
  UPDATE_CHALLAN_STATUS: `${API_BASE_URL}/api/delivery-challans/update-status`,
  
  // Reports
  REPORTS: `${API_BASE_URL}/api/reports`,
} as const;

// Helper function to get full API URL
export const getApiUrl = (endpoint: string) => `${API_BASE_URL}${endpoint}`;

// Helper function to get auth headers
export const getAuthHeaders = (token: string) => ({
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json',
}); 