const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const raw = localStorage.getItem('lanka.web.auth');
  const session = raw ? JSON.parse(raw) as { accessToken?: string } : null;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {}),
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || 'Request failed');
  return data as T;
}
