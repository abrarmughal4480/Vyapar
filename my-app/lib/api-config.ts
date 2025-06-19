export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const API_ENDPOINTS = {
  barcode: {
    generate: `${API_BASE_URL}/barcode/generate`,
    bulkGenerate: `${API_BASE_URL}/barcode/bulk-generate`,
    history: `${API_BASE_URL}/barcode/history`,
    delete: (id: string) => `${API_BASE_URL}/barcode/${id}`,
    getById: (id: string) => `${API_BASE_URL}/barcode/${id}`,
    getByProduct: (productId: string) => `${API_BASE_URL}/barcode/product/${productId}`,
  },
  auth: {
    login: `${API_BASE_URL}/auth/login`,
    register: `${API_BASE_URL}/auth/register`,
    profile: `${API_BASE_URL}/auth/profile`,
  },  sale: {
    create: (businessId: string) => `${API_BASE_URL}/sale/${businessId}/invoice`,
    getAll: (businessId: string) => `${API_BASE_URL}/sale/${businessId}`,
    getById: (businessId: string, invoiceId: string) => `${API_BASE_URL}/sale/${businessId}/invoice/${invoiceId}`,
    update: (businessId: string, invoiceId: string) => `${API_BASE_URL}/sale/${businessId}/invoice/${invoiceId}`,
    delete: (businessId: string, invoiceId: string) => `${API_BASE_URL}/sale/${businessId}/invoice/${invoiceId}`,
    stats: (businessId: string) => `${API_BASE_URL}/sale/${businessId}/stats`,
    customers: (businessId: string) => `${API_BASE_URL}/sale/${businessId}/customers`,
  }
};

export const getAuthHeaders = () => {
  let token = null;
  
  // Check if we're in the browser before accessing localStorage
  if (typeof window !== 'undefined') {
    token = localStorage.getItem('token');
  }
  
  const headers: { [key: string]: string } = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

// Demo token for testing (you can replace this with actual login)
export const setDemoToken = () => {
  if (typeof window !== 'undefined') {
    // Create a demo JWT token (this is just for testing)
    const demoToken = 'demo-token-for-testing';
    localStorage.setItem('token', demoToken);
  }
};

// Function to check if user is authenticated
export const isAuthenticated = () => {
  if (typeof window !== 'undefined') {
    return !!localStorage.getItem('token');
  }
  return false;
};

// Function to login with demo credentials
export const loginWithDemo = async () => {
  try {
    const response = await fetch(API_ENDPOINTS.auth.login, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'demo@example.com',
        password: 'demo123'
      })
    });

    if (response.ok) {
      const result = await response.json();
      if (result.access_token) {
        localStorage.setItem('token', result.access_token);
        return true;
      }
    }
    
    // If login fails, set demo token
    setDemoToken();
    return true;
  } catch (error) {
    console.error('Login failed:', error);
    // Fallback to demo token
    setDemoToken();
    return true;
  }
};
