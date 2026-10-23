import { Router } from 'express'; import { z } from 'zod';
import { Setting } from '../models/index.js';
import { authenticate, csrf, requireRole } from '../middleware/auth.js';
import { mergeRules } from '../services/leadScore.js';
import { ah, ok } from '../utils/http.js'; import { audit } from '../utils/log.js';
const DEFAULTS = { orgName: 'My Company', currency: 'USD', timezone: 'UTC', dateFormat: 'medium', pageSize: 10 };
const pickBase = (s) => ({ ...DEFAULTS, ...Object.fromEntries(Object.keys(DEFAULTS).filter((k) => s?.[k] != null).map((k) => [k, s[k]])) });
const pick = (s) => ({ ...pickBase(s), scoring: mergeRules(s?.scoring) });
const rec = z.record(z.string(), z.number().min(-100).max(100));
const scoringSchema = z.object({ priority: rec, status: rec, source: rec, flags: rec,
  valueTiers: z.array(z.object({ min: z.number().min(0), points: z.number().min(-100).max(100) }).strict()).max(8) }).partial().strict();
const validTz = (t) => { try { new Intl.DateTimeFormat(undefined, { timeZone: t }); return true; } catch { return false; } };
const schema = z.object({ orgName: z.string().trim().min(1).max(100), currency: z.string().length(3).toUpperCase(), timezone: z.string().refine(validTz, 'Invalid time zone'),
  dateFormat: z.enum(['short', 'medium', 'long']), pageSize: z.number().int().min(5).max(100), scoring: scoringSchema }).partial().strict();
const r = Router(); r.use(authenticate);
r.get('/', ah(async (_q, res) => ok(res, pick(await Setting.findOne({ key: 'org' }).lean()))));
r.put('/', csrf, requireRole('admin'), ah(async (req, res) => {
  const d = schema.parse(req.body);
  const s = await Setting.findOneAndUpdate({ key: 'org' }, { $set: d }, { upsert: true, new: true, setDefaultsOnInsert: true }).lean();
  audit(req.user._id, 'settings.updated', 'org', { fields: Object.keys(d) }); ok(res, pick(s));
}));
export default r;
