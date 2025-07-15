import axios from 'axios';
import { API_BASE_URL } from '../lib/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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

export async function fetchRecentActivity(userId: string, token?: string) {
  const res = await fetch(`${API_BASE_URL}/dashboard/recent-activity/${userId}`, {
    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
  });
  return res.json();
} 