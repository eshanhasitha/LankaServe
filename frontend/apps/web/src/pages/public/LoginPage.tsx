import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth-context.tsx';
import { loginWithEmailPassword, loginWithGooglePopup } from '../../lib/firebase-client.ts';
import { notifyError } from '../../lib/toast.ts';


// Matches Register page input style exactly
const inputClass =
  'w-full h-12 px-4 bg-white border border-slate-200 rounded-[10px] text-sm text-[#111827] placeholder:text-slate-400 outline-none focus:border-[#1E3A8A] focus:ring-2 focus:ring-[#1E3A8A]/20 transition-all';

// Matches Register page label style exactly
const labelClass = 'block text-[10px] font-bold tracking-widest text-[#6B7280] uppercase mb-2';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();

  async function redirectByRole(data) {
    const role = data?.user?.role;
    if (role === 'customer') navigate('/customer/dashboard', { replace: true });
    else if (role === 'provider') navigate('/provider/dashboard', { replace: true });
    else if (role === 'admin') window.location.replace(import.meta.env.VITE_ADMIN_APP_URL || 'http://localhost:5174/dashboard');
    else navigate('/home', { replace: true });
  }

  async function onSubmit(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const token = await loginWithEmailPassword(email.trim(), password);
      const data = await loginWithToken(token);
      await redirectByRole(data);
    } catch (submitError) {
      notifyError(submitError.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  async function onGoogleLogin() {
    setBusy(true);
    try {
      const token = await loginWithGooglePopup();
      const data = await loginWithToken(token);
      await redirectByRole(data);
    } catch (loginError) {
      notifyError(loginError.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="min-h-screen flex flex-col bg-[#F0F2F5] font-['Inter'] p-4">

      {/* Language switcher â€” identical to Register */}
      <div className="fixed top-6 right-6 z-50">
        <div className="flex items-center overflow-hidden rounded-full bg-white px-1 py-1 border border-slate-300 shadow-sm">
          <button className="px-3 py-1 text-xs font-semibold text-[#1E3A8A] hover:bg-slate-100 rounded-full transition-colors" type="button">EN</button>
          <div className="w-px h-3 bg-slate-300" />
          <button className="px-3 py-1 text-xs font-semibold text-slate-400 hover:bg-slate-100 rounded-full transition-colors" type="button">SI</button>
          <div className="w-px h-3 bg-slate-300" />
          <button className="px-3 py-1 text-xs font-semibold text-slate-400 hover:bg-slate-100 rounded-full transition-colors" type="button">TA</button>
        </div>
      </div>

      <main className="grow flex items-center justify-center px-4">
        <div className="w-full max-w-115 bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] p-10">

          {/* Header â€” identical structure to Register */}
          <div className="flex flex-col items-center mb-8">
            <div className="flex items-center justify-center w-14 h-14 bg-[#1E3A8A] rounded-2xl mb-4">
              <span className="material-symbols-outlined text-white text-3xl">handshake</span>
            </div>
            <h1 className="text-3xl font-bold text-[#111827] mb-1">LankaServe</h1>
            <p className="text-sm text-[#6B7280]">Access your LankaServe account</p>
          </div>

          <form className="flex flex-col gap-5" onSubmit={onSubmit}>

            {/* Email field */}
            <div>
              <label className={labelClass} htmlFor="email">Email Address</label>
              <div className="relative">
                <input
                  className={inputClass + ' pl-11'}
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-[10px] font-bold tracking-widest text-[#6B7280] uppercase" htmlFor="password">
                  Password
                </label>
                <button
                  className="text-xs font-semibold text-[#1E3A8A] hover:underline"
                  type="button"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <input
                  className={inputClass + ' pl-11 pr-11'}
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  className="absolute inset-y-0 right-3.5 flex items-center text-slate-400 hover:text-[#6B7280] transition-colors"
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  <span className="material-symbols-outlined text-xl">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Submit â€” identical style to Register button */}
            <button
              className="w-full h-12 bg-[#1E3A8A] hover:bg-[#1e40af] active:scale-[0.98] text-white text-sm font-bold tracking-wide rounded-[10px] shadow-[0_4px_14px_rgba(30,58,138,0.25)] disabled:opacity-75 disabled:cursor-not-allowed transition-all"
              type="submit"
              disabled={busy}
            >
              {busy ? 'Signing in...' : 'LOGIN'}
            </button>

            {/* Divider â€” identical to Register */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-[11px] font-medium tracking-wide text-slate-400 uppercase">
                  Or
                </span>
              </div>
            </div>

            {/* Google â€” identical to Register */}
            <button
              className="w-full h-12 flex items-center justify-center gap-2.5 bg-white border border-slate-200 rounded-[10px] text-sm font-semibold text-[#374151] hover:bg-slate-50 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
              type="button"
              disabled={busy}
              onClick={onGoogleLogin}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Sign in with Google
            </button>

          </form>

          {/* Footer link â€” identical to Register */}
          <div className="mt-7 text-center">
            <p className="text-sm text-[#6B7280]">
              Don&apos;t have an account?{' '}
              <Link className="font-bold text-[#1E3A8A] hover:underline" to="/register">Register</Link>
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ marginTop: '28px', textAlign: 'center' }}>
        <p style={{
          fontSize: '11px',
          color: '#9CA3AF',
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>shield</span>
          Secure authentication with role-based access.
        </p>
      </footer>
    </section>
  );
}

