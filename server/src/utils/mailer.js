import { env } from '../config/env.js';
let transport;
// Returns true if sent, false if SMTP is not configured or sending failed (callers must not reveal this to end users).
export async function sendMail({ to, subject, text }) {
  if (!env.smtp.host) return false;
  try {
    if (!transport) { const nm = await import('nodemailer'); transport = nm.default.createTransport({ host: env.smtp.host, port: env.smtp.port, secure: env.smtp.port === 465, auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined }); }
    await transport.sendMail({ from: env.smtp.from || env.smtp.user, to, subject, text }); return true;
  } catch (e) { console.error('mail failed:', e.message); return false; }
}
