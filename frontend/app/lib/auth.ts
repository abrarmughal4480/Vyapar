import { jwtDecode } from 'jwt-decode';

export function getToken() {
  if (typeof window === 'undefined') return null;
  // Try localStorage first (like items page)
  let token = localStorage.getItem('token') || localStorage.getItem('vypar_auth_token') || null;
  if (!token) {
    // Fallback to cookies
    const match = document.cookie.match(/token=([^;]+)/);
    token = match ? match[1] : null;
  }
  return token;
}

export function getUserIdFromToken() {
  const token = getToken();
  if (!token) return null;
  try {
    const decoded: any = jwtDecode(token);
    return decoded._id || decoded.id || null;
  } catch {
    return null;
  }
} 