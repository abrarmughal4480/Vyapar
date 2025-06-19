const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface BusinessSummary {
  totalIncome: number;
  totalExpenses: number;
  profit: number;
  totalProducts: number;
  totalCustomers: number;
  currentMonthIncome: number;
  revenueGrowth: number;
}

export interface MonthlyData {
  month: number;
  totalIncome: number;
}

export interface MonthlyExpenseData {
  month: number;
  totalExpenses: number;
}

export interface TopProduct {
  name: string;
  totalSales: number;
  totalQuantity: number;
}

export const reportsApi = {
  async getBusinessSummary(businessId: string): Promise<BusinessSummary> {
    const response = await fetch(`${API_BASE_URL}/reports/summary/${businessId}`);
    if (!response.ok) throw new Error('Failed to fetch business summary');
    return response.json();
  },

  async getMonthlyIncome(businessId: string, year: number): Promise<MonthlyData[]> {
    const response = await fetch(`${API_BASE_URL}/reports/monthly-income/${businessId}?year=${year}`);
    if (!response.ok) throw new Error('Failed to fetch monthly income');
    return response.json();
  },

  async getMonthlyExpenses(businessId: string, year: number): Promise<MonthlyExpenseData[]> {
    const response = await fetch(`${API_BASE_URL}/reports/monthly-expenses/${businessId}?year=${year}`);
    if (!response.ok) throw new Error('Failed to fetch monthly expenses');
    return response.json();
  },

  async getTopProducts(businessId: string, limit: number = 5): Promise<TopProduct[]> {
    const response = await fetch(`${API_BASE_URL}/reports/top-products/${businessId}?limit=${limit}`);
    if (!response.ok) throw new Error('Failed to fetch top products');
    return response.json();
  },
};
