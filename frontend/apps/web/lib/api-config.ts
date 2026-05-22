const DEFAULT_API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS || 15000);
const LOCAL_API_TARGET_PATTERN = /^https?:\/\/(?:localhost|127(?:\.\d{1,3}){3}|0\.0\.0\.0)(?::\d+)?(?:\/api)?\/?$/i;

function resolveBaseUrl(value) {
  const rawValue = value ? String(value).trim() : '';
  if (
    import.meta.env.DEV &&
    (!rawValue || LOCAL_API_TARGET_PATTERN.test(rawValue))
  ) {
    // In local development, route API calls through Vite proxy to avoid CORS
    // mismatches when host/port/origin variations happen (localhost vs 127.0.0.1).
    return '/api';
  }
  return rawValue || '/api';
}

function normalizeBaseUrl(value) {
  if (!value) return '/api';
  const trimmed = String(value).trim();
  if (!trimmed) return '/api';
  const normalized = trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
  if (normalized.startsWith('/')) {
    if (typeof window !== 'undefined' && window.location?.origin) {
      return `${window.location.origin}${normalized}`;
    }
  }
  return normalized;
}

export const API_BASE_URL = normalizeBaseUrl(resolveBaseUrl(import.meta.env.VITE_API_BASE_URL));
export const API_TIMEOUT_MS = Number.isFinite(DEFAULT_API_TIMEOUT_MS) && DEFAULT_API_TIMEOUT_MS > 0
  ? DEFAULT_API_TIMEOUT_MS
  : 15000;
