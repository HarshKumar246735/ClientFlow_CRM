import { Deal, Lead, Contact, Company, STAGE_PROB } from '../models/index.js';
import { crud, findScopedBy } from '../utils/crud.js';
import { dealCreate, dealUpdate, dealStage } from '../validators/schemas.js';
import { HttpError, ah, ok } from '../utils/http.js';
import { logActivity } from '../utils/log.js';
import { notify } from '../utils/notify.js';
import { User } from '../models/index.js';
const router = crud({
  Model: Deal, entity: 'Deal', ownerField: 'owner', scopeFields: ['owner'], create: dealCreate, update: dealUpdate,
  filters: ['stage', 'owner', 'currency', 'lead', 'company', 'contact'], search: ['title', 'description'],
  sorts: ['createdAt', 'value', 'expectedCloseDate', 'stage', 'title', 'probability'], populate: 'owner lead contact company',
  check: async (req, d) => {
    for (const [k, M] of [['lead', Lead], ['contact', Contact], ['company', Company]])
      if (d[k] && !(await findScopedBy(req, M, d[k], ['owner']))) throw new HttpError(400, `Invalid related ${k}`);
  },
});
// Server-side stage rules: Won/Lost are closed (only admin/manager may reopen); Lost requires a reason.
router.patch('/:id/stage', ah(async (req, res) => {
  const { stage, lossReason } = dealStage.parse(req.body);
  const deal = await findScopedBy(req, Deal, req.params.id, ['owner']);
  if (!deal) throw new HttpError(404, 'Deal not found');
  if (['Won', 'Lost'].includes(deal.stage) && req.user.role === 'rep') throw new HttpError(403, 'Only a manager or admin can reopen a closed deal');
  if (stage === deal.stage) throw new HttpError(400, 'Deal is already in this stage');
  if (stage === 'Lost' && !lossReason?.trim()) throw new HttpError(400, 'A loss reason is required');
  deal.stageHistory.push({ from: deal.stage, to: stage, by: req.user._id });
  deal.stage = stage; deal.probability = STAGE_PROB[stage];
  deal.lossReason = stage === 'Lost' ? lossReason : undefined;
  deal.actualCloseDate = ['Won', 'Lost'].includes(stage) ? new Date() : undefined;
  await deal.save();
  logActivity({ type: stage === 'Won' ? 'deal.won' : stage === 'Lost' ? 'deal.lost' : 'deal.stage_changed',
    description: `Deal "${deal.title}" moved to ${stage}`, actor: req.user._id, entity: 'Deal', entityId: deal._id });
  if (['Won', 'Lost'].includes(stage)) {
    const mgr = (await User.findById(deal.owner).select('manager'))?.manager;
    const targets = new Set([String(deal.owner), mgr && String(mgr)].filter(Boolean)); targets.delete(String(req.user._id));
    targets.forEach((t) => notify(t, { type: `deal_${stage.toLowerCase()}`, message: `A deal was marked ${stage}`, link: `/deals/${deal._id}` }));
  }
  ok(res, deal);
}));
export default router;
