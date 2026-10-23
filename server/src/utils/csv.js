// CSV with spreadsheet formula-injection protection (cells starting with = + - @ are prefixed with ').
const cell = (v) => { if (v == null) return ''; let s = v instanceof Date ? v.toISOString() : Array.isArray(v) ? v.join('; ') : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
export const toCsv = (cols, rows) => [cols.join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\n');
