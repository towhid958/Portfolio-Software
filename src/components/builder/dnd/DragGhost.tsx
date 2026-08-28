import { useDragDrop } from './DragDropContext';

/**
 * Follows the cursor while dragging. Positioned via direct style writes on
 * every pointer move (see DragDropContext.updatePointer) rather than React
 * state, so dragging never re-renders the tree.
 */
export function DragGhost() {
  const { ghostRef, source } = useDragDrop();

  if (!source) return null;

  return (
    <div
      ref={ghostRef}
      className="pointer-events-none fixed left-0 top-0 z-[9999] rounded-md bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-lg"
      style={{ transform: 'translate(-9999px, -9999px)' }}
    >
      {source.label}
    </div>
  );
}
