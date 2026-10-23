import mongoose from 'mongoose';
const { Schema } = mongoose; const ref = (m) => ({ type: Schema.Types.ObjectId, ref: m });
const T = { timestamps: true };
export const ROLES = ['admin', 'manager', 'rep'];
export const LEAD_STATUS = ['New', 'Contacted', 'Qualified', 'Unqualified', 'Converted'];
export const STAGES = ['Qualification', 'Discovery', 'Proposal', 'Negotiation', 'Won', 'Lost'];
export const STAGE_PROB = { Qualification: 10, Discovery: 25, Proposal: 50, Negotiation: 75, Won: 100, Lost: 0 };

export const User = mongoose.model('User', new Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ROLES, default: 'rep' },
  manager: ref('User'), phone: String, theme: { type: String, enum: ['light', 'dark'], default: 'light' },
  isActive: { type: Boolean, default: true }, tokenVersion: { type: Number, default: 0 },
}, T));

const leadSchema = new Schema({
  firstName: { type: String, required: true, trim: true }, lastName: { type: String, required: true, trim: true },
  email: { type: String, lowercase: true, trim: true }, phone: String, company: String, jobTitle: String,
  source: { type: String, enum: ['Website', 'Referral', 'Social media', 'Email campaign', 'Advertisement', 'Phone call', 'Event', 'Other'], default: 'Other' },
  status: { type: String, enum: LEAD_STATUS, default: 'New' },
  priority: { type: String, enum: ['Low', 'Medium', 'High', 'Urgent'], default: 'Medium' },
  owner: { ...ref('User'), required: true }, createdBy: ref('User'),
  estimatedValue: { type: Number, min: 0, default: 0 }, nextFollowUp: Date, description: String, tags: [String],
  convertedAt: Date, convertedContact: ref('Contact'), convertedCompany: ref('Company'), convertedDeal: ref('Deal'),
}, T);
leadSchema.index({ owner: 1, status: 1, createdAt: -1 }); leadSchema.index({ email: 1 });
export const Lead = mongoose.model('Lead', leadSchema);

const dealSchema = new Schema({
  title: { type: String, required: true, trim: true }, owner: { ...ref('User'), required: true }, createdBy: ref('User'),
  lead: ref('Lead'), contact: ref('Contact'), company: ref('Company'), value: { type: Number, required: true, min: 0 }, currency: { type: String, default: 'USD' },
  stage: { type: String, enum: STAGES, default: 'Qualification' }, probability: { type: Number, min: 0, max: 100, default: 10 },
  expectedCloseDate: Date, actualCloseDate: Date, description: String, lossReason: String,
  stageHistory: [{ from: String, to: String, by: ref('User'), at: { type: Date, default: Date.now }, _id: false }],
}, T);
dealSchema.index({ owner: 1, stage: 1, createdAt: -1 });
export const Deal = mongoose.model('Deal', dealSchema);

const taskSchema = new Schema({
  title: { type: String, required: true, trim: true }, description: String,
  type: { type: String, enum: ['Call', 'Email', 'Meeting', 'Follow-up', 'Demo', 'General'], default: 'General' },
  dueDate: Date, priority: { type: String, enum: ['Low', 'Medium', 'High', 'Urgent'], default: 'Medium' },
  status: { type: String, enum: ['Pending', 'In Progress', 'Completed', 'Cancelled'], default: 'Pending' },
  assignedTo: { ...ref('User'), required: true }, createdBy: ref('User'), lead: ref('Lead'), deal: ref('Deal'), completedAt: Date, reminderSentAt: Date, overdueNotifiedAt: Date,
}, T);
taskSchema.index({ assignedTo: 1, status: 1, dueDate: 1 });
taskSchema.pre('save', function (next) {
  if (this.isModified('dueDate') && !this.isNew) { this.reminderSentAt = undefined; this.overdueNotifiedAt = undefined; }
  if (this.isModified('status')) this.completedAt = this.status === 'Completed' ? new Date() : undefined;
  next();
});
export const Task = mongoose.model('Task', taskSchema);

const actSchema = new Schema({ type: String, description: String, actor: ref('User'), entity: String,
  entityId: Schema.Types.ObjectId, meta: Object }, T);
actSchema.index({ entity: 1, entityId: 1, createdAt: -1 });
export const Activity = mongoose.model('Activity', actSchema);
export const AuditLog = mongoose.model('AuditLog', new Schema({ actor: ref('User'), action: String, target: String, meta: Object }, T));

const addr = { address: String, city: String, state: String, country: String };
const companySchema = new Schema({ name: { type: String, required: true, trim: true }, website: String, industry: String, size: String,
  annualRevenue: { type: Number, min: 0 }, phone: String, email: { type: String, lowercase: true, trim: true }, ...addr,
  owner: { ...ref('User'), required: true }, createdBy: ref('User'), description: String, tags: [String] }, T);
companySchema.index({ owner: 1, createdAt: -1 }); companySchema.index({ name: 1 });
export const Company = mongoose.model('Company', companySchema);
const contactSchema = new Schema({ firstName: { type: String, required: true, trim: true }, lastName: { type: String, required: true, trim: true },
  email: { type: String, lowercase: true, trim: true }, phone: String, jobTitle: String, company: ref('Company'),
  owner: { ...ref('User'), required: true }, createdBy: ref('User'), ...addr, tags: [String], notes: String, sourceLead: ref('Lead') }, T);
contactSchema.index({ owner: 1, createdAt: -1 }); contactSchema.index({ email: 1 });
export const Contact = mongoose.model('Contact', contactSchema);

const notifSchema = new Schema({ user: { ...ref('User'), required: true }, type: String, message: String, link: String, read: { type: Boolean, default: false } }, T);
notifSchema.index({ user: 1, read: 1, createdAt: -1 });
export const Notification = mongoose.model('Notification', notifSchema);
const prtSchema = new Schema({ user: { ...ref('User'), required: true }, tokenHash: { type: String, required: true, index: true }, expiresAt: { type: Date, required: true } });
prtSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL cleanup
export const PasswordResetToken = mongoose.model('PasswordResetToken', prtSchema);

export const Setting = mongoose.model('Setting', new Schema({ key: { type: String, unique: true }, orgName: String, currency: { type: String, default: 'USD' },
  timezone: { type: String, default: 'UTC' }, dateFormat: { type: String, enum: ['short', 'medium', 'long'], default: 'medium' }, pageSize: { type: Number, min: 5, max: 100, default: 10 }, scoring: Schema.Types.Mixed }, T));
