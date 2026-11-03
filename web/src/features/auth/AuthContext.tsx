import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { apiClient } from '../../lib/api';
import type { AuthState, UserInfo } from '../../types';

interface AuthContextType extends AuthState {
  login: () => void;
  devLogin: (name?: string, email?: string, role?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthCtx = createContext<AuthContextType>({
  authenticated: false,
  user: null,
  loading: true,
  login: () => {},
  devLogin: async () => {},
  logout: async () => {},
  refreshAuth: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({
    authenticated: false,
    user: null,
    loading: true,
  });

  const refreshAuth = useCallback(async () => {
    try {
      const data = await apiClient<{ authenticated: boolean; user?: UserInfo }>('/api/auth/me');
      setAuth({
        authenticated: data.authenticated,
        user: data.user || null,
        loading: false,
      });
    } catch {
      setAuth({ authenticated: false, user: null, loading: false });
    }
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  const login = useCallback(() => {
    // Redirect to backend OAuth2 authorization endpoint
    let apiBase = (import.meta.env.VITE_API_BASE_URL || '').trim();
    if (apiBase.endsWith('/')) {
      apiBase = apiBase.slice(0, -1);
    }
    if (apiBase && !apiBase.startsWith('http://') && !apiBase.startsWith('https://')) {
      if (!apiBase.includes('.')) {
        apiBase = `https://${apiBase}.onrender.com`;
      } else {
        apiBase = `https://${apiBase}`;
      }
    }
    const targetUrl = apiBase ? `${apiBase}/oauth2/authorization/google` : '/oauth2/authorization/google';
    window.location.href = targetUrl;
  }, []);

  const devLogin = useCallback(async (name = 'Demo User', email = 'demo@example.com', role = 'ROLE_USER') => {
    try {
      const data = await apiClient<{ authenticated: boolean; user: UserInfo }>('/api/auth/dev-login', {
        method: 'POST',
        body: JSON.stringify({ name, email, role }),
      });
      setAuth({
        authenticated: data.authenticated,
        user: data.user,
        loading: false,
      });
    } catch (err) {
      console.error('Dev login failed:', err);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient('/api/auth/logout', { method: 'POST' });
    } catch {
      // Logout may fail if session already expired
    }
    setAuth({ authenticated: false, user: null, loading: false });
  }, []);

  return (
    <AuthCtx.Provider value={{ ...auth, login, devLogin, logout, refreshAuth }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  return useContext(AuthCtx);
}
