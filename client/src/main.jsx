import React from 'react'; import { createRoot } from 'react-dom/client'; import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx'; import { AuthProvider } from './context/AuthContext.jsx';
import './css/variables.css'; import './css/global.css'; import './css/layout.css'; import './css/components.css';
import './css/auth.css'; import './css/dashboard.css'; import './css/leads.css'; import './css/pipeline.css'; import './css/detail.css'; import './css/reports.css'; import './css/settings.css'; import './css/team.css'; import './css/topbar.css'; import './css/landing.css'; import './css/dark.css';
createRoot(document.getElementById('root')).render(<BrowserRouter><AuthProvider><App /></AuthProvider></BrowserRouter>);
