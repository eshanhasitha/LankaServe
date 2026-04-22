const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const s = JSON.parse(localStorage.getItem('lanka.admin.auth') || 'null');
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(s?.accessToken ? { Authorization: `Bearer ${s.accessToken}` } : {}),
      ...(init.headers || {}),
    },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.message || 'Request failed');
  return json;
}