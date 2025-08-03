import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Auto-detect frontend URL for password reset and other features
export const getFrontendUrl = () => {
  if (typeof window !== 'undefined') {
    // Get current URL and extract base URL
    const currentUrl = window.location.origin;
    return currentUrl;
  }
  // Fallback for server-side rendering
  return process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000';
};

// Get current page URL
export const getCurrentUrl = () => {
  if (typeof window !== 'undefined') {
    return window.location.href;
  }
  return '';
};

// Get base URL without path
export const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000';
};
