import { Router } from 'express';
import { Lead, Deal, Task, Contact, Activity } from '../models/index.js';
import { authenticate, scopeFilter } from '../middleware/auth.js';
import { ah, ok, HttpError } from '../utils/http.js';
const r = Router(); r.use(authenticate);
const DAY = 86400000;
function getRange(q) {
  const now = new Date(), sod = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (q.range || '30d') {
    case 'today': return [sod, now];
    case '7d': return [new Date(sod.getTime() - 6 * DAY), now];
    case '30d': return [new Date(sod.getTime() - 29 * DAY), now];
    case 'this_month': return [new Date(now.getFullYear(), now.getMonth(), 1), now];
    case 'last_month': return [new Date(now.getFullYear(), now.getMonth() - 1, 1), new Date(now.getFullYear(), now.getMonth(), 1)];
    case 'custom': { const f = new Date(q.from), t = new Date(q.to); if (isNaN(f) || isNaN(t) || f > t) throw new HttpError(400, 'Invalid custom range'); return [f, t]; }
    default: throw new HttpError(400, 'Invalid range');
  }
}
/* Definitions (all scoped to the caller's visible records):
 - totalLeads / sources: leads CREATED in range.  conversionRate = converted leads / leads created in range (same cohort) * 100.
 - customers: all contacts visible (snapshot).  activeDeals: deals not Won/Lost (snapshot).
 - wonDeals / lostDeals / wonRevenue: deals whose actualCloseDate is in range.
 - pipelineValue: sum(value) of open deals; expectedValue: sum(value * probability/100) of open deals.
 - overdueTasks: Pending/In Progress with dueDate < now.  upcomingFollowUps: open tasks due in the next 7 days. */
r.get('/stats', ah(async (req, res) => {
  const [from, to] = getRange(req.query), inR = { $gte: from, $lte: to };
  const ls = scopeFilter(req, ['owner']), ts = scopeFilter(req, ['assignedTo']), as = scopeFilter(req, ['actor']);
  const open = { stage: { $nin: ['Won', 'Lost'] } }, openTask = { status: { $in: ['Pending', 'In Progress'] } };
  const now = new Date(), wk = new Date(now.getTime() + 7 * DAY), yearAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const [totalLeads, convertedLeads, customers, activeDeals, won, lostDeals, pipe, overdue, upcoming, monthly, sources, stages, recentLeads, upTasks, reps, activities] = await Promise.all([
    Lead.countDocuments({ ...ls, createdAt: inR }),
    Lead.countDocuments({ ...ls, createdAt: inR, status: 'Converted' }),
    Contact.countDocuments(ls),
    Deal.countDocuments({ ...ls, ...open }),
    Deal.aggregate([{ $match: { ...ls, stage: 'Won', actualCloseDate: inR } }, { $group: { _id: null, count: { $sum: 1 }, revenue: { $sum: '$value' } } }]),
    Deal.countDocuments({ ...ls, stage: 'Lost', actualCloseDate: inR }),
    Deal.aggregate([{ $match: { ...ls, ...open } }, { $group: { _id: null, total: { $sum: '$value' }, expected: { $sum: { $multiply: ['$value', { $divide: ['$probability', 100] }] } } } }]),
    Task.countDocuments({ ...ts, ...openTask, dueDate: { $lt: now } }),
    Task.countDocuments({ ...ts, ...openTask, dueDate: { $gte: now, $lte: wk } }),
    Deal.aggregate([{ $match: { ...ls, stage: 'Won', actualCloseDate: { $gte: yearAgo } } },
      { $group: { _id: { y: { $year: '$actualCloseDate' }, m: { $month: '$actualCloseDate' } }, revenue: { $sum: '$value' }, deals: { $sum: 1 } } }, { $sort: { '_id.y': 1, '_id.m': 1 } }]),
    Lead.aggregate([{ $match: { ...ls, createdAt: inR } }, { $group: { _id: '$source', count: { $sum: 1 } } }]),
    Deal.aggregate([{ $match: { ...ls, ...open } }, { $group: { _id: '$stage', count: { $sum: 1 }, value: { $sum: '$value' } } }]),
    Lead.find(ls).sort('-createdAt').limit(5).select('firstName lastName company status createdAt').lean(),
    Task.find({ ...ts, ...openTask, dueDate: { $gte: now } }).sort('dueDate').limit(5).select('title type dueDate priority').lean(),
    req.user.role === 'rep' ? [] : Deal.aggregate([{ $match: { ...ls, stage: 'Won', actualCloseDate: inR } }, { $group: { _id: '$owner', revenue: { $sum: '$value' }, deals: { $sum: 1 } } },
      { $sort: { revenue: -1 } }, { $limit: 5 }, { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'u' } }, { $project: { revenue: 1, deals: 1, name: { $arrayElemAt: ['$u.name', 0] } } }]),
    Activity.find(as).sort('-createdAt').limit(10).populate('actor', 'name').lean(),
  ]);
  ok(res, {
    range: { from, to },
    cards: { totalLeads, customers, activeDeals, wonDeals: won[0]?.count || 0, lostDeals, wonRevenue: won[0]?.revenue || 0,
      pipelineValue: pipe[0]?.total || 0, expectedValue: Math.round(pipe[0]?.expected || 0),
      conversionRate: totalLeads ? Math.round((convertedLeads / totalLeads) * 1000) / 10 : 0, overdueTasks: overdue, upcomingFollowUps: upcoming },
    charts: { monthlyRevenue: monthly.map((m) => ({ month: `${m._id.y}-${String(m._id.m).padStart(2, '0')}`, revenue: m.revenue, deals: m.deals })),
      leadSources: sources.map((s) => ({ source: s._id, count: s.count })), pipelineByStage: stages.map((s) => ({ stage: s._id, count: s.count, value: s.value })),
      leadConversion: { created: totalLeads, converted: convertedLeads } },
    recentLeads, upcomingTasks: upTasks, topReps: reps, recentActivity: activities,
  });
}));
export default r;
