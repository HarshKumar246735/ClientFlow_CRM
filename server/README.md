# ClientFlow CRM - Server (Phase A: backend core)
Node 18+, Express 4, Mongoose 8, MongoDB.

## Run (PowerShell)
    cd server; Copy-Item .env.example .env   # edit JWT_SECRET, MONGODB_URI
    npm install
    $env:ADMIN_NAME="Admin"; $env:ADMIN_EMAIL="you@example.com"; $env:ADMIN_PASSWORD="a-long-password-12+"; npm run seed:admin
    npm run dev        # http://localhost:5000/api/health

## Auth model
JWT (8h) in an HTTP-only cookie; `tokenVersion` on the user revokes tokens on logout, password change, role/status change.
CSRF: double-submit. `/auth/login` and `/auth/me` return `csrfToken`; send it as `X-CSRF-Token` on every POST/PUT/PATCH/DELETE.
Roles: admin = all records; manager = own + team (users whose `manager` is them); rep = own. Enforced in queries (`scopeFilter`), so guessing IDs returns 404.

## Endpoints
POST /api/auth/login | GET /api/auth/me | POST /api/auth/logout | POST /api/auth/change-password
GET/POST /api/users, PATCH /api/users/:id/role, PATCH /api/users/:id/status (admin; manager can list team)
GET/POST /api/leads, GET/PUT/DELETE /api/leads/:id  (list: q, status, source, priority, owner, createdFrom, createdTo, sort, page, limit)
GET/POST /api/deals, GET/PUT/DELETE /api/deals/:id, PATCH /api/deals/:id/stage {stage, lossReason?}
GET/POST /api/tasks, GET/PUT/DELETE /api/tasks/:id, PATCH /api/tasks/:id/status

## Added in Phase A2
GET/POST /api/contacts, GET/PUT/DELETE /api/contacts/:id | GET/POST /api/companies, GET/PUT/DELETE /api/companies/:id (delete blocked while contacts/deals are linked)
POST /api/leads/:id/convert {createDeal?, dealTitle?, dealValue?} - Qualified leads only; creates/links company + contact, optional deal, transactional where MongoDB supports it (fallback: sequential writes, so a mid-way failure on a standalone MongoDB can leave partial records)
GET /api/dashboard/stats?range=today|7d|30d|this_month|last_month|custom&from&to (metric definitions are in routes/dashboard.js)
GET /api/search?q= | GET /api/activities?entity=Lead&entityId=...

## Added in Phase A3
Socket.IO (cookie-authenticated, private per-user rooms): event `notification`. Notifications are created for lead/task assignment, lead reassignment and deal won/lost, and contain no customer data.
GET /api/notifications (?unread=true, returns meta.unread) | PATCH /api/notifications/read-all | PATCH /api/notifications/:id/read
POST /api/auth/forgot-password {email} | POST /api/auth/reset-password {token,newPassword} - 1h single-use tokens, stored hashed. SMTP is NOT implemented: in development the link is printed to the server console; in production no email is sent.
GET /api/reports/sales | /api/reports/leads (?from&to&owner&format=csv; formulas documented in routes/reports.js)
GET /api/leads/export | /api/deals/export (CSV, formula-injection safe) | PATCH /api/leads/bulk/assign {ids[],owner} | GET /api/audit-logs (admin)
Run `npm install` again (new deps: socket.io, cookie).

## Not yet implemented (later phases)
CSV import, upcoming-task/overdue notification scheduler, email delivery, settings API, user profile update endpoint, automated tests, Render/Vercel config, the whole React client.

## Not verified
Dependencies were not installed and the server was never started or tested (sandbox has no network). Only a Node syntax check was run.
