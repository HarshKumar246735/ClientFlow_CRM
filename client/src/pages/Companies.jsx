import ResourcePage from '../components/common/ResourcePage.jsx'; import { money } from '../services/api.js';
const fields = [{ name: 'name', required: true }, { name: 'website', half: true }, { name: 'industry', half: true }, { name: 'size', half: true }, { name: 'annualRevenue', label: 'Annual revenue', type: 'number', half: true },
  { name: 'phone', half: true }, { name: 'email', type: 'email', half: true }, { name: 'city', half: true }, { name: 'country', half: true },
  { name: 'owner', label: 'Owner', type: 'ref', source: '/users', optionLabel: (u) => u.name, roles: ['admin', 'manager'] }, { name: 'description', type: 'textarea' }];
const columns = [{ label: 'Company', key: 'name' }, { label: 'Industry', key: 'industry' }, { label: 'Size', key: 'size' }, { label: 'Country', key: 'country' },
  { label: 'Revenue', render: (c) => (c.annualRevenue ? money(c.annualRevenue) : '-') }, { label: 'Owner', render: (c) => c.owner?.name || '-' }];
export default function Companies() {
  return <ResourcePage title="Companies" noun="company" endpoint="/companies" columns={columns} fields={fields} detailPath={(c) => `/companies/${c._id}`} csv={{ export: '/companies/export', import: '/companies/import' }} />;
}
