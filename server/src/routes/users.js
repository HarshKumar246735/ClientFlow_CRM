import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User, Lead, Deal, Contact, Company, Task, Notification, PasswordResetToken, ROLES } from '../models/index.js';
import { authenticate, csrf, requireRole } from '../middleware/auth.js';
import { HttpError, ah, ok } from '../utils/http.js';
import { userCreate, userUpdate, oid } from '../validators/schemas.js';
import { audit } from '../utils/log.js';
import crypto from 'crypto';
import { sendInvite } from '../utils/invite.js';
const r = Router(); r.use(authenticate, csrf);
const lastAdmin = async (id) => (await User.countDocuments({ role: 'admin', isActive: true, _id: { $ne: id } })) === 0;
// A reporting line must point at another active manager/administrator (never the user themselves).
const checkManager = async (managerId, selfId) => {
  if (!managerId) return;
  if (selfId && String(managerId) === String(selfId)) throw new HttpError(400, 'A user cannot report to themselves');
  if (!(await User.exists({ _id: managerId, isActive: true, role: { $in: ['manager', 'admin'] } }))) throw new HttpError(400, 'Manager must be an active manager or administrator');
};
r.get('/', requireRole('admin', 'manager'), ah(async (req, res) => {
  const f = req.user.role === 'admin' ? {} : { $or: [{ _id: req.user._id }, { _id: { $in: req.teamIds } }] };
  ok(res, await User.find(f).sort('name').select('-tokenVersion').lean()); // password hash is select:false; the token version is internal
}));
r.post('/', requireRole('admin'), ah(async (req, res) => {
  const d = userCreate.parse(req.body);
  const { password, ...rest } = d;
  if (await User.exists({ email: rest.email })) throw new HttpError(409, 'A user with this email already exists');
  await checkManager(rest.manager);
  // No password => invitation flow: random unusable password + 72h set-password link (emailed if SMTP is configured, otherwise returned to the admin to share).
  const u = await User.create({ ...rest, passwordHash: await bcrypt.hash(password || crypto.randomBytes(32).toString('hex'), 12) });
  const invite = password ? null : await sendInvite(u);
  audit(req.user._id, password ? 'user.created' : 'user.invited', String(u._id), { role: u.role });
  ok(res, { id: u._id, name: u.name, email: u.email, role: u.role, invite }, 201);
}));
r.post('/:id/invite', requireRole('admin'), ah(async (req, res) => {
  const u = await User.findOne({ _id: req.params.id, isActive: true }); if (!u) throw new HttpError(404, 'Active user not found');
  const invite = await sendInvite(u); audit(req.user._id, 'user.invite_resent', String(u._id)); ok(res, { invite });
}));
r.patch('/:id/role', requireRole('admin'), ah(async (req, res) => {
  const { role, manager } = z.object({ role: z.enum(ROLES), manager: oid.optional() }).strict().parse(req.body);
  const u = await User.findById(req.params.id); if (!u) throw new HttpError(404, 'User not found');
  if (u.role === 'admin' && role !== 'admin' && await lastAdmin(u._id)) throw new HttpError(400, 'Cannot demote the last active administrator');
  await checkManager(manager, u._id);
  const before = u.role; u.role = role; if (manager) u.manager = manager; u.tokenVersion += 1; await u.save();
  audit(req.user._id, 'user.role_changed', String(u._id), { from: before, to: role }); ok(res, { id: u._id, role });
}));
r.patch('/:id/status', requireRole('admin'), ah(async (req, res) => {
  const { isActive } = z.object({ isActive: z.boolean() }).strict().parse(req.body);
  const u = await User.findById(req.params.id); if (!u) throw new HttpError(404, 'User not found');
  if (!isActive && u.role === 'admin' && await lastAdmin(u._id)) throw new HttpError(400, 'Cannot deactivate the last active administrator');
  u.isActive = isActive; u.tokenVersion += 1; await u.save();
  audit(req.user._id, 'user.status_changed', String(u._id), { isActive }); ok(res, { id: u._id, isActive });
}));
// Edit profile details and reporting line (role and active status have their own endpoints above).
r.patch('/:id', requireRole('admin'), ah(async (req, res) => {
  const d = userUpdate.parse(req.body);
  const u = await User.findById(req.params.id); if (!u) throw new HttpError(404, 'User not found');
  if (d.email && d.email !== u.email && await User.exists({ email: d.email, _id: { $ne: u._id } })) throw new HttpError(409, 'Email already in use');
  if (d.manager) await checkManager(d.manager, u._id);
  const { manager, ...rest } = d; Object.assign(u, rest);
  if (manager === null) u.manager = undefined; else if (manager) u.manager = manager;
  await u.save();
  audit(req.user._id, 'user.updated', String(u._id), { fields: Object.keys(d) });
  ok(res, { id: u._id, name: u.name, email: u.email, phone: u.phone, manager: u.manager });
}));
// Safe removal: not yourself, not the last administrator, and never a user who still owns records (deactivate instead or reassign first).
r.delete('/:id', requireRole('admin'), ah(async (req, res) => {
  const u = await User.findById(req.params.id); if (!u) throw new HttpError(404, 'User not found');
  if (String(u._id) === String(req.user._id)) throw new HttpError(400, 'You cannot delete your own account');
  if (u.role === 'admin' && u.isActive && await lastAdmin(u._id)) throw new HttpError(400, 'Cannot delete the last active administrator');
  const owns = await Promise.all([Lead.exists({ owner: u._id }), Deal.exists({ owner: u._id }), Contact.exists({ owner: u._id }), Company.exists({ owner: u._id }), Task.exists({ assignedTo: u._id })]);
  if (owns.some(Boolean)) throw new HttpError(409, 'This user still owns leads, deals, contacts, companies or tasks. Reassign them first, or deactivate the account instead.');
  await Promise.all([Notification.deleteMany({ user: u._id }), PasswordResetToken.deleteMany({ user: u._id }), User.updateMany({ manager: u._id }, { $unset: { manager: 1 } })]);
  await u.deleteOne();
  audit(req.user._id, 'user.deleted', String(u._id), { email: u.email, role: u.role });
  ok(res, { deleted: true });
}));
export default r;
