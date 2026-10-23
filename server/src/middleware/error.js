import { ZodError } from 'zod';
import { env } from '../config/env.js';
export const notFound = (_req, res) => res.status(404).json({ success: false, message: 'Route not found' });
export function errorHandler(err, _req, res, _next) {
  if (err instanceof ZodError) return res.status(400).json({ success: false, message: 'Validation failed', errors: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) });
  if (err.name === 'CastError') return res.status(400).json({ success: false, message: 'Invalid identifier or value' });
  if (err.code === 11000) return res.status(409).json({ success: false, message: 'Duplicate value' });
  if (err.message === 'CORS blocked') return res.status(403).json({ success: false, message: 'Origin not allowed' });
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ success: false, message: status >= 500 && env.prod ? 'Internal server error' : err.message });
}
