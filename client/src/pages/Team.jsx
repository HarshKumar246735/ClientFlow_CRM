import { useEffect, useState, useCallback } from 'react'; import { Plus, Mail, Pencil, Trash2 } from 'lucide-react';
import api, { errMsg, fmtDate } from '../services/api.js'; import { useAuth } from '../context/AuthContext.jsx'; import Modal from '../components/common/Modal.jsx';
const BLANK = { name: '', email: '', password: '', role: 'rep', manager: '', invite: true };
export default function Team() {
  const { user } = useAuth(); const admin = user.role === 'admin'; const [rows, setRows] = useState([]); const [err, setErr] = useState(''); const [loading, setLoading] = useState(true); const [q, setQ] = useState('');
  const [show, setShow] = useState(false); const [f, setF] = useState(BLANK); const [fe, setFe] = useState(''); const [invite, setInvite] = useState(null);
  const [ed, setEd] = useState(null); const [edf, setEdf] = useState({}); const [edErr, setEdErr] = useState(''); const [del, setDel] = useState(null);
  const load = useCallback(() => { setLoading(true); api.get('/users').then((r) => setRows(r.data.data)).catch((e) => setErr(errMsg(e))).finally(() => setLoading(false)); }, []);
  useEffect(load, [load]);
  const act = async (fn) => { setErr(''); try { await fn(); load(); } catch (e) { setErr(errMsg(e)); } };
  const create = async (e) => {
    e.preventDefault(); setFe('');
    try { const { invite: inv, password, manager, ...rest } = f; const r = await api.post('/users', { ...rest, ...(!inv && { password }), ...(manager && { manager }) });
      setShow(false); setF(BLANK); setInvite({ email: rest.email, ...(r.data.data.invite || { sent: null }) }); load();
    } catch (x) { setFe(errMsg(x)); }
  };
  const resend = (u) => act(async () => { const r = await api.post(`/users/${u._id}/invite`); setInvite({ email: u.email, ...r.data.data.invite }); });
  const openEdit = (u) => { setEd(u); setEdErr(''); setEdf({ name: u.name, email: u.email, phone: u.phone || '', manager: u.manager || '' }); };
  const saveEdit = async (e) => {
    e.preventDefault(); setEdErr('');
    try { await api.patch(`/users/${ed._id}`, { name: edf.name, email: edf.email, phone: edf.phone, manager: edf.manager || null }); setEd(null); load(); } catch (x) { setEdErr(errMsg(x)); }
  };
  const remove = async () => { const u = del; setDel(null); await act(() => api.delete(`/users/${u._id}`)); };
  const nameOf = (id) => rows.find((x) => x._id === id)?.name || '-';
  const managers = (self) => rows.filter((u) => u.isActive && ['manager', 'admin'].includes(u.role) && u._id !== self);
  const shown = rows.filter((u) => `${u.name} ${u.email}`.toLowerCase().includes(q.toLowerCase()));
  return (<div>
    <div className="page-head"><h1>Team</h1>{admin && <button className="btn primary" onClick={() => setShow(true)}><Plus size={16} /> Add user</button>}</div>
    <div className="toolbar card"><div className="search"><input placeholder="Filter by name or email" value={q} onChange={(e) => setQ(e.target.value)} /></div></div>
    {err && <div className="alert error">{err}</div>}
    <div className="card table-wrap"><table className="table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Reports to</th><th>Status</th><th>Joined</th>{admin && <th />}</tr></thead><tbody>
      {shown.map((u) => <tr key={u._id}><td><strong>{u.name}</strong></td><td>{u.email}</td>
        <td>{admin ? <select value={u.role} onChange={(e) => act(() => api.patch(`/users/${u._id}/role`, { role: e.target.value }))}>{['admin', 'manager', 'rep'].map((r) => <option key={r}>{r}</option>)}</select> : u.role}</td>
        <td>{u.manager ? nameOf(u.manager) : '-'}</td>
        <td>{admin ? <button className={`pill ${u.isActive ? 'green' : 'gray'} btn-pill`} onClick={() => act(() => api.patch(`/users/${u._id}/status`, { isActive: !u.isActive }))}>{u.isActive ? 'Active' : 'Deactivated'}</button> : u.isActive ? 'Active' : 'Deactivated'}</td>
        <td>{fmtDate(u.createdAt)}</td>{admin && <td className="row-actions">{u.isActive && <button className="btn ghost sm" onClick={() => resend(u)} title="Send a new set-password link"><Mail size={14} /> Invite</button>}
          <button className="icon-btn sm" aria-label={`Edit ${u.name}`} onClick={() => openEdit(u)}><Pencil size={14} /></button>
          {u._id !== user.id && <button className="icon-btn sm" aria-label={`Delete ${u.name}`} onClick={() => setDel(u)}><Trash2 size={14} /></button>}</td>}</tr>)}
      {loading && <tr><td colSpan="7" className="empty">Loading...</td></tr>}{!loading && !shown.length && <tr><td colSpan="7" className="empty">No users found.</td></tr>}</tbody></table></div>
    {show && <Modal title="Add user" onClose={() => setShow(false)}><form className="form" onSubmit={create}>{fe && <div className="alert error">{fe}</div>}
      <label>Name<input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label><label>Email<input type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
      <label className="check"><input type="checkbox" checked={f.invite} onChange={(e) => setF({ ...f, invite: e.target.checked })} /> Send an invitation so the user sets their own password</label>
      {!f.invite && <label>Temporary password (12+ characters)<input type="password" minLength={12} required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></label>}
      <div className="row2"><label>Role<select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>{['rep', 'manager', 'admin'].map((r) => <option key={r}>{r}</option>)}</select></label>
        <label>Reports to<select value={f.manager} onChange={(e) => setF({ ...f, manager: e.target.value })}><option value="">-</option>{rows.filter((u) => u.role === 'manager' && u.isActive).map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}</select></label></div>
      <button className="btn primary">{f.invite ? 'Create and invite' : 'Create user'}</button></form></Modal>}
    {ed && <Modal title="Edit user" onClose={() => setEd(null)}><form className="form" onSubmit={saveEdit}>{edErr && <div className="alert error" role="alert">{edErr}</div>}
      <label>Name<input required value={edf.name} onChange={(e) => setEdf({ ...edf, name: e.target.value })} /></label><label>Email<input type="email" required value={edf.email} onChange={(e) => setEdf({ ...edf, email: e.target.value })} /></label>
      <div className="row2"><label>Phone<input value={edf.phone} onChange={(e) => setEdf({ ...edf, phone: e.target.value })} /></label>
        <label>Reports to<select value={edf.manager} onChange={(e) => setEdf({ ...edf, manager: e.target.value })}><option value="">-</option>{managers(ed._id).map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}</select></label></div>
      <p className="muted">Change the role or active status from the table. Deactivated users cannot sign in.</p><button className="btn primary">Save changes</button></form></Modal>}
    {del && <Modal title="Delete user" onClose={() => setDel(null)}><p>Delete <strong>{del.name}</strong> ({del.email})? This cannot be undone. Users who still own records cannot be deleted; deactivate them instead.</p>
      <div className="actions"><button className="btn ghost" onClick={() => setDel(null)}>Cancel</button><button className="btn danger" onClick={remove}>Delete</button></div></Modal>}
    {invite && <Modal title="Invitation" onClose={() => setInvite(null)}>
      {invite.sent === true && <p>An invitation email was sent to <strong>{invite.email}</strong>. The link is valid for 72 hours.</p>}
      {invite.sent === null && <p>User <strong>{invite.email}</strong> was created with the password you set.</p>}
      {invite.sent === false && <><p>Email is not configured (or sending failed), so share this one-time link with <strong>{invite.email}</strong> securely. It is valid for 72 hours and is shown only once.</p>
        <input readOnly value={invite.link} onFocus={(e) => e.target.select()} aria-label="Invitation link" /></>}</Modal>}
  </div>);
}
