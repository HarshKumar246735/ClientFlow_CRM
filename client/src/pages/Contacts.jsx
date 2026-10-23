import ResourcePage from '../components/common/ResourcePage.jsx';
const fields = [{ name: 'firstName', label: 'First name', required: true, half: true }, { name: 'lastName', label: 'Last name', required: true, half: true },
  { name: 'email', type: 'email', half: true }, { name: 'phone', half: true }, { name: 'jobTitle', label: 'Job title', half: true },
  { name: 'company', type: 'ref', source: '/companies', optionLabel: (c) => c.name, half: true },
  { name: 'owner', label: 'Owner', type: 'ref', source: '/users', optionLabel: (u) => u.name, roles: ['admin', 'manager'] }, { name: 'notes', type: 'textarea' }];
const columns = [{ label: 'Name', render: (c) => `${c.firstName} ${c.lastName}` }, { label: 'Email', key: 'email' }, { label: 'Phone', key: 'phone' }, { label: 'Job title', key: 'jobTitle' },
  { label: 'Company', render: (c) => c.company?.name || '-' }, { label: 'Owner', render: (c) => c.owner?.name || '-' }];
export default function Contacts() {
  return <ResourcePage title="Contacts" noun="contact" endpoint="/contacts" columns={columns} fields={fields} detailPath={(c) => `/contacts/${c._id}`} csv={{ export: '/contacts/export', import: '/contacts/import' }} />;
}
