import { Activity, AuditLog } from '../models/index.js';
export const logActivity = (a) => Activity.create(a).catch((e) => console.error('activity log failed', e.message));
export const audit = (actor, action, target, meta) => AuditLog.create({ actor, action, target, meta }).catch(() => {});
