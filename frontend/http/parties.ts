import api from './api';

export interface PartyData {
  name: string;
  phone?: string;
  email?: string;
  gstNumber?: string;
  pan?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  openingBalance?: number;
  tags?: string[];
  status?: string;
  note?: string;
  openingDate?: string; // Added for bulk import
}

export const createParty = async (partyData: PartyData, token: string): Promise<any> => {
  const response = await api.post('/parties', partyData, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

export const fetchPartiesByUserId = async (token: string): Promise<any> => {
  console.log('fetchPartiesByUserId called with token length:', token?.length);
  try {
    const response = await api.get('/parties', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    console.log('Parties API response:', response);
    return response.data;
  } catch (error) {
    console.error('Parties API error:', error);
    throw error;
  }
};

export const updateParty = async (id: string, partyData: PartyData, token: string): Promise<any> => {
  const response = await api.put(`/parties/${id}`, partyData, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

export const deleteParty = async (id: string, token: string): Promise<any> => {
  const response = await api.delete(`/parties/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

export const getCustomerParties = async (token: string) => {
  const res = await api.get('/parties', {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data.data;
};

export const getPartyBalance = async (partyId: string, token: string) => {
  try {
    const res = await api.get(`/parties/${partyId}/balance`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.data;
  } catch (error: any) {
    // If party doesn't exist or balance endpoint fails, return null
    if (error.response?.status === 404 || error.response?.status === 500) {
      return null;
    }
    throw error; // Re-throw other errors
  }
};

export const getReceivables = async (token: string) => {
  const res = await api.get('/api/dashboard/receivables', {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data.data;
};

export const getPayables = async (token: string) => {
  const res = await api.get('/api/dashboard/payables', {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data.data;
}; 