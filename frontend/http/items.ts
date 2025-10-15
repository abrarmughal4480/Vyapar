import api from './api';

// Items API for frontend

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function getItems(userId: string, token: string) {
  const res = await fetch(`${API_BASE_URL}/items/${userId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return res.json();
}

export async function getItemsByLoggedInUser(token: string) {
  const res = await fetch(`${API_BASE_URL}/items`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return res.json();
}

export async function addItem(userId: string, item: any, token: string) {
  const res = await fetch(`${API_BASE_URL}/items/${userId}`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(item),
  });
  return res.json();
}

export async function checkExistingItems(userId: string, itemCodes: string[], token: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/items/${userId}/check-existing`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ itemCodes }),
    });
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    
    return res.json();
  } catch (error: any) {
    console.error('Check existing items error:', error);
    throw error;
  }
}

export async function bulkImportItems(userId: string, items: any[], token: string) {
  try {
    // Calculate timeout based on number of items (faster for smaller batches)
    const timeoutMs = Math.min(30000 + (items.length * 50), 120000); // 30s-2min based on size
    
    console.log(`Starting bulk import request for ${items.length} items with ${timeoutMs}ms timeout`);
    console.log('Request URL:', `${API_BASE_URL}/items/${userId}/bulk-import`);
    console.log('Token present:', !!token);
    console.log('Items sample:', items.slice(0, 2));
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    const res = await fetch(`${API_BASE_URL}/items/${userId}/bulk-import`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ items }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    console.log(`Bulk import response received: ${res.status} ${res.statusText}`);
    console.log('Response headers:', Object.fromEntries(res.headers.entries()));
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('Response error text:', errorText);
      
      if (res.status === 413) {
        throw new Error('Payload too large. Please try importing fewer items at once.');
      } else if (res.status === 401) {
        throw new Error('Authentication failed. Please login again.');
      } else if (res.status === 403) {
        throw new Error('Access denied. You may not have permission to import items.');
      } else if (res.status === 500) {
        throw new Error('Server error. Please try again later.');
      }
      throw new Error(`HTTP ${res.status}: ${errorText}`);
    }
    
    const result = await res.json();
    console.log('Bulk import successful result:', result);
    return result;
  } catch (error: any) {
    console.error('Bulk import error:', error);
    
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please try with fewer items or check your connection.');
    }
    
    throw error;
  }
}

export async function deleteItem(userId: string, itemId: string, token: string) {
  const res = await fetch(`${API_BASE_URL}/items/${userId}/${itemId}`, {
    method: 'DELETE',
    headers: { 
      'Authorization': `Bearer ${token}`
    }
  });
  return res.json();
}

export async function updateItem(userId: string, itemId: string, data: any, token: string) {
  const res = await fetch(`${API_BASE_URL}/items/${userId}/${itemId}`, {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(data),
  });
  return res.json();
}

export const getUserItems = async (token: string) => {
  try {
    console.log('Fetching items with token:', token ? 'Token present' : 'No token');
    console.log('API base URL:', process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000');
    const res = await api.get('/items', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Items API response:', res.data);
    return res.data.data || res.data || [];
  } catch (error) {
    console.error('Error fetching items:', error);
    return [];
  }
};

export const fetchItemsByUserId = async (userId: string, token: string) => {
  try {
    console.log('Fetching items for user:', userId);
    const res = await api.get('/items', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Items API response:', res.data);
    return res.data;
  } catch (error) {
    console.error('Error fetching items:', error);
    return { success: false, message: 'Failed to fetch items', data: [] };
  }
};

// Get stock summary for all items
export const getStockSummary = async (token?: string) => {
  try {
    console.log('Fetching stock summary with token:', token ? 'Token present' : 'No token');
    const res = await api.get('/items/stock-summary');
    console.log('Stock Summary API response:', res.data);
    return res.data;
  } catch (error) {
    console.error('Error fetching stock summary:', error);
    return { success: false, data: { items: [], totals: { totalStockQty: 0, totalStockValue: 0 } } };
  }
};

// Get item wise profit and loss report
export const getItemWiseProfitLoss = async (token?: string) => {
  try {
    console.log('Fetching item wise profit loss with token:', token ? 'Token present' : 'No token');
    const res = await api.get('/items/item-wise-profit-loss');
    console.log('Item Wise Profit Loss API response:', res.data);
    return res.data;
  } catch (error) {
    console.error('Error fetching item wise profit loss:', error);
    return { success: false, data: { items: [], totalNetProfitLoss: 0 } };
  }
};

// Optimized function with search and filtering support
export const getUserItemsWithFilters = async (
  token: string, 
  search?: string, 
  category?: string, 
  status?: string, 
  type?: string
) => {
  try {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (category) params.append('category', category);
    if (status) params.append('status', status);
    if (type) params.append('type', type);
    
    const url = params.toString() ? `/items?${params.toString()}` : '/items';
    
    const res = await api.get(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    return res.data.data || res.data || [];
  } catch (error) {
    console.error('Error fetching items with filters:', error);
    return [];
  }
};

// Performance monitoring function
export const getItemsPerformanceStats = async (token: string) => {
  try {
    const res = await api.get('/items/stats/performance', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.data;
  } catch (error) {
    console.error('Error fetching items performance stats:', error);
    throw error;
  }
}; 