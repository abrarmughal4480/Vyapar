import { API_BASE_URL } from '../lib/api';

const CASH_BANK_API = `${API_BASE_URL}/api/cash-bank`;

export interface CashAdjustment {
  type: 'Income' | 'Expense';
  amount: number;
  description: string;
  date: string;
}

export interface CashFlowDetailsParams {
  startDate?: string;
  endDate?: string;
  type?: string;
}

export interface CashTransactionsParams {
  page?: number;
  limit?: number;
  type?: string;
}

export const cashBankAPI = {
  // Get cash in hand summary
  getSummary: async (token: string) => {
    const response = await fetch(`${CASH_BANK_API}/summary`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch cash summary');
    }
    
    return response.json();
  },

  // Get detailed cash flow
  getDetails: async (token: string, params: CashFlowDetailsParams = {}) => {
    const searchParams = new URLSearchParams();
    if (params.startDate) searchParams.append('startDate', params.startDate);
    if (params.endDate) searchParams.append('endDate', params.endDate);
    if (params.type) searchParams.append('type', params.type);
    
    const url = `${CASH_BANK_API}/details${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch cash flow details');
    }
    
    return response.json();
  },

  // Add cash adjustment
  addAdjustment: async (token: string, adjustment: CashAdjustment) => {
    const response = await fetch(`${CASH_BANK_API}/adjustment`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(adjustment)
    });
    
    if (!response.ok) {
      throw new Error('Failed to add cash adjustment');
    }
    
    return response.json();
  },

  // Get cash bank transactions
  getTransactions: async (token: string, params: CashTransactionsParams = {}) => {
    const searchParams = new URLSearchParams();
    searchParams.append('page', (params.page || 1).toString());
    searchParams.append('limit', (params.limit || 20).toString());
    if (params.type) searchParams.append('type', params.type);
    
    const url = `${CASH_BANK_API}/transactions?${searchParams.toString()}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch cash bank transactions');
    }
    
    return response.json();
  }
};
