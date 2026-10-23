import { Link } from 'react-router-dom';
import { Hexagon, Users, KanbanSquare, CheckSquare, BarChart3, Bell, ShieldCheck, ArrowRight } from 'lucide-react';
const FEATURES = [
  [Users, 'Lead management', 'Capture, import, score and assign leads, then convert qualified ones into contacts, companies and deals.'],
  [KanbanSquare, 'Visual pipeline', 'Drag deals between stages on desktop or touch screens, with every change saved and recorded.'],
  [CheckSquare, 'Tasks and follow-ups', 'Never miss a call or demo. Reminders arrive before tasks are due and when they become overdue.'],
  [BarChart3, 'Reports you can trust', 'Revenue, conversion and rep performance calculated from your real records, with CSV export and print.'],
  [Bell, 'Live notifications', 'Get notified instantly when leads are assigned or deals are won or lost.'],
  [ShieldCheck, 'Role-based access', 'Admins, managers and reps each see only the records they should, enforced on the server.']];
const STEPS = [['Capture', 'Add leads manually or import a CSV.'], ['Qualify', 'Score, assign and follow up until they are ready.'], ['Close', 'Convert to a deal and move it through your pipeline.']];
const COLS = [['Qualification', 'blue', ['Website redesign', 'CRM integration']], ['Proposal', 'purple', ['Support contract']], ['Negotiation', 'orange', ['Annual license']], ['Won', 'green', ['Training package']]];
export default function Landing() {
  return (<div className="landing">
    <header className="l-nav"><div className="l-wrap l-nav-in"><div className="brand"><Hexagon size={26} /><strong>ClientFlow</strong></div>
      <nav className="l-links"><a href="#features">Features</a><a href="#how">How it works</a></nav><Link to="/login" className="btn primary">Sign in</Link></div></header>
    <section className="l-hero l-wrap"><div className="l-copy"><span className="l-badge">Sales CRM for growing teams</span>
      <h1>Close more deals with a CRM your team will actually use</h1>
      <p>ClientFlow brings leads, contacts, deals and follow-ups into one clean workspace, so nothing slips through the cracks.</p>
      <div className="actions"><Link to="/login" className="btn primary lg">Sign in to your workspace <ArrowRight size={16} /></Link><a href="#features" className="btn ghost lg">See features</a></div>
      <small className="muted">Accounts are created by your administrator.</small></div>
      <div className="l-preview" aria-hidden="true">{COLS.map(([n, tone, cards]) => <div key={n} className={`l-col ${tone}`}><h4>{n}</h4>{cards.map((c) => <div className="l-card" key={c}><strong>{c}</strong><span /><span className="short" /></div>)}</div>)}</div></section>
    <section id="features" className="l-section"><div className="l-wrap"><h2>Everything you need to manage your sales</h2><p className="muted center">One platform from first contact to closed deal.</p>
      <div className="l-grid">{FEATURES.map(([I, t, d]) => <div className="card l-feature" key={t}><div className="l-icon"><I size={20} /></div><h3>{t}</h3><p className="muted">{d}</p></div>)}</div></div></section>
    <section id="how" className="l-section alt"><div className="l-wrap"><h2>How it works</h2>
      <div className="l-steps">{STEPS.map(([t, d], i) => <div key={t} className="l-step"><span className="l-num">{i + 1}</span><h3>{t}</h3><p className="muted">{d}</p></div>)}</div></div></section>
    <section className="l-cta l-wrap"><h2>Ready to get organised?</h2><p className="muted">Sign in to start managing your pipeline.</p><Link to="/login" className="btn primary lg">Sign in <ArrowRight size={16} /></Link></section>
    <footer className="l-foot"><div className="l-wrap"><span>ClientFlow CRM</span><span className="muted">Built with React, Express and MongoDB</span></div></footer>
  </div>);
}
