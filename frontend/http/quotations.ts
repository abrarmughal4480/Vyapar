import api from './api';

export const createQuotation = async (quotation: any, token: string) => {
  const res = await api.post('/quotations', quotation, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const getQuotationsForUser = async (token: string) => {
  const res = await api.get('/quotations', {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const updateQuotationStatus = async (quotationId: string, status: string, convertedTo?: string, token?: string) => {
  const res = await api.put(`/quotations/${quotationId}/status`, {
    status,
    convertedTo
  }, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}; 