import { Router } from 'express';
import { AuditLog } from '../models/index.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { ah, ok } from '../utils/http.js';
const r = Router(); r.use(authenticate, requireRole('admin'));
r.get('/', ah(async (req, res) => {
  const page = Math.max(1, +req.query.page || 1), limit = Math.min(100, Math.max(1, +req.query.limit || 25));
  const [items, total] = await Promise.all([AuditLog.find().sort('-createdAt').skip((page - 1) * limit).limit(limit).populate('actor', 'name email').lean(), AuditLog.countDocuments()]);
  ok(res, items, 200, { page, limit, total, pages: Math.ceil(total / limit) });
}));
export default r;
