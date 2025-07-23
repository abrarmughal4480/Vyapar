import { getToken } from '../app/lib/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function getProfile() {
  const token = getToken();
  const res = await fetch(`${API_BASE_URL}/profile`, {
    headers: { 'Authorization': `Bearer ${token}` },
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to fetch profile');
  return res.json();
}

export async function updateProfile(data: Record<string, any>, file?: File) {
  const token = getToken();
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) formData.append(key, value);
  });
  if (file) formData.append('profileImage', file);
  const res = await fetch(`${API_BASE_URL}/profile`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData,
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to update profile');
  return res.json();
} 