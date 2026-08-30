import { useRef, useState } from 'react';
import { ChevronRight, ChevronDown, Copy, Trash2, Pencil, ListTree, X, GripHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { getWidget } from '@/lib/builder/registry';
import { isAncestor, type ElementId, type PageDocument } from '@/lib/builder/document';
import { cn } from '@/lib/utils';

const PANEL_WIDTH = 272;
const DEFAULT_POSITION = { x: 16, y: 72 };

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), Math.max(min, max));
}

type DropPosition = 'before' | 'after' | 'inside';
interface DropState {
  id: ElementId;
  position: DropPosition;
}

interface NavigatorProps {
  doc: PageDocument;
  selectedId: ElementId | null;
  onSelect: (id: ElementId | null) => void;
  onRename: (id: ElementId, name: string) => void;
  onDuplicate: (id: ElementId) => void;
  onDelete: (id: ElementId) => void;
  onClose: () => void;
  onMove: (id: ElementId, newParentId: ElementId, index: number) => void;
}

export function Navigator({ doc, selectedId, onSelect, onRename, onDuplicate, onDelete, onMove, onClose }: NavigatorProps) {
  const [collapsed, setCollapsed] = useState<Set<ElementId>>(new Set());
  const [draggingId, setDraggingId] = useState<ElementId | null>(null);
  const [dropState, setDropState] = useState<DropState | null>(null);
  const [renamingId, setRenamingId] = useState<ElementId | null>(null);
  const [position, setPosition] = useState(DEFAULT_POSITION);
  const dragOrigin = useRef<{ pointerX: number; pointerY: number; panelX: number; panelY: number } | null>(null);

  function handleTitleBarPointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragOrigin.current = { pointerX: e.clientX, pointerY: e.clientY, panelX: position.x, panelY: position.y };
  }

  function handleTitleBarPointerMove(e: React.PointerEvent) {
    if (!dragOrigin.current || e.buttons !== 1) return;
    const origin = dragOrigin.current;
    const nextX = clamp(origin.panelX + (e.clientX - origin.pointerX), 0, window.innerWidth - PANEL_WIDTH);
    const nextY = clamp(origin.panelY + (e.clientY - origin.pointerY), 0, window.innerHeight - 40);
    setPosition({ x: nextX, y: nextY });
  }

  const toggleCollapsed = (id: ElementId) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  function handleDragOver(e: React.DragEvent, id: ElementId, isContainer: boolean) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientY - rect.top) / rect.height;
    // A container's middle band drops INTO it; a leaf widget only ever
    // offers before/after (split 50/50, no middle band) since it can't
    // hold children.
    let position: DropPosition;
    if (isContainer) {
      position = ratio < 0.3 ? 'before' : ratio > 0.7 ? 'after' : 'inside';
    } else {
      position = ratio < 0.5 ? 'before' : 'after';
    }
    setDropState({ id, position });
  }

  function handleDrop(e: React.DragEvent, targetId: ElementId) {
    e.preventDefault();
    const sourceId = draggingId;
    setDraggingId(null);
    const drop = dropState;
    setDropState(null);
    if (!sourceId || !drop || drop.id !== targetId) return;
    if (sourceId === targetId) return;
    // moveElement itself also refuses this, but skipping it here avoids
    // ever showing a misleading "valid" drop and then silently no-op'ing.
    if (isAncestor(doc, sourceId, targetId)) return;

    const targetNode = doc.nodes[targetId];
    if (!targetNode) return;

    if (drop.position === 'inside') {
      onMove(sourceId, targetId, targetNode.children.length);
      return;
    }
    const parentId = targetNode.parent;
    if (!parentId) return;
    const parent = doc.nodes[parentId];
    if (!parent) return;
    const idx = parent.children.indexOf(targetId);
    onMove(sourceId, parentId, drop.position === 'before' ? idx : idx + 1);
  }

  function renderRow(id: ElementId, depth: number): React.ReactNode {
    const node = doc.nodes[id];
    if (!node) return null;
    const widget = getWidget(node.type);
    if (!widget) return null;
    const isRoot = id === doc.rootId;
    const isContainer = !!widget.isContainer;
    const hasChildren = node.children.length > 0;
    const isCollapsed = collapsed.has(id);
    const isSelected = selectedId === id;
    const isDropTarget = dropState?.id === id;
    const label = node.advanced.name || widget.label;
    const Icon = widget.icon;

    return (
      <div key={id}>
        <div
          draggable={!isRoot}
          onDragStart={(e) => {
            e.stopPropagation();
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', id);
            setDraggingId(id);
          }}
          onDragEnd={() => {
            setDraggingId(null);
            setDropState(null);
          }}
          onDragOver={(e) => {
            e.stopPropagation();
            if (isRoot && !isContainer) return;
            handleDragOver(e, id, isContainer);
          }}
          onDrop={(e) => {
            e.stopPropagation();
            handleDrop(e, id);
          }}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(id === doc.rootId ? null : id);
          }}
          className={cn(
            'group flex items-center gap-1 rounded px-1.5 py-1 text-xs cursor-pointer select-none border-t-2 border-b-2 border-transparent',
            isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-muted',
            draggingId === id && 'opacity-40',
            isDropTarget && dropState?.position === 'before' && 'border-t-primary',
            isDropTarget && dropState?.position === 'after' && 'border-b-primary',
            isDropTarget && dropState?.position === 'inside' && 'bg-primary/15'
          )}
          style={{ paddingLeft: 6 + depth * 14 }}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleCollapsed(id);
            }}
            className={cn('flex h-4 w-4 shrink-0 items-center justify-center text-muted-foreground', !hasChildren && 'invisible')}
          >
            {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />

          {renamingId === id ? (
            <Input
              autoFocus
              defaultValue={label}
              onClick={(e) => e.stopPropagation()}
              onBlur={(e) => {
                onRename(id, e.target.value.trim() || widget.label);
                setRenamingId(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
                if (e.key === 'Escape') setRenamingId(null);
              }}
              className="h-5 flex-1 px-1 text-xs"
            />
          ) : (
            <span className="flex-1 truncate">{label}</span>
          )}

          {!isRoot && renamingId !== id && (
            <div className="hidden shrink-0 items-center gap-0.5 group-hover:flex">
              <button
                type="button"
                title="Rename"
                onClick={(e) => {
                  e.stopPropagation();
                  setRenamingId(id);
                }}
                className="flex h-5 w-5 items-center justify-center rounded hover:bg-background"
              >
                <Pencil className="h-3 w-3" />
              </button>
              <button
                type="button"
                title="Duplicate"
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate(id);
                }}
                className="flex h-5 w-5 items-center justify-center rounded hover:bg-background"
              >
                <Copy className="h-3 w-3" />
              </button>
              <button
                type="button"
                title="Delete"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(id);
                }}
                className="flex h-5 w-5 items-center justify-center rounded text-destructive hover:bg-background"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
        {hasChildren && !isCollapsed && node.children.map((childId) => renderRow(childId, depth + 1))}
      </div>
    );
  }

  return (
    <div
      className="fixed z-50 flex max-h-[70vh] flex-col rounded-lg border bg-card shadow-xl"
      style={{ left: position.x, top: position.y, width: PANEL_WIDTH }}
    >
      <div
        onPointerDown={handleTitleBarPointerDown}
        onPointerMove={handleTitleBarPointerMove}
        className="flex shrink-0 cursor-grab items-center gap-1.5 rounded-t-lg border-b bg-muted/50 px-2 py-1.5 active:cursor-grabbing"
      >
        <ListTree className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="flex-1 text-xs font-medium">Layers</span>
        <GripHorizontal className="h-3.5 w-3.5 text-muted-foreground/50" />
        <button
          type="button"
          // Stops the title bar's own onPointerDown (drag start) from
          // firing first - it bubbles up from here otherwise, and since
          // that handler calls setPointerCapture on the title bar div (via
          // e.currentTarget), the resulting pointerup/click would be
          // redirected there instead of this button, so onClick below
          // would silently never fire.
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onClose}
          className="flex h-5 w-5 items-center justify-center rounded hover:bg-background"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2" onClick={() => onSelect(null)}>
        {renderRow(doc.rootId, 0)}
      </div>
    </div>
  );
}
