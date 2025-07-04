import api from './api';

export const register = (userData: any) =>
  api.post('/auth/register', userData);

export const login = (credentials: any) =>
  api.post('/auth/login', credentials); 