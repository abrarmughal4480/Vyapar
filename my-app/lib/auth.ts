// lib/auth.ts
export interface User {
  id: string;
  email: string;
  name: string;
  role?: string;
  businessId?: string;
}

// ✅ Your setAuthTokenAndUser function - moved from page.tsx
export function setAuthTokenAndUser(
  token: string, 
  user: { id: string, email: string, name: string, role?: string, businessId?: string }
) {
  if (typeof window !== 'undefined') {
    // Store in multiple formats for compatibility
    localStorage.setItem('authToken', token);
    localStorage.setItem('userData', JSON.stringify(user));
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('vypar_auth_token', token);
    localStorage.setItem('vypar_user_session', JSON.stringify(user));
    localStorage.setItem('businessId', user.businessId || '');
    
    console.log('Setting auth token and user:', { token, user });
  }
}

// Additional auth utilities
export const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('authToken') || 
           localStorage.getItem('token') || 
           localStorage.getItem('vypar_auth_token');
  }
  return null;
};

export const getCurrentUser = (): User | null => {
  if (typeof window !== 'undefined') {
    try {
      const userStr = localStorage.getItem('userData') || 
                     localStorage.getItem('user') || 
                     localStorage.getItem('vypar_user_session');
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  }
  return null;
};

export const clearAuth = (): void => {
  if (typeof window !== 'undefined') {
    // Clear all possible auth storage keys
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('vypar_auth_token');
    localStorage.removeItem('vypar_user_session');
    localStorage.removeItem('businessId');
    console.log('Auth data cleared');
  }
};

export const isAuthenticated = (): boolean => {
  const token = getAuthToken();
  const user = getCurrentUser();
  return !!(token && user);
};

export const getAuthState = () => {
  const token = getAuthToken();
  const user = getCurrentUser();
  
  return {
    token,
    user,
    isAuthenticated: !!(token && user),
    headers: token ? {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    } : {}
  };
};