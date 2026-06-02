import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../lib/auth-context.tsx';

const inputClass =
  'w-full h-12 px-4 bg-white border border-slate-200 rounded-[10px] text-sm text-[#111827] placeholder:text-slate-400 outline-none focus:border-[#1E3A8A] focus:ring-2 focus:ring-[#1E3A8A]/20 transition-all';

const labelClass = 'block text-[10px] font-bold tracking-widest text-[#6B7280] uppercase mb-2';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { initialized, isAuthenticated, loginWithCredentials } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from || '/dashboard';

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');

    try {
      await loginWithCredentials(email, password);
      navigate(from, { replace: true });
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : 'Admin login failed');
    } finally {
      setBusy(false);
    }
  }

  if (initialized && isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  return (
    <section className="min-h-screen flex flex-col bg-[#F0F2F5] font-['Inter'] p-4">
      <main className="grow flex items-center justify-center px-4">
        <div className="w-full max-w-115 bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] p-10">
          <div className="flex flex-col items-center mb-8">
            <div className="flex items-center justify-center w-14 h-14 bg-[#1E3A8A] rounded-2xl mb-4">
              <span className="material-symbols-outlined text-white text-3xl">admin_panel_settings</span>
            </div>
            <h1 className="text-3xl font-bold text-[#111827] mb-1">LankaServe Admin</h1>
            <p className="text-sm text-[#6B7280]">Access the restricted LankaServe admin console</p>
          </div>

          <form className="flex flex-col gap-5" onSubmit={onSubmit}>
            <div>
              <label className={labelClass} htmlFor="email">Admin Email</label>
              <input
                className={inputClass}
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                placeholder="admin@lankaserve.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={busy || !initialized}
                required
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="password">Password</label>
              <div className="relative">
                <input
                  className={inputClass + ' pr-11'}
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={busy || !initialized}
                  required
                />
                <button
                  className="absolute inset-y-0 right-3.5 flex items-center text-slate-400 hover:text-[#6B7280] transition-colors disabled:cursor-not-allowed"
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  disabled={busy || !initialized}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <span className="material-symbols-outlined text-xl">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            <button
              className="w-full h-12 bg-[#1E3A8A] hover:bg-[#1e40af] active:scale-[0.98] text-white text-sm font-bold tracking-wide rounded-[10px] shadow-[0_4px_14px_rgba(30,58,138,0.25)] disabled:opacity-75 disabled:cursor-not-allowed transition-all"
              type="submit"
              disabled={busy || !initialized}
            >
              {busy ? 'Signing in...' : 'LOGIN'}
            </button>
          </form>

          {!initialized ? (
            <p className="mt-5 text-center text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Checking existing admin session...
            </p>
          ) : null}
          {error ? (
            <p className="mt-4 rounded-[10px] border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}
        </div>
      </main>

      <footer className="mt-7 text-center">
        <p className="text-[11px] text-[#9CA3AF] font-medium uppercase tracking-widest flex items-center justify-center gap-1.5">
          <span className="material-symbols-outlined text-[15px]">shield</span>
          Restricted access for authorized admins only.
        </p>
      </footer>
    </section>
  );
}


