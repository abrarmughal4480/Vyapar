// Logout utility function for consistent logout behavior across the app

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export const performLogout = async () => {
  try {
    // Call backend logout API to clear server-side session
    await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Logout API error:', error);
  } finally {
    // Clear all local storage data regardless of API call result
    if (typeof window !== 'undefined') {
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('businessName');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('devease_auth_token');
      localStorage.removeItem('devease_user_session');
      localStorage.removeItem('businessId');
      
      // Stop session monitoring
      try {
        const sessionManager = await import('./sessionManager');
        sessionManager.default.stopMonitoring();
      } catch (e) {
        console.log('Session manager not available');
      }
      
      // Force redirect to login page
      window.location.href = '/';
    }
  }
};

export default performLogout;
