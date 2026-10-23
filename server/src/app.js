import express from 'express'; import helmet from 'helmet'; import cors from 'cors'; import cookieParser from 'cookie-parser'; import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { notFound, errorHandler } from './middleware/error.js';
import auth from './routes/auth.js'; import users from './routes/users.js'; import leads from './routes/leads.js'; import deals from './routes/deals.js'; import tasks from './routes/tasks.js';
import contacts from './routes/contacts.js'; import companies from './routes/companies.js'; import activities from './routes/activities.js'; import search from './routes/search.js'; import dashboard from './routes/dashboard.js';
import notifications from './routes/notifications.js'; import reports from './routes/reports.js'; import exportsR from './routes/exports.js'; import audit from './routes/audit.js'; import imports from './routes/imports.js'; import settings from './routes/settings.js';
const app = express();
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: (o, cb) => (!o || env.clientUrls.includes(o) ? cb(null, true) : cb(new Error('CORS blocked'))), credentials: true }));
app.use((req, res, next) => express.json({ limit: req.path.endsWith('/import') ? '2mb' : '100kb' })(req, res, next)); app.use(cookieParser());
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 600, standardHeaders: true, legacyHeaders: false }));
app.get('/api/health', (_q, res) => res.json({ success: true, status: 'ok', uptime: process.uptime() }));
app.use('/api', imports); app.use('/api', exportsR); // /leads/export, /deals/export (before the :id routes)
app.use('/api/auth', auth); app.use('/api/users', users); app.use('/api/leads', leads); app.use('/api/deals', deals); app.use('/api/tasks', tasks);
app.use('/api/contacts', contacts); app.use('/api/companies', companies); app.use('/api/activities', activities); app.use('/api/search', search); app.use('/api/dashboard', dashboard); app.use('/api/notifications', notifications); app.use('/api/reports', reports); app.use('/api/audit-logs', audit); app.use('/api/settings', settings);
app.use(notFound); app.use(errorHandler);
export default app;
