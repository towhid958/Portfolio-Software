import { useEffect } from 'react';
import type { PageDocument } from '@/lib/builder/document';
import { useDragDrop, type DragSource, type DropTarget } from './DragDropContext';
import { hitTestContainer } from './hitTest';

/**
 * Single pointermove/pointerup listener pair on the window, active only
 * while dragging. The canvas renders in the same document as the rest of
 * the editor (no iframe), so there's no coordinate translation or second
 * listener set to keep in sync - just one hit-test against the live DOM.
 */
export function useDropZone(doc: PageDocument, onDrop: (source: DragSource, target: DropTarget) => void) {
  const { isDragging, source, updatePointer, setDropTarget, endDrag } = useDragDrop();

  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e: PointerEvent) => {
      updatePointer(e.clientX, e.clientY);
      const excludeId = source?.kind === 'move' ? source.elementId : undefined;
      setDropTarget(hitTestContainer(document, doc, e.clientX, e.clientY, excludeId));
    };

    const handleUp = () => {
      const result = endDrag();
      if (result) onDrop(result.source, result.dropTarget);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [isDragging, source, doc, onDrop, updatePointer, setDropTarget, endDrag]);
}
