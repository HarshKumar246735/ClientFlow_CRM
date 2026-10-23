import { Router } from 'express';
import { Lead, Contact, Company, Deal } from '../models/index.js';
import { authenticate, scopeFilter } from '../middleware/auth.js';
import { ah, ok } from '../utils/http.js';
const r = Router(); r.use(authenticate);
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Only non-sensitive identifying fields are returned.
r.get('/', ah(async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';
  if (q.length < 2) return ok(res, { leads: [], contacts: [], companies: [], deals: [] });
  const rx = new RegExp(esc(q), 'i'), sc = scopeFilter(req, ['owner']);
  const go = (M, fields, sel) => M.find({ $and: [{ $or: fields.map((f) => ({ [f]: rx })) }, sc] }).limit(5).select(sel).lean();
  const [leads, contacts, companies, deals] = await Promise.all([
    go(Lead, ['firstName', 'lastName', 'email', 'company'], 'firstName lastName company status'),
    go(Contact, ['firstName', 'lastName', 'email', 'jobTitle'], 'firstName lastName jobTitle'),
    go(Company, ['name', 'industry'], 'name industry'),
    go(Deal, ['title'], 'title stage value currency')]);
  ok(res, { leads, contacts, companies, deals });
}));
export default r;
