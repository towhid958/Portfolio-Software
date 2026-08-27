// Shared CSV export used across admin list pages so every page produces the
// same escaping/quoting behavior instead of each hand-rolling its own.
export function exportToCSV(filename: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return;

  const headers = Object.keys(rows[0] ?? {});
  const escapeCell = (value: unknown) => {
    const str = value === null || value === undefined ? '' : String(value);
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };

  const csv = [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => escapeCell(row[h])).join(',')),
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
