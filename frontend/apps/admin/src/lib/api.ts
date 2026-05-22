const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

type AdminApiRequestOptions = RequestInit & {
  headers?: HeadersInit;
};

type AdminApiError = Error & {
  status?: number;
  payload?: unknown;
};

export async function apiRequest(path, options: AdminApiRequestOptions = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(payload?.message || 'Request failed') as AdminApiError;
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}
