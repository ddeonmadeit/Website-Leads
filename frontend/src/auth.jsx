import { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api.js';

const AuthCtx = createContext({ user: null, loading: true, login: async () => {}, logout: async () => {} });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const me = await api.me();
      setUser(me.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    const handler = () => setUser(null);
    window.addEventListener('leadscout-unauthenticated', handler);
    return () => window.removeEventListener('leadscout-unauthenticated', handler);
  }, []);

  const login = async (u, p) => {
    await api.login(u, p);
    await refresh();
  };
  const logout = async () => {
    await api.logout();
    setUser(null);
  };

  return (
    <AuthCtx.Provider value={{ user, loading, login, logout }}>{children}</AuthCtx.Provider>
  );
}

export function useAuth() { return useContext(AuthCtx); }
