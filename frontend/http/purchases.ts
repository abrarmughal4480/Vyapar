import api from './api';

export const createPurchase = async (purchase: any, token: string) => {
  const { data } = await api.post('/api/purchases', purchase, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return data;
};

export const updatePurchase = async (purchaseId: string, purchase: any, token: string) => {
  const { data } = await api.put(`/api/purchases/update/${purchaseId}`, purchase, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return data;
};

export const getPurchasesByUser = async (userId: string, token: string, companyName?: string) => {
  const url = companyName ? `/api/purchases/${userId}?companyName=${encodeURIComponent(companyName)}` : `/api/purchases/${userId}`;
  const { data } = await api.get(url, {
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

export const makePayment = async (paymentData: any, token: string) => {
  console.log('makePayment called with:', { paymentData, token: token ? 'Present' : 'Missing' });
  const res = await api.post('/api/purchases/payment-out', paymentData, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.data;
};

export const getPurchaseStatsByUser = async (userId: string, token: string, companyName?: string) => {
  const url = companyName ? `/api/purchases/stats/${userId}?companyName=${encodeURIComponent(companyName)}` : `/api/purchases/stats/${userId}`;
  const { data } = await api.get(url, {
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

export const getPayments = async (token: string) => {
  const { data } = await api.get('/api/purchases/payments', {
    headers: { Authorization: `Bearer ${token}` }
  });
  return data;
};

export const getPaymentOutsByUser = async (userId: string, token: string) => {
  const { data } = await api.get(`/api/payment-out/user/${userId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return data;
};

export const makeBulkPaymentToParty = async (paymentData: any, token: string) => {
  console.log('makeBulkPaymentToParty called with:', { paymentData, token: token ? 'Present' : 'Missing' });
  const res = await api.post('/api/payment-out/bulk-payment', paymentData, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.data;
};

// Edit payment out record
export const editPaymentOut = async (paymentId: string, paymentData: any, token: string) => {
  try {
    const { data } = await api.put(`/api/purchases/edit-payment/${paymentId}`, paymentData, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return data;
  } catch (error) {
    console.error('Error editing payment out:', error);
    return { success: false, message: 'Failed to edit payment' };
  }
};

// Delete payment out record
export const deletePaymentOut = async (paymentId: string, token: string) => {
  try {
    const { data } = await api.delete(`/api/purchases/delete-payment/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return data;
  } catch (error) {
    console.error('Error deleting payment out:', error);
    return { success: false, message: 'Failed to delete payment' };
  }
}; 