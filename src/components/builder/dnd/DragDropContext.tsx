import { createContext, useCallback, useContext, useRef, useState } from 'react';
import type { ElementId } from '@/lib/builder/document';

export type DragSource =
  | { kind: 'new-widget'; widgetType: string; label: string }
  | { kind: 'move'; elementId: ElementId; label: string };

export interface DropTarget {
  parentId: ElementId;
  index: number;
  /** The container currently highlighted as the drop destination, for outline styling. */
  containerId: ElementId;
}

interface DragDropApi {
  /** Ref the ghost-preview element attaches to - moved via direct style writes, never React state, so pointer moves never trigger a re-render. */
  ghostRef: React.RefObject<HTMLDivElement | null>;
  source: DragSource | null;
  dropTarget: DropTarget | null;
  isDragging: boolean;
  startDrag: (source: DragSource, clientX: number, clientY: number) => void;
  updatePointer: (clientX: number, clientY: number) => void;
  setDropTarget: (target: DropTarget | null) => void;
  /** Clears drag state and returns the last drop target, for the caller to commit the mutation. */
  endDrag: () => { source: DragSource; dropTarget: DropTarget } | null;
}

const DragDropCtx = createContext<DragDropApi | null>(null);

export function DragDropProvider({ children }: { children: React.ReactNode }) {
  const ghostRef = useRef<HTMLDivElement>(null);
  const [source, setSource] = useState<DragSource | null>(null);
  const [dropTarget, setDropTargetState] = useState<DropTarget | null>(null);
  const dropTargetRef = useRef<DropTarget | null>(null);
  const sourceRef = useRef<DragSource | null>(null);

  const positionGhost = useCallback((x: number, y: number) => {
    const el = ghostRef.current;
    if (!el) return;
    el.style.transform = `translate(${x + 12}px, ${y + 12}px)`;
  }, []);

  const startDrag = useCallback((next: DragSource, clientX: number, clientY: number) => {
    sourceRef.current = next;
    setSource(next);
    positionGhost(clientX, clientY);
  }, [positionGhost]);

  const updatePointer = useCallback(
    (clientX: number, clientY: number) => {
      positionGhost(clientX, clientY);
    },
    [positionGhost]
  );

  const setDropTarget = useCallback((target: DropTarget | null) => {
    const prev = dropTargetRef.current;
    const changed =
      (prev?.parentId ?? null) !== (target?.parentId ?? null) ||
      (prev?.index ?? null) !== (target?.index ?? null) ||
      (prev?.containerId ?? null) !== (target?.containerId ?? null);
    dropTargetRef.current = target;
    if (changed) setDropTargetState(target);
  }, []);

  const endDrag = useCallback(() => {
    const finalSource = sourceRef.current;
    const finalTarget = dropTargetRef.current;
    sourceRef.current = null;
    dropTargetRef.current = null;
    setSource(null);
    setDropTargetState(null);
    if (finalSource && finalTarget) return { source: finalSource, dropTarget: finalTarget };
    return null;
  }, []);

  const api: DragDropApi = {
    ghostRef,
    source,
    dropTarget,
    isDragging: source !== null,
    startDrag,
    updatePointer,
    setDropTarget,
    endDrag,
  };

  return <DragDropCtx.Provider value={api}>{children}</DragDropCtx.Provider>;
}

export function useDragDrop(): DragDropApi {
  const ctx = useContext(DragDropCtx);
  if (!ctx) throw new Error('useDragDrop must be used within DragDropProvider');
  return ctx;
}
