// Usage: ADMIN_NAME="Jane" ADMIN_EMAIL=jane@x.com ADMIN_PASSWORD='12+ chars' npm run seed:admin
import bcrypt from 'bcryptjs'; import mongoose from 'mongoose';
import '../src/config/env.js'; import { connectDB } from '../src/config/db.js'; import { User } from '../src/models/index.js';
const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
if (!ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD || ADMIN_PASSWORD.length < 12) { console.error('Set ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD (12+ chars)'); process.exit(1); }
await connectDB();
if (await User.exists({ role: 'admin' })) { console.error('An administrator already exists. Aborting.'); process.exit(1); }
await User.create({ name: ADMIN_NAME, email: ADMIN_EMAIL, role: 'admin', passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 12) });
console.log('Administrator created.'); await mongoose.disconnect();
