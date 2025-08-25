import api from './api';

// Purchase Orders API for frontend

export async function getPurchaseOrders(token: string) {
  try {
    const { data } = await api.get('/api/purchase-orders', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return data;
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    return { success: false, data: [] };
  }
}

export async function addPurchaseOrder(userId: string, purchaseOrder: any) {
  const res = await fetch(`http://localhost:4000/purchase-orders/${userId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(purchaseOrder),
  });
  return res.json();
}

export async function deletePurchaseOrder(userId: string, orderId: string) {
  const res = await fetch(`http://localhost:4000/purchase-orders/${userId}/${orderId}`, {
    method: 'DELETE',
  });
  return res.json();
}

export async function updatePurchaseOrder(token: string, orderId: string, data: any) {
  try {
    const res = await api.put(`/api/purchase-orders/${orderId}`, data, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.data;
  } catch (error) {
    console.error('Error updating purchase order:', error);
    throw error;
  }
}

export const getUserPurchaseOrders = async (token: string) => {
  try {
    const res = await api.get('/api/purchase-orders', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.data.data || res.data || [];
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    return [];
  }
};

export const createPurchaseOrder = async (token: string, purchaseOrderData: any) => {
  try {
    const res = await api.post('/api/purchase-orders', purchaseOrderData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.data;
  } catch (error) {
    console.error('Error creating purchase order:', error);
    throw error;
  }
};

export const fixCompletedPurchaseOrders = async (token: string) => {
  try {
    const res = await api.post('/api/purchase-orders/fix-completed', {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.data;
  } catch (error) {
    console.error('Error fixing completed purchase orders:', error);
    throw error;
  }
};

export const deletePurchaseOrderById = async (orderId: string, token: string) => {
  const { data } = await api.delete(`/api/purchase-orders/${orderId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return data;
};

export const getPurchaseOrderById = async (orderId: string, token: string) => {
  try {
    const res = await api.get(`/api/purchase-orders/${orderId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return { success: true, order: res.data.data || res.data };
  } catch (error) {
    console.error('Error fetching purchase order by id:', error);
    return { success: false, error };
  }
}; 