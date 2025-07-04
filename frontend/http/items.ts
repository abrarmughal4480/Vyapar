import api from './api';

// Items API for frontend

export async function getItems(userId: string) {
  const res = await fetch(`http://localhost:4000/items/${userId}`);
  return res.json();
}

export async function addItem(userId: string, item: any) {
  const res = await fetch(`http://localhost:4000/items/${userId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  });
  return res.json();
}

export async function deleteItem(userId: string, itemId: string) {
  const res = await fetch(`http://localhost:4000/items/${userId}/${itemId}`, {
    method: 'DELETE',
  });
  return res.json();
}

export async function updateItem(userId: string, itemId: string, data: any) {
  const res = await fetch(`http://localhost:4000/items/${userId}/${itemId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export const getUserItems = async (token: string) => {
  const res = await api.get('/items', {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data.items;
}; 