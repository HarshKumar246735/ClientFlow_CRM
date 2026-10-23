import { Router } from 'express';
import { Lead, Deal } from '../models/index.js';
import { authenticate, scopeFilter } from '../middleware/auth.js';
import { ah } from '../utils/http.js';
import { toCsv } from '../utils/csv.js';
const r = Router();
const run = (Model, cols, filters, name) => ah(async (req, res) => {
  const f = {}; for (const k of filters) if (typeof req.query[k] === 'string' && req.query[k]) f[k] = req.query[k];
  const rows = await Model.find({ $and: [f, scopeFilter(req, ['owner'])] }).sort('-createdAt').limit(10000).populate('owner', 'name').lean();
  rows.forEach((x) => { x.owner = x.owner?.name; });
  res.type('text/csv').attachment(`${name}.csv`).send(toCsv(cols, rows));
});
r.get('/leads/export', authenticate, run(Lead, ['firstName', 'lastName', 'email', 'phone', 'company', 'jobTitle', 'source', 'status', 'priority', 'owner', 'estimatedValue', 'nextFollowUp', 'tags', 'createdAt'], ['status', 'source', 'priority', 'owner'], 'leads'));
r.get('/deals/export', authenticate, run(Deal, ['title', 'owner', 'value', 'currency', 'stage', 'probability', 'expectedCloseDate', 'actualCloseDate', 'lossReason', 'createdAt'], ['stage', 'owner'], 'deals'));
export default r;
