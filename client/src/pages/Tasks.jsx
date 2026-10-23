import { Check } from 'lucide-react';
import ResourcePage from '../components/common/ResourcePage.jsx'; import StatusBadge from '../components/common/StatusBadge.jsx'; import api, { errMsg, fmtDateTime } from '../services/api.js';
const STATUS = ['Pending', 'In Progress', 'Completed', 'Cancelled'], PRIO = ['Low', 'Medium', 'High', 'Urgent'];
const fields = [{ name: 'title', required: true }, { name: 'type', type: 'select', options: ['Call', 'Email', 'Meeting', 'Follow-up', 'Demo', 'General'], default: 'General', required: true, half: true },
  { name: 'priority', type: 'select', options: PRIO, default: 'Medium', required: true, half: true }, { name: 'dueDate', label: 'Due', type: 'datetime', half: true },
  { name: 'status', type: 'select', options: STATUS, default: 'Pending', required: true, half: true },
  { name: 'assignedTo', label: 'Assigned to', type: 'ref', source: '/users', optionLabel: (u) => u.name, roles: ['admin', 'manager'] }, { name: 'description', type: 'textarea' }];
const columns = [{ label: 'Task', key: 'title' }, { label: 'Type', key: 'type' }, { label: 'Priority', render: (t) => <StatusBadge value={t.priority} /> }, { label: 'Status', render: (t) => <StatusBadge value={t.status} /> },
  { label: 'Due', render: (t) => fmtDateTime(t.dueDate) }, { label: 'Assigned to', render: (t) => t.assignedTo?.name || '-' }];
const done = (t, reload) => !['Completed', 'Cancelled'].includes(t.status) && (
  <button className="btn ghost sm" onClick={async () => { try { await api.patch(`/tasks/${t._id}/status`, { status: 'Completed' }); reload(); } catch (e) { window.alert(errMsg(e)); } }}><Check size={14} /> Done</button>);
export default function Tasks() {
  return <ResourcePage title="Tasks" noun="task" endpoint="/tasks" columns={columns} fields={fields} rowActions={done} sort="dueDate"
    filters={[{ key: 'status', label: 'All statuses', options: STATUS }, { key: 'priority', label: 'All priorities', options: PRIO }, { key: 'type', label: 'All types', options: ['Call', 'Email', 'Meeting', 'Follow-up', 'Demo', 'General'] }]} />;
}
