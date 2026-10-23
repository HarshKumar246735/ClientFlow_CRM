# ClientFlow CRM (work in progress)
MERN-style CRM: `server/` (Express + MongoDB) and `client/` (React + Vite). **Not feature-complete** - see "Status".

## Quick start (PowerShell)
    npm run install:all
    Copy-Item server\.env.example server\.env      # set MONGODB_URI and a 32+ char JWT_SECRET
    Copy-Item client\.env.example client\.env
    $env:ADMIN_NAME="Admin"; $env:ADMIN_EMAIL="you@example.com"; $env:ADMIN_PASSWORD="a-long-password-12+"; npm run seed:admin
    npm run dev:server      # terminal 1 -> http://localhost:5000/api/health
    npm run dev:client      # terminal 2 -> http://localhost:5173
MongoDB: local instance or Atlas (create a free cluster, add a DB user, allow your IP, paste the connection string into MONGODB_URI). Transactions (lead conversion) need Atlas or a replica set.

## Status
**Backend (server/):** auth (login/logout/me/profile/change + forgot/reset password), RBAC + CSRF, users, leads (CRUD, bulk assign, conversion, CSV import/export), contacts, companies (+CSV import/export via leads/contacts/companies import routes), deals + stage rules, tasks + reminder scheduler, activities (+manual notes/calls/emails/meetings), notifications + Socket.IO, dashboard, reports (+CSV), global search, audit log, org settings, optional SMTP email.
**Frontend (client/):** Login, Forgot/Reset password, Dashboard, Pipeline (drag-and-drop), Leads / Contacts / Companies / Deals / Tasks (search, filters, pagination, create/edit/delete, CSV where supported), detail pages with activity timeline and lead conversion, Reports (+print/CSV), Team, Settings (profile, security, organization, light/dark mode), Notifications (+live dropdown), Audit log, global search.
**Tests:** `npm test` (from the repo root or `server/`) runs the dependency-free unit tests (CSV utilities, lead scoring) plus `server/tests/team.integration.test.js` (login, CSRF, team management, role enforcement, last-admin protection). The integration suite is SKIPPED unless you point it at a throwaway database: `$env:TEST_MONGODB_URI="mongodb://127.0.0.1:27017/clientflow_test"; npm test` (the name must end in `_test`; it is wiped before and after, and your `server/.env` database is never used). There are NO frontend tests yet.
**Verification done:** Node syntax check of all server files; TypeScript-based JSX syntax check of all client files; relative-import existence check. **Never run:** `npm install`, the server against MongoDB, `vite build`, or the UI in a browser.

## New in this version
- **Public landing page** at `/` for signed-out visitors (signed-in users still go to the dashboard).
- **Bulk actions on Leads:** tick rows, then assign to a user (admin/manager) or set status, priority or source. Converted leads are skipped. API: `PATCH /api/leads/bulk/assign` and `/bulk/update`.
- **Rule-based lead scoring (not machine learning):** `GET /api/leads/:id/score` returns the score plus every contributing factor; scores and Hot/Warm/Cold bands show in the leads list and detail page. Weights are configurable by admins (Settings > Lead scoring rules, stored in the org settings).
- **Invitations:** admins add users without a password; a 72-hour set-password link is emailed (SMTP configured) or shown once to the admin to share. `POST /api/users/:id/invite` resends. Admin-set temporary passwords are still possible.
- **Touch drag-and-drop** on the pipeline via each card's grip handle (the "move to" dropdown remains as an accessible fallback).

## Team management (admin)
Team page > Add user (invitation link or temporary password), change role, activate/deactivate, **Edit** (name, email, phone, reports-to) and **Delete**. Deleting is refused for yourself, the last active administrator, and any user who still owns leads, deals, contacts, companies or tasks (deactivate them or reassign first). API: `POST /api/users`, `PATCH /api/users/:id`, `PATCH /api/users/:id/role`, `PATCH /api/users/:id/status`, `DELETE /api/users/:id`, `POST /api/users/:id/invite` (all admin-only).

## Known limitations
- Self-registration is intentionally not offered; accounts are created by admins.
- Email only works when SMTP_* variables are set; otherwise reset/invite links are printed to the server console (development) or shown to the admin (invites).
- Task reminders use an in-process timer (every 5 min): needs an always-on server; they pause when a free host sleeps.
- Lead conversion uses a transaction only on replica sets/Atlas; on standalone MongoDB it falls back to sequential writes.
- Scoring weights are edited as JSON in Settings (no visual editor).
- `dateFormat` offers short/medium/long only. CSV import is JSON-based (`{csv}`), max 1,000 rows / 2 MB; duplicates by email (leads, contacts) or exact company name.
- Touch dragging was written but never tested on a real device.
- No automated API/integration or frontend tests.

## Deployment (manual)
Render (API): New > Blueprint from this repo (uses render.yaml) or Web Service with Root Directory `server`, build `npm install`, start `npm start`; set MONGODB_URI, JWT_SECRET, CLIENT_URL=<your Vercel URL>, NODE_ENV=production.
Vercel (client): Root Directory `client`, build `npm run build`, output `dist` (client/vercel.json adds SPA rewrites); set VITE_API_URL=<render URL>/api.
Cross-site cookies in production use SameSite=None; Secure, so both sites must be HTTPS.
