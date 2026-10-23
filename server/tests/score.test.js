import test from 'node:test'; import assert from 'node:assert/strict';
import { scoreLead, mergeRules, DEFAULT_RULES } from '../src/services/leadScore.js';
const NOW = Date.parse('2026-01-10T00:00:00Z');
test('scores and explains each factor', () => {
  const r = scoreLead({ priority: 'High', status: 'Qualified', source: 'Referral', estimatedValue: 12000, email: 'a@b.c', phone: '1', nextFollowUp: new Date(), createdAt: '2026-01-08' }, DEFAULT_RULES, NOW);
  assert.equal(r.rawTotal, 15 + 20 + 15 + 15 + 5 + 5 + 5 + 5); assert.equal(r.score, 85); assert.equal(r.band, 'Hot'); assert.ok(r.factors.every((f) => f.detail));
});
test('clamps to 0..100 and supports negative factors', () => assert.equal(scoreLead({ priority: 'Low', status: 'Unqualified', source: 'Other' }, DEFAULT_RULES, NOW).score, 0));
test('uses the highest matching value tier only', () => assert.equal(scoreLead({ estimatedValue: 60000 }, DEFAULT_RULES, NOW).factors.find((f) => f.factor === 'Estimated value').points, 25));
test('custom weights override defaults and merge partially', () => {
  const rules = mergeRules({ priority: { Urgent: 50 } });
  assert.equal(rules.priority.Urgent, 50); assert.equal(rules.priority.High, 15); assert.equal(scoreLead({ priority: 'Urgent' }, rules, NOW).score, 50);
});
test('bands', () => { assert.equal(scoreLead({ priority: 'Urgent', status: 'Contacted' }, DEFAULT_RULES, NOW).band, 'Cold'); assert.equal(scoreLead({ priority: 'Urgent', status: 'Qualified' }, DEFAULT_RULES, NOW).band, 'Warm'); });
