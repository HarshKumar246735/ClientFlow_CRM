import { useState } from 'react'; import { Link } from 'react-router-dom'; import api, { errMsg } from '../services/api.js';
export default function ForgotPassword() {
  const [email, setEmail] = useState(''); const [done, setDone] = useState(false); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async (e) => { e.preventDefault(); setBusy(true); setErr(''); try { await api.post('/auth/forgot-password', { email }); setDone(true); } catch (x) { setErr(errMsg(x)); } finally { setBusy(false); } };
  return (<div className="auth-page"><form className="auth-card" onSubmit={submit}><h1>Forgot password</h1>
    {done ? <div className="alert okmsg">If that account exists, a reset link has been issued. Check your email (or ask your administrator if email is not configured).</div> : <>
      <p className="muted">Enter your email to receive a reset link.</p>{err && <div className="alert error">{err}</div>}<label>Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
      <button className="btn primary block" disabled={busy}>{busy ? 'Sending...' : 'Send reset link'}</button></>}<Link to="/login">Back to sign in</Link></form></div>);
}
