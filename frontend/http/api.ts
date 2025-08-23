import axios from 'axios';
import { API_BASE_URL } from '../lib/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor to handle session expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && error.response?.data?.code === 'SESSION_EXPIRED') {
      // Clear local storage and redirect to home page (which has login)
      if (typeof window !== 'undefined') {
        // Clear data in a way that triggers storage events for other tabs
        const keysToRemove = ['token', 'user', 'isAuthenticated', 'businessName', 'devease_auth_token', 'devease_user_session', 'businessId'];
        
        keysToRemove.forEach(key => {
          localStorage.removeItem(key);
        });
        
        // Trigger storage event manually for same tab
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'token',
          oldValue: 'expired',
          newValue: '',
          url: window.location.href
        }));
        
        // Force page reload to go to home/login page
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

export const fetchDashboardStats = async (token?: string) => {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await api.get('/dashboard/stats', { headers });
  return response.data;
};

export const fetchSalesOverview = async (userId: string, token?: string) => {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await api.get(`/api/dashboard/sales-overview/${userId}`, { headers });
  return response.data;
};

export const fetchSalesOverviewForUser = async (token?: string) => {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await api.get('/dashboard/sales-overview', { headers });
  return response.data;
};

export async function fetchRecentActivity(userId: string, token?: string) {
  const res = await fetch(`${API_BASE_URL}/dashboard/recent-activity/${userId}`, {
    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
  });
  return res.json();
}

export async function fetchRecentActivityForUser(token?: string) {
  const res = await fetch(`${API_BASE_URL}/dashboard/recent-activity`, {
    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
  });
  return res.json();
} 

export const sendUserInvite = async (invite: { email: string, role: string, companyName: string }, token: string) => {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await api.post('/api/user-invite', invite, { headers });
  return response.data;
}; 

export const getUserInvites = async (token: string) => {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await api.get('/api/user-invites', { headers });
  return response.data;
}; 

export const updateUserInvite = async (inviteId: string, role: string, token: string) => {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await api.put(`/api/user-invite/${inviteId}`, { role }, { headers });
  return response.data;
};

export const deleteUserInvite = async (inviteId: string, token: string) => {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await api.delete(`/api/user-invite/${inviteId}`, { headers });
  return response.data;
};

export const getInvitesForMe = async (token: string) => {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await api.get('/api/invites/for-me', { headers });
  return response.data;
};

export const respondToInvite = async (inviteId: string, action: 'Accepted' | 'Rejected', token: string) => {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await api.post('/api/invites/respond', { inviteId, action }, { headers });
  return response.data;
}; 

export const updateUserCompanyContext = async (inviteId: string, companyId: string, userId: string, token: string) => {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await api.post('/api/invites/update-company-context', { inviteId, companyId, userId }, { headers });
  return response.data;
}; 