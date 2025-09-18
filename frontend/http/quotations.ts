import api from './api';

export const createQuotation = async (quotation: any, token: string) => {
  try {
    console.log('=== CREATING QUOTATION ===');
    console.log('Quotation data:', quotation);
    console.log('Token:', token ? 'Present' : 'Missing');
    
    const res = await api.post('/quotations', quotation, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Quotation creation response:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('Quotation creation error:', error);
    console.error('Error status:', error.response?.status);
    console.error('Error response:', error.response?.data);
    console.error('Error message:', error.message);
    throw error;
  }
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

export const deleteQuotation = async (id: string, token: string) => {
  const res = await api.delete(`/quotations/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const getQuotationById = async (id: string, token: string) => {
  const res = await api.get(`/quotations/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const updateQuotation = async (id: string, quotation: any, token: string) => {
  const res = await api.put(`/quotations/update/${id}`, quotation, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}; 