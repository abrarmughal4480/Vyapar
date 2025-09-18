import { API_BASE_URL } from '../lib/api';

const CASH_BANK_API = `${API_BASE_URL}/api/cash-bank`;

// ==================== INTERFACES ====================

export interface BankAccount {
  _id: string;
  userId: string;
  accountDisplayName: string;
  openingBalance: number;
  asOfDate: string;
  accountNumber: string;
  ifscCode: string;
  upiId: string;
  bankName: string;
  accountHolderName: string;
  printBankDetails: boolean;
  currentBalance: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BankTransaction {
  _id: string;
  userId: string;
  type: 'Opening Balance' | 'Bank to Cash Transfer' | 'Cash to Bank Transfer' | 'Bank to Bank Transfer' | 'Bank Adjustment Entry';
  fromAccount: string;
  toAccount: string;
  amount: number;
  description: string;
  transactionDate: string;
  adjustmentType?: 'Increase balance' | 'Decrease balance';
  imageUrl?: string;
  balanceAfter: number;
  status: 'completed' | 'pending' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface CreateBankAccountData {
  accountDisplayName: string;
  openingBalance?: number;
  asOfDate?: string;
  accountNumber?: string;
  ifscCode?: string;
  upiId?: string;
  bankName?: string;
  accountHolderName?: string;
  printBankDetails?: boolean;
}

export interface CreateBankTransactionData {
  type: 'Bank to Cash Transfer' | 'Cash to Bank Transfer' | 'Bank to Bank Transfer' | 'Bank Adjustment Entry';
  fromAccount: string;
  toAccount: string;
  amount: number;
  description?: string;
  transactionDate?: string;
  adjustmentType?: 'Increase balance' | 'Decrease balance';
  imageUrl?: string;
}

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

export interface BankTransactionsParams {
  page?: number;
  limit?: number;
  type?: string;
}

// ==================== BANK ACCOUNT API ====================

export const bankAccountAPI = {
  // Create a new bank account
  create: async (token: string, data: CreateBankAccountData) => {
    const response = await fetch(`${CASH_BANK_API}/accounts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error('Failed to create bank account');
    }
    
    return response.json();
  },

  // Get all bank accounts
  getAll: async (token: string) => {
    const response = await fetch(`${CASH_BANK_API}/accounts`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch bank accounts');
    }
    
    return response.json();
  },

  // Get a specific bank account
  getById: async (token: string, id: string) => {
    const response = await fetch(`${CASH_BANK_API}/accounts/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch bank account');
    }
    
    return response.json();
  },

  // Update a bank account
  update: async (token: string, id: string, data: Partial<CreateBankAccountData>) => {
    const response = await fetch(`${CASH_BANK_API}/accounts/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error('Failed to update bank account');
    }
    
    return response.json();
  },

  // Delete a bank account
  delete: async (token: string, id: string) => {
    const response = await fetch(`${CASH_BANK_API}/accounts/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete bank account');
    }
    
    return response.json();
  }
};

// ==================== BANK TRANSACTION API ====================

export const bankTransactionAPI = {
  // Create a bank transaction
  create: async (token: string, data: CreateBankTransactionData) => {
    const response = await fetch(`${CASH_BANK_API}/transactions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error('Failed to create bank transaction');
    }
    
    return response.json();
  },

  // Get transactions for a specific account
  getByAccount: async (token: string, accountName: string, params: BankTransactionsParams = {}) => {
    const searchParams = new URLSearchParams();
    searchParams.append('page', (params.page || 1).toString());
    searchParams.append('limit', (params.limit || 20).toString());
    if (params.type) searchParams.append('type', params.type);
    
    const url = `${CASH_BANK_API}/accounts/${encodeURIComponent(accountName)}/transactions?${searchParams.toString()}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch account transactions');
    }
    
    return response.json();
  },

  // Get all bank transactions
  getAll: async (token: string, params: BankTransactionsParams = {}) => {
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
      throw new Error('Failed to fetch bank transactions');
    }
    
    return response.json();
  },

  // Update a bank transaction
  update: async (token: string, id: string, data: Partial<CreateBankTransactionData>) => {
    const response = await fetch(`${CASH_BANK_API}/transactions/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error('Failed to update bank transaction');
    }
    
    return response.json();
  },

  // Delete a bank transaction
  delete: async (token: string, id: string) => {
    const response = await fetch(`${CASH_BANK_API}/transactions/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete bank transaction');
    }
    
    return response.json();
  }
};

// ==================== LEGACY CASH IN HAND API ====================

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
    
    const url = `${CASH_BANK_API}/legacy-transactions?${searchParams.toString()}`;
    
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
  },

  // Update cash adjustment
  updateAdjustment: async (token: string, id: string, adjustment: CashAdjustment) => {
    const response = await fetch(`${CASH_BANK_API}/adjustment/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(adjustment)
    });
    
    if (!response.ok) {
      throw new Error('Failed to update cash adjustment');
    }
    
    return response.json();
  },

  // Delete cash adjustment
  deleteAdjustment: async (token: string, id: string) => {
    const response = await fetch(`${CASH_BANK_API}/adjustment/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete cash adjustment');
    }
    
    return response.json();
  }
};