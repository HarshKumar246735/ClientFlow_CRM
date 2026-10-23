import { Task, Lead, Deal } from '../models/index.js';
import { crud, findScopedBy } from '../utils/crud.js';
import { taskCreate, taskUpdate, taskStatus } from '../validators/schemas.js';
import { HttpError, ah, ok } from '../utils/http.js';
import { logActivity } from '../utils/log.js';
const router = crud({
  Model: Task, entity: 'Task', ownerField: 'assignedTo', scopeFields: ['assignedTo', 'createdBy'], create: taskCreate, update: taskUpdate,
  filters: ['status', 'priority', 'type', 'assignedTo', 'lead', 'deal'], search: ['title', 'description'],
  sorts: ['createdAt', 'dueDate', 'priority', 'status', 'title'], populate: 'assignedTo lead deal', deleteRoles: ['admin', 'manager'],
  check: async (req, d) => { // related records must be visible to the caller
    if (d.lead && !(await findScopedBy(req, Lead, d.lead, ['owner']))) throw new HttpError(400, 'Invalid related lead');
    if (d.deal && !(await findScopedBy(req, Deal, d.deal, ['owner']))) throw new HttpError(400, 'Invalid related deal');
  },
});
router.patch('/:id/status', ah(async (req, res) => {
  const { status } = taskStatus.parse(req.body);
  const t = await findScopedBy(req, Task, req.params.id, ['assignedTo', 'createdBy']);
  if (!t) throw new HttpError(404, 'Task not found');
  t.status = status; await t.save();
  logActivity({ type: `task.${status.toLowerCase().replace(' ', '_')}`, description: `Task "${t.title}" marked ${status}`, actor: req.user._id, entity: 'Task', entityId: t._id });
  ok(res, t);
}));
export default router;
