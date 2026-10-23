import { Notification } from '../models/index.js';
import { emitToUser } from '../sockets/index.js';
// Messages are intentionally generic (no customer data); the link leads to the record, which is permission-checked on fetch.
export async function notify(userId, { type, message, link }) {
  if (!userId) return;
  try { const n = await Notification.create({ user: userId, type, message, link }); emitToUser(String(userId), 'notification', n); }
  catch (e) { console.error('notify failed', e.message); }
}
