import { notifyError } from './toast.ts';
import { API_BASE_URL, API_TIMEOUT_MS } from './api-config.ts';

const STORAGE_KEY = 'lanka.web.auth';
let refreshPromise = null;
type ApiRequestOptions = RequestInit & {
  headers?: HeadersInit;
  notifyOnError?: boolean;
};

export async function apiRequest(path, options: ApiRequestOptions = {}) {
  return requestWithAuth(path, options, true);
}

async function requestWithAuth(path, options: ApiRequestOptions = {}, allowRefresh = true) {
  const { headers: optionHeaders, notifyOnError = true, ...restOptions } = options;
  const session = readSession();
  const authHeaders = session?.accessToken && !hasAuthorizationHeader(optionHeaders)
    ? { Authorization: `Bearer ${session.accessToken}` }
    : {};
  let response;
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...restOptions,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...(optionHeaders || {}),
      },
    });
  } catch (error) {
    const message = error?.name === 'AbortError'
      ? `API request timed out after ${Math.round(API_TIMEOUT_MS / 1000)}s`
      : `Cannot reach API server: ${error.message}`;
    if (notifyOnError) notifyError(message);
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

  if (response.status === 401 && allowRefresh && session?.refreshToken) {
    try {
      const nextSession = await refreshSession(session);
      return requestWithAuth(
        path,
        {
          ...restOptions,
          notifyOnError,
          headers: {
            ...(optionHeaders || {}),
            Authorization: `Bearer ${nextSession.accessToken}`,
          },
        },
        false
      );
    } catch {
      clearSession();
    }
  }

  if (!response.ok) {
    const message =
      payload?.message ||
      rawText?.trim() ||
      `Request failed (${response.status} ${response.statusText})`;
    if (notifyOnError) notifyError(message);
    throw new Error(message);
  }

  return payload;
}

export { API_BASE_URL };

function readSession() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function persistSession(session) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event('auth:session-changed'));
}

function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event('auth:session-changed'));
}

function hasAuthorizationHeader(headers) {
  if (!headers) return false;
  return Object.keys(headers).some((key) => key.toLowerCase() === 'authorization');
}

async function refreshSession(session) {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), API_TIMEOUT_MS);
      let response;
      try {
        response = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken: session.refreshToken }),
        });
      } catch (error) {
        const message = error?.name === 'AbortError'
          ? `Token refresh timed out after ${Math.round(API_TIMEOUT_MS / 1000)}s`
          : `Cannot reach API server: ${error.message}`;
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

      if (!response.ok || !payload?.data?.accessToken || !payload?.data?.refreshToken) {
        throw new Error(payload?.message || 'Token refresh failed');
      }

      const nextSession = {
        ...session,
        accessToken: payload.data.accessToken,
        refreshToken: payload.data.refreshToken,
      };
      persistSession(nextSession);
      return nextSession;
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

