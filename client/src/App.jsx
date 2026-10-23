import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx'; import AppLayout from './components/layout/AppLayout.jsx';
import Landing from './pages/Landing.jsx'; import Login from './pages/Login.jsx'; import ForgotPassword from './pages/ForgotPassword.jsx'; import ResetPassword from './pages/ResetPassword.jsx';
import Dashboard from './pages/Dashboard.jsx'; import Pipeline from './pages/Pipeline.jsx'; import Leads from './pages/Leads.jsx'; import Contacts from './pages/Contacts.jsx'; import Companies from './pages/Companies.jsx';
import Deals from './pages/Deals.jsx'; import Tasks from './pages/Tasks.jsx'; import Detail from './pages/Detail.jsx'; import Reports from './pages/Reports.jsx'; import Team from './pages/Team.jsx';
import Settings from './pages/Settings.jsx'; import Notifications from './pages/Notifications.jsx'; import AuditLogs from './pages/AuditLogs.jsx';
function Protected({ children }) {
  const { user, loading } = useAuth(); const loc = useLocation();
  if (loading) return <div className="center-screen"><div className="spinner" /></div>;
  if (user) return children;
  return loc.pathname === '/' ? <Landing /> : <Navigate to="/login" replace />; // public landing page at '/' for visitors
}
function Guard({ roles, children }) { // UI guard only; the API enforces the same rules.
  const { user } = useAuth();
  return roles.includes(user.role) ? children : <div className="center-screen"><div><h1>Unauthorized</h1><p>You do not have access to this page.</p><a href="/">Go to dashboard</a></div></div>;
}
export default function App() {
  const { user } = useAuth();
  return (<Routes>
    <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} /><Route path="/forgot-password" element={<ForgotPassword />} /><Route path="/reset-password" element={<ResetPassword />} />
    <Route element={<Protected><AppLayout /></Protected>}>
      <Route index element={<Dashboard />} /><Route path="pipeline" element={<Pipeline />} />
      <Route path="leads" element={<Leads />} /><Route path="leads/:id" element={<Detail type="leads" />} />
      <Route path="contacts" element={<Contacts />} /><Route path="contacts/:id" element={<Detail type="contacts" />} />
      <Route path="companies" element={<Companies />} /><Route path="companies/:id" element={<Detail type="companies" />} />
      <Route path="deals" element={<Deals />} /><Route path="deals/:id" element={<Detail type="deals" />} />
      <Route path="tasks" element={<Tasks />} /><Route path="reports" element={<Reports />} /><Route path="notifications" element={<Notifications />} /><Route path="settings" element={<Settings />} />
      <Route path="team" element={<Guard roles={['admin', 'manager']}><Team /></Guard>} /><Route path="audit" element={<Guard roles={['admin']}><AuditLogs /></Guard>} />
    </Route>
    <Route path="*" element={<div className="center-screen"><div><h1>404</h1><p>Page not found.</p><a href="/">Go to dashboard</a></div></div>} />
  </Routes>);
}
