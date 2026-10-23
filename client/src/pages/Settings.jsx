import { useEffect, useState } from 'react';
import api, { errMsg, org } from '../services/api.js'; import { useAuth } from '../context/AuthContext.jsx';
const Msg = ({ m }) => (m ? <div className={`alert ${m.ok ? 'okmsg' : 'error'}`} role="status">{m.text}</div> : null);
export default function Settings() {
  const { user, setUser } = useAuth(); const admin = user.role === 'admin';
  const [prof, setProf] = useState({ name: user.name, email: user.email, phone: user.phone || '' }); const [pm, setPm] = useState(null);
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' }); const [pwm, setPwm] = useState(null);
  const [sc, setSc] = useState(JSON.stringify(org.scoring || {}, null, 2)); const [scm, setScm] = useState(null);
  const [o, setO] = useState({ ...org }); const [om, setOm] = useState(null); const [tm, setTm] = useState(null);
  useEffect(() => { setO({ ...org }); }, []);
  const run = async (fn, setM, okText) => { setM(null); try { await fn(); setM({ ok: true, text: okText }); } catch (e) { setM({ ok: false, text: errMsg(e) }); } };
  const zones = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : ['UTC'];
  return (<div className="settings"><div className="page-head"><h1>Settings</h1></div>
    <form className="card form" onSubmit={(e) => { e.preventDefault(); run(async () => { const r = await api.patch('/auth/profile', { name: prof.name, email: prof.email, phone: prof.phone }); setUser(r.data.data.user); }, setPm, 'Profile saved'); }}>
      <h3>Profile</h3><Msg m={pm} /><div className="fgrid"><label>Name<input required value={prof.name} onChange={(e) => setProf({ ...prof, name: e.target.value })} /></label><label>Email<input type="email" required value={prof.email} onChange={(e) => setProf({ ...prof, email: e.target.value })} /></label>
        <label>Phone<input value={prof.phone} onChange={(e) => setProf({ ...prof, phone: e.target.value })} /></label></div><button className="btn primary fit">Save profile</button></form>
    <div className="card form"><h3>Appearance</h3><Msg m={tm} /><div className="actions">{['light', 'dark'].map((t) => <button key={t} className={`btn ${user.theme === t ? 'primary' : 'ghost'}`} onClick={() => run(async () => { const r = await api.patch('/auth/profile', { theme: t }); setUser(r.data.data.user); }, setTm, `Theme set to ${t}`)}>{t[0].toUpperCase() + t.slice(1)} mode</button>)}</div></div>
    <form className="card form" onSubmit={(e) => { e.preventDefault(); run(async () => { await api.post('/auth/change-password', pw); setPw({ currentPassword: '', newPassword: '' }); }, setPwm, 'Password changed. Other sessions were signed out.'); }}>
      <h3>Security</h3><Msg m={pwm} /><div className="fgrid"><label>Current password<input type="password" required autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} /></label>
        <label>New password (12+ characters)<input type="password" required minLength={12} autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} /></label></div><button className="btn primary fit">Change password</button></form>
    <form className="card form" onSubmit={(e) => { e.preventDefault(); run(async () => { const r = await api.put('/settings', { orgName: o.orgName, currency: o.currency, timezone: o.timezone, dateFormat: o.dateFormat, pageSize: Number(o.pageSize) }); Object.assign(org, r.data.data); }, setOm, 'Organization settings saved'); }}>
      <h3>Organization {!admin && <small>Only administrators can change these.</small>}</h3><Msg m={om} />
      <fieldset disabled={!admin} className="fgrid"><label>Organization name<input value={o.orgName || ''} onChange={(e) => setO({ ...o, orgName: e.target.value })} /></label>
        <label>Default currency<select value={o.currency} onChange={(e) => setO({ ...o, currency: e.target.value })}>{['USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD', 'JPY'].map((c) => <option key={c}>{c}</option>)}</select></label>
        <label>Time zone<select value={o.timezone} onChange={(e) => setO({ ...o, timezone: e.target.value })}>{zones.map((z) => <option key={z}>{z}</option>)}</select></label>
        <label>Date format<select value={o.dateFormat} onChange={(e) => setO({ ...o, dateFormat: e.target.value })}>{['short', 'medium', 'long'].map((c) => <option key={c}>{c}</option>)}</select></label>
        <label>Rows per page<input type="number" min="5" max="100" value={o.pageSize} onChange={(e) => setO({ ...o, pageSize: e.target.value })} /></label></fieldset>
      {admin && <button className="btn primary fit">Save organization settings</button>}</form>
    {admin && <form className="card form" onSubmit={(e) => { e.preventDefault(); run(async () => { const r = await api.put('/settings', { scoring: JSON.parse(sc) }); Object.assign(org, r.data.data); setSc(JSON.stringify(r.data.data.scoring, null, 2)); }, setScm, 'Scoring rules saved'); }}>
      <h3>Lead scoring rules</h3><p className="muted">Transparent, rule-based points (not machine learning). Edit the weights as JSON; the score is clamped to 0-100 (Hot 70+, Warm 40+).</p><Msg m={scm} />
      <textarea className="mono" rows="16" value={sc} onChange={(e) => setSc(e.target.value)} spellCheck="false" /><button className="btn primary fit">Save scoring rules</button></form>}
  </div>);
}
