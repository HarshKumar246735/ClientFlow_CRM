import { Router } from 'express';
import { Notification } from '../models/index.js';
import { authenticate, csrf } from '../middleware/auth.js';
import { ah, ok, HttpError } from '../utils/http.js';
const r = Router(); r.use(authenticate, csrf);
r.get('/', ah(async (req, res) => {
  const page = Math.max(1, +req.query.page || 1), limit = Math.min(100, Math.max(1, +req.query.limit || 20));
  const f = { user: req.user._id }; if (req.query.unread === 'true') f.read = false;
  const [items, total, unread] = await Promise.all([Notification.find(f).sort('-createdAt').skip((page - 1) * limit).limit(limit).lean(),
    Notification.countDocuments(f), Notification.countDocuments({ user: req.user._id, read: false })]);
  ok(res, items, 200, { page, limit, total, pages: Math.ceil(total / limit), unread });
}));
r.patch('/read-all', ah(async (req, res) => { const x = await Notification.updateMany({ user: req.user._id, read: false }, { read: true }); ok(res, { modified: x.modifiedCount }); }));
r.patch('/:id/read', ah(async (req, res) => {
  const n = await Notification.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { read: true }, { new: true });
  if (!n) throw new HttpError(404, 'Notification not found'); ok(res, n);
}));
export default r;
