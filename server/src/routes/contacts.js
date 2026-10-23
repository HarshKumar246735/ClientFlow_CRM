import { Contact, Company, Deal } from '../models/index.js';
import { crud, findScopedBy } from '../utils/crud.js';
import { contactCreate, contactUpdate } from '../validators/schemas.js';
import { scopeFilter } from '../middleware/auth.js';
import { HttpError } from '../utils/http.js';
export default crud({
  Model: Contact, entity: 'Contact', ownerField: 'owner', scopeFields: ['owner'], create: contactCreate, update: contactUpdate,
  filters: ['company', 'owner'], search: ['firstName', 'lastName', 'email', 'phone', 'jobTitle'],
  sorts: ['createdAt', 'firstName', 'lastName', 'email'], populate: 'owner company',
  check: async (req, d) => {
    if (d.company && !(await findScopedBy(req, Company, d.company, ['owner']))) throw new HttpError(400, 'Invalid related company');
    if (req.method === 'POST' && d.email && await Contact.exists({ $and: [{ email: d.email }, scopeFilter(req, ['owner'])] }))
      throw new HttpError(409, 'A contact with this email already exists');
  },
  beforeDelete: async (_req, doc) => {
    if (await Deal.exists({ contact: doc._id })) throw new HttpError(409, 'Contact has linked deals');
  },
});
