import { useEffect, useState } from 'react'; import api, { errMsg, fmtDateTime } from '../services/api.js';
export default function AuditLogs() {
  const [rows, setRows] = useState([]); const [meta, setMeta] = useState({}); const [page, setPage] = useState(1); const [err, setErr] = useState(''); const [loading, setLoading] = useState(true);
  useEffect(() => { setLoading(true); setErr(''); api.get('/audit-logs', { params: { page, limit: 25 } }).then((r) => { setRows(r.data.data); setMeta(r.data.meta); }).catch((e) => setErr(errMsg(e))).finally(() => setLoading(false)); }, [page]);
  return (<div><div className="page-head"><h1>Audit log</h1></div>{err && <div className="alert error">{err}</div>}
    <div className="card table-wrap"><table className="table"><thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Target</th><th>Details</th></tr></thead><tbody>
      {rows.map((a) => <tr key={a._id}><td>{fmtDateTime(a.createdAt)}</td><td>{a.actor?.name || '-'}</td><td><code>{a.action}</code></td><td>{a.target}</td><td><small>{a.meta ? JSON.stringify(a.meta) : ''}</small></td></tr>)}
      {loading && <tr><td colSpan="5" className="empty">Loading...</td></tr>}{!loading && !rows.length && <tr><td colSpan="5" className="empty">No audit entries yet.</td></tr>}</tbody></table></div>
    <div className="pager"><span className="muted">{meta.total ?? 0} entries</span><div><button className="btn ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><span className="muted"> Page {page} of {meta.pages || 1} </span><button className="btn ghost" disabled={page >= (meta.pages || 1)} onClick={() => setPage(page + 1)}>Next</button></div></div></div>);
}
