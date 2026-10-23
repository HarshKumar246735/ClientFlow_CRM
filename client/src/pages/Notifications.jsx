import { useEffect, useState, useCallback } from 'react'; import { useNavigate } from 'react-router-dom';
import api, { errMsg, fmtDateTime } from '../services/api.js';
export default function Notifications() {
  const nav = useNavigate(); const [items, setItems] = useState([]); const [meta, setMeta] = useState({}); const [page, setPage] = useState(1); const [err, setErr] = useState(''); const [loading, setLoading] = useState(true);
  const load = useCallback(() => { setLoading(true); api.get('/notifications', { params: { page, limit: 20 } }).then((r) => { setItems(r.data.data); setMeta(r.data.meta); }).catch((e) => setErr(errMsg(e))).finally(() => setLoading(false)); }, [page]);
  useEffect(load, [load]);
  const open = async (n) => { if (!n.read) { try { await api.patch(`/notifications/${n._id}/read`); } catch { /* ignore */ } } if (n.link) nav(n.link); else load(); };
  return (<div><div className="page-head"><h1>Notifications</h1><button className="btn ghost" onClick={async () => { try { await api.patch('/notifications/read-all'); load(); } catch (e) { setErr(errMsg(e)); } }}>Mark all as read</button></div>
    {err && <div className="alert error">{err}</div>}
    <div className="card">{loading && <p className="empty">Loading...</p>}{!loading && !items.length && <p className="empty">You're all caught up.</p>}
      <ul className="list">{items.map((n) => <li key={n._id} className={n.read ? '' : 'unread'} onClick={() => open(n)} style={{ cursor: 'pointer' }}><span>{n.message}<small>{n.type.replace('_', ' ')}</small></span><span className="muted">{fmtDateTime(n.createdAt)}</span></li>)}</ul></div>
    <div className="pager"><span className="muted">{meta.unread ?? 0} unread</span><div><button className="btn ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><span className="muted"> Page {page} of {meta.pages || 1} </span><button className="btn ghost" disabled={page >= (meta.pages || 1)} onClick={() => setPage(page + 1)}>Next</button></div></div></div>);
}
