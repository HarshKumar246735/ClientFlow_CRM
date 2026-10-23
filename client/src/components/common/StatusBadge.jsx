const TONE = { New: 'blue', Contacted: 'purple', Qualified: 'green', Unqualified: 'gray', Converted: 'green', Low: 'gray', Medium: 'blue', High: 'orange', Urgent: 'red',
  Pending: 'gray', 'In Progress': 'blue', Completed: 'green', Cancelled: 'gray', Qualification: 'blue', Discovery: 'purple', Proposal: 'blue', Negotiation: 'orange', Won: 'green', Lost: 'red' };
export default function StatusBadge({ value }) { return value ? <span className={`pill ${TONE[value] || 'gray'}`}>{value}</span> : '-'; }
