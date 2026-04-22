import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { login } from './auth-api';

type Session = {
  user: { _id: string; role: string; name: string; email: string };
  accessToken: string;
};

type CtxType = {
  session: Session | null;
  loginWithToken: (t: string) => Promise<void>;
  logout: () => void;
};

const KEY = 'lanka.admin.auth';
const Ctx = createContext<CtxType | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  });

  useEffect(() => {
    if (session) {
      localStorage.setItem(KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(KEY);
    }
  }, [session]);

  return (
    <Ctx.Provider
      value={{
        session,
        loginWithToken: async (t) => setSession(await login(t)),
        logout: () => setSession(null),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAdminAuth must be used inside AdminAuthProvider');
  return ctx;
}