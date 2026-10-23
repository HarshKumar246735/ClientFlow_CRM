import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api, { setCsrf, org } from '../services/api.js';
const Ctx = createContext(null); export const useAuth = () => useContext(Ctx);
const loadOrg = () => api.get('/settings').then((r) => Object.assign(org, r.data.data)).catch(() => {});
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get('/auth/me').then(async (r) => { setCsrf(r.data.data.csrfToken); await loadOrg(); setUser(r.data.data.user); }).catch(() => {}).finally(() => setLoading(false));
    const expired = () => setUser(null); window.addEventListener('auth:expired', expired);
    return () => window.removeEventListener('auth:expired', expired);
  }, []);
  useEffect(() => { document.documentElement.dataset.theme = user?.theme || 'light'; }, [user]);
  const login = useCallback(async (email, password) => {
    const r = await api.post('/auth/login', { email, password }); setCsrf(r.data.data.csrfToken); await loadOrg(); setUser(r.data.data.user);
  }, []);
  const logout = useCallback(async () => { try { await api.post('/auth/logout'); } catch { /* session may already be gone */ } setCsrf(null); setUser(null); }, []);
  return <Ctx.Provider value={{ user, setUser, loading, login, logout }}>{children}</Ctx.Provider>;
}
