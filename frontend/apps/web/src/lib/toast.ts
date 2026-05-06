export const APP_TOAST_EVENT = 'app:toast';

export function notify(message, options = {}) {
  const text = String(message || '').trim();
  if (!text) return;

  window.dispatchEvent(
    new CustomEvent(APP_TOAST_EVENT, {
      detail: {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        message: text,
        type: options.type || 'info',
        duration: Number(options.duration) > 0 ? Number(options.duration) : 4500,
      },
    })
  );
}

export function notifyError(message, options = {}) {
  notify(message, { ...options, type: 'error' });
}
