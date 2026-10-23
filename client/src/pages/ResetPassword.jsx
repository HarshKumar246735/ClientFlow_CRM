import { useState } from 'react'; import { Link, useSearchParams } from 'react-router-dom'; import api, { errMsg } from '../services/api.js';
export default function ResetPassword() {
  const [sp] = useSearchParams(); const [pw, setPw] = useState(''); const [done, setDone] = useState(false); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async (e) => { e.preventDefault(); setBusy(true); setErr(''); try { await api.post('/auth/reset-password', { token: sp.get('token') || '', newPassword: pw }); setDone(true); } catch (x) { setErr(errMsg(x)); } finally { setBusy(false); } };
  return (<div className="auth-page"><form className="auth-card" onSubmit={submit}><h1>{sp.get('invite') ? 'Set your password' : 'Reset password'}</h1>
    {done ? <div className="alert okmsg">Password saved. You can now sign in.</div> : <>{err && <div className="alert error">{err}</div>}
      <label>New password (12+ characters)<input type="password" minLength={12} required autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} /></label><button className="btn primary block" disabled={busy}>{busy ? 'Saving...' : 'Reset password'}</button></>}
    <Link to="/login">Back to sign in</Link></form></div>);
}
