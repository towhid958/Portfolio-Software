import { useEffect } from 'react';
import { useDragDrop } from '@/components/builder/dnd/DragDropContext';
import { useSelection } from './SelectionContext';

/**
 * Tracks which element is under the pointer via a single mousemove listener
 * and elementFromPoint, rather than per-widget onMouseEnter/onMouseLeave -
 * bubbling semantics for enter/leave get awkward once widgets nest inside
 * containers (leaving a child back into its still-hovered parent fires the
 * child's mouseleave but not the parent's mouseenter again). One listener
 * with closest() sidesteps that entirely and matches how the drag hit-test
 * already works.
 */
export function useHoverTracking() {
  const { isDragging } = useDragDrop();
  const { setHovered } = useSelection();

  useEffect(() => {
    if (isDragging) {
      setHovered(null);
      return;
    }

    const handleMove = (e: MouseEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const wrapped = el?.closest('[data-el-id]');
      setHovered(wrapped?.getAttribute('data-el-id') ?? null);
    };

    const handleLeaveWindow = (e: MouseEvent) => {
      if (!e.relatedTarget) setHovered(null);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseout', handleLeaveWindow);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseout', handleLeaveWindow);
    };
  }, [isDragging, setHovered]);
}
