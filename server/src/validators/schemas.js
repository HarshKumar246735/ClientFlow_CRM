import { z } from 'zod';
export const oid = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const s = (n = 200) => z.string().trim().max(n);
const prio = z.enum(['Low', 'Medium', 'High', 'Urgent']);
const leadBase = z.object({
  firstName: s(100).min(1), lastName: s(100).min(1), email: z.string().trim().toLowerCase().email().optional(),
  phone: s(30).optional(), company: s().optional(), jobTitle: s().optional(),
  source: z.enum(['Website', 'Referral', 'Social media', 'Email campaign', 'Advertisement', 'Phone call', 'Event', 'Other']).optional(),
  status: z.enum(['New', 'Contacted', 'Qualified', 'Unqualified']).optional(), priority: prio.optional(),
  owner: oid.optional(), estimatedValue: z.number().min(0).optional(), nextFollowUp: z.coerce.date().optional(),
  description: s(5000).optional(), tags: z.array(s(40)).max(20).optional(),
}).strict();
export const leadCreate = leadBase; export const leadUpdate = leadBase.partial();
const dealBase = z.object({
  title: s().min(1), owner: oid.optional(), lead: oid.optional(), contact: oid.optional(), company: oid.optional(), value: z.number().min(0), currency: z.string().length(3).toUpperCase().optional(),
  stage: z.enum(['Qualification', 'Discovery', 'Proposal', 'Negotiation']).optional(), probability: z.number().min(0).max(100).optional(),
  expectedCloseDate: z.coerce.date().optional(), description: s(5000).optional(),
}).strict();
export const dealCreate = dealBase; export const dealUpdate = dealBase.omit({ stage: true }).partial();
export const dealStage = z.object({ stage: z.enum(['Qualification', 'Discovery', 'Proposal', 'Negotiation', 'Won', 'Lost']), lossReason: s(500).optional() }).strict();
const taskStatusEnum = z.enum(['Pending', 'In Progress', 'Completed', 'Cancelled']);
const taskBase = z.object({
  title: s().min(1), description: s(5000).optional(), type: z.enum(['Call', 'Email', 'Meeting', 'Follow-up', 'Demo', 'General']).optional(),
  dueDate: z.coerce.date().optional(), priority: prio.optional(), status: taskStatusEnum.optional(),
  assignedTo: oid.optional(), lead: oid.optional(), deal: oid.optional(),
}).strict();
export const taskCreate = taskBase; export const taskUpdate = taskBase.partial();
export const taskStatus = z.object({ status: taskStatusEnum }).strict();
export const login = z.object({ email: z.string().email(), password: z.string().min(1).max(200) }).strict();
export const passwordChange = z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(12).max(200) }).strict();
export const userCreate = z.object({ name: s(100).min(1), email: z.string().email().toLowerCase(), password: z.string().min(12).max(200).optional(), // omit password to send an invitation
  role: z.enum(['admin', 'manager', 'rep']).default('rep'), manager: oid.optional(), phone: s(30).optional() }).strict();
export const userUpdate = z.object({ name: s(100).min(1).optional(), email: z.string().trim().toLowerCase().email().optional(), phone: s(30).optional(), manager: oid.nullable().optional() })
  .strict().refine((o) => Object.keys(o).length > 0, 'No changes provided');

const addr = { address: s(300).optional(), city: s(100).optional(), state: s(100).optional(), country: s(100).optional() };
const companyBase = z.object({ name: s().min(1), website: s(300).optional(), industry: s(100).optional(), size: s(50).optional(),
  annualRevenue: z.number().min(0).optional(), phone: s(30).optional(), email: z.string().trim().toLowerCase().email().optional(),
  ...addr, owner: oid.optional(), description: s(5000).optional(), tags: z.array(s(40)).max(20).optional() }).strict();
export const companyCreate = companyBase; export const companyUpdate = companyBase.partial();
const contactBase = z.object({ firstName: s(100).min(1), lastName: s(100).min(1), email: z.string().trim().toLowerCase().email().optional(),
  phone: s(30).optional(), jobTitle: s().optional(), company: oid.optional(), owner: oid.optional(), ...addr,
  tags: z.array(s(40)).max(20).optional(), notes: s(5000).optional() }).strict();
export const contactCreate = contactBase; export const contactUpdate = contactBase.partial();
export const convertSchema = z.object({ createDeal: z.boolean().optional(), dealTitle: s().optional(), dealValue: z.number().min(0).optional() }).strict();
