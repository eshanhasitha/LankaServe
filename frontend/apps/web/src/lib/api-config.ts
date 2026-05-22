const DEFAULT_API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS || 15000);

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

export const API_BASE_URL = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL || '/api');
export const API_TIMEOUT_MS = Number.isFinite(DEFAULT_API_TIMEOUT_MS) && DEFAULT_API_TIMEOUT_MS > 0
  ? DEFAULT_API_TIMEOUT_MS
  : 15000;
