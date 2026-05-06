import { notifyError } from './toast.ts';
import { API_BASE_URL, API_TIMEOUT_MS } from './api-config.ts';

const STORAGE_KEY = 'lanka.web.auth';
const SESSION_EVENT = 'auth:session-changed';

const emitSessionChanged = () => {
  window.dispatchEvent(new Event(SESSION_EVENT));
};

export async function login(firebaseIdToken) {
  const result = await fetchJson('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ firebaseIdToken }),
  });

  return result.data;
}

export async function register(firebaseIdToken, role, providerProfile) {
  const result = await fetchJson('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ firebaseIdToken, role, providerProfile }),
  });

  return result.data;
}

export async function logout(accessToken, refreshToken) {
  if (!accessToken || !refreshToken) return;

  await fetchJson('/auth/logout', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ refreshToken }),
  });
}

export async function refresh(refreshToken) {
  const result = await fetchJson('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });

  return result.data;
}

export function persistSession(session) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  emitSessionChanged();
}

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

export function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
  emitSessionChanged();
}

export { SESSION_EVENT };

async function fetchJson(path, options = {}) {
  const { headers: optionHeaders, ...restOptions } = options;
  let response;
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...restOptions,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(optionHeaders || {}),
      },
    });
  } catch (error) {
    const message = error?.name === 'AbortError'
      ? `API request timed out after ${Math.round(API_TIMEOUT_MS / 1000)}s`
      : `Cannot reach API server: ${error.message}`;
    notifyError(message);
    throw new Error(message);
  } finally {
    window.clearTimeout(timeoutId);
  }

  const rawText = await response.text();
  let payload = null;
  try {
    payload = rawText ? JSON.parse(rawText) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message =
      payload?.message ||
      rawText?.trim() ||
      `Request failed (${response.status} ${response.statusText})`;
    notifyError(message);
    throw new Error(message);
  }

  return payload;
}

