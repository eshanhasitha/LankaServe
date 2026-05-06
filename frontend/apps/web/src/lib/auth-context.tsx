import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  SESSION_EVENT,
  clearSession,
  login,
  logout,
  persistSession,
  readSession,
  register,
} from './auth-api.ts';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => readSession());

  useEffect(() => {
    const syncSession = () => {
      setSession(readSession());
    };

    window.addEventListener('storage', syncSession);
    window.addEventListener(SESSION_EVENT, syncSession);

    return () => {
      window.removeEventListener('storage', syncSession);
      window.removeEventListener(SESSION_EVENT, syncSession);
    };
  }, []);

  const value = useMemo(() => ({
    user: session?.user ?? null,
    accessToken: session?.accessToken ?? null,
    refreshToken: session?.refreshToken ?? null,
    isAuthenticated: Boolean(session?.accessToken && session?.user),

    async loginWithToken(firebaseIdToken) {
      const data = await login(firebaseIdToken);
      persistSession(data);
      setSession(data);
      return data;
    },

    async registerWithToken(firebaseIdToken, role, providerProfile) {
      const data = await register(firebaseIdToken, role, providerProfile);
      persistSession(data);
      setSession(data);
      return data;
    },

    async logoutCurrentUser() {
      try {
        await logout(session?.accessToken, session?.refreshToken);
      } finally {
        clearSession();
        setSession(null);
      }
    },

    updateCurrentUser(nextUser) {
      setSession((prev) => {
        if (!prev) return prev;
        const nextSession = { ...prev, user: { ...(prev.user || {}), ...(nextUser || {}) } };
        persistSession(nextSession);
        return nextSession;
      });
    },
  }), [session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}

