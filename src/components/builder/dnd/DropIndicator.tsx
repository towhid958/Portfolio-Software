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
 * Live feedback for where a drag will land: a dashed highlight around the
 * target container, plus a thin line at the exact insertion point between
 * (or before/after) its children - without this there was no way to tell
 * which container would receive the drop, or where within it.
 */
export function DropIndicator({ doc }: { doc: PageDocument }) {
  const { isDragging, dropTarget, source } = useDragDrop();
  const [containerRect, setContainerRect] = useState<Rect | null>(null);
  const [lineRect, setLineRect] = useState<Rect | null>(null);

  useEffect(() => {
    if (!isDragging || !dropTarget) {
      setContainerRect(null);
      setLineRect(null);
      return;
    }

    const containerEl = document.querySelector(`[data-el-id="${dropTarget.containerId}"]`);
    if (!containerEl) {
      setContainerRect(null);
      setLineRect(null);
      return;
    }

    const containerBox = containerEl.getBoundingClientRect();
    setContainerRect(containerBox);

    const containerNode = doc.nodes[dropTarget.containerId];
    const excludeId = source?.kind === 'move' ? source.elementId : undefined;
    const childIds = (containerNode?.children ?? []).filter((cid) => cid !== excludeId);

    const style = getComputedStyle(containerEl);
    const isRow = style.display === 'flex' && style.flexDirection.startsWith('row');

    const beforeEl = dropTarget.index > 0 ? document.querySelector(`[data-el-id="${childIds[dropTarget.index - 1]}"]`) : null;
    const afterEl = dropTarget.index < childIds.length ? document.querySelector(`[data-el-id="${childIds[dropTarget.index]}"]`) : null;

    if (isRow) {
      const x = afterEl ? afterEl.getBoundingClientRect().left : beforeEl ? beforeEl.getBoundingClientRect().right : containerBox.left;
      setLineRect({ left: x - 1, top: containerBox.top, width: 2, height: containerBox.height });
    } else {
      const y = afterEl ? afterEl.getBoundingClientRect().top : beforeEl ? beforeEl.getBoundingClientRect().bottom : containerBox.top;
      setLineRect({ left: containerBox.left, top: y - 1, width: containerBox.width, height: 2 });
    }
  }, [isDragging, dropTarget, doc, source]);

  if (!isDragging || !dropTarget) return null;

  return (
    <>
      {containerRect && (
        <div
          className="pointer-events-none fixed z-30 rounded-sm border-2 border-dashed border-blue-500 bg-blue-500/5"
          style={{ left: containerRect.left, top: containerRect.top, width: containerRect.width, height: containerRect.height }}
        />
      )}
      {lineRect && <div className="pointer-events-none fixed z-40 rounded-full bg-blue-500" style={lineRect} />}
    </>
  );
}
