// Rule-based lead scoring (transparent, configurable; NOT machine learning). Pure functions: no I/O.
export const DEFAULT_RULES = {
  priority: { Low: 0, Medium: 5, High: 15, Urgent: 25 },
  status: { New: 0, Contacted: 8, Qualified: 20, Unqualified: -30, Converted: 0 },
  source: { Referral: 15, Event: 10, Website: 8, 'Phone call': 8, 'Email campaign': 5, 'Social media': 4, Advertisement: 3, Other: 0 },
  valueTiers: [{ min: 50000, points: 25 }, { min: 10000, points: 15 }, { min: 1000, points: 8 }],
  flags: { hasEmail: 5, hasPhone: 5, followUpScheduled: 5, createdLast7Days: 5 },
};
export const mergeRules = (o = {}) => ({
  priority: { ...DEFAULT_RULES.priority, ...o?.priority }, status: { ...DEFAULT_RULES.status, ...o?.status }, source: { ...DEFAULT_RULES.source, ...o?.source },
  valueTiers: Array.isArray(o?.valueTiers) && o.valueTiers.length ? o.valueTiers : DEFAULT_RULES.valueTiers, flags: { ...DEFAULT_RULES.flags, ...o?.flags },
});
export function scoreLead(l, rules = DEFAULT_RULES, now = Date.now()) {
  const factors = []; const add = (factor, points, detail) => { if (points) factors.push({ factor, points, detail }); };
  add('Priority', rules.priority[l.priority] ?? 0, l.priority); add('Status', rules.status[l.status] ?? 0, l.status); add('Source', rules.source[l.source] ?? 0, l.source);
  const tier = [...rules.valueTiers].sort((a, b) => b.min - a.min).find((t) => (l.estimatedValue || 0) >= t.min);
  if (tier) add('Estimated value', tier.points, `at least ${tier.min}`);
  if (l.email) add('Has email', rules.flags.hasEmail, 'email on file'); if (l.phone) add('Has phone', rules.flags.hasPhone, 'phone on file');
  if (l.nextFollowUp) add('Follow-up scheduled', rules.flags.followUpScheduled, 'next follow-up set');
  if (l.createdAt && now - new Date(l.createdAt).getTime() <= 7 * 86400000) add('Recently created', rules.flags.createdLast7Days, 'created in the last 7 days');
  const rawTotal = factors.reduce((a, f) => a + f.points, 0), score = Math.max(0, Math.min(100, rawTotal));
  return { score, band: score >= 70 ? 'Hot' : score >= 40 ? 'Warm' : 'Cold', rawTotal, factors };
}
