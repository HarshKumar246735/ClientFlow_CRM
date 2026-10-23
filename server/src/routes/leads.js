import mongoose from 'mongoose';
import { Lead, Contact, Company, Deal, Setting } from '../models/index.js';
import { scoreLead, mergeRules } from '../services/leadScore.js';
import { crud, findScopedBy } from '../utils/crud.js';
import { leadCreate, leadUpdate, convertSchema } from '../validators/schemas.js';
import { scopeFilter, assertAssignable } from '../middleware/auth.js';
import { notify } from '../utils/notify.js';
import { z } from 'zod';
import { oid } from '../validators/schemas.js';
import { HttpError, ah, ok } from '../utils/http.js';
import { logActivity } from '../utils/log.js';
const loadRules = async () => mergeRules((await Setting.findOne({ key: 'org' }).select('scoring').lean())?.scoring);
const router = crud({
  Model: Lead, entity: 'Lead', ownerField: 'owner', scopeFields: ['owner'], create: leadCreate, update: leadUpdate,
  filters: ['status', 'source', 'priority', 'owner'], search: ['firstName', 'lastName', 'email', 'company'],
  sorts: ['createdAt', 'updatedAt', 'firstName', 'lastName', 'estimatedValue', 'nextFollowUp', 'priority', 'status'], populate: 'owner',
  transform: async (rows) => { const rules = await loadRules(); return rows.map((r) => { const { score, band } = scoreLead(r, rules); return { ...r, score, scoreBand: band }; }); },
  check: async (req, data) => { // duplicate detection (within the caller's visible records)
    if (req.method === 'POST' && data.email && await Lead.exists({ $and: [{ email: data.email }, scopeFilter(req, ['owner'])] }))
      throw new HttpError(409, 'A lead with this email already exists');
  },
});

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Uses a transaction when MongoDB supports it (replica set / Atlas); otherwise falls back to sequential writes.
async function runTx(fn) {
  const session = await mongoose.startSession();
  try { let out; await session.withTransaction(async () => { out = await fn(session); }); return out; }
  catch (e) { if (/replica set|Transaction numbers|IllegalOperation/i.test(`${e.message} ${e.codeName}`)) return fn(null); throw e; }
  finally { session.endSession(); }
}
// Transparent rule-based score (NOT machine learning): every contributing factor is returned so the score can be explained.
router.get('/:id/score', ah(async (req, res) => {
  const l = await findScopedBy(req, Lead, req.params.id, ['owner']);
  if (!l) throw new HttpError(404, 'Lead not found');
  ok(res, scoreLead(l.toObject(), await loadRules()));
}));
router.patch('/bulk/update', ah(async (req, res) => {
  const { ids, changes } = z.object({ ids: z.array(oid).min(1).max(200), changes: z.object({ status: z.enum(['New', 'Contacted', 'Qualified', 'Unqualified']).optional(),
    priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).optional(), source: z.enum(['Website', 'Referral', 'Social media', 'Email campaign', 'Advertisement', 'Phone call', 'Event', 'Other']).optional() })
    .strict().refine((c) => Object.keys(c).length > 0, 'No changes provided') }).strict().parse(req.body);
  const r = await Lead.updateMany({ $and: [{ _id: { $in: ids } }, { status: { $ne: 'Converted' } }, scopeFilter(req, ['owner'])] }, changes);
  logActivity({ type: 'lead.bulk_updated', description: `${r.modifiedCount} leads updated`, actor: req.user._id, entity: 'Lead', meta: { changes } });
  ok(res, { matched: r.matchedCount, modified: r.modifiedCount });
}));
router.patch('/bulk/assign', ah(async (req, res) => {
  const { ids, owner } = z.object({ ids: z.array(oid).min(1).max(200), owner: oid }).strict().parse(req.body);
  await assertAssignable(req, owner);
  const r = await Lead.updateMany({ $and: [{ _id: { $in: ids } }, scopeFilter(req, ['owner'])] }, { owner });
  if (r.modifiedCount && String(owner) !== String(req.user._id)) notify(owner, { type: 'lead_assigned', message: `${r.modifiedCount} lead(s) were assigned to you`, link: '/leads' });
  logActivity({ type: 'lead.bulk_assigned', description: `${r.modifiedCount} leads reassigned`, actor: req.user._id, entity: 'Lead', meta: { owner } });
  ok(res, { matched: r.matchedCount, modified: r.modifiedCount });
}));
router.post('/:id/convert', ah(async (req, res) => {
  const b = convertSchema.parse(req.body || {});
  const lead = await findScopedBy(req, Lead, req.params.id, ['owner']);
  if (!lead) throw new HttpError(404, 'Lead not found');
  if (lead.status === 'Converted') throw new HttpError(409, 'Lead already converted');
  if (lead.status !== 'Qualified') throw new HttpError(400, 'Only Qualified leads can be converted');
  const scope = scopeFilter(req, ['owner']);
  const r = await runTx(async (session) => {
    const o = { session: session || undefined }, owner = lead.owner, by = req.user._id;
    let company = lead.company ? await Company.findOne({ $and: [{ name: new RegExp(`^${esc(lead.company)}$`, 'i') }, scope] }).session(session || null) : null;
    if (lead.company && !company) [company] = await Company.create([{ name: lead.company, owner, createdBy: by }], o);
    let contact = lead.email ? await Contact.findOne({ $and: [{ email: lead.email }, scope] }).session(session || null) : null;
    if (!contact) [contact] = await Contact.create([{ firstName: lead.firstName, lastName: lead.lastName, email: lead.email, phone: lead.phone,
      jobTitle: lead.jobTitle, company: company?._id, owner, createdBy: by, sourceLead: lead._id }], o);
    let deal = null;
    if (b.createDeal) [deal] = await Deal.create([{ title: b.dealTitle || `${lead.firstName} ${lead.lastName} - ${lead.company || 'Deal'}`, owner, createdBy: by,
      lead: lead._id, contact: contact._id, company: company?._id, value: b.dealValue ?? lead.estimatedValue ?? 0 }], o);
    Object.assign(lead, { status: 'Converted', convertedAt: new Date(), convertedContact: contact._id, convertedCompany: company?._id, convertedDeal: deal?._id });
    await lead.save(o);
    return { contact, company, deal };
  });
  logActivity({ type: 'lead.converted', description: `Lead ${lead.firstName} ${lead.lastName} converted`, actor: req.user._id, entity: 'Lead', entityId: lead._id,
    meta: { contact: r.contact._id, company: r.company?._id, deal: r.deal?._id } });
  ok(res, { lead, ...r });
}));
export default router;
