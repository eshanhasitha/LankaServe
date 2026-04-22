import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { login, type Session, type UserRole } from './auth-api';

type AuthCtx = {
  user: Session['user'] | null;
  accessToken: string | null;
  loginWithToken: (token: string) => Promise<void>;
  logout: () => void;
  hasRole: (roles: UserRole[]) => boolean;
};

const Ctx = createContext<AuthCtx | null>(null);
const KEY = 'lanka.web.auth';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) as Session : null;
  });

  useEffect(() => {
    if (session) localStorage.setItem(KEY, JSON.stringify(session));
    else localStorage.removeItem(KEY);
  }, [session]);

  const value = useMemo<AuthCtx>(() => ({
    user: session?.user || null,
    accessToken: session?.accessToken || null,
    loginWithToken: async (token: string) => setSession(await login(token)),
    logout: () => setSession(null),
    hasRole: (roles) => !!session?.user && roles.includes(session.user.role),
  }), [session]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}