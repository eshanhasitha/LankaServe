import { useEffect, useRef, useState } from 'react';
import { APP_TOAST_EVENT } from '../lib/toast.ts';

export default function AppToaster() {
  const [toasts, setToasts] = useState([]);
  const recentRef = useRef([]);

  useEffect(() => {
    const onToast = (event) => {
      const next = event?.detail;
      if (!next?.message) return;

      const now = Date.now();
      const fingerprint = `${next.type || 'info'}:${next.message}`;
      recentRef.current = recentRef.current.filter((item) => now - item.at < 1500);
      if (recentRef.current.some((item) => item.fingerprint === fingerprint)) {
        return;
      }
      recentRef.current.push({ fingerprint, at: now });

      const toast = {
        id: next.id || `${now}-${Math.random().toString(36).slice(2, 8)}`,
        message: next.message,
        type: next.type || 'info',
        duration: Number(next.duration) > 0 ? Number(next.duration) : 4500,
      };

      setToasts((prev) => [...prev, toast]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== toast.id));
      }, toast.duration);
    };

    window.addEventListener(APP_TOAST_EVENT, onToast);
    return () => window.removeEventListener(APP_TOAST_EVENT, onToast);
  }, []);

  return (
    <div className="pointer-events-none fixed left-1/2 top-4 z-70 flex w-[min(92vw,24rem)] -translate-x-1/2 flex-col items-center gap-2 sm:top-8">
      {toasts.map((toast) => (
        <article
          key={toast.id}
          role="alert"
          className={`pointer-events-auto w-full rounded-2xl border px-4 py-3 shadow-lg transition-all ${
            toast.type === 'error'
              ? 'border-slate-200 bg-slate-100 text-slate-700'
              : 'border-slate-200 bg-white text-slate-800'
          }`}
        >
          <div className="flex items-center gap-3">
            {toast.type === 'error' ? (
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-500 text-white">
                <span className="material-symbols-outlined text-base leading-none">close</span>
              </span>
            ) : (
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-700 text-white">
                <span className="material-symbols-outlined text-base leading-none">info</span>
              </span>
            )}
            <p className="text-sm font-medium leading-5 sm:text-base">{toast.message}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

