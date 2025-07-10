import api from './api';

// Items API for frontend

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';

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