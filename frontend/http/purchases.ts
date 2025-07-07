import api from './api';

export const createPurchase = async (purchase: any, token: string) => {
  const { data } = await api.post('/api/purchases', purchase, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return data;
};

export const getPurchasesByUser = async (userId: string, token: string) => {
  const { data } = await api.get(`/api/purchases/${userId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return data;
};

export const getPurchaseById = async (purchaseId: string, token: string) => {
  const { data } = await api.get(`/api/purchases/by-id/${purchaseId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return data;
};

export const makePayment = async (purchaseId: string, amount: number) => {
  const res = await api.post('/api/purchases/payment-out', { purchaseId, amount });
  return res.data;
};

export const getPurchaseStatsByUser = async (userId: string, token: string) => {
  const { data } = await api.get(`/api/purchases/stats/${userId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return data;
};

export const getNextBillNo = async (token: string) => {
  const { data } = await api.get('/api/purchases/next-bill-no', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return data;
};

export const deletePurchase = async (purchaseId: string, token: string) => {
  const { data } = await api.delete(`/api/purchases/${purchaseId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return data;
}; 