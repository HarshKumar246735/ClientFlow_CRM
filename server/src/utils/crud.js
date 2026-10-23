import { Router } from 'express';
import { authenticate, csrf, requireRole, scopeFilter, assertAssignable } from '../middleware/auth.js';
import { HttpError, ah, ok } from './http.js';
import { logActivity } from './log.js';
import { notify } from './notify.js';
const NOTIFIED = { Lead: 'leads', Task: 'tasks' };
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export async function findScopedBy(req, Model, id, fields) {
  return Model.findOne({ $and: [{ _id: id }, scopeFilter(req, fields)] });
}

// Generic, permission-scoped CRUD router. Filters/sorts come from allowlists; ids are scoped to the user's visibility.
export function crud({ Model, entity, ownerField, scopeFields, create, update, filters, search, sorts, populate, check, deleteRoles = ['admin', 'manager'], beforeDelete, transform }) {
  const r = Router(); r.use(authenticate, csrf);
  const findScoped = async (req) => {
    const d = await findScopedBy(req, Model, req.params.id, scopeFields);
    if (!d) throw new HttpError(404, `${entity} not found`);
    return d;
  };
  r.get('/', ah(async (req, res) => {
    const q = req.query, page = Math.max(1, +q.page || 1), limit = Math.min(100, Math.max(1, +q.limit || 20));
    const f = {};
    for (const k of filters) if (typeof q[k] === 'string' && q[k]) f[k] = q[k];
    if (q.createdFrom || q.createdTo) {
      f.createdAt = {};
      if (typeof q.createdFrom === 'string') f.createdAt.$gte = new Date(q.createdFrom);
      if (typeof q.createdTo === 'string') f.createdAt.$lte = new Date(q.createdTo);
    }
    if (typeof q.q === 'string' && q.q) f.$or = search.map((s) => ({ [s]: new RegExp(esc(q.q.slice(0, 100)), 'i') }));
    const s = typeof q.sort === 'string' ? q.sort : '-createdAt';
    const sort = sorts.includes(s.replace(/^-/, '')) ? s : '-createdAt';
    const query = { $and: [f, scopeFilter(req, scopeFields)] };
    const [items, total] = await Promise.all([
      Model.find(query).sort(sort).skip((page - 1) * limit).limit(limit).populate(populate).lean(), Model.countDocuments(query)]);
    ok(res, transform ? await transform(items, req) : items, 200, { page, limit, total, pages: Math.ceil(total / limit) });
  }));
  r.post('/', ah(async (req, res) => {
    const data = create.parse(req.body);
    await assertAssignable(req, data[ownerField]); if (check) await check(req, data);
    const doc = await Model.create({ ...data, [ownerField]: data[ownerField] || req.user._id, createdBy: req.user._id });
    logActivity({ type: `${entity}.created`, description: `${entity} created`, actor: req.user._id, entity, entityId: doc._id });
    if (NOTIFIED[entity] && String(doc[ownerField]) !== String(req.user._id))
      notify(doc[ownerField], { type: `${entity.toLowerCase()}_assigned`, message: `A ${entity.toLowerCase()} was assigned to you`, link: `/${NOTIFIED[entity]}` });
    ok(res, doc, 201);
  }));
  r.get('/:id', ah(async (req, res) => {
    const doc = await findScoped(req); await doc.populate(populate);
    ok(res, doc);
  }));
  r.put('/:id', ah(async (req, res) => {
    const doc = await findScoped(req), data = update.parse(req.body);
    if (data[ownerField]) await assertAssignable(req, data[ownerField]);
    if (check) await check(req, data);
    const prev = String(doc[ownerField]); Object.assign(doc, data); await doc.save();
    if (NOTIFIED[entity] && data[ownerField] && String(data[ownerField]) !== prev && String(data[ownerField]) !== String(req.user._id))
      notify(data[ownerField], { type: `${entity.toLowerCase()}_reassigned`, message: `A ${entity.toLowerCase()} was reassigned to you`, link: `/${NOTIFIED[entity]}/${doc._id}` });
    logActivity({ type: `${entity}.updated`, description: `${entity} updated`, actor: req.user._id, entity, entityId: doc._id, meta: { fields: Object.keys(data) } });
    ok(res, doc);
  }));
  r.delete('/:id', requireRole(...deleteRoles), ah(async (req, res) => {
    const doc = await findScoped(req); if (beforeDelete) await beforeDelete(req, doc); await doc.deleteOne();
    logActivity({ type: `${entity}.deleted`, description: `${entity} deleted`, actor: req.user._id, entity, entityId: doc._id });
    ok(res, { deleted: true });
  }));
  return r;
}
