import { Server } from 'socket.io'; import jwt from 'jsonwebtoken'; import { parse } from 'cookie';
import { env } from '../config/env.js'; import { User } from '../models/index.js';
let io;
// Sockets authenticate with the same HTTP-only JWT cookie; each user joins only their own private room.
export function initSockets(server) {
  io = new Server(server, { cors: { origin: env.clientUrls, credentials: true } });
  io.use(async (socket, next) => {
    try {
      const p = jwt.verify(parse(socket.handshake.headers.cookie || '')[env.cookie], env.secret);
      const u = await User.findById(p.sub).select('isActive tokenVersion');
      if (!u || !u.isActive || u.tokenVersion !== p.tv) throw new Error('bad session');
      socket.userId = String(u._id); next();
    } catch { next(new Error('unauthorized')); }
  });
  io.on('connection', (s) => s.join(`user:${s.userId}`));
}
export const emitToUser = (id, ev, payload) => io?.to(`user:${id}`).emit(ev, payload);
