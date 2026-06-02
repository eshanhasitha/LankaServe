import { apiRequest } from './api.ts';

const STORAGE_KEY = 'lanka.admin.auth';

export function readSession() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function saveSession(session) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
}

export async function loginAdmin(email, password) {
  const result = await apiRequest('/admin-auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  return result.data;
}

export async function refreshAdminSession(refreshToken) {
  const result = await apiRequest('/admin-auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });

  return result.data;
}

export async function logoutAdmin(accessToken, refreshToken) {
  if (!accessToken || !refreshToken) return;

  await apiRequest('/admin-auth/logout', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ refreshToken }),
  });
}

