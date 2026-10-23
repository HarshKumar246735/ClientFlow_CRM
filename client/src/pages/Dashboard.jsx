import { useEffect, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, CartesianGrid } from 'recharts';
import api, { errMsg, money, fmtDate } from '../services/api.js';
const RANGES = [['today', 'Today'], ['7d', 'Last 7 days'], ['30d', 'Last 30 days'], ['this_month', 'This month'], ['last_month', 'Last month']];
const COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#06b6d4', '#ec4899', '#94a3b8'];
export default function Dashboard() {
  const [range, setRange] = useState('30d'); const [tick, setTick] = useState(0); const [d, setD] = useState(null); const [err, setErr] = useState(''); const [loading, setLoading] = useState(true);
  useEffect(() => { setLoading(true); setErr(''); api.get('/dashboard/stats', { params: { range } }).then((r) => setD(r.data.data)).catch((e) => setErr(errMsg(e))).finally(() => setLoading(false)); }, [range, tick]);
  const c = d?.cards;
  const cards = c && [['Total leads', c.totalLeads], ['Customers', c.customers], ['Active deals', c.activeDeals], ['Won deals', c.wonDeals], ['Lost deals', c.lostDeals],
    ['Won revenue', money(c.wonRevenue)], ['Pipeline value', money(c.pipelineValue)], ['Expected value', money(c.expectedValue)], ['Conversion rate', `${c.conversionRate}%`], ['Overdue tasks', c.overdueTasks], ['Upcoming follow-ups', c.upcomingFollowUps]];
  return (<div>
    <div className="page-head"><h1>Dashboard</h1><select value={range} onChange={(e) => setRange(e.target.value)} aria-label="Date range">{RANGES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
    {err && <div className="alert error">{err} <button className="link" onClick={() => setTick((n) => n + 1)}>Retry</button></div>}
    {loading && !d && <div className="center-screen"><div className="spinner" /></div>}
    {d && <>
      <div className="stat-grid">{cards.map(([l, v]) => <div className="card stat" key={l}><span className="muted">{l}</span><strong>{v}</strong></div>)}</div>
      <div className="chart-grid">
        <div className="card"><h3>Monthly revenue (won deals)</h3>{d.charts.monthlyRevenue.length ? <ResponsiveContainer width="100%" height={240}><BarChart data={d.charts.monthlyRevenue}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="month" fontSize={12} /><YAxis fontSize={12} /><Tooltip formatter={(v) => money(v)} /><Bar dataKey="revenue" fill="#3b82f6" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer> : <p className="empty">No won deals yet.</p>}</div>
        <div className="card"><h3>Lead sources</h3>{d.charts.leadSources.length ? <ResponsiveContainer width="100%" height={240}><PieChart><Pie data={d.charts.leadSources} dataKey="count" nameKey="source" innerRadius={50} outerRadius={85}>{d.charts.leadSources.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer> : <p className="empty">No leads in this period.</p>}</div>
      </div>
      <div className="chart-grid">
        <div className="card"><h3>Recent leads</h3>{d.recentLeads.length ? <ul className="list">{d.recentLeads.map((l) => <li key={l._id}><span>{l.firstName} {l.lastName}<small>{l.company || '-'}</small></span><span className="muted">{fmtDate(l.createdAt)}</span></li>)}</ul> : <p className="empty">No leads yet.</p>}</div>
        <div className="card"><h3>Upcoming tasks</h3>{d.upcomingTasks.length ? <ul className="list">{d.upcomingTasks.map((t) => <li key={t._id}><span>{t.title}<small>{t.type}</small></span><span className="muted">{fmtDate(t.dueDate)}</span></li>)}</ul> : <p className="empty">Nothing scheduled.</p>}</div>
      </div>
      <div className="card"><h3>Recent activity</h3>{d.recentActivity.length ? <ul className="list">{d.recentActivity.map((a) => <li key={a._id}><span>{a.description}<small>{a.actor?.name}</small></span><span className="muted">{fmtDate(a.createdAt)}</span></li>)}</ul> : <p className="empty">No activity yet.</p>}</div>
    </>}
  </div>);
}
