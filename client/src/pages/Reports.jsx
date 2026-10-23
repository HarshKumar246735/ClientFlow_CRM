import { useEffect, useState } from 'react'; import { Download, Printer } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import api, { errMsg, money, download } from '../services/api.js'; import { useAuth } from '../context/AuthContext.jsx';
const Chart = ({ title, data, x, bars }) => (<div className="card"><h3>{title}</h3>{data?.length ? <ResponsiveContainer width="100%" height={240}><BarChart data={data}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey={x} fontSize={12} /><YAxis fontSize={12} /><Tooltip /><Legend />
  {bars.map(([k, c]) => <Bar key={k} dataKey={k} fill={c} radius={[5, 5, 0, 0]} />)}</BarChart></ResponsiveContainer> : <p className="empty">No data for this period.</p>}</div>);
export default function Reports() {
  const { user } = useAuth(); const [p, setP] = useState({ from: '', to: '', owner: '' }); const [users, setUsers] = useState([]);
  const [s, setS] = useState(null); const [l, setL] = useState(null); const [err, setErr] = useState(''); const [loading, setLoading] = useState(true);
  const params = () => ({ ...(p.from && { from: p.from }), ...(p.to && { to: `${p.to}T23:59:59` }), ...(p.owner && { owner: p.owner }) });
  useEffect(() => { if (user.role !== 'rep') api.get('/users').then((r) => setUsers(r.data.data)).catch(() => {}); }, [user.role]);
  useEffect(() => { setLoading(true); setErr(''); Promise.all([api.get('/reports/sales', { params: params() }), api.get('/reports/leads', { params: params() })])
    .then(([a, b]) => { setS(a.data.data); setL(b.data.data); }).catch((e) => setErr(errMsg(e))).finally(() => setLoading(false)); }, [p]);
  const exp = (kind) => download(`/reports/${kind}`, { ...params(), format: 'csv' }, `${kind}-report.csv`).catch((e) => setErr(errMsg(e)));
  const revenue = s?.revenueByMonth.reduce((a, m) => a + m.revenue, 0) || 0, won = s?.wonVsLost.Won?.count || 0, lost = s?.wonVsLost.Lost?.count || 0;
  const cards = s && l && [['Won revenue', money(revenue)], ['Deals won', won], ['Deals lost', lost], ['Average deal value', money(s.averageDealValue)], ['Avg days to close', s.averageDaysToClose], ['Lead conversion rate', `${l.conversionRate}%`], ['Follow-up completion', `${l.followUpCompletionRate}%`]];
  return (<div className="print-area">
    <div className="page-head"><h1>Reports</h1><div className="actions no-print"><button className="btn ghost" onClick={() => exp('sales')}><Download size={16} /> Sales CSV</button><button className="btn ghost" onClick={() => exp('leads')}><Download size={16} /> Leads CSV</button><button className="btn ghost" onClick={() => window.print()}><Printer size={16} /> Print</button></div></div>
    <div className="toolbar card no-print"><label className="inline">From<input type="date" value={p.from} onChange={(e) => setP({ ...p, from: e.target.value })} /></label><label className="inline">To<input type="date" value={p.to} onChange={(e) => setP({ ...p, to: e.target.value })} /></label>
      {user.role !== 'rep' && <select aria-label="Representative" value={p.owner} onChange={(e) => setP({ ...p, owner: e.target.value })}><option value="">All representatives</option>{users.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}</select>}</div>
    <p className="muted">Default range: last 12 months. Revenue counts Won deals by close date; conversion rate = converted leads / leads created in the range.</p>
    {err && <div className="alert error">{err}</div>}{loading && !s && <div className="center-screen"><div className="spinner" /></div>}
    {cards && <><div className="stat-grid">{cards.map(([k, v]) => <div className="card stat" key={k}><span className="muted">{k}</span><strong>{v}</strong></div>)}</div>
      <div className="chart-grid"><Chart title="Revenue by month" data={s.revenueByMonth} x="month" bars={[['revenue', '#3b82f6']]} /><Chart title="Leads by source" data={l.bySource} x="source" bars={[['count', '#8b5cf6'], ['converted', '#10b981']]} /></div>
      <div className="chart-grid"><Chart title="Open deals by stage" data={s.dealsByStage} x="stage" bars={[['count', '#f59e0b']]} />
        <div className="card"><h3>Representative performance</h3>{s.repPerformance.length ? <table className="table slim"><thead><tr><th>Rep</th><th>Won</th><th>Lost</th><th>Revenue</th></tr></thead><tbody>{s.repPerformance.map((r) => <tr key={r._id}><td>{r.name}</td><td>{r.won}</td><td>{r.lost}</td><td>{money(r.revenue)}</td></tr>)}</tbody></table> : <p className="empty">No closed deals in this period.</p>}</div></div></>}
  </div>);
}
