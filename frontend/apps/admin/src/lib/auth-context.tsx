import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  clearSession,
  loginAdmin,
  logoutAdmin,
  readSession,
  refreshAdminSession,
  saveSession,
} from './auth-api.ts';
import { apiRequest } from './api.ts';

const AdminAuthContext = createContext(null);
let inFlightRefresh = null;
let inFlightRefreshToken = null;

function normalizeSessionPayload(data, previousSession = null) {
  if (!data) return previousSession;

  return {
    admin: data.admin ?? previousSession?.admin ?? null,
    accessToken: data.accessToken ?? previousSession?.accessToken ?? null,
    refreshToken: data.refreshToken ?? previousSession?.refreshToken ?? null,
  };
}

async function refreshSessionOnce(refreshToken) {
  if (!refreshToken) {
    throw new Error('Admin refresh token is missing');
  }

  if (inFlightRefresh && inFlightRefreshToken === refreshToken) {
    return inFlightRefresh;
  }

  inFlightRefreshToken = refreshToken;
  inFlightRefresh = refreshAdminSession(refreshToken).finally(() => {
    if (inFlightRefreshToken === refreshToken) {
      inFlightRefresh = null;
      inFlightRefreshToken = null;
    }
  });

  return inFlightRefresh;
}

export function AdminAuthProvider({ children }) {
  const [session, setSession] = useState(() => readSession());
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      const current = readSession();
      if (!current?.refreshToken) {
        if (active) setInitialized(true);
        return;
      }

      try {
        const refreshed = await refreshSessionOnce(current.refreshToken);
        const nextSession = normalizeSessionPayload(refreshed, current);
        saveSession(nextSession);
        if (active) setSession(nextSession);
      } catch {
        const latestSession = readSession();

        // If another concurrent refresh already rotated tokens, keep that session.
        if (latestSession?.refreshToken && latestSession.refreshToken !== current.refreshToken) {
          if (active) setSession(latestSession);
        } else {
          clearSession();
          if (active) setSession(null);
        }
      } finally {
        if (active) setInitialized(true);
      }
    }

    bootstrap();

    return () => {
      active = false;
    };
  }, []);

  const loginWithCredentials = useCallback(async (email, password) => {
    const data = await loginAdmin(email, password);
    const nextSession = normalizeSessionPayload(data);
    saveSession(nextSession);
    setSession(nextSession);
    return nextSession;
  }, []);

  const authorizedRequest = useCallback(async (path, options = {}) => {
    if (!session?.accessToken) {
      throw new Error('Admin session not found');
    }

    try {
      return await apiRequest(path, {
        ...options,
        headers: {
          ...(options.headers || {}),
          Authorization: `Bearer ${session.accessToken}`,
        },
      });
    } catch (error) {
      if (error?.status !== 401 || !session?.refreshToken) {
        throw error;
      }

      try {
        const refreshed = await refreshSessionOnce(session.refreshToken);
        const nextSession = normalizeSessionPayload(refreshed, session);
        saveSession(nextSession);
        setSession(nextSession);

        return apiRequest(path, {
          ...options,
          headers: {
            ...(options.headers || {}),
            Authorization: `Bearer ${nextSession.accessToken}`,
          },
        });
      } catch (refreshError) {
        const latestSession = readSession();

        if (
          latestSession?.accessToken &&
          latestSession?.refreshToken &&
          latestSession.refreshToken !== session.refreshToken
        ) {
          setSession(latestSession);
          return apiRequest(path, {
            ...options,
            headers: {
              ...(options.headers || {}),
              Authorization: `Bearer ${latestSession.accessToken}`,
            },
          });
        }

        clearSession();
        setSession(null);
        throw refreshError;
      }
    }
  }, [session]);

  const logoutUser = useCallback(async () => {
    try {
      await logoutAdmin(session?.accessToken, session?.refreshToken);
    } finally {
      clearSession();
      setSession(null);
    }
  }, [session?.accessToken, session?.refreshToken]);

  const value = useMemo(() => ({
    admin: session?.admin ?? null,
    accessToken: session?.accessToken ?? null,
    refreshToken: session?.refreshToken ?? null,
    isAuthenticated: Boolean(session?.accessToken && session?.admin),
    initialized,
    loginWithCredentials,
    authorizedRequest,
    logoutUser,
  }), [authorizedRequest, initialized, loginWithCredentials, logoutUser, session]);

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used inside AdminAuthProvider');
  }
  return context;
}

