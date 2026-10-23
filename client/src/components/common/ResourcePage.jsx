import { useEffect, useState, useCallback, useRef } from 'react'; import { Link } from 'react-router-dom';
import { Plus, Search, Download, Upload, Pencil, Trash2 } from 'lucide-react';
import api, { errMsg, org, download } from '../../services/api.js'; import { useAuth } from '../../context/AuthContext.jsx'; import Modal from './Modal.jsx';
const toLocal = (v) => { const d = new Date(v); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };
const initial = (f, row) => { const v = row?.[f.name];
  if (f.type === 'ref') return v?._id || v || ''; if (f.type === 'date') return v ? String(v).slice(0, 10) : ''; if (f.type === 'datetime') return v ? toLocal(v) : '';
  if (f.type === 'tags') return (v || []).join(', '); return v ?? f.default ?? ''; };
const toBody = (fields, form) => { const b = {};
  for (const f of fields) { const v = form[f.name]; if (v === '' || v == null) continue; if (f.type === 'select' && !f.options.includes(v)) continue;
    b[f.name] = f.type === 'number' ? Number(v) : f.type === 'datetime' ? new Date(v).toISOString() : f.type === 'tags' ? v.split(',').map((s) => s.trim()).filter(Boolean) : v; }
  return b; };
const INPUT = { number: 'number', date: 'date', datetime: 'datetime-local', email: 'email' };
// Generic list + create/edit/delete + filters + pagination + CSV import/export page used by Leads, Contacts, Companies, Deals and Tasks.
export default function ResourcePage({ title, endpoint, columns, fields, filters = [], detailPath, csv, rowActions, sort, noun, bulk }) {
  const { user } = useAuth(); const canDelete = ['admin', 'manager'].includes(user.role);
  const usable = fields.filter((f) => !f.roles || f.roles.includes(user.role));
  const [q, setQ] = useState(''); const [fv, setFv] = useState({}); const [page, setPage] = useState(1); const [tick, setTick] = useState(0);
  const [rows, setRows] = useState([]); const [meta, setMeta] = useState({}); const [loading, setLoading] = useState(true); const [err, setErr] = useState('');
  const [edit, setEdit] = useState(null); const [form, setForm] = useState({}); const [formErr, setFormErr] = useState(''); const [saving, setSaving] = useState(false); const [refs, setRefs] = useState({});
  const [del, setDel] = useState(null); const [result, setResult] = useState(null); const [msg, setMsg] = useState(''); const file = useRef();
  const [sel, setSel] = useState([]); const [bUsers, setBUsers] = useState([]); const [bBusy, setBBusy] = useState(false);
  const reload = useCallback(() => setTick((n) => n + 1), []);
  useEffect(() => { if (bulk?.assign && canDelete) api.get('/users').then((r) => setBUsers(r.data.data.filter((u) => u.isActive))).catch(() => {}); }, []); // eslint-disable-line
  useEffect(() => setSel([]), [page, q, fv, tick]);
  useEffect(() => { if (msg) { const t = setTimeout(() => setMsg(''), 2500); return () => clearTimeout(t); } }, [msg]);
  useEffect(() => {
    setLoading(true); setErr('');
    const t = setTimeout(() => api.get(endpoint, { params: { q: q || undefined, ...Object.fromEntries(Object.entries(fv).filter(([, v]) => v)), page, limit: org.pageSize, sort } })
      .then((r) => { setRows(r.data.data); setMeta(r.data.meta); }).catch((e) => setErr(errMsg(e))).finally(() => setLoading(false)), q ? 300 : 0);
    return () => clearTimeout(t);
  }, [endpoint, q, fv, page, tick, sort]);
  const openForm = (row) => {
    setEdit({ row }); setFormErr(''); setForm(Object.fromEntries(usable.map((f) => [f.name, initial(f, row)])));
    usable.filter((f) => f.type === 'ref').forEach((f) => api.get(f.source, { params: { limit: 100 } }).then((r) => setRefs((s) => ({ ...s, [f.name]: r.data.data }))).catch(() => {}));
  };
  const save = async (e) => {
    e.preventDefault(); setSaving(true); setFormErr('');
    try { const body = toBody(usable.filter((f) => !(edit.row && f.createOnly)), form);
      if (edit.row) await api.put(`${endpoint}/${edit.row._id}`, body); else await api.post(endpoint, body);
      setEdit(null); setMsg(edit.row ? 'Saved' : 'Created'); reload();
    } catch (x) { setFormErr(errMsg(x)); } finally { setSaving(false); }
  };
  const remove = async () => { try { await api.delete(`${endpoint}/${del._id}`); setDel(null); setMsg('Deleted'); reload(); } catch (x) { setErr(errMsg(x)); setDel(null); } };
  const doImport = async (e) => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    try { const r = await api.post(csv.import, { csv: await f.text() }); setResult(r.data.data); reload(); } catch (x) { setErr(errMsg(x)); }
  };
  const doExport = () => download(csv.export, Object.fromEntries(Object.entries(fv).filter(([, v]) => v)), `${noun || title.toLowerCase()}.csv`).catch((x) => setErr(errMsg(x)));
  const bulkRun = async (path, body) => {
    setBBusy(true); setErr('');
    try { const r = await api.patch(`${endpoint}/bulk/${path}`, { ids: sel, ...body }); setMsg(`${r.data.data.modified} updated`); reload(); } catch (x) { setErr(errMsg(x)); } finally { setBBusy(false); }
  };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const field = (f) => { const common = { value: form[f.name] ?? '', onChange: set(f.name), required: f.required };
    if (f.type === 'select') return <select {...common}>{!f.required && <option value="">-</option>}{f.options.map((o) => <option key={o}>{o}</option>)}</select>;
    if (f.type === 'ref') return <select {...common}><option value="">-</option>{(refs[f.name] || []).map((o) => <option key={o._id} value={o._id}>{f.optionLabel(o)}</option>)}</select>;
    if (f.type === 'textarea') return <textarea rows="3" {...common} />;
    return <input type={INPUT[f.type] || 'text'} min={f.type === 'number' ? 0 : undefined} {...common} />; };
  return (<div>
    <div className="page-head"><h1>{title}</h1><div className="actions">
      {csv?.export && <button className="btn ghost" onClick={doExport}><Download size={16} /> Export</button>}
      {csv?.import && <><input ref={file} type="file" accept=".csv,text/csv" hidden onChange={doImport} /><button className="btn ghost" onClick={() => file.current.click()}><Upload size={16} /> Import CSV</button></>}
      <button className="btn primary" onClick={() => openForm(null)}><Plus size={16} /> New</button></div></div>
    <div className="toolbar card">
      <div className="search"><Search size={16} /><input placeholder="Search" aria-label="Search" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} /></div>
      {filters.map((f) => <select key={f.key} aria-label={f.label} value={fv[f.key] || ''} onChange={(e) => { setFv({ ...fv, [f.key]: e.target.value }); setPage(1); }}><option value="">{f.label}</option>{f.options.map((o) => <option key={o}>{o}</option>)}</select>)}
    </div>
    {err && <div className="alert error">{err} <button className="link" onClick={reload}>Retry</button></div>}
    {msg && <div className="toast ok" role="status">{msg}</div>}
    {bulk && sel.length > 0 && <div className="bulkbar card" role="region" aria-label="Bulk actions"><strong>{sel.length} selected</strong>
      {bulk.assign && canDelete && <select aria-label="Assign to" defaultValue="" disabled={bBusy} onChange={(e) => { if (e.target.value) bulkRun('assign', { owner: e.target.value }); e.target.value = ''; }}><option value="">Assign to...</option>{bUsers.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}</select>}
      {(bulk.fields || []).map((f) => <select key={f.key} aria-label={f.label} defaultValue="" disabled={bBusy} onChange={(e) => { if (e.target.value) bulkRun('update', { changes: { [f.key]: e.target.value } }); e.target.value = ''; }}><option value="">{f.label}</option>{f.options.map((o) => <option key={o}>{o}</option>)}</select>)}
      <button className="btn ghost sm" onClick={() => setSel([])}>Clear</button></div>}
    <div className="card table-wrap"><table className="table"><thead><tr>{bulk && <th className="sel"><input type="checkbox" aria-label="Select all" checked={rows.length > 0 && sel.length === rows.length} onChange={(e) => setSel(e.target.checked ? rows.map((r) => r._id) : [])} /></th>}{columns.map((c) => <th key={c.label}>{c.label}</th>)}<th /></tr></thead><tbody>
      {rows.map((row) => <tr key={row._id}>{bulk && <td className="sel"><input type="checkbox" aria-label="Select row" checked={sel.includes(row._id)} onChange={() => setSel(sel.includes(row._id) ? sel.filter((x) => x !== row._id) : [...sel, row._id])} /></td>}{columns.map((c, i) => { const v = c.render ? c.render(row) : row[c.key] ?? '-';
        return <td key={c.label}>{i === 0 && detailPath ? <Link to={detailPath(row)}><strong>{v}</strong></Link> : v}</td>; })}
        <td className="row-actions">{rowActions?.(row, reload)}<button className="icon-btn sm" aria-label="Edit" onClick={() => openForm(row)}><Pencil size={14} /></button>
          {canDelete && <button className="icon-btn sm" aria-label="Delete" onClick={() => setDel(row)}><Trash2 size={14} /></button>}</td></tr>)}
      {loading && <tr><td colSpan={columns.length + 1 + (bulk ? 1 : 0)} className="empty">Loading...</td></tr>}
      {!loading && !rows.length && !err && <tr><td colSpan={columns.length + 1 + (bulk ? 1 : 0)} className="empty">{q || Object.values(fv).some(Boolean) ? 'Nothing matches your search or filters.' : `No ${title.toLowerCase()} yet. Create the first one.`}</td></tr>}
    </tbody></table></div>
    <div className="pager"><span className="muted">{meta.total ?? 0} total</span><div><button className="btn ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
      <span className="muted"> Page {page} of {meta.pages || 1} </span><button className="btn ghost" disabled={page >= (meta.pages || 1)} onClick={() => setPage(page + 1)}>Next</button></div></div>
    {edit && <Modal title={`${edit.row ? 'Edit' : 'New'} ${noun || title.replace(/s$/, '').toLowerCase()}`} onClose={() => setEdit(null)}><form className="form" onSubmit={save}>
      {formErr && <div className="alert error" role="alert">{formErr}</div>}
      <div className="fgrid">{usable.filter((f) => !(edit.row && f.createOnly)).map((f) => <label key={f.name} style={f.half ? undefined : { gridColumn: '1/-1' }}>{f.label || f.name.replace(/^./, (c) => c.toUpperCase())}{f.required && ' *'}{field(f)}</label>)}</div>
      <button className="btn primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button></form></Modal>}
    {del && <Modal title="Confirm delete" onClose={() => setDel(null)}><p>Delete this record? This cannot be undone.</p><div className="actions"><button className="btn ghost" onClick={() => setDel(null)}>Cancel</button><button className="btn danger" onClick={remove}>Delete</button></div></Modal>}
    {result && <Modal title="Import result" onClose={() => setResult(null)}><p><strong>{result.imported}</strong> imported, <strong>{result.duplicatesSkipped.length}</strong> duplicates skipped, <strong>{result.invalidCount}</strong> invalid rows.</p>
      {result.invalid.length > 0 && <ul className="list">{result.invalid.map((r) => <li key={r.row}><span>Row {r.row}<small>{r.errors.join('; ')}</small></span></li>)}</ul>}</Modal>}
  </div>);
}
