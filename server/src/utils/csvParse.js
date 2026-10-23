// Minimal RFC-4180 CSV parser (quoted fields, escaped quotes, CRLF/LF, blank lines skipped). No dependencies.
export function parseCsv(text) {
  const rows = []; let row = [], f = '', q = false;
  const endRow = () => { row.push(f); f = ''; if (row.some((x) => x !== '')) rows.push(row); row = []; };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; endRow(); }
    else f += c;
  }
  endRow(); return rows;
}
