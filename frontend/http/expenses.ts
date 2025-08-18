import { getToken } from '../app/lib/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Create new expense
export const createExpense = async (expenseData: any) => {
  try {
    const token = getToken();
    if (!token) {
      throw new Error('Authentication token not found');
    }

    const response = await fetch(`${API_BASE_URL}/api/expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(expenseData)
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to create expense');
    }

    return data;
  } catch (error) {
    console.error('Error creating expense:', error);
    throw error;
  }
};

// Get all expenses
export const getExpenses = async (filters?: any) => {
  try {
    const token = getToken();
    if (!token) {
      throw new Error('Authentication token not found');
    }

    const queryParams = new URLSearchParams();
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          queryParams.append(key, filters[key]);
        }
      });
    }

    const response = await fetch(`${API_BASE_URL}/api/expenses?${queryParams}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch expenses');
    }

    return data;
  } catch (error) {
    console.error('Error fetching expenses:', error);
    throw error;
  }
};

// Get expense by ID
export const getExpenseById = async (id: string) => {
  try {
    const token = getToken();
    if (!token) {
      throw new Error('Authentication token not found');
    }

    const response = await fetch(`${API_BASE_URL}/api/expenses/${id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch expense');
    }

    return data;
  } catch (error) {
    console.error('Error fetching expense:', error);
    throw error;
  }
};

// Update expense
export const updateExpense = async (id: string, expenseData: any) => {
  try {
    const token = getToken();
    if (!token) {
      throw new Error('Authentication token not found');
    }

    const response = await fetch(`${API_BASE_URL}/api/expenses/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(expenseData)
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to update expense');
    }

    return data;
  } catch (error) {
    console.error('Error updating expense:', error);
    throw error;
  }
};

// Delete expense
export const deleteExpense = async (id: string) => {
  try {
    const token = getToken();
    if (!token) {
      throw new Error('Authentication token not found');
    }

    const response = await fetch(`${API_BASE_URL}/api/expenses/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to delete expense');
    }

    return data;
  } catch (error) {
    console.error('Error deleting expense:', error);
    throw error;
  }
};

// Get expense statistics
export const getExpenseStats = async (filters?: any) => {
  try {
    const token = getToken();
    if (!token) {
      throw new Error('Authentication token not found');
    }

    const queryParams = new URLSearchParams();
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          queryParams.append(key, filters[key]);
        }
      });
    }

    const response = await fetch(`${API_BASE_URL}/api/expenses/stats?${queryParams}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch expense stats');
    }

    return data;
  } catch (error) {
    console.error('Error fetching expense stats:', error);
    throw error;
  }
};
