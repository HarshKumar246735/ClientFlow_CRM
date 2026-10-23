import ResourcePage from '../components/common/ResourcePage.jsx'; import StatusBadge from '../components/common/StatusBadge.jsx'; import { money, fmtDate } from '../services/api.js';
const fields = [{ name: 'title', required: true }, { name: 'value', type: 'number', required: true, half: true }, { name: 'currency', half: true, default: 'USD' },
  { name: 'stage', type: 'select', options: ['Qualification', 'Discovery', 'Proposal', 'Negotiation'], required: true, default: 'Qualification', createOnly: true, half: true },
  { name: 'expectedCloseDate', label: 'Expected close', type: 'date', half: true },
  { name: 'company', type: 'ref', source: '/companies', optionLabel: (c) => c.name, half: true }, { name: 'contact', type: 'ref', source: '/contacts', optionLabel: (c) => `${c.firstName} ${c.lastName}`, half: true },
  { name: 'owner', label: 'Owner', type: 'ref', source: '/users', optionLabel: (u) => u.name, roles: ['admin', 'manager'] }, { name: 'description', type: 'textarea' }];
const columns = [{ label: 'Deal', key: 'title' }, { label: 'Stage', render: (d) => <StatusBadge value={d.stage} /> }, { label: 'Value', render: (d) => money(d.value, d.currency) },
  { label: 'Company', render: (d) => d.company?.name || '-' }, { label: 'Expected close', render: (d) => fmtDate(d.expectedCloseDate) }, { label: 'Owner', render: (d) => d.owner?.name || '-' }];
export default function Deals() {
  return <ResourcePage title="Deals" noun="deal" endpoint="/deals" columns={columns} fields={fields} detailPath={(d) => `/deals/${d._id}`} csv={{ export: '/deals/export' }}
    filters={[{ key: 'stage', label: 'All stages', options: ['Qualification', 'Discovery', 'Proposal', 'Negotiation', 'Won', 'Lost'] }]} />;
}
