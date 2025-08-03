import api from './api';

export const createSale = async (sale: any, token: string) => {
  const { data } = await api.post('/api/sales', sale, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return data;
};

export const getSalesByUser = async (userId: string, token: string, companyName?: string) => {
  const url = companyName ? `/api/sales/${userId}?companyName=${encodeURIComponent(companyName)}` : `/api/sales/${userId}`;
  const { data } = await api.get(url, {
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

export const receivePayment = async (saleId: string, amount: number, paymentType?: string, paymentDate?: string) => {
  const res = await api.post('/api/sales/receive-payment', { 
    saleId, 
    amount, 
    paymentType, 
    paymentDate 
  });
  return res.data;
};

export const receivePartyPayment = async (partyName: string, amount: number, token: string, paymentType?: string, paymentDate?: string) => {
  const res = await api.post('/api/sales/receive-party-payment', { 
    partyName, 
    amount, 
    paymentType, 
    paymentDate 
  }, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const getSalesStatsByUser = async (userId: string, token: string, companyName?: string) => {
  const url = companyName ? `/api/sales/stats/${userId}?companyName=${encodeURIComponent(companyName)}` : `/api/sales/stats/${userId}`;
  const { data } = await api.get(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return data;
};

export const getSalesOverview = async (userId: string, token: string) => {
  const { data } = await api.get(`/api/sales/overview/${userId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return data;
};

export const deleteSale = async (saleId: string, token: string) => {
  const { data } = await api.delete(`/api/sales/${saleId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return data;
};

export const updateSale = async (saleId: string, sale: any, token: string) => {
  const { data } = await api.put(`/api/sales/update/${saleId}`, sale, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return data;
};

export const getBillWiseProfit = async (token: string, party?: string) => {
  let url = '/api/sales/bill-wise-profit';
  if (party) url += `?party=${encodeURIComponent(party)}`;
  const { data } = await api.get(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return data;
};

export const updatePurchaseAtPrice = async (token: string) => {
  const { data } = await api.post('/api/sales/update-purchase-atprice', {}, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return data;
};

export const getItemPurchasePrices = async (items: string[], token: string) => {
  const { data } = await api.post('/api/sales/item-purchase-prices', { items }, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return data;
};

export const debugPurchases = async (token: string) => {
  const { data } = await api.get('/api/sales/debug-purchases', {
    headers: { Authorization: `Bearer ${token}` }
  });
  return data;
}; 