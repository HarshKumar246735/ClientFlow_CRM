import { Router } from 'express';
import mongoose from 'mongoose';
import { Lead, Deal, Task } from '../models/index.js';
import { authenticate, scopeFilter } from '../middleware/auth.js';
import { ah, ok, HttpError } from '../utils/http.js';
import { toCsv } from '../utils/csv.js';
const r = Router(); r.use(authenticate);
const DAY = 86400000;
function ctx(req) {
  const to = req.query.to ? new Date(req.query.to) : new Date(), from = req.query.from ? new Date(req.query.from) : new Date(to.getTime() - 365 * DAY);
  if (isNaN(from) || isNaN(to) || from > to) throw new HttpError(400, 'Invalid date range');
  let own = null; const o = req.query.owner;
  if (typeof o === 'string' && o) {
    if (!/^[a-f\d]{24}$/i.test(o)) throw new HttpError(400, 'Invalid owner');
    if (req.user.role !== 'admin' && ![req.user._id, ...req.teamIds].map(String).includes(o)) throw new HttpError(403, 'Not allowed to view this user');
    own = new mongoose.Types.ObjectId(o);
  }
  const f = (field) => (own ? { [field]: own } : scopeFilter(req, [field]));
  return { inR: { $gte: from, $lte: to }, from, to, deals: f('owner'), leads: f('owner'), tasks: f('assignedTo'), isRep: req.user.role === 'rep' };
}
const repLookup = [{ $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'u' } }];
/* Formulas: revenue = sum(value) of deals Won with actualCloseDate in range. avgDealValue = revenue / won count.
   avgDaysToClose = mean(actualCloseDate - createdAt) of won deals in range. */
r.get('/sales', ah(async (req, res) => {
  const c = ctx(req), won = { ...c.deals, stage: 'Won', actualCloseDate: c.inR };
  const [monthly, outcome, avg, byRep, stages] = await Promise.all([
    Deal.aggregate([{ $match: won }, { $group: { _id: { y: { $year: '$actualCloseDate' }, m: { $month: '$actualCloseDate' } }, revenue: { $sum: '$value' }, deals: { $sum: 1 } } }, { $sort: { '_id.y': 1, '_id.m': 1 } }]),
    Deal.aggregate([{ $match: { ...c.deals, stage: { $in: ['Won', 'Lost'] }, actualCloseDate: c.inR } }, { $group: { _id: '$stage', count: { $sum: 1 }, value: { $sum: '$value' } } }]),
    Deal.aggregate([{ $match: won }, { $group: { _id: null, avgValue: { $avg: '$value' }, avgDays: { $avg: { $divide: [{ $subtract: ['$actualCloseDate', '$createdAt'] }, DAY] } } } }]),
    c.isRep ? [] : Deal.aggregate([{ $match: { ...c.deals, stage: { $in: ['Won', 'Lost'] }, actualCloseDate: c.inR } }, { $group: { _id: '$owner', won: { $sum: { $cond: [{ $eq: ['$stage', 'Won'] }, 1, 0] } }, lost: { $sum: { $cond: [{ $eq: ['$stage', 'Lost'] }, 1, 0] } }, revenue: { $sum: { $cond: [{ $eq: ['$stage', 'Won'] }, '$value', 0] } } } }, ...repLookup, { $project: { won: 1, lost: 1, revenue: 1, name: { $arrayElemAt: ['$u.name', 0] } } }]),
    Deal.aggregate([{ $match: { ...c.deals, stage: { $nin: ['Won', 'Lost'] } } }, { $group: { _id: '$stage', count: { $sum: 1 }, value: { $sum: '$value' } } }]),
  ]);
  const data = { range: { from: c.from, to: c.to },
    revenueByMonth: monthly.map((m) => ({ month: `${m._id.y}-${String(m._id.m).padStart(2, '0')}`, revenue: m.revenue, deals: m.deals })),
    wonVsLost: Object.fromEntries(outcome.map((o) => [o._id, { count: o.count, value: o.value }])),
    averageDealValue: Math.round(avg[0]?.avgValue || 0), averageDaysToClose: Math.round((avg[0]?.avgDays || 0) * 10) / 10,
    repPerformance: byRep.map(({ u, ...x }) => x), dealsByStage: stages.map((s) => ({ stage: s._id, count: s.count, value: s.value })) };
  if (req.query.format === 'csv') return res.type('text/csv').attachment('sales-report.csv').send(toCsv(['month', 'revenue', 'deals'], data.revenueByMonth));
  ok(res, data);
}));
/* Formulas: conversionRate = leads created in range that are Converted / leads created in range.
   followUpCompletion = Completed / (Completed + Pending + In Progress) of tasks of type Follow-up due in range (Cancelled excluded). */
r.get('/leads', ah(async (req, res) => {
  const c = ctx(req), base = { ...c.leads, createdAt: c.inR };
  const [bySource, byRep, tasks] = await Promise.all([
    Lead.aggregate([{ $match: base }, { $group: { _id: '$source', count: { $sum: 1 }, converted: { $sum: { $cond: [{ $eq: ['$status', 'Converted'] }, 1, 0] } } } }]),
    c.isRep ? [] : Lead.aggregate([{ $match: base }, { $group: { _id: '$owner', leads: { $sum: 1 }, converted: { $sum: { $cond: [{ $eq: ['$status', 'Converted'] }, 1, 0] } } } }, ...repLookup, { $project: { leads: 1, converted: 1, name: { $arrayElemAt: ['$u.name', 0] } } }]),
    Task.aggregate([{ $match: { ...c.tasks, type: 'Follow-up', status: { $ne: 'Cancelled' }, dueDate: c.inR } }, { $group: { _id: null, total: { $sum: 1 }, done: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] } } } }]),
  ]);
  const total = bySource.reduce((a, s) => a + s.count, 0), conv = bySource.reduce((a, s) => a + s.converted, 0);
  const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : 0);
  const data = { range: { from: c.from, to: c.to }, totalLeads: total, convertedLeads: conv, conversionRate: pct(conv, total),
    bySource: bySource.map((s) => ({ source: s._id, count: s.count, converted: s.converted, rate: pct(s.converted, s.count) })),
    repPerformance: byRep.map(({ u, ...x }) => ({ ...x, rate: pct(x.converted, x.leads) })),
    followUpCompletionRate: pct(tasks[0]?.done || 0, tasks[0]?.total || 0) };
  if (req.query.format === 'csv') return res.type('text/csv').attachment('leads-report.csv').send(toCsv(['source', 'count', 'converted', 'rate'], data.bySource));
  ok(res, data);
}));
export default r;
