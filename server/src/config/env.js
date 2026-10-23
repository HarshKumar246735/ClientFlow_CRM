import 'dotenv/config';
const e = process.env;
const missing = ['MONGODB_URI', 'JWT_SECRET', 'CLIENT_URL'].filter((k) => !e[k]);
if (missing.length) { console.error(`Missing env vars: ${missing.join(', ')}`); process.exit(1); }
const prod = e.NODE_ENV === 'production';
if (prod && e.JWT_SECRET.length < 32) { console.error('JWT_SECRET must be 32+ chars in production'); process.exit(1); }
export const env = { prod, port: +e.PORT || 5000, mongo: e.MONGODB_URI, secret: e.JWT_SECRET,
  clientUrls: e.CLIENT_URL.split(',').map((s) => s.trim()), cookie: e.COOKIE_NAME || 'clientflow_token',
  smtp: { host: e.SMTP_HOST, port: +e.SMTP_PORT || 587, user: e.SMTP_USER, pass: e.SMTP_PASS, from: e.EMAIL_FROM } };
