// Integration tests for authentication and team-member management.
// SAFETY: runs only when TEST_MONGODB_URI is set AND its database name ends with "_test" (the database is wiped).
// The values in server/.env are never used: the env vars below are set BEFORE the app is imported, and dotenv does not override existing variables.
//   PowerShell:  $env:TEST_MONGODB_URI="mongodb://127.0.0.1:27017/clientflow_test"; npm test
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

const URI = process.env.TEST_MONGODB_URI || '';
const dbName = URI.split('?')[0].split('/').pop();
const enabled = Boolean(URI) && dbName.endsWith('_test');
if (URI && !enabled) console.warn('TEST_MONGODB_URI ignored: the database name must end with "_test".');

describe('auth + team management (isolated test database)', { skip: !enabled && 'set TEST_MONGODB_URI to a database whose name ends with _test' }, () => {
  let server, base, mongoose, models, bcrypt;
  const PW = 'correct-horse-battery-1';

  // Minimal cookie-aware client; one jar per simulated browser.
  const client = () => {
    const jar = {};
    const call = async (method, path, body) => {
      const headers = { 'content-type': 'application/json' };
      const cookie = Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; '); if (cookie) headers.cookie = cookie;
      if (method !== 'GET' && jar.csrf_token) headers['x-csrf-token'] = jar.csrf_token;
      const res = await fetch(base + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
      for (const c of res.headers.getSetCookie()) { const [pair] = c.split(';'); const i = pair.indexOf('='); const k = pair.slice(0, i), v = pair.slice(i + 1); if (v) jar[k] = v; else delete jar[k]; }
      let json = null; try { json = await res.json(); } catch { /* non-JSON body */ }
      return { status: res.status, body: json };
    };
    call.jar = jar; return call;
  };

  before(async () => {
    process.env.NODE_ENV = 'test'; process.env.MONGODB_URI = URI; process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-123'; process.env.CLIENT_URL = 'http://localhost:5173';
    for (const k of ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'EMAIL_FROM']) process.env[k] = ''; // never send real email from tests, whatever server/.env holds
    mongoose = (await import('mongoose')).default; bcrypt = (await import('bcryptjs')).default;
    await mongoose.connect(URI, { serverSelectionTimeoutMS: 8000 });
    assert.ok(mongoose.connection.name.endsWith('_test'), 'refusing to run against a non-test database');
    await mongoose.connection.dropDatabase();
    models = await import('../src/models/index.js'); await models.User.init();
    await models.User.create({ name: 'Root Admin', email: 'admin@test.local', role: 'admin', passwordHash: await bcrypt.hash(PW, 4) });
    const app = (await import('../src/app.js')).default;
    server = http.createServer(app); await new Promise((r) => server.listen(0, '127.0.0.1', r)); base = `http://127.0.0.1:${server.address().port}`;
  });
  after(async () => { if (server) await new Promise((r) => server.close(r)); if (mongoose) { if (enabled) await mongoose.connection.dropDatabase(); await mongoose.disconnect(); } });

  const login = async (email, password = PW) => { const c = client(); const r = await c('POST', '/api/auth/login', { email, password }); return { c, r }; };

  it('health endpoint responds', async () => { assert.equal((await client()('GET', '/api/health')).status, 200); });
  it('protected endpoints reject unauthenticated requests', async () => {
    for (const p of ['/api/users', '/api/leads', '/api/dashboard/stats', '/api/auth/me']) assert.equal((await client()('GET', p)).status, 401, p);
  });
  it('rejects a wrong password and an unknown email with the same message', async () => {
    const a = await login('admin@test.local', 'wrong-password-123'), b = await login('nobody@test.local');
    assert.equal(a.r.status, 401); assert.equal(b.r.status, 401); assert.equal(a.r.body.message, b.r.body.message);
  });
  it('admin logs in and the response never exposes password data', async () => {
    const { c, r } = await login('admin@test.local'); assert.equal(r.status, 200); assert.equal(r.body.data.user.role, 'admin');
    assert.ok(!JSON.stringify(r.body).includes('passwordHash'));
    const me = await c('GET', '/api/auth/me'); assert.equal(me.status, 200); assert.equal(me.body.data.user.email, 'admin@test.local');
  });
  it('state-changing requests without a CSRF token are rejected', async () => {
    const { c } = await login('admin@test.local');
    const cookie = Object.entries(c.jar).map(([k, v]) => `${k}=${v}`).join('; '); // valid session cookie, but no X-CSRF-Token header
    const bare = await fetch(base + '/api/users', { method: 'POST', headers: { 'content-type': 'application/json', cookie }, body: JSON.stringify({ name: 'N', email: 'n@test.local', password: PW }) });
    assert.equal(bare.status, 403); assert.equal(await models.User.exists({ email: 'n@test.local' }), null);
  });

  describe('team members', () => {
    let admin, repId;
    before(async () => { admin = (await login('admin@test.local')).c; });

    it('admin creates a team member who can then sign in; duplicates and weak passwords are rejected', async () => {
      const ok = await admin('POST', '/api/users', { name: 'Rita Rep', email: 'Rita@Test.local', password: PW, role: 'rep' });
      assert.equal(ok.status, 201); repId = ok.body.data.id; assert.equal(ok.body.data.email, 'rita@test.local');
      assert.equal((await admin('POST', '/api/users', { name: 'Dup', email: 'rita@test.local', password: PW })).status, 409);
      assert.equal((await admin('POST', '/api/users', { name: 'Weak', email: 'weak@test.local', password: 'short' })).status, 400);
      const stored = await models.User.findById(repId).select('+passwordHash').lean(); assert.notEqual(stored.passwordHash, PW); assert.ok(stored.passwordHash.startsWith('$2'));
      assert.equal((await login('rita@test.local')).r.status, 200);
    });
    it('invitation flow returns a one-time link when email is not configured', async () => {
      const r = await admin('POST', '/api/users', { name: 'Ivy Invite', email: 'ivy@test.local', role: 'rep' });
      assert.equal(r.status, 201); assert.equal(r.body.data.invite.sent, false); assert.match(r.body.data.invite.link, /reset-password\?token=/);
    });
    it('a rep cannot reach any administrative user endpoint or escalate privileges', async () => {
      const { c } = await login('rita@test.local');
      assert.equal((await c('GET', '/api/users')).status, 403);
      assert.equal((await c('POST', '/api/users', { name: 'X', email: 'x@test.local', password: PW, role: 'admin' })).status, 403);
      assert.equal((await c('PATCH', `/api/users/${repId}/role`, { role: 'admin' })).status, 403);
      assert.equal((await c('PATCH', `/api/users/${repId}`, { name: 'Hacker' })).status, 403);
      assert.equal((await c('DELETE', `/api/users/${repId}`)).status, 403);
      assert.equal((await c('PATCH', '/api/auth/profile', { role: 'admin' })).status, 400); // strict schema rejects unknown fields
      assert.equal((await c('GET', '/api/audit-logs')).status, 403);
    });
    it('the user list never exposes password hashes or token versions', async () => {
      const r = await admin('GET', '/api/users'); assert.equal(r.status, 200); const text = JSON.stringify(r.body);
      assert.ok(!text.includes('passwordHash') && !text.includes('tokenVersion'));
    });
    it('admin can edit details; invalid and duplicate emails are rejected; self-reporting is rejected', async () => {
      assert.equal((await admin('PATCH', `/api/users/${repId}`, { name: 'Rita R.', phone: '555-0100' })).status, 200);
      assert.equal((await models.User.findById(repId).lean()).name, 'Rita R.');
      assert.equal((await admin('PATCH', `/api/users/${repId}`, { email: 'admin@test.local' })).status, 409);
      assert.equal((await admin('PATCH', `/api/users/${repId}`, { email: 'not-an-email' })).status, 400);
      assert.equal((await admin('PATCH', `/api/users/${repId}`, {})).status, 400);
      assert.equal((await admin('PATCH', `/api/users/${repId}`, { manager: repId })).status, 400);
    });
    it('the last administrator cannot be demoted, deactivated or deleted, and nobody can delete themselves', async () => {
      const adminId = String((await models.User.findOne({ email: 'admin@test.local' }))._id);
      assert.equal((await admin('PATCH', `/api/users/${adminId}/role`, { role: 'rep' })).status, 400);
      assert.equal((await admin('PATCH', `/api/users/${adminId}/status`, { isActive: false })).status, 400);
      assert.equal((await admin('DELETE', `/api/users/${adminId}`)).status, 400);
    });
    it('a user who owns records cannot be deleted; one who owns nothing can', async () => {
      await models.Lead.create({ firstName: 'A', lastName: 'B', owner: repId });
      assert.equal((await admin('DELETE', `/api/users/${repId}`)).status, 409);
      const t = await admin('POST', '/api/users', { name: 'Temp', email: 'temp@test.local', password: PW }); assert.equal(t.status, 201);
      assert.equal((await admin('DELETE', `/api/users/${t.body.data.id}`)).status, 200);
      assert.equal(await models.User.exists({ email: 'temp@test.local' }), null);
    });
    it('deactivating a user ends their session and blocks new sign-ins', async () => {
      const { c } = await login('rita@test.local'); assert.equal((await c('GET', '/api/auth/me')).status, 200);
      assert.equal((await admin('PATCH', `/api/users/${repId}/status`, { isActive: false })).status, 200);
      assert.equal((await c('GET', '/api/auth/me')).status, 401);
      assert.equal((await login('rita@test.local')).r.status, 401);
    });
    it('logout revokes the session', async () => {
      const { c } = await login('admin@test.local'); assert.equal((await c('POST', '/api/auth/logout')).status, 200);
      assert.equal((await c('GET', '/api/auth/me')).status, 401);
    });
  });
});
