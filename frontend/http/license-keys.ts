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

// Delete a license key (superadmin only)
export const deleteLicenseKey = async (key: string): Promise<{ success: boolean; message: string }> => {
  try {
    // Try DELETE method first
    const response = await api.delete(`/api/license-keys/delete/${key}`);
    return response.data;
  } catch (error: any) {
    // If DELETE fails, try POST method as fallback
    try {
      const response = await api.post(`/api/license-keys/delete/${key}`);
      return response.data;
    } catch (postError: any) {
      throw new Error(postError.response?.data?.message || 'Failed to delete license key');
    }
  }
}; 