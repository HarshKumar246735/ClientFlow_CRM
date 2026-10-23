import { useEffect, useState } from 'react'; import { useParams, Link } from 'react-router-dom';
import api, { errMsg, money, fmtDate, fmtDateTime } from '../services/api.js'; import StatusBadge from '../components/common/StatusBadge.jsx'; import Modal from '../components/common/Modal.jsx';
const L = (to, t) => (to && t ? <Link to={to}>{t}</Link> : '-');
const full = (c) => (c ? `${c.firstName} ${c.lastName}` : null);
const CFG = {
  leads: { ep: '/leads', entity: 'Lead', title: (r) => `${r.firstName} ${r.lastName}`, rows: (r) => [['Email', r.email], ['Phone', r.phone], ['Company', r.company], ['Job title', r.jobTitle], ['Source', r.source],
    ['Status', <StatusBadge value={r.status} />], ['Priority', <StatusBadge value={r.priority} />], ['Estimated value', money(r.estimatedValue)], ['Next follow-up', fmtDate(r.nextFollowUp)], ['Owner', r.owner?.name], ['Tags', (r.tags || []).join(', ')], ['Description', r.description],
    ['Converted to', r.convertedContact ? <span>{L(`/contacts/${r.convertedContact}`, 'Contact')}{r.convertedCompany && <> · {L(`/companies/${r.convertedCompany}`, 'Company')}</>}{r.convertedDeal && <> · {L(`/deals/${r.convertedDeal}`, 'Deal')}</>}</span> : null]] },
  contacts: { ep: '/contacts', entity: 'Contact', title: full, rows: (r) => [['Email', r.email], ['Phone', r.phone], ['Job title', r.jobTitle], ['Company', L(r.company && `/companies/${r.company._id}`, r.company?.name)], ['Owner', r.owner?.name], ['Notes', r.notes]],
    related: [{ label: 'Deals', ep: '/deals', param: 'contact', path: (d) => `/deals/${d._id}`, text: (d) => `${d.title} (${d.stage})` }] },
  companies: { ep: '/companies', entity: 'Company', title: (r) => r.name, rows: (r) => [['Website', r.website], ['Industry', r.industry], ['Size', r.size], ['Annual revenue', r.annualRevenue ? money(r.annualRevenue) : null], ['Phone', r.phone], ['Email', r.email],
    ['Location', [r.city, r.state, r.country].filter(Boolean).join(', ')], ['Owner', r.owner?.name], ['Description', r.description]],
    related: [{ label: 'Contacts', ep: '/contacts', param: 'company', path: (c) => `/contacts/${c._id}`, text: full }, { label: 'Deals', ep: '/deals', param: 'company', path: (d) => `/deals/${d._id}`, text: (d) => `${d.title} (${d.stage})` }] },
  deals: { ep: '/deals', entity: 'Deal', title: (r) => r.title, rows: (r) => [['Stage', <StatusBadge value={r.stage} />], ['Value', money(r.value, r.currency)], ['Probability', `${r.probability}%`], ['Expected close', fmtDate(r.expectedCloseDate)],
    ['Actual close', fmtDate(r.actualCloseDate)], ['Loss reason', r.lossReason], ['Company', L(r.company && `/companies/${r.company._id}`, r.company?.name)], ['Contact', L(r.contact && `/contacts/${r.contact._id}`, full(r.contact))],
    ['Lead', L(r.lead && `/leads/${r.lead._id}`, full(r.lead))], ['Owner', r.owner?.name], ['Description', r.description]] },
};
export default function Detail({ type }) {
  const cfg = CFG[type], { id } = useParams();
  const [r, setR] = useState(null); const [err, setErr] = useState(''); const [rel, setRel] = useState({}); const [acts, setActs] = useState([]); const [tick, setTick] = useState(0); const [score, setScore] = useState(null);
  const [note, setNote] = useState({ type: 'note', description: '' }); const [noteErr, setNoteErr] = useState(''); const [conv, setConv] = useState(null); const [convErr, setConvErr] = useState('');
  useEffect(() => {
    setErr(''); api.get(`${cfg.ep}/${id}`).then((x) => setR(x.data.data)).catch((e) => setErr(errMsg(e)));
    api.get('/activities', { params: { entity: cfg.entity, entityId: id, limit: 50 } }).then((x) => setActs(x.data.data)).catch(() => setActs([]));
    if (type === 'leads') api.get(`/leads/${id}/score`).then((x) => setScore(x.data.data)).catch(() => setScore(null));
    (cfg.related || []).forEach((rl) => api.get(rl.ep, { params: { [rl.param]: id, limit: 20 } }).then((x) => setRel((s) => ({ ...s, [rl.label]: x.data.data }))).catch(() => {}));
  }, [type, id, tick]);
  const addNote = async (e) => { e.preventDefault(); setNoteErr(''); try { await api.post('/activities', { entity: cfg.entity, entityId: id, ...note }); setNote({ ...note, description: '' }); setTick((n) => n + 1); } catch (x) { setNoteErr(errMsg(x)); } };
  const setStatus = async (status) => { try { await api.put(`/leads/${id}`, { status }); setTick((n) => n + 1); } catch (x) { setErr(errMsg(x)); } };
  const convert = async (e) => {
    e.preventDefault(); setConvErr('');
    try { await api.post(`/leads/${id}/convert`, { createDeal: conv.createDeal, ...(conv.createDeal && conv.dealTitle && { dealTitle: conv.dealTitle }), ...(conv.createDeal && conv.dealValue !== '' && { dealValue: Number(conv.dealValue) }) }); setConv(null); setTick((n) => n + 1); }
    catch (x) { setConvErr(errMsg(x)); }
  };
  if (err && !r) return <div className="alert error">{err} <Link to={`/${type}`}>Back to list</Link></div>;
  if (!r) return <div className="center-screen"><div className="spinner" /></div>;
  return (<div>
    <div className="crumbs"><Link to="/">Dashboard</Link> / <Link to={`/${type}`}>{type[0].toUpperCase() + type.slice(1)}</Link> / {cfg.title(r)}</div>
    <div className="page-head"><h1>{cfg.title(r)}</h1>
      {type === 'leads' && r.status !== 'Converted' && <div className="actions"><select aria-label="Change status" value={r.status} onChange={(e) => setStatus(e.target.value)}>{['New', 'Contacted', 'Qualified', 'Unqualified'].map((s) => <option key={s}>{s}</option>)}</select>
        <button className="btn primary" disabled={r.status !== 'Qualified'} title={r.status !== 'Qualified' ? 'Only Qualified leads can be converted' : ''} onClick={() => setConv({ createDeal: false, dealTitle: '', dealValue: '' })}>Convert lead</button></div>}</div>
    {err && <div className="alert error">{err}</div>}
    <div className="detail-grid">
      <div className="card"><h3>Details</h3><dl className="dl">{cfg.rows(r).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v || '-'}</dd></div>)}</dl></div>
      <div>
        {(cfg.related || []).map((rl) => <div className="card gap" key={rl.label}><h3>{rl.label}</h3>{(rel[rl.label] || []).length ? <ul className="list">{rel[rl.label].map((x) => <li key={x._id}><Link to={rl.path(x)}>{rl.text(x)}</Link></li>)}</ul> : <p className="empty">None linked.</p>}</div>)}
        {type === 'deals' && <div className="card gap"><h3>Stage history</h3>{r.stageHistory?.length ? <ul className="list">{r.stageHistory.map((h, i) => <li key={i}><span>{h.from} → {h.to}</span><span className="muted">{fmtDateTime(h.at)}</span></li>)}</ul> : <p className="empty">No stage changes yet.</p>}</div>}
        {type === 'leads' && score && <div className="card gap"><h3>Lead score: {score.score}/100 ({score.band})</h3>
          <p className="muted">Rule-based score (not machine learning). Each factor adds or subtracts points; admins can tune the weights in Settings.</p>
          {score.factors.length ? <ul className="list">{score.factors.map((f) => <li key={f.factor}><span>{f.factor}<small>{f.detail}</small></span><strong>{f.points > 0 ? '+' : ''}{f.points}</strong></li>)}</ul> : <p className="empty">No factors apply yet.</p>}</div>}
        <div className="card"><h3>Activity timeline</h3>
          <form className="note-form" onSubmit={addNote}><select value={note.type} onChange={(e) => setNote({ ...note, type: e.target.value })} aria-label="Activity type">{['note', 'call', 'email', 'meeting'].map((t) => <option key={t}>{t}</option>)}</select>
            <input required placeholder="Log a note, call, email or meeting" value={note.description} onChange={(e) => setNote({ ...note, description: e.target.value })} /><button className="btn primary">Add</button></form>
          {noteErr && <div className="alert error">{noteErr}</div>}
          {acts.length ? <ul className="list">{acts.map((a) => <li key={a._id}><span>{a.description}<small>{a.type} · {a.actor?.name || 'System'}</small></span><span className="muted">{fmtDateTime(a.createdAt)}</span></li>)}</ul> : <p className="empty">No activity yet.</p>}</div>
      </div></div>
    {conv && <Modal title="Convert lead" onClose={() => setConv(null)}><form className="form" onSubmit={convert}>
      <p className="muted">Creates (or links) a contact and company from this lead. The lead and its history are preserved.</p>{convErr && <div className="alert error">{convErr}</div>}
      <label className="check"><input type="checkbox" checked={conv.createDeal} onChange={(e) => setConv({ ...conv, createDeal: e.target.checked })} /> Also create a deal</label>
      {conv.createDeal && <><label>Deal title<input value={conv.dealTitle} onChange={(e) => setConv({ ...conv, dealTitle: e.target.value })} /></label><label>Deal value<input type="number" min="0" value={conv.dealValue} onChange={(e) => setConv({ ...conv, dealValue: e.target.value })} /></label></>}
      <button className="btn primary">Convert</button></form></Modal>}
  </div>);
}
