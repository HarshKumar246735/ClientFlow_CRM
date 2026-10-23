import { useEffect, useState, useCallback } from 'react'; import { useNavigate, Link } from 'react-router-dom'; import { Bell } from 'lucide-react'; import { io } from 'socket.io-client';
import api, { fmtDateTime } from '../../services/api.js';
export default function NotificationBell() {
  const nav = useNavigate(); const [open, setOpen] = useState(false); const [items, setItems] = useState([]); const [unread, setUnread] = useState(0);
  const load = useCallback(() => api.get('/notifications', { params: { limit: 6 } }).then((r) => { setItems(r.data.data); setUnread(r.data.meta.unread); }).catch(() => {}), []);
  useEffect(() => {
    load(); const base = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
    const s = io(base, { withCredentials: true }); s.on('notification', (n) => { setItems((i) => [n, ...i].slice(0, 6)); setUnread((u) => u + 1); });
    return () => s.disconnect();
  }, [load]);
  const openItem = async (n) => { setOpen(false); if (!n.read) { try { await api.patch(`/notifications/${n._id}/read`); } catch { /* ignore */ } load(); } if (n.link) nav(n.link); };
  const readAll = async () => { try { await api.patch('/notifications/read-all'); } catch { /* ignore */ } load(); };
  return (<div className="bell-wrap"><button className="icon-btn bell" aria-label={`Notifications, ${unread} unread`} onClick={() => setOpen(!open)}><Bell size={18} />{unread > 0 && <span className="dot">{unread}</span>}</button>
    {open && <div className="dropdown"><div className="dd-head"><strong>Notifications</strong><button className="link" onClick={readAll}>Mark all read</button></div>
      {items.length ? items.map((n) => <button key={n._id} className={`dd-item ${n.read ? '' : 'unread'}`} onClick={() => openItem(n)}>{n.message}<small>{fmtDateTime(n.createdAt)}</small></button>) : <p className="empty">No notifications.</p>}
      <Link className="dd-foot" to="/notifications" onClick={() => setOpen(false)}>View all</Link></div>}</div>);
}
