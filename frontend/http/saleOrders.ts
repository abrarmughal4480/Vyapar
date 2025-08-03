import api from './api';

export const createSaleOrder = async (order: any, token: string) => {
  const { data } = await api.post('/api/sale-orders', order, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return data;
};

export const getSaleOrders = async (token: string) => {
  const { data } = await api.get('/api/sale-orders', {
    headers: { Authorization: `Bearer ${token}` }
  });
  return data;
};

export const updateSaleOrderStatus = async (orderId: string, status: string, token: string) => {
  const { data } = await api.put(`/api/sale-orders/${orderId}/status`, { status }, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return data;
};

export const convertSaleOrderToInvoice = async (orderId: string, token: string) => {
  const { data } = await api.post(`/api/sale-orders/${orderId}/convert`, {}, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return data;
};

export const deleteSaleOrder = async (orderId: string, token: string) => {
  const { data } = await api.delete(`/api/sale-orders/${orderId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return data;
}; 