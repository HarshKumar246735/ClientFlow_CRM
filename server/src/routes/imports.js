import { Router } from 'express'; import { z } from 'zod';
import { Lead, Contact, Company } from '../models/index.js';
import { authenticate, csrf, scopeFilter } from '../middleware/auth.js';
import { ah, ok, HttpError } from '../utils/http.js';
import { leadCreate, contactCreate, companyCreate } from '../validators/schemas.js';
import { parseCsv } from '../utils/csvParse.js'; import { logActivity } from '../utils/log.js';
const CFG = { leads: { Model: Lead, schema: leadCreate, req: ['firstName', 'lastName'], dupe: 'email', entity: 'Lead' },
  contacts: { Model: Contact, schema: contactCreate, req: ['firstName', 'lastName'], dupe: 'email', entity: 'Contact' },
  companies: { Model: Company, schema: companyCreate, req: ['name'], dupe: 'name', entity: 'Company' } };
const NUM = ['estimatedValue', 'annualRevenue'], MAX = 1000;
const r = Router();
// POST /api/{leads|contacts|companies}/import  body: { csv: "<file text>" }  -> validates headers + every row; reports invalid rows and skipped duplicates.
for (const [name, cfg] of Object.entries(CFG)) {
  r.post(`/${name}/import`, authenticate, csrf, ah(async (req, res) => {
    const { csv } = z.object({ csv: z.string().min(1).max(2_000_000) }).strict().parse(req.body);
    const rows = parseCsv(csv);
    if (rows.length < 2) throw new HttpError(400, 'CSV needs a header row and at least one data row');
    if (rows.length - 1 > MAX) throw new HttpError(400, `Maximum ${MAX} rows per import`);
    const header = rows[0].map((h) => h.trim()), allowed = Object.keys(cfg.schema.shape).filter((k) => k !== 'owner');
    const unknown = header.filter((h) => !allowed.includes(h));
    if (unknown.length) throw new HttpError(400, `Unknown column(s): ${unknown.join(', ')}. Allowed: ${allowed.join(', ')}`);
    const missing = cfg.req.filter((h) => !header.includes(h));
    if (missing.length) throw new HttpError(400, `Missing required column(s): ${missing.join(', ')}`);
    const valid = [], invalid = [];
    rows.slice(1).forEach((cells, i) => {
      const o = {};
      header.forEach((h, j) => { const v = (cells[j] ?? '').trim(); if (v === '') return; o[h] = NUM.includes(h) ? Number(v) : h === 'tags' ? v.split(';').map((t) => t.trim()).filter(Boolean) : v; });
      const p = cfg.schema.safeParse(o);
      if (!p.success) invalid.push({ row: i + 2, errors: p.error.issues.map((x) => `${x.path.join('.')}: ${x.message}`) }); else valid.push({ row: i + 2, data: p.data });
    });
    const keyOf = (d) => String(d[cfg.dupe] ?? '').toLowerCase();
    const found = await cfg.Model.find({ $and: [{ [cfg.dupe]: { $in: valid.map((v) => v.data[cfg.dupe]).filter(Boolean) } }, scopeFilter(req, ['owner'])] }).select(cfg.dupe).lean();
    const existing = new Set(found.map(keyOf)), seen = new Set(), toInsert = [], dupes = [];
    for (const v of valid) {
      const k = keyOf(v.data);
      if (k && (existing.has(k) || seen.has(k))) { dupes.push(v.row); continue; }
      if (k) seen.add(k);
      toInsert.push({ ...v.data, owner: req.user._id, createdBy: req.user._id });
    }
    if (toInsert.length) await cfg.Model.insertMany(toInsert);
    logActivity({ type: `${cfg.entity.toLowerCase()}.imported`, description: `${toInsert.length} ${name} imported`, actor: req.user._id, entity: cfg.entity });
    ok(res, { imported: toInsert.length, duplicatesSkipped: dupes, invalid: invalid.slice(0, 50), invalidCount: invalid.length }, 201);
  }));
}
export default r;
