import { useEffect, useState } from 'react'; import { useNavigate } from 'react-router-dom'; import { Search } from 'lucide-react'; import api, { errMsg } from '../../services/api.js';
const G = [['Leads', 'leads', (x) => `${x.firstName} ${x.lastName}`, (x) => x.company], ['Contacts', 'contacts', (x) => `${x.firstName} ${x.lastName}`, (x) => x.jobTitle],
  ['Companies', 'companies', (x) => x.name, (x) => x.industry], ['Deals', 'deals', (x) => x.title, (x) => x.stage]];
export default function GlobalSearch() {
  const nav = useNavigate(); const [q, setQ] = useState(''); const [res, setRes] = useState(null); const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [open, setOpen] = useState(false);
  useEffect(() => { if (q.trim().length < 2) { setRes(null); setErr(''); return undefined; } setBusy(true); setErr('');
    const t = setTimeout(() => api.get('/search', { params: { q } }).then((r) => setRes(r.data.data)).catch((e) => setErr(errMsg(e))).finally(() => setBusy(false)), 300); return () => clearTimeout(t); }, [q]);
  const go = (path) => { setOpen(false); setQ(''); nav(path); };
  const total = res ? G.reduce((a, [, k]) => a + res[k].length, 0) : 0;
  return (<div className="gsearch"><Search size={16} /><input aria-label="Global search" placeholder="Search leads, contacts, companies, deals" value={q} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} onChange={(e) => setQ(e.target.value)} />
    {open && q.trim().length >= 2 && <div className="dropdown wide">{busy && <p className="empty">Searching...</p>}{err && <p className="empty">{err}</p>}{!busy && !err && res && !total && <p className="empty">No results.</p>}
      {!busy && res && G.map(([label, k, t, s]) => res[k].length > 0 && <div key={k}><div className="dd-group">{label}</div>{res[k].map((x) => <button key={x._id} className="dd-item" onMouseDown={() => go(`/${k}/${x._id}`)}>{t(x)}<small>{s(x) || ''}</small></button>)}</div>)}</div>}</div>);
}
