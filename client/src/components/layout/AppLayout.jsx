import { useEffect, useState } from 'react'; import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, KanbanSquare, Users, Contact, Building2, Handshake, CheckSquare, BarChart3, Bell, UsersRound, ScrollText, Settings, LogOut, Menu, Hexagon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx'; import NotificationBell from './NotificationBell.jsx'; import GlobalSearch from './GlobalSearch.jsx';
const NAV = [{ to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true }, { to: '/pipeline', label: 'Pipeline', icon: KanbanSquare }, { to: '/leads', label: 'Leads', icon: Users },
  { to: '/contacts', label: 'Contacts', icon: Contact }, { to: '/companies', label: 'Companies', icon: Building2 }, { to: '/deals', label: 'Deals', icon: Handshake }, { to: '/tasks', label: 'Tasks', icon: CheckSquare },
  { to: '/reports', label: 'Reports', icon: BarChart3 }, { to: '/notifications', label: 'Notifications', icon: Bell }, { to: '/team', label: 'Team', icon: UsersRound, roles: ['admin', 'manager'] },
  { to: '/audit', label: 'Audit log', icon: ScrollText, roles: ['admin'] }, { to: '/settings', label: 'Settings', icon: Settings }];
export default function AppLayout() {
  const { user, logout } = useAuth(); const [open, setOpen] = useState(false); const loc = useLocation();
  useEffect(() => setOpen(false), [loc.pathname]);
  return (<div className="shell">
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div className="brand"><Hexagon size={26} /><div><strong>ClientFlow</strong><small>Sales CRM Platform</small></div></div>
      <nav>{NAV.filter((n) => !n.roles || n.roles.includes(user.role)).map(({ to, label, icon: I, end }) => <NavLink key={to} to={to} end={end} className="nav-link"><I size={18} />{label}</NavLink>)}</nav>
      <div className="sidebar-user"><div className="avatar">{user.name[0]}</div><div><strong>{user.name}</strong><small>{user.role}</small></div></div>
    </aside>
    {open && <div className="scrim" onClick={() => setOpen(false)} />}
    <div className="main">
      <header className="topbar"><button className="icon-btn menu-btn" aria-label="Open menu" onClick={() => setOpen(true)}><Menu size={20} /></button><GlobalSearch /><div className="spacer" />
        <NotificationBell /><button className="btn ghost" onClick={logout}><LogOut size={16} /> Log out</button></header>
      <main className="content"><Outlet /></main>
    </div></div>);
}
