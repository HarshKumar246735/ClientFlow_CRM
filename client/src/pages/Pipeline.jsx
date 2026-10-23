import { useEffect, useState, useCallback, useRef } from 'react'; import { Plus, Calendar, GripVertical } from 'lucide-react';
import api, { errMsg, money, fmtDate } from '../services/api.js'; import Modal from '../components/common/Modal.jsx';
const STAGES = [['Qualification', 'blue'], ['Discovery', 'purple'], ['Proposal', 'teal'], ['Negotiation', 'orange'], ['Won', 'green'], ['Lost', 'red']];
export default function Pipeline() {
  const [deals, setDeals] = useState([]); const [loading, setLoading] = useState(true); const [err, setErr] = useState(''); const [toast, setToast] = useState(null);
  const [busy, setBusy] = useState(null); const [over, setOver] = useState(null); const [lost, setLost] = useState(null); const [reason, setReason] = useState('');
  const [show, setShow] = useState(false); const [nf, setNf] = useState({ title: '', value: '' }); const [nErr, setNErr] = useState('');
  const flash = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3500); };
  const [ghost, setGhost] = useState(null); const boardRef = useRef(null);
  const load = useCallback(() => { setLoading(true); setErr(''); api.get('/deals', { params: { limit: 100 } }).then((r) => setDeals(r.data.data)).catch((e) => setErr(errMsg(e))).finally(() => setLoading(false)); }, []);
  useEffect(load, [load]);
  const move = async (deal, stage, lossReason) => {
    if (stage === deal.stage) return;
    const prev = deals; setDeals(deals.map((d) => (d._id === deal._id ? { ...d, stage } : d))); setBusy(deal._id); // optimistic
    try { const r = await api.patch(`/deals/${deal._id}/stage`, { stage, ...(lossReason && { lossReason }) });
      setDeals((cur) => cur.map((d) => (d._id === deal._id ? { ...d, ...r.data.data, owner: d.owner, lead: d.lead, contact: d.contact, company: d.company } : d))); flash('ok', `Moved to ${stage}`);
    } catch (e) { setDeals(prev); flash('err', errMsg(e)); } finally { setBusy(null); }
  };
  const request = (deal, stage) => (stage === 'Lost' && deal.stage !== 'Lost' ? (setReason(''), setLost({ deal })) : move(deal, stage));
  const drop = (stage) => (e) => { e.preventDefault(); setOver(null); const deal = deals.find((d) => d._id === e.dataTransfer.getData('text/plain')); if (deal) request(deal, stage); };
  // Touch/pen dragging via pointer events on the grip handle (mouse users keep native HTML5 drag-and-drop).
  const stageAt = (x, y) => document.elementFromPoint(x, y)?.closest('[data-stage]')?.dataset.stage || null;
  const startTouch = (deal) => (e) => { if (e.pointerType === 'mouse') return; e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); setGhost({ deal, x: e.clientX, y: e.clientY }); };
  const moveTouch = (e) => { if (!ghost) return; setGhost({ ...ghost, x: e.clientX, y: e.clientY }); setOver(stageAt(e.clientX, e.clientY));
    if (boardRef.current) { if (e.clientX < 50) boardRef.current.scrollLeft -= 14; else if (e.clientX > window.innerWidth - 50) boardRef.current.scrollLeft += 14; } };
  const endTouch = (e) => { if (!ghost) return; const g = ghost, stage = stageAt(e.clientX, e.clientY); setGhost(null); setOver(null); if (stage) request(g.deal, stage); };
  const cancelTouch = () => { setGhost(null); setOver(null); };
  const create = async (e) => { e.preventDefault(); setNErr(''); try { await api.post('/deals', { title: nf.title, value: Number(nf.value) || 0 }); setShow(false); setNf({ title: '', value: '' }); load(); } catch (x) { setNErr(errMsg(x)); } };
  return (<div>
    <div className="page-head"><h1>Pipeline</h1><button className="btn primary" onClick={() => setShow(true)}><Plus size={16} /> New deal</button></div>
    {err && <div className="alert error">{err} <button className="link" onClick={load}>Retry</button></div>}
    {toast && <div className={`toast ${toast.type}`} role="status">{toast.msg}</div>}
    {loading && !deals.length ? <div className="center-screen"><div className="spinner" /></div> :
      <div className="board" ref={boardRef}>{STAGES.map(([stage, tone]) => { const col = deals.filter((d) => d.stage === stage); return (
        <section key={stage} data-stage={stage} className={`col ${tone} ${over === stage ? 'over' : ''}`} onDragOver={(e) => { e.preventDefault(); setOver(stage); }} onDragLeave={() => setOver(null)} onDrop={drop(stage)}>
          <header><h3>{stage}</h3><span className="count">{col.length}</span><small>{money(col.reduce((a, d) => a + d.value, 0))}</small></header>
          {col.map((d) => <article key={d._id} className={`deal ${busy === d._id ? 'busy' : ''}`} draggable onDragStart={(e) => e.dataTransfer.setData('text/plain', d._id)}>
            <strong>{d.title}</strong><span className="muted">{d.company?.name || d.contact ? [d.company?.name, d.contact && `${d.contact.firstName} ${d.contact.lastName}`].filter(Boolean).join(' · ') : 'No company'}</span>
            <div className="meta"><b>{money(d.value, d.currency)}</b><span><Calendar size={13} /> {fmtDate(d.expectedCloseDate)}</span></div>
            <div className="foot"><span className="grip" role="img" aria-label="Drag handle" onPointerDown={startTouch(d)} onPointerMove={moveTouch} onPointerUp={endTouch} onPointerCancel={cancelTouch}><GripVertical size={14} /></span><span className="avatar sm">{d.owner?.name?.[0] || '?'}</span><select aria-label="Move to stage" value={d.stage} onChange={(e) => request(d, e.target.value)}>{STAGES.map(([s]) => <option key={s}>{s}</option>)}</select></div>
          </article>)}
          {!col.length && <p className="empty">Drop deals here</p>}
        </section>); })}</div>}
    {ghost && <div className="drag-ghost" style={{ left: ghost.x, top: ghost.y }}>{ghost.deal.title}</div>}
    {lost && <Modal title="Mark deal as lost" onClose={() => setLost(null)}><form className="form" onSubmit={(e) => { e.preventDefault(); move(lost.deal, 'Lost', reason); setLost(null); }}>
      <label>Loss reason<input required autoFocus value={reason} onChange={(e) => setReason(e.target.value)} /></label><button className="btn primary">Confirm</button></form></Modal>}
    {show && <Modal title="New deal" onClose={() => setShow(false)}><form className="form" onSubmit={create}>{nErr && <div className="alert error">{nErr}</div>}
      <label>Title<input required value={nf.title} onChange={(e) => setNf({ ...nf, title: e.target.value })} /></label>
      <label>Value<input type="number" min="0" required value={nf.value} onChange={(e) => setNf({ ...nf, value: e.target.value })} /></label><button className="btn primary">Create deal</button></form></Modal>}
  </div>);
}
