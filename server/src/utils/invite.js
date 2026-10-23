import crypto from 'crypto';
import { env } from '../config/env.js'; import { PasswordResetToken } from '../models/index.js'; import { sendMail } from './mailer.js';
// Creates a 72h single-use set-password token. Returns { sent: true } when emailed, or { sent: false, link } so an admin can share it manually.
export async function sendInvite(user) {
  const raw = crypto.randomBytes(32).toString('hex');
  await PasswordResetToken.deleteMany({ user: user._id });
  await PasswordResetToken.create({ user: user._id, tokenHash: crypto.createHash('sha256').update(raw).digest('hex'), expiresAt: new Date(Date.now() + 72 * 3600e3) });
  const link = `${env.clientUrls[0]}/reset-password?token=${raw}&invite=1`;
  const sent = await sendMail({ to: user.email, subject: 'You have been invited to ClientFlow CRM', text: `Hello ${user.name},\n\nAn account was created for you. Set your password within 72 hours:\n${link}\n` });
  return sent ? { sent: true } : { sent: false, link };
}
