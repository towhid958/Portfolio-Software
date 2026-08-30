import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface TableCell {
  text: string;
  /** How many columns this cell occupies - omit/1 for a normal cell. */
  colspan?: number;
  /** How many rows this cell occupies - when set >1, the author is responsible for removing the corresponding cells from the rows below it, same as raw HTML table markup. */
  rowspan?: number;
}

export interface TableData {
  headers: TableCell[];
  rows: TableCell[][];
}

export function newTableData(): TableData {
  return {
    headers: [{ text: 'Column 1' }, { text: 'Column 2' }, { text: 'Column 3' }],
    rows: [
      [{ text: '' }, { text: '' }, { text: '' }],
      [{ text: '' }, { text: '' }, { text: '' }],
    ],
  };
}

// A bare "1" with only a hover tooltip reads as decoration, not a control -
// the visible letter prefix (C/R) is what actually tells you what this
// number does without hovering first.
function SpanInput({
  value,
  onChange,
  label,
  title,
}: {
  value: number | undefined;
  onChange: (v: number) => void;
  label: string;
  title: string;
}) {
  return (
    <label className="flex items-center gap-0.5" title={title}>
      <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
      <input
        type="number"
        min={1}
        max={12}
        value={value ?? 1}
        onChange={(e) => onChange(Math.max(1, Number(e.target.value) || 1))}
        className="h-8 w-9 rounded border bg-background px-1 text-center text-xs"
      />
    </label>
  );
}

// A plain grid of inputs, not a repeater-of-objects like IconListItemsControl -
// a table's shape is two-dimensional (every row must stay the same length as
// headers), so adding/removing a column has to touch every row at once,
// which a per-row-only repeater can't express. Colspan/rowspan are raw HTML
// table primitives, not a merge-cell UI: setting rowspan > 1 doesn't
// automatically remove cells from the rows below - same responsibility the
// author has hand-authoring an HTML table.
export function TableDataControl({ value, onChange }: { value: TableData | undefined; onChange: (v: TableData) => void }) {
  const data = value ?? newTableData();

  const setHeader = (index: number, patch: Partial<TableCell>) => {
    onChange({ ...data, headers: data.headers.map((h, i) => (i === index ? { ...h, ...patch } : h)) });
  };

  const setCell = (rowIndex: number, colIndex: number, patch: Partial<TableCell>) => {
    onChange({
      ...data,
      rows: data.rows.map((row, r) => (r === rowIndex ? row.map((c, ci) => (ci === colIndex ? { ...c, ...patch } : c)) : row)),
    });
  };

  const addColumn = () => {
    onChange({
      headers: [...data.headers, { text: `Column ${data.headers.length + 1}` }],
      rows: data.rows.map((row) => [...row, { text: '' }]),
    });
  };

  const removeColumn = (index: number) => {
    if (data.headers.length <= 1) return;
    onChange({
      headers: data.headers.filter((_, i) => i !== index),
      rows: data.rows.map((row) => row.filter((_, i) => i !== index)),
    });
  };

  const addRow = () => onChange({ ...data, rows: [...data.rows, data.headers.map(() => ({ text: '' }))] });

  const removeRow = (index: number) => {
    if (data.rows.length <= 1) return;
    onChange({ ...data, rows: data.rows.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <table className="border-separate border-spacing-1">
          <thead>
            <tr>
              {data.headers.map((header, colIndex) => (
                <th key={colIndex} className="p-0 align-top">
                  <div className="flex items-center gap-1">
                    <Input
                      value={header.text}
                      onChange={(e) => setHeader(colIndex, { text: e.target.value })}
                      placeholder={`Column ${colIndex + 1}`}
                      className="h-8 min-w-24 text-xs font-medium"
                    />
                    <SpanInput
                      label="C"
                      title="Column span - how many columns this header cell covers"
                      value={header.colspan}
                      onChange={(colspan) => setHeader(colIndex, { colspan })}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-6 shrink-0"
                      disabled={data.headers.length <= 1}
                      onClick={() => removeColumn(colIndex)}
                      title="Remove column"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, colIndex) => (
                  <td key={colIndex} className="p-0 align-top">
                    <div className="flex items-center gap-1">
                      <Input
                        value={cell.text}
                        onChange={(e) => setCell(rowIndex, colIndex, { text: e.target.value })}
                        className="h-8 min-w-24 text-xs"
                      />
                      <SpanInput
                        label="C"
                        title="Column span - how many columns this cell covers"
                        value={cell.colspan}
                        onChange={(colspan) => setCell(rowIndex, colIndex, { colspan })}
                      />
                      <SpanInput
                        label="R"
                        title="Row span - how many rows this cell covers"
                        value={cell.rowspan}
                        onChange={(rowspan) => setCell(rowIndex, colIndex, { rowspan })}
                      />
                    </div>
                  </td>
                ))}
                <td className="p-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-6 shrink-0"
                    disabled={data.rows.length <= 1}
                    onClick={() => removeRow(rowIndex)}
                    title="Remove row"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-muted-foreground">
        The two small number fields on each cell set column span and row span. Setting a row span doesn't remove cells
        below it automatically - delete the covered cells in the following row(s) yourself, same as a plain HTML table.
      </p>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={addRow}>
          <Plus className="h-3 w-3" /> Add row
        </Button>
        <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={addColumn}>
          <Plus className="h-3 w-3" /> Add column
        </Button>
      </div>
    </div>
  );
}
