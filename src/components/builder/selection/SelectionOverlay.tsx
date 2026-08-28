import { useEffect, useState } from 'react';
import { GripVertical, Copy, Trash2 } from 'lucide-react';
import type { ElementId, PageDocument } from '@/lib/builder/document';
import { getWidget } from '@/lib/builder/registry';
import { useDragDrop } from '@/components/builder/dnd/DragDropContext';
import { useSelection } from './SelectionContext';

function useElementRect(id: string | null): DOMRect | null {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!id) {
      setRect(null);
      return;
    }

    const measure = () => {
      const el = document.querySelector(`[data-el-id="${id}"]`);
      setRect(el ? el.getBoundingClientRect() : null);
    };

    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [id]);

  return rect;
}

interface SelectionOverlayProps {
  doc: PageDocument;
  onDuplicate: (id: ElementId) => void;
  onDelete: (id: ElementId) => void;
}

/** Recomputes on every doc change too, since edits shift layout without moving selectedId/hoveredId themselves. */
export function SelectionOverlay({ doc, onDuplicate, onDelete }: SelectionOverlayProps) {
  const { selectedId, hoveredId } = useSelection();
  const { startDrag } = useDragDrop();
  const selectedRect = useElementRect(selectedId);
  const hoveredRect = useElementRect(hoveredId !== selectedId ? hoveredId : null);

  // Re-measure after every doc mutation (e.g. a widget just got dropped in),
  // since the DOM shifts without selectedId/hoveredId themselves changing.
  useEffect(() => {
    window.dispatchEvent(new Event('resize'));
  }, [doc]);

  const selectedWidget = selectedId ? getWidget(doc.nodes[selectedId]?.type ?? '') : undefined;

  return (
    <>
      {hoveredRect && (
        <div
          // Same pink/dashed language as the selected outline, just at half
          // opacity - close enough to read as "this is selectable" without
          // being mistaken for the actual selection.
          className="pointer-events-none fixed z-40 border border-dashed border-pink-500/50"
          style={{
            left: hoveredRect.left,
            top: hoveredRect.top,
            width: hoveredRect.width,
            height: hoveredRect.height,
          }}
        />
      )}
      {selectedRect && (
        <>
          <div
            className="pointer-events-none fixed z-40 border border-dashed border-pink-500"
            style={{
              left: selectedRect.left,
              top: selectedRect.top,
              width: selectedRect.width,
              height: selectedRect.height,
            }}
          />
          <div
            className="pointer-events-auto fixed z-40 flex items-stretch overflow-hidden rounded-t bg-pink-500 text-[11px] font-medium leading-none text-white"
            style={{
              left: selectedRect.left,
              top: selectedRect.top,
              transform: selectedRect.top >= 22 ? 'translateY(-100%)' : 'translateY(0)',
            }}
          >
            <button
              type="button"
              className="flex cursor-grab items-center gap-1 px-1.5 py-1 active:cursor-grabbing"
              onPointerDown={(e) => {
                if (!selectedId) return;
                e.preventDefault();
                startDrag({ kind: 'move', elementId: selectedId, label: selectedWidget?.label ?? 'Element' }, e.clientX, e.clientY);
              }}
            >
              <GripVertical className="h-3 w-3" />
              {selectedWidget?.label ?? 'Element'}
            </button>
            <button
              type="button"
              title="Duplicate"
              className="flex items-center px-1.5 hover:bg-white/20"
              onClick={() => selectedId && onDuplicate(selectedId)}
            >
              <Copy className="h-3 w-3" />
            </button>
            <button
              type="button"
              title="Delete"
              className="flex items-center px-1.5 hover:bg-destructive"
              onClick={() => selectedId && onDelete(selectedId)}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </>
      )}
    </>
  );
}
