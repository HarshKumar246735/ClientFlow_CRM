import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/index.js';
import { HttpError, ah } from '../utils/http.js';

export const authenticate = ah(async (req, _res, next) => {
  const t = req.cookies?.[env.cookie];
  if (!t) throw new HttpError(401, 'Authentication required');
  let p; try { p = jwt.verify(t, env.secret); } catch { throw new HttpError(401, 'Session expired'); }
  const user = await User.findById(p.sub);
  if (!user || !user.isActive || user.tokenVersion !== p.tv) throw new HttpError(401, 'Session invalid');
  req.user = user;
  req.teamIds = user.role === 'manager' ? await User.find({ manager: user._id, isActive: true }).distinct('_id') : [];
  next();
});
// Double-submit CSRF: cookie value must equal X-CSRF-Token header on state-changing requests.
export const csrf = (req, _res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const c = req.cookies?.csrf_token, h = req.get('x-csrf-token');
  if (!c || c !== h) return next(new HttpError(403, 'Invalid CSRF token'));
  next();
};
export const requireRole = (...roles) => (req, _res, next) =>
  roles.includes(req.user.role) ? next() : next(new HttpError(403, 'Insufficient permissions'));

export function scopeFilter(req, fields) {
  if (req.user.role === 'admin') return {};
  const ids = req.user.role === 'manager' ? [req.user._id, ...req.teamIds] : [req.user._id];
  return fields.length === 1 ? { [fields[0]]: { $in: ids } } : { $or: fields.map((f) => ({ [f]: { $in: ids } })) };
}
export async function assertAssignable(req, id) {
  if (!id || String(id) === String(req.user._id)) return;
  if (req.user.role === 'rep') throw new HttpError(403, 'You cannot assign records to other users');
  if (req.user.role === 'manager' && !req.teamIds.some((t) => String(t) === String(id))) throw new HttpError(403, 'User is not on your team');
  if (!(await User.exists({ _id: id, isActive: true }))) throw new HttpError(400, 'Assignee not found or inactive');
}
