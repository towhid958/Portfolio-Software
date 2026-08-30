import { useEffect, useState } from 'react';
import type { PageDocument } from '@/lib/builder/document';
import { useDragDrop } from './DragDropContext';

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Live feedback for where a drag will land. Two distinct cases, because a
 * single "outline the whole target container" treatment reads fine for a
 * small container but is actively confusing once the target is a large
 * ancestor (e.g. dropping between two root-level sections escalates the
 * target to the root, whose box is the entire page) - a dashed border
 * around the whole canvas doesn't read as "insert here", it reads as
 * "everything is selected":
 *
 * - Container already has children: no outline at all, just a bold
 *   "Place here" bar at the exact insertion boundary - the only ambiguity
 *   worth resolving is *where in the stack*, not *which giant box*.
 * - Empty container: outline + label scoped to that (normally small)
 *   container, since there's no sibling boundary to draw a line against.
 */
export function DropIndicator({ doc }: { doc: PageDocument }) {
  const { isDragging, dropTarget, source } = useDragDrop();
  const [emptyRect, setEmptyRect] = useState<Rect | null>(null);
  const [line, setLine] = useState<Rect | null>(null);

  useEffect(() => {
    if (!isDragging || !dropTarget) {
      setEmptyRect(null);
      setLine(null);
      return;
    }

    const containerEl = document.querySelector(`[data-el-id="${dropTarget.containerId}"]`);
    if (!containerEl) {
      setEmptyRect(null);
      setLine(null);
      return;
    }

    const containerBox = containerEl.getBoundingClientRect();
    const containerNode = doc.nodes[dropTarget.containerId];
    const excludeId = source?.kind === 'move' ? source.elementId : undefined;
    const childIds = (containerNode?.children ?? []).filter((cid) => cid !== excludeId);

    if (childIds.length === 0) {
      setEmptyRect(containerBox);
      setLine(null);
      return;
    }
    setEmptyRect(null);

    const style = getComputedStyle(containerEl);
    const isRow = style.display === 'flex' && style.flexDirection.startsWith('row');

    const beforeEl = dropTarget.index > 0 ? document.querySelector(`[data-el-id="${childIds[dropTarget.index - 1]}"]`) : null;
    const afterEl = dropTarget.index < childIds.length ? document.querySelector(`[data-el-id="${childIds[dropTarget.index]}"]`) : null;

    if (isRow) {
      const x = afterEl ? afterEl.getBoundingClientRect().left : beforeEl ? beforeEl.getBoundingClientRect().right : containerBox.left;
      setLine({ left: x - 2, top: containerBox.top, width: 4, height: containerBox.height });
    } else {
      const y = afterEl ? afterEl.getBoundingClientRect().top : beforeEl ? beforeEl.getBoundingClientRect().bottom : containerBox.top;
      setLine({ left: containerBox.left, top: y - 2, width: containerBox.width, height: 4 });
    }
  }, [isDragging, dropTarget, doc, source]);

  if (!isDragging || !dropTarget) return null;

  return (
    <>
      {emptyRect && (
        <div
          className="pointer-events-none fixed z-30 flex items-center justify-center rounded-sm border-2 border-dashed border-blue-500 bg-blue-500/5"
          style={{ left: emptyRect.left, top: emptyRect.top, width: emptyRect.width, height: emptyRect.height }}
        >
          <span className="rounded-full bg-blue-500 px-2 py-0.5 text-xs font-medium text-white shadow-sm">
            Place here
          </span>
        </div>
      )}
      {line && (
        <div
          className="pointer-events-none fixed z-40 rounded-full bg-blue-500 shadow-[0_0_0_3px_rgba(59,130,246,0.25)]"
          style={{ left: line.left, top: line.top, width: line.width, height: line.height }}
        >
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-blue-500 px-2 py-0.5 text-xs font-medium text-white shadow-sm">
            Place here
          </span>
        </div>
      )}
    </>
  );
}
