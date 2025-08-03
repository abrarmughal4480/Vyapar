import api from './api';
import { getFrontendUrl } from '../lib/utils';

export const sendOTP = (email: string) =>
  api.post('/auth/send-otp', { email });

export const verifyOTPAndRegister = (userData: any) =>
  api.post('/auth/verify-otp-register', userData);

export const register = (userData: any) =>
  api.post('/auth/register', userData);

export const login = (credentials: any) =>
  api.post('/auth/login', credentials);

export const forgotPassword = (email: string) =>
  api.post('/auth/forgot-password', { 
    email,
    frontendUrl: getFrontendUrl() // Send frontend URL to backend
  });

export const resetPassword = (token: string, password: string) =>
  api.post('/auth/reset-password', { token, password }); 