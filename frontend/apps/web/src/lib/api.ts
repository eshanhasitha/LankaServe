export type ApiResponse<T> = { 
  success: boolean; 
  message?: string; 
  data: T 
};

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export async function apiRequest<T>(
  path: string, 
  init: RequestInit = {}
): Promise<ApiResponse<T>> {
  const s = JSON.parse(localStorage.getItem('lanka.web.auth') || 'null');
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(s?.accessToken ? { Authorization: `Bearer ${s.accessToken}` } : {}),
      ...(init.headers || {}),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || 'Request failed');
  return data;
}