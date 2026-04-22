export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
  pagination: any;
  errorCode: string | null;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<ApiResponse<T>> {
  const session = JSON.parse(localStorage.getItem('lanka.web.auth') || 'null');

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {}),
      ...(init.headers || {}),
    },
  });

  const json = await res.json();

  if (!res.ok) throw new Error(json?.message || 'Request failed');

  return json;
}