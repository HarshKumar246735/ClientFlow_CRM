import { Company, Contact, Deal } from '../models/index.js';
import { crud } from '../utils/crud.js';
import { companyCreate, companyUpdate } from '../validators/schemas.js';
import { HttpError } from '../utils/http.js';
export default crud({
  Model: Company, entity: 'Company', ownerField: 'owner', scopeFields: ['owner'], create: companyCreate, update: companyUpdate,
  filters: ['industry', 'country', 'owner', 'size'], search: ['name', 'industry', 'email', 'city'],
  sorts: ['createdAt', 'name', 'industry', 'annualRevenue'], populate: 'owner',
  // Safe deletion: never orphan contacts or deals.
  beforeDelete: async (_req, doc) => {
    if ((await Contact.exists({ company: doc._id })) || (await Deal.exists({ company: doc._id })))
      throw new HttpError(409, 'Company has linked contacts or deals; reassign or remove them first');
  },
});
