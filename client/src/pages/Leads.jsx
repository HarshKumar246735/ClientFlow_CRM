import ResourcePage from '../components/common/ResourcePage.jsx'; import StatusBadge from '../components/common/StatusBadge.jsx'; import { money, fmtDate } from '../services/api.js';
const SOURCES = ['Website', 'Referral', 'Social media', 'Email campaign', 'Advertisement', 'Phone call', 'Event', 'Other'];
const PRIO = ['Low', 'Medium', 'High', 'Urgent'];
const fields = [
  { name: 'firstName', label: 'First name', required: true, half: true }, { name: 'lastName', label: 'Last name', required: true, half: true },
  { name: 'email', type: 'email', half: true }, { name: 'phone', half: true }, { name: 'company', half: true }, { name: 'jobTitle', label: 'Job title', half: true },
  { name: 'source', type: 'select', options: SOURCES, required: true, default: 'Website', half: true }, { name: 'status', type: 'select', options: ['New', 'Contacted', 'Qualified', 'Unqualified'], required: true, default: 'New', half: true },
  { name: 'priority', type: 'select', options: PRIO, required: true, default: 'Medium', half: true }, { name: 'estimatedValue', label: 'Estimated value', type: 'number', half: true },
  { name: 'nextFollowUp', label: 'Next follow-up', type: 'date', half: true }, { name: 'owner', label: 'Assigned to', type: 'ref', source: '/users', optionLabel: (u) => u.name, roles: ['admin', 'manager'], half: true },
  { name: 'tags', label: 'Tags (comma separated)', type: 'tags' }, { name: 'description', type: 'textarea' }];
const columns = [{ label: 'Name', render: (l) => `${l.firstName} ${l.lastName}` }, { label: 'Company', key: 'company' }, { label: 'Source', key: 'source' },
  { label: 'Status', render: (l) => <StatusBadge value={l.status} /> }, { label: 'Priority', render: (l) => <StatusBadge value={l.priority} /> },
  { label: 'Score', render: (l) => <span title="Rule-based score; open the lead for the breakdown" className={`pill ${l.scoreBand === 'Hot' ? 'red' : l.scoreBand === 'Warm' ? 'orange' : 'gray'}`}>{l.score} {l.scoreBand}</span> },
  { label: 'Value', render: (l) => money(l.estimatedValue) }, { label: 'Owner', render: (l) => l.owner?.name || '-' }, { label: 'Created', render: (l) => fmtDate(l.createdAt) }];
const filters = [{ key: 'status', label: 'All statuses', options: ['New', 'Contacted', 'Qualified', 'Unqualified', 'Converted'] }, { key: 'source', label: 'All sources', options: SOURCES }, { key: 'priority', label: 'All priorities', options: PRIO }];
export default function Leads() {
  return <ResourcePage title="Leads" noun="lead" endpoint="/leads" columns={columns} fields={fields} filters={filters} detailPath={(l) => `/leads/${l._id}`} csv={{ export: '/leads/export', import: '/leads/import' }}
    bulk={{ assign: true, fields: [{ key: 'status', label: 'Set status...', options: ['New', 'Contacted', 'Qualified', 'Unqualified'] }, { key: 'priority', label: 'Set priority...', options: PRIO }, { key: 'source', label: 'Set source...', options: SOURCES }] }} />;
}
