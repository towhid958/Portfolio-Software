import { registerWidget, type WidgetComponentProps } from '@/lib/builder/registry';
import { Table as TableIcon } from 'lucide-react';
import type { FieldDef } from '@/lib/builder/fields';
import { newTableData, type TableData } from '@/components/builder/controls/TableDataControl';
import { length } from '@/lib/builder/valueTypes';
import { literal } from '@/lib/builder/styleValue';
import { cn } from '@/lib/utils';

export interface TableContent {
  data: TableData;
  striped: boolean;
  bordered: boolean;
}

// A flat content widget, not a container - cells are plain text, not nested
// builder elements, same tradeoff IconList makes for its items. Styling is
// two toggles (striped/bordered) using fixed, sensible defaults rather than
// user-pickable colors - there's no per-cell element for the shared Style
// system to target, so anything more would need its own bespoke color
// fields rather than reusing the existing responsive style machinery.
//
// table-fixed alone isn't enough: per spec, a fixed-layout table without an
// explicit <colgroup> takes its column widths from the FIRST row's cells
// only - if that row (the header) has a colspan, its cell count doesn't
// match the real column count and later rows misalign. An explicit <col>
// per real column (data.headers.length) makes every column genuinely and
// predictably equal width regardless of any row's colspans. minWidth keeps
// columns from being crushed illegibly narrow when there are many of them
// in a tight space - the wrapper's overflow-x-auto scrolls instead.
const MIN_COLUMN_WIDTH_PX = 96;

function TableComponent({ content, wiring }: WidgetComponentProps<TableContent>) {
  const data = content.data ?? newTableData();
  const columnCount = Math.max(1, data.headers.length);

  return (
    <div {...(wiring as any)} className={cn('builder-el builder-table', wiring.className)}>
      <table
        className={cn('w-full table-fixed border-collapse text-left', content.bordered && 'border border-current/15')}
        style={{ minWidth: `${columnCount * MIN_COLUMN_WIDTH_PX}px` }}
      >
        <colgroup>
          {data.headers.map((_, i) => (
            <col key={i} style={{ width: `${100 / columnCount}%` }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {data.headers.map((header, i) => (
              <th
                key={i}
                colSpan={header.colspan && header.colspan > 1 ? header.colspan : undefined}
                className={cn('wrap-break-word px-3 py-2 font-semibold', content.bordered && 'border border-current/15')}
              >
                <span className="builder-el-text">{header.text}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, rowIndex) => (
            <tr key={rowIndex} className={cn(content.striped && rowIndex % 2 === 1 && 'bg-current/5')}>
              {row.map((cell, colIndex) => (
                <td
                  key={colIndex}
                  colSpan={cell.colspan && cell.colspan > 1 ? cell.colspan : undefined}
                  rowSpan={cell.rowspan && cell.rowspan > 1 ? cell.rowspan : undefined}
                  className={cn('wrap-break-word px-3 py-2', content.bordered && 'border border-current/15')}
                >
                  <span className="builder-el-text">{cell.text}</span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const contentFields: FieldDef[] = [
  { key: 'data', label: 'Table Data', control: 'tableData' },
  { key: 'striped', label: 'Striped Rows', control: 'toggle' },
  { key: 'bordered', label: 'Bordered Cells', control: 'toggle' },
];

registerWidget({
  type: 'table',
  label: 'Table',
  icon: TableIcon,
  category: 'basic',
  keywords: ['table', 'grid', 'data', 'rows', 'columns', 'pricing table'],
  isContainer: false,
  defaultContent: { data: newTableData(), striped: true, bordered: true } satisfies TableContent,
  // Overflow X: Scroll, not the usual Hidden every other widget defaults to
  // - a wide table needs to be scrollable horizontally rather than clipped,
  // and unlike overflow-x-auto (a hardcoded Tailwind class), driving this
  // through the real overflowX field means it shows up (and is editable) in
  // the Advanced tab instead of being invisible, fixed behavior.
  defaultAdvanced: { width: literal(length(100, '%')), overflowX: literal('scroll') },
  contentFields,
  Component: TableComponent,
});
