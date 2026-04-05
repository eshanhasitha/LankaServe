import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { login, type Session, type User } from './auth-api';

type AuthContextType = {
  user: User | null;
  accessToken: string | null;
  loginWithDevToken: (token: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => {
    const raw = localStorage.getItem('lanka.web.auth');
    return raw ? JSON.parse(raw) as Session : null;
  });

  useEffect(() => {
    if (session) localStorage.setItem('lanka.web.auth', JSON.stringify(session));
    else localStorage.removeItem('lanka.web.auth');
  }, [session]);

  async function loginWithDevToken(token: string) {
    const result = await login(token);
    setSession(result);
  }

  function logout() {
    setSession(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        accessToken: session?.accessToken ?? null,
        loginWithDevToken,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
