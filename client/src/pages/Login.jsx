import { useState } from 'react'; import { Link } from 'react-router-dom'; import { Hexagon } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx'; import { errMsg } from '../services/api.js';
export default function Login() {
  const { login } = useAuth(); const [f, setF] = useState({ email: '', password: '' }); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async (e) => { e.preventDefault(); setBusy(true); setErr(''); try { await login(f.email, f.password); } catch (x) { setErr(errMsg(x)); } finally { setBusy(false); } };
  return (<div className="auth-page"><form className="auth-card" onSubmit={submit}>
    <div className="brand dark"><Hexagon size={28} /><strong>ClientFlow CRM</strong></div><h1>Welcome back</h1><p className="muted">Sign in to your workspace</p>
    {err && <div className="alert error" role="alert">{err}</div>}
    <label>Email<input type="email" required autoComplete="username" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
    <label>Password<input type="password" required autoComplete="current-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></label>
    <button className="btn primary block" disabled={busy}>{busy ? 'Signing in...' : 'Sign in'}</button>
    <Link to="/forgot-password">Forgot password?</Link>
  </form></div>);
}
