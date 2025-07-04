import api from './api';

export const createSale = async (sale: any, token: string) => {
  const { data } = await api.post('/api/sales', sale, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return data;
};

export const getSalesByUser = async (userId: string, token: string) => {
  const { data } = await api.get(`/api/sales/${userId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return data;
};

export const getSaleById = async (saleId: string, token: string) => {
  const { data } = await api.get(`/api/sales/by-id/${saleId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return data;
};

export const receivePayment = async (saleId: string, amount: number) => {
  const res = await api.post('/api/sales/payment-in', { saleId, amount });
  return res.data;
};

export const getSalesStatsByUser = async (userId: string, token: string) => {
  const { data } = await api.get(`/api/sales/stats/${userId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return data;
}; 