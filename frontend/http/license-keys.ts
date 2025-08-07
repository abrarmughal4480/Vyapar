import api from './api';

export interface LicenseKey {
  key: string;
  duration: number;
  maxDevices: number;
  currentUsage: number;
  remainingDevices: number;
  expiresAt: string;
  generatedAt: string;
  isActive: boolean;
  usedDevices: Array<{
    userId: string;
    userEmail: string;
    userName: string;
    activatedAt: string;
    deviceInfo: string;
  }>;
}

export interface GenerateLicenseKeyRequest {
  duration: number;
  maxDevices: number;
}

export interface ActivateLicenseKeyRequest {
  key: string;
  deviceInfo?: string;
}

export interface LicenseStatus {
  hasValidLicense: boolean;
  message?: string;
  license?: {
    key: string;
    duration: number;
    maxDevices: number;
    currentUsage: number;
    remainingDevices: number;
    expiresAt: string;
    activatedAt: string;
  };
}

// Generate a new license key (superadmin only)
export const generateLicenseKey = async (data: GenerateLicenseKeyRequest): Promise<{ success: boolean; message: string; data: LicenseKey }> => {
  try {
    const response = await api.post('/api/license-keys/generate', data);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to generate license key');
  }
};

// Get all license keys (superadmin only)
export const getAllLicenseKeys = async (): Promise<{ success: boolean; data: LicenseKey[] }> => {
  try {
    const response = await api.get('/api/license-keys/all');
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to fetch license keys');
  }
};

// Activate a license key
export const activateLicenseKey = async (data: ActivateLicenseKeyRequest): Promise<{ success: boolean; message: string; data: LicenseKey }> => {
  try {
    const response = await api.post('/api/license-keys/activate', data);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to activate license key');
  }
};

// Check current user's license status
export const checkLicenseStatus = async (): Promise<{ success: boolean; data: LicenseStatus }> => {
  try {
    const response = await api.get('/api/license-keys/status');
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to check license status');
  }
};

// Deactivate a license key (superadmin only)
export const deactivateLicenseKey = async (key: string): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await api.put(`/api/license-keys/deactivate/${key}`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to deactivate license key');
  }
}; 