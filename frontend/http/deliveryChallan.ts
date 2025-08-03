import api from './api';

export const createDeliveryChallan = async (challan: any, token: string) => {
  const { data } = await api.post('/api/delivery-challan', challan, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return data;
};

export const getDeliveryChallans = async (token: string) => {
  const { data } = await api.get('/api/delivery-challan', {
    headers: { Authorization: `Bearer ${token}` }
  });
  return data;
};

export const getDeliveryChallanById = async (challanId: string, token: string) => {
  const { data } = await api.get(`/api/delivery-challan/${challanId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return data;
};

export const updateDeliveryChallanStatus = async (challanId: string, status: string, token: string, invoiceNumber?: string) => {
  const payload: any = { status };
  if (invoiceNumber) {
    payload.invoiceNumber = invoiceNumber;
  }
  
  console.log('=== FRONTEND: UPDATE DELIVERY CHALLAN STATUS ===');
  console.log('Challan ID:', challanId);
  console.log('Status:', status);
  console.log('Invoice Number:', invoiceNumber);
  console.log('Payload:', payload);
  console.log('URL:', `/api/delivery-challan/${challanId}/status`);
  
  // Validate challanId
  if (!challanId || challanId === 'undefined' || challanId === 'null') {
    console.error('Invalid challan ID:', challanId);
    throw new Error('Invalid challan ID');
  }
  
  try {
    console.log('Making API request to:', `/api/delivery-challan/${challanId}/status`);
    console.log('Request payload:', payload);
    console.log('Request headers:', { Authorization: `Bearer ${token}` });
    
    const { data } = await api.put(`/api/delivery-challan/${challanId}/status`, payload, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Response:', data);
    return data;
  } catch (error: any) {
    console.error('Error updating delivery challan status:', error);
    console.error('Error status:', error.response?.status);
    console.error('Error response:', error.response?.data);
    console.error('Error message:', error.message);
    console.error('Full error:', error);
    throw error;
  }
};

export const deleteDeliveryChallan = async (challanId: string, token: string) => {
  const { data } = await api.delete(`/api/delivery-challan/${challanId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return data;
}; 