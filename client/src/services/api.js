import axios from 'axios';
let csrf = null; // CSRF token is kept in memory only (never localStorage); auth itself is an HTTP-only cookie.
export const setCsrf = (t) => { csrf = t; };
export const org = { currency: 'USD', pageSize: 10, timezone: 'UTC', dateFormat: 'medium' }; // overwritten from /settings after login
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api', withCredentials: true });
api.interceptors.request.use((c) => { if (csrf && c.method !== 'get') c.headers['X-CSRF-Token'] = csrf; return c; });
api.interceptors.response.use((r) => r, (e) => {
  if (e.response?.status === 401 && !String(e.config?.url).includes('/auth/')) window.dispatchEvent(new Event('auth:expired'));
  return Promise.reject(e);
});
export const errMsg = (e) => e.response?.data?.errors?.map((x) => `${x.path}: ${x.message}`).join('; ') || e.response?.data?.message || 'Cannot reach the server. Is the API running?';
export const money = (n, cur = org.currency) => new Intl.NumberFormat(undefined, { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(n || 0);
export const fmtDate = (d) => { if (!d) return '-'; try { return new Date(d).toLocaleDateString(undefined, { dateStyle: org.dateFormat, timeZone: org.timezone }); } catch { return new Date(d).toLocaleDateString(); } };
export const fmtDateTime = (d) => { if (!d) return '-'; try { return new Date(d).toLocaleString(undefined, { dateStyle: org.dateFormat, timeStyle: 'short', timeZone: org.timezone }); } catch { return new Date(d).toLocaleString(); } };
export async function download(url, params, filename) {
  const r = await api.get(url, { params, responseType: 'blob' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(r.data); a.download = filename; a.click(); URL.revokeObjectURL(a.href);
}
export default api;
