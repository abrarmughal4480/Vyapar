import api from './api';

// Items API for frontend

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function getItems(userId: string) {
  const res = await fetch(`${API_BASE_URL}/items/${userId}`);
  return res.json();
}

export async function addItem(userId: string, item: any) {
  const res = await fetch(`${API_BASE_URL}/items/${userId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  });
  return res.json();
}

export async function bulkImportItems(userId: string, items: any[]) {
  try {
    const res = await fetch(`${API_BASE_URL}/items/${userId}/bulk-import`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ items }),
      // Increase timeout for large payloads
      signal: AbortSignal.timeout(300000) // 5 minutes timeout
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('Response error text:', errorText);
      
      if (res.status === 413) {
        throw new Error('Payload too large. Please try importing fewer items at once.');
      }
      throw new Error(`HTTP ${res.status}: ${errorText}`);
    }
    
    return res.json();
  } catch (error) {
    console.error('Bulk import error:', error);
    throw error;
  }
}

export async function deleteItem(userId: string, itemId: string) {
  const res = await fetch(`${API_BASE_URL}/items/${userId}/${itemId}`, {
    method: 'DELETE',
  });
  return res.json();
}

export async function updateItem(userId: string, itemId: string, data: any) {
  const res = await fetch(`${API_BASE_URL}/items/${userId}/${itemId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
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