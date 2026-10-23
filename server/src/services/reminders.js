import { Task } from '../models/index.js';
import { notify } from '../utils/notify.js';
// In-process scheduler: needs an always-on server (Render web service). It does not run on serverless platforms,
// and on hosts that sleep when idle, reminders are sent when the server wakes up. Each task is notified once per due date.
export async function runReminders(now = new Date()) {
  const open = { status: { $in: ['Pending', 'In Progress'] } };
  const soon = new Date(now.getTime() + 3600e3);
  for (const t of await Task.find({ ...open, dueDate: { $gt: now, $lte: soon }, reminderSentAt: null }).select('_id assignedTo').limit(200)) {
    await notify(t.assignedTo, { type: 'task_upcoming', message: 'A task is due within the next hour', link: '/tasks' });
    await Task.updateOne({ _id: t._id }, { reminderSentAt: now });
  }
  for (const t of await Task.find({ ...open, dueDate: { $lt: now }, overdueNotifiedAt: null }).select('_id assignedTo').limit(200)) {
    await notify(t.assignedTo, { type: 'task_overdue', message: 'A task is overdue', link: '/tasks' });
    await Task.updateOne({ _id: t._id }, { overdueNotifiedAt: now });
  }
}
export function startReminders(everyMs = 5 * 60 * 1000) {
  const run = () => runReminders().catch((e) => console.error('reminders failed:', e.message));
  run(); setInterval(run, everyMs).unref();
}
