import { Router } from 'express';
import { Activity, Lead, Contact, Company, Deal, Task } from '../models/index.js';
import { authenticate, csrf, scopeFilter } from '../middleware/auth.js';
import { z } from 'zod';
import { oid } from '../validators/schemas.js';
import { ah, ok, HttpError } from '../utils/http.js';
import { findScopedBy } from '../utils/crud.js';
const MAP = { Lead: [Lead, ['owner']], Contact: [Contact, ['owner']], Company: [Company, ['owner']], Deal: [Deal, ['owner']], Task: [Task, ['assignedTo', 'createdBy']] };
const r = Router(); r.use(authenticate);
// GET /api/activities?entity=Lead&entityId=...  (timeline of one visible record) or no params (activity by users in your scope)
r.get('/', ah(async (req, res) => {
  const { entity, entityId } = req.query, f = {};
  const page = Math.max(1, +req.query.page || 1), limit = Math.min(100, Math.max(1, +req.query.limit || 20));
  if (entity || entityId) {
    if (typeof entity !== 'string' || typeof entityId !== 'string' || !MAP[entity]) throw new HttpError(400, 'Invalid entity');
    const [M, fields] = MAP[entity];
    if (!(await findScopedBy(req, M, entityId, fields))) throw new HttpError(404, 'Record not found');
    Object.assign(f, { entity, entityId });
  } else Object.assign(f, scopeFilter(req, ['actor']));
  const [items, total] = await Promise.all([Activity.find(f).sort('-createdAt').skip((page - 1) * limit).limit(limit).populate('actor', 'name').lean(), Activity.countDocuments(f)]);
  ok(res, items, 200, { page, limit, total, pages: Math.ceil(total / limit) });
}));
// Manually log a note/call/email/meeting against a record the caller can see.
r.post('/', csrf, ah(async (req, res) => {
  const d = z.object({ entity: z.enum(Object.keys(MAP)), entityId: oid, type: z.enum(['note', 'call', 'email', 'meeting']), description: z.string().trim().min(1).max(2000) }).strict().parse(req.body);
  const [M, fields] = MAP[d.entity];
  if (!(await findScopedBy(req, M, d.entityId, fields))) throw new HttpError(404, 'Record not found');
  ok(res, await Activity.create({ ...d, actor: req.user._id }), 201);
}));
export default r;
