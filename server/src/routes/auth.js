import { Router } from 'express';
import bcrypt from 'bcryptjs'; import jwt from 'jsonwebtoken'; import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { z } from 'zod';
import { User, PasswordResetToken } from '../models/index.js';
import { authenticate, csrf } from '../middleware/auth.js';
import { HttpError, ah, ok } from '../utils/http.js';
import { login, passwordChange } from '../validators/schemas.js';
import { audit } from '../utils/log.js';
import { sendMail } from '../utils/mailer.js';
const r = Router();
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false, message: { success: false, message: 'Too many attempts, try later' } });
// Login counts only FAILED attempts, so a team sharing one office IP is not locked out by normal successful sign-ins.
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, skipSuccessfulRequests: true, standardHeaders: true, legacyHeaders: false, message: { success: false, message: 'Too many attempts, try later' } });
const pub = (u) => ({ id: u._id, name: u.name, email: u.email, role: u.role, phone: u.phone, theme: u.theme });
const cookieOpts = {
  httpOnly: true,
  secure: true,
  sameSite: 'none',
  maxAge: 8 * 60 * 60 * 1000,
  path: '/'
};
function issue(res, user) {
  const csrfToken = crypto.randomBytes(24).toString('hex');
  res.cookie(env.cookie, jwt.sign({ sub: user._id, tv: user.tokenVersion }, env.secret, { expiresIn: '8h' }), cookieOpts);
  res.cookie('csrf_token', csrfToken, cookieOpts);
  return csrfToken;
}
const DUMMY = bcrypt.hashSync('dummy-password-for-timing', 12);
r.post('/login', loginLimiter, ah(async (req, res) => {
  const { email, password } = login.parse(req.body);
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  const valid = await bcrypt.compare(password, user?.passwordHash || DUMMY);
  if (!user || !valid || !user.isActive) throw new HttpError(401, 'Invalid email or password');
  ok(res, { user: pub(user), csrfToken: issue(res, user) });
}));
r.get('/me', authenticate, (req, res) => ok(res, { user: pub(req.user), csrfToken: req.cookies.csrf_token }));
r.post('/logout', authenticate, csrf, ah(async (req, res) => {
  await User.updateOne({ _id: req.user._id }, { $inc: { tokenVersion: 1 } }); // revokes all issued tokens
  res.clearCookie(env.cookie, cookieOpts).clearCookie('csrf_token', cookieOpts); ok(res, { loggedOut: true });
}));
r.post('/change-password', authenticate, csrf, limiter, ah(async (req, res) => {
  const { currentPassword, newPassword } = passwordChange.parse(req.body);
  const u = await User.findById(req.user._id).select('+passwordHash');
  if (!(await bcrypt.compare(currentPassword, u.passwordHash))) throw new HttpError(400, 'Current password is incorrect');
  u.passwordHash = await bcrypt.hash(newPassword, 12); u.tokenVersion += 1; await u.save();
  audit(u._id, 'auth.password_changed', String(u._id));
  ok(res, { user: pub(u), csrfToken: issue(res, u) });
}));
r.patch('/profile', authenticate, csrf, ah(async (req, res) => {
  const d = z.object({ name: z.string().trim().min(1).max(100).optional(), phone: z.string().trim().max(30).optional(),
    theme: z.enum(['light', 'dark']).optional(), email: z.string().trim().toLowerCase().email().optional() }).strict().parse(req.body);
  if (d.email && d.email !== req.user.email && await User.exists({ email: d.email })) throw new HttpError(409, 'Email already in use');
  Object.assign(req.user, d); await req.user.save(); ok(res, { user: pub(req.user) });
}));
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
// Email delivery is not implemented: in development the reset link is printed to the server console.
r.post('/forgot-password', limiter, ah(async (req, res) => {
  const { email } = z.object({ email: z.string().email() }).strict().parse(req.body);
  const u = await User.findOne({ email: email.toLowerCase(), isActive: true });
  if (u) {
    const raw = crypto.randomBytes(32).toString('hex');
    await PasswordResetToken.deleteMany({ user: u._id });
    await PasswordResetToken.create({ user: u._id, tokenHash: sha(raw), expiresAt: new Date(Date.now() + 3600e3) });
    const link = `${env.clientUrls[0]}/reset-password?token=${raw}`;
    const sent = await sendMail({ to: u.email, subject: 'Reset your ClientFlow password', text: `Use this link within 1 hour to reset your password:\n${link}\n\nIf you did not request this, ignore this email.` });
    if (!sent) { if (!env.prod) console.log(`[DEV] email not configured; reset link: ${link}`); else console.warn('Password reset requested but SMTP is not configured'); }
  }
  ok(res, { message: 'If that account exists, a reset link has been issued.' }); // same response either way
}));
r.post('/reset-password', limiter, ah(async (req, res) => {
  const { token, newPassword } = z.object({ token: z.string().min(32).max(200), newPassword: z.string().min(12).max(200) }).strict().parse(req.body);
  const t = await PasswordResetToken.findOne({ tokenHash: sha(token), expiresAt: { $gt: new Date() } });
  if (!t) throw new HttpError(400, 'Invalid or expired token');
  const u = await User.findById(t.user).select('+passwordHash'); if (!u || !u.isActive) throw new HttpError(400, 'Invalid or expired token');
  u.passwordHash = await bcrypt.hash(newPassword, 12); u.tokenVersion += 1; await u.save(); await PasswordResetToken.deleteMany({ user: u._id });
  audit(u._id, 'auth.password_reset', String(u._id)); ok(res, { reset: true });
}));
export default r;
