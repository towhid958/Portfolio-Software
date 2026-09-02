import { useEffect, useRef, useState } from 'react';
import { GripVertical, Copy, Trash2, PaintBucket } from 'lucide-react';
import type { ElementId, PageDocument } from '@/lib/builder/document';
import { getWidget } from '@/lib/builder/registry';
import { useDragDrop } from '@/components/builder/dnd/DragDropContext';
import { useSelection } from './SelectionContext';
import { cn } from '@/lib/utils';

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

/**
 * Same measure-on-resize/scroll pattern as useElementRect above, just for a
 * whole set at once (hooks can't be called in a loop, so multi-select needs
 * its own version rather than calling useElementRect per id). Keyed on the
 * joined id string rather than the `ids` array itself, since selectedIds is
 * a fresh array reference on every context update even when its contents
 * haven't changed - re-measuring on every unrelated render would be wasted
 * work.
 */
function useElementRects(ids: ElementId[]): Map<ElementId, DOMRect> {
  const [rects, setRects] = useState<Map<ElementId, DOMRect>>(new Map());
  const key = ids.join(',');

  useEffect(() => {
    const measure = () => {
      const next = new Map<ElementId, DOMRect>();
      for (const id of ids) {
        const el = document.querySelector(`[data-el-id="${id}"]`);
        if (el) next.set(id, el.getBoundingClientRect());
      }
      setRects(next);
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return rects;
}

/** Same pattern again, for the canvas's own scrollable viewport rather than a widget - see the clip wrapper this feeds below. */
function useContainerRect(ref: React.RefObject<HTMLElement | null>): DOMRect | null {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const measure = () => setRect(ref.current ? ref.current.getBoundingClientRect() : null);
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [ref]);

  return rect;
}

interface SelectionOverlayProps {
  doc: PageDocument;
  onDuplicate: (id: ElementId) => void;
  onDelete: (id: ElementId) => void;
  onDuplicateMany: (ids: ElementId[]) => void;
  onDeleteMany: (ids: ElementId[]) => void;
  /** Undefined (not just a no-op) when nothing's been copied yet - the pill only renders when there's actually something to paste. */
  onPasteStyleMany?: ((ids: ElementId[]) => void) | undefined;
  /** The canvas's own scrollable viewport - hover/selection outlines are clipped to this (see the wrapper below) so scrolling a selected element out of view doesn't paint its border over the toolbar/sidebar/rest of the page. */
  viewportRef: React.RefObject<HTMLElement | null>;
}

/** Recomputes on every doc change too, since edits shift layout without moving selectedId/hoveredId themselves. */
export function SelectionOverlay({
  doc,
  onDuplicate,
  onDelete,
  onDuplicateMany,
  onDeleteMany,
  onPasteStyleMany,
  viewportRef,
}: SelectionOverlayProps) {
  const { selectedId, selectedIds, hoveredId } = useSelection();
  const { startDrag, isDragging } = useDragDrop();
  const isMulti = selectedIds.length > 1;
  // The single-select outline/pill and the multi-select outlines/bulk bar
  // are mutually exclusive - only ever measure the one that's actually
  // showing, so a lingering hook subscription doesn't keep re-measuring the
  // other for nothing.
  const selectedRect = useElementRect(!isMulti ? selectedId : null);
  const multiRects = useElementRects(isMulti ? selectedIds : []);
  const hoveredRect = useElementRect(hoveredId && !selectedIds.includes(hoveredId) ? hoveredId : null);
  const viewportRect = useContainerRect(viewportRef);

  // Re-measure after every doc mutation (e.g. a widget just got dropped in),
  // since the DOM shifts without selectedId/hoveredId themselves changing.
  useEffect(() => {
    window.dispatchEvent(new Event('resize'));
  }, [doc]);

  const selectedWidget = !isMulti && selectedId ? getWidget(doc.nodes[selectedId]?.type ?? '') : undefined;

  // Every rect below is viewport-relative (getBoundingClientRect), same as
  // viewportRect itself - subtracting it converts to "relative to the clip
  // wrapper", which is what its children need once the wrapper (not the
  // browser viewport) becomes their containing block (see its own
  // transform comment).
  const toWrapperLeft = (v: number) => v - (viewportRect?.left ?? 0);
  const toWrapperTop = (v: number) => v - (viewportRect?.top ?? 0);

  return (
    <>
      {viewportRect && (
        <div
          className="pointer-events-none fixed z-40 overflow-hidden"
          style={{
            left: viewportRect.left,
            top: viewportRect.top,
            width: viewportRect.width,
            height: viewportRect.height,
            // `overflow: hidden` only clips a `position: fixed` descendant
            // if this element is actually ITS containing block - any
            // transform (even a no-op one) makes that so. Without this, the
            // hover/selection borders below would keep painting at their
            // raw viewport coordinates, ignoring this box's bounds entirely.
            transform: 'translateZ(0)',
          }}
        >
          {hoveredRect && (
            <div
              // Same pink/dashed language as the selected outline, just at half
              // opacity - close enough to read as "this is selectable" without
              // being mistaken for the actual selection.
              className="pointer-events-none fixed border border-pink-500/80"
              style={{
                left: toWrapperLeft(hoveredRect.left),
                top: toWrapperTop(hoveredRect.top),
                width: hoveredRect.width,
                height: hoveredRect.height,
              }}
            />
          )}
          {!isMulti && selectedRect && (
            <>
              <div
                className="pointer-events-none fixed border border-pink-500"
                style={{
                  left: toWrapperLeft(selectedRect.left),
                  top: toWrapperTop(selectedRect.top),
                  width: selectedRect.width,
                  height: selectedRect.height,
                }}
              />
              <div
                // Hidden (not just visually, but from pointer-events entirely)
                // while a drag is in progress - it has no data-el-id, so the
                // canvas's drag hit-test (elementFromPoint) can't see past it
                // to the actual element underneath. Left showing during a
                // drag, it silently ate any drop attempted near the selected
                // element's own top-left corner - most noticeable nesting a
                // second container into one that was already selected, since
                // that's exactly where its own label pill sits.
                className={cn(
                  'fixed flex items-stretch overflow-hidden rounded-t bg-pink-500 text-[11px] font-medium leading-none text-white',
                  isDragging ? 'pointer-events-none opacity-0' : 'pointer-events-auto'
                )}
                style={{
                  left: toWrapperLeft(selectedRect.left),
                  top: toWrapperTop(selectedRect.top),
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
          {isMulti &&
            selectedIds.map((id) => {
              const rect = multiRects.get(id);
              if (!rect) return null;
              return (
                <div
                  key={id}
                  className="pointer-events-none fixed border-2 border-pink-500 bg-pink-500/10"
                  style={{
                    left: toWrapperLeft(rect.left),
                    top: toWrapperTop(rect.top),
                    width: rect.width,
                    height: rect.height,
                  }}
                />
              );
            })}
        </div>
      )}
      {isMulti && (
        // Deliberately outside the clip wrapper above - this is a floating
        // action bar, not a "here's where the element is" indicator, so it
        // stays visible (top-center of the whole editor) regardless of
        // where the selected elements have scrolled to, same as it always has.
        <div className="pointer-events-auto fixed left-1/2 top-3 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-pink-500 px-3 py-1.5 text-xs font-medium text-white shadow-lg">
          <span>{selectedIds.length} selected</span>
          {onPasteStyleMany && (
            <button
              type="button"
              className="flex items-center gap-1 rounded-full bg-white/20 px-2 py-1 hover:bg-white/30"
              onClick={() => onPasteStyleMany(selectedIds)}
            >
              <PaintBucket className="h-3 w-3" /> Paste Style
            </button>
          )}
          <button
            type="button"
            className="flex items-center gap-1 rounded-full bg-white/20 px-2 py-1 hover:bg-white/30"
            onClick={() => onDuplicateMany(selectedIds)}
          >
            <Copy className="h-3 w-3" /> Duplicate
          </button>
          <button
            type="button"
            className="flex items-center gap-1 rounded-full bg-white/20 px-2 py-1 hover:bg-destructive"
            onClick={() => onDeleteMany(selectedIds)}
          >
            <Trash2 className="h-3 w-3" /> Delete
          </button>
        </div>
      )}
    </>
  );
}
