import { createElement, insertElement, type PageDocument, type ElementId } from './document';
import { literal } from './styleValue';
import { literalColor, length, box } from './valueTypes';

/**
 * Quick-start "N Columns" tiles in the Toolbox - not real widget types (no
 * document ever contains a node of one of these types), just a drop recipe:
 * dropping one builds a row Container with `count` equal-width column
 * Containers already inside it, saving the hand-nesting a plain Container
 * would take to get the same starting structure. See ColumnsPresetWidgets.tsx
 * for the Toolbox-facing registration and EditorShell's onDrop for where
 * this gets invoked instead of the normal single-widget insert path.
 */
export const COLUMN_PRESET_COUNTS: Record<string, number> = {
  'columns-2': 2,
  'columns-3': 3,
  'columns-4': 4,
};

export function isColumnPreset(widgetType: string): boolean {
  return widgetType in COLUMN_PRESET_COUNTS;
}

export function insertColumnsPreset(
  doc: PageDocument,
  widgetType: string,
  parentId: ElementId,
  index?: number
): PageDocument {
  const count = COLUMN_PRESET_COUNTS[widgetType];
  if (!count) return doc;

  // The row itself is always row-direction regardless of nesting - unlike a
  // plain Container drag (which defaults to column once nested, see
  // EditorShell), this wrapper's entire job is holding columns side by side.
  const row = createElement('container', { tag: 'div' }, parentId);
  row.design = { display: literal({ type: 'flex', direction: 'row', gap: length(16) }) };
  row.advanced = {
    width: literal(length(100, '%')),
    minHeight: literal(length(80)),
    overflowX: literal('hidden'),
    overflowY: literal('hidden'),
  };

  let next = insertElement(doc, row, parentId, index);

  const columnWidth = length(Math.round((100 / count) * 100) / 100, '%');
  for (let i = 0; i < count; i++) {
    const col = createElement('container', { tag: 'div' }, row.id);
    col.design = {
      display: literal({ type: 'flex', direction: 'column', gap: length(16) }),
      background: literal({ type: 'color', color: literalColor('#eaeaea') }),
    };
    col.advanced = {
      padding: literal(box(length(16))),
      minWidth: literal(length(80)),
      minHeight: literal(length(80)),
      // Equal-width columns, not the usual 100% every other fresh Container
      // gets - a flex row's children default to shrink-to-content, and 100%
      // each would make every column fight for the whole row's width.
      width: literal(columnWidth),
      overflowX: literal('hidden'),
      overflowY: literal('hidden'),
    };
    next = insertElement(next, col, row.id);
  }

  return next;
}
