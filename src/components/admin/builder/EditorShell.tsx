import { useEffect, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  Monitor,
  Tablet,
  Smartphone,
  ChevronLeft,
  Save,
  ExternalLink,
  Undo2,
  Redo2,
  ListTree,
  Scissors,
  Copy,
  ClipboardPaste,
  CopyPlus,
  CornerLeftUp,
  Trash2,
} from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { logActivity } from '@/utils/audit';
import { isSlugConflictError } from '@/lib/slug';
import { useSavedState } from '@/hooks/useSavedState';
import { useDocHistory } from '@/lib/builder/history';
import {
  createEmptyDocument,
  insertElement,
  createElement,
  updateElement,
  removeElement,
  moveElement,
  duplicateElement,
  renameElement,
  copySubtree,
  pasteSubtree,
  isPageDocument,
  type ElementId,
  type PageDocument,
  type ClipboardSubtree,
} from '@/lib/builder/document';
import { getWidget } from '@/lib/builder/registry';
import type { BreakpointId } from '@/lib/builder/breakpoints';
import { resolveValue, setValue, literal } from '@/lib/builder/styleValue';
import { length, defaultDisplay } from '@/lib/builder/valueTypes';
import { DragDropProvider, type DropTarget } from '@/components/builder/dnd/DragDropContext';
import { DragGhost } from '@/components/builder/dnd/DragGhost';
import { DropIndicator } from '@/components/builder/dnd/DropIndicator';
import { hitTestContainer } from '@/components/builder/dnd/hitTest';
import { SelectionProvider, useSelection } from '@/components/builder/selection/SelectionContext';
import { SelectionOverlay } from '@/components/builder/selection/SelectionOverlay';
import { Toolbox } from './Toolbox';
import { Canvas } from './Canvas';
import { SettingsPanel } from './SettingsPanel';
import { PageSettingsDialog } from './PageSettingsDialog';
import { Navigator } from './Navigator';
import '@/components/builder/widgets';

type DeviceSize = 'desktop' | 'tablet' | 'mobile';
const DEVICE_WIDTH: Record<DeviceSize, string> = { desktop: '100%', tablet: '768px', mobile: '390px' };
const DEVICE_BREAKPOINTS: Record<DeviceSize, BreakpointId[]> = {
  desktop: ['desktop'],
  tablet: ['desktop', 'tablet'],
  mobile: ['desktop', 'tablet', 'mobile'],
};

export interface PageRecord {
  id: string;
  title: string;
  slug: string;
  status: string;
  sections: unknown;
  seo_title: string | null;
  seo_description: string | null;
  og_image: string | null;
}

export function EditorShell({ page }: { page: PageRecord | null }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { doc, setDoc, undo, redo, canUndo, canRedo } = useDocHistory(
    page && isPageDocument(page.sections) ? page.sections : createEmptyDocument()
  );
  const [device, setDevice] = useState<DeviceSize>('desktop');
  const [title, setTitle] = useState(page?.title ?? 'Untitled Page');
  const [slug, setSlug] = useState(page?.slug ?? '');
  const [status, setStatus] = useState(page?.status ?? 'draft');
  const [seoTitle, setSeoTitle] = useState(page?.seo_title ?? '');
  const [seoDescription, setSeoDescription] = useState(page?.seo_description ?? '');
  const [ogImage, setOgImage] = useState(page?.og_image ?? '');
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'error'>('idle');
  const [isDirty, setIsDirty] = useState(false);
  const [justSaved, setJustSaved] = useSavedState(isDirty);

  // Covers the browser/tab-close case; in-app navigation (the Back button)
  // is guarded separately below since beforeunload can't intercept that.
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title,
        slug,
        status,
        sections: doc as any,
        seo_title: seoTitle || null,
        seo_description: seoDescription || null,
        og_image: ogImage || null,
      };
      if (page?.id) {
        const { error } = await supabase.from('pages').update(payload).eq('id', page.id);
        if (error) throw error;
        await logActivity('pages', 'update_page', { id: page.id, title, slug });
        return { id: page.id, slug };
      }
      const { data, error } = await supabase.from('pages').insert(payload).select().single();
      if (error) throw error;
      await logActivity('pages', 'create_page', { id: data.id, title, slug });
      return { id: data.id as string, slug: data.slug as string };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['admin-pages'] });
      setIsDirty(false);
      setJustSaved(true);
      if (!page?.id) {
        toast.success('Page created');
        navigate({ to: '/admin/pages/edit/$pageSlug', params: { pageSlug: result.slug } });
      } else {
        toast.success('Page saved');
      }
    },
    onError: (error: any) => {
      if (isSlugConflictError(error)) {
        toast.error('That URL is already in use - pick a different one in Page Settings.');
        return;
      }
      toast.error(`Save failed: ${error.message}`);
    },
  });

  const handleBack = () => {
    if (isDirty && !confirm('You have unsaved changes. Leave without saving?')) return;
    navigate({ to: '/admin/pages' });
  };

  return (
    <DragDropProvider>
      <SelectionProvider>
        <EditorShellInner
          doc={doc}
          setDoc={setDoc}
          undo={undo}
          redo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
          markDirty={() => setIsDirty(true)}
          device={device}
          setDevice={setDevice}
          title={title}
          setTitle={(v) => {
            setTitle(v);
            setIsDirty(true);
          }}
          slug={slug}
          setSlug={(v) => {
            setSlug(v);
            setIsDirty(true);
          }}
          status={status}
          setStatus={(v) => {
            setStatus(v);
            setIsDirty(true);
          }}
          seoTitle={seoTitle}
          setSeoTitle={(v) => {
            setSeoTitle(v);
            setIsDirty(true);
          }}
          seoDescription={seoDescription}
          setSeoDescription={(v) => {
            setSeoDescription(v);
            setIsDirty(true);
          }}
          ogImage={ogImage}
          setOgImage={(v) => {
            setOgImage(v);
            setIsDirty(true);
          }}
          slugStatus={slugStatus}
          setSlugStatus={setSlugStatus}
          excludeId={page?.id}
          onSave={() => saveMutation.mutate()}
          isSaving={saveMutation.isPending}
          justSaved={justSaved}
          onBack={handleBack}
        />
      </SelectionProvider>
    </DragDropProvider>
  );
}

function EditorShellInner({
  doc,
  setDoc,
  undo,
  redo,
  canUndo,
  canRedo,
  markDirty,
  device,
  setDevice,
  title,
  setTitle,
  slug,
  setSlug,
  status,
  setStatus,
  seoTitle,
  setSeoTitle,
  seoDescription,
  setSeoDescription,
  ogImage,
  setOgImage,
  slugStatus,
  setSlugStatus,
  excludeId,
  onSave,
  isSaving,
  justSaved,
  onBack,
}: {
  doc: PageDocument;
  setDoc: (updater: PageDocument | ((prev: PageDocument) => PageDocument), opts?: { coalesceKey?: string }) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  markDirty: () => void;
  device: DeviceSize;
  setDevice: (d: DeviceSize) => void;
  title: string;
  setTitle: (v: string) => void;
  slug: string;
  setSlug: (v: string) => void;
  status: string;
  setStatus: (v: string) => void;
  seoTitle: string;
  setSeoTitle: (v: string) => void;
  seoDescription: string;
  setSeoDescription: (v: string) => void;
  ogImage: string;
  setOgImage: (v: string) => void;
  slugStatus: 'idle' | 'checking' | 'available' | 'taken' | 'error';
  setSlugStatus: (v: 'idle' | 'checking' | 'available' | 'taken' | 'error') => void;
  excludeId?: string | undefined;
  onSave: () => void;
  isSaving: boolean;
  justSaved: boolean;
  onBack: () => void;
}) {
  const { selectedId, select } = useSelection();
  const [showNavigator, setShowNavigator] = useState(false);
  // Which element the canvas's own right-click context menu is currently
  // targeting - tracked separately from selectedId (rather than just
  // reading selectedId at render time) because it's set synchronously in
  // the same handler that opens the menu, so the menu's contents can never
  // be a stale frame behind the click that opened it.
  const [contextMenuId, setContextMenuId] = useState<ElementId | null>(null);
  // Where a Paste from this menu should land - captured at the moment the
  // menu opens (the right-click), since by the time its Paste item is
  // actually clicked the mouse has moved onto the menu popup itself and no
  // longer points at a spot on the canvas. A ref: it's write-once-per-open
  // and only ever read inside a click handler, never rendered.
  const contextMenuPasteTargetRef = useRef<DropTarget | null>(null);

  // Undo/redo can bring back a document where the currently-selected id no
  // longer exists (undoing past a delete's own select(null) doesn't restore
  // it; undoing an insert/duplicate removes the very element that's
  // selected) - getElement() throws on an unknown id, so leaving a stale
  // selection in place would crash SettingsPanel the next render.
  useEffect(() => {
    if (selectedId && !doc.nodes[selectedId]) select(null);
  }, [doc, selectedId, select]);

  const handleUpdate = (id: ElementId, patch: Record<string, any>) => {
    setDoc((prev) => updateElement(prev, id, patch), { coalesceKey: id });
    markDirty();
  };

  const handleDelete = (id: ElementId) => {
    setDoc((prev) => removeElement(prev, id));
    select(null);
    markDirty();
  };

  const handleDuplicate = (id: ElementId) => {
    const { doc: next, newId } = duplicateElement(doc, id);
    setDoc(next);
    select(newId);
    markDirty();
  };

  const handleRename = (id: ElementId, name: string) => {
    setDoc((prev) => renameElement(prev, id, name));
    markDirty();
  };

  const handleMove = (id: ElementId, newParentId: ElementId, index: number) => {
    setDoc((prev) => moveElement(prev, id, newParentId, index));
    markDirty();
  };

  // In-editor only, not the real OS clipboard - a subtree (an element plus
  // all its descendants) isn't representable as copyable text/HTML, and a
  // ref is enough since it only needs to survive within this session.
  // hasClipboard mirrors "clipboardRef.current !== null" as real state
  // purely so the context menu's Paste item can reactively enable/disable
  // itself - a ref write alone doesn't trigger a re-render.
  const clipboardRef = useRef<ClipboardSubtree | null>(null);
  const [hasClipboard, setHasClipboard] = useState(false);

  const handleCopy = (id: ElementId) => {
    clipboardRef.current = copySubtree(doc, id);
    setHasClipboard(true);
  };

  const handleCut = (id: ElementId) => {
    handleCopy(id);
    handleDelete(id);
  };

  const handleSelectParent = (id: ElementId) => {
    const parentId = doc.nodes[id]?.parent;
    if (parentId) select(parentId);
  };

  // Tracks the mouse position continuously (not just mid-drag, unlike
  // useDropZone's listener) purely so keyboard Ctrl+V has somewhere to
  // paste "at the cursor" without needing an actual pointer event to read
  // coordinates from. A ref, not state - this fires on every mouse move
  // and nothing needs to re-render because of it.
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    const handler = (e: PointerEvent) => {
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('pointermove', handler);
    return () => window.removeEventListener('pointermove', handler);
  }, []);

  // Pastes at the same spot a drag-and-drop drop would land - reusing
  // hitTestContainer means "hover a container, land inside it" / "hover a
  // regular widget, land right before/after it" behave exactly like they
  // already do when dropping something from the Toolbox, instead of a
  // second, differently-behaving placement rule to learn. `target` lets
  // the context menu pass the exact spot it was opened at (its Paste item
  // is clicked later, once the mouse has moved onto the menu itself, so by
  // then the live cursor position no longer points at the canvas).
  // Falls back to appending at the end of the root when the cursor isn't
  // over the canvas at all (e.g. Ctrl+V while hovering the sidebar).
  const handlePaste = (target?: DropTarget | null) => {
    const clip = clipboardRef.current;
    if (!clip) return;
    const resolved =
      target !== undefined
        ? target
        : lastPointerRef.current
          ? hitTestContainer(document, doc, lastPointerRef.current.x, lastPointerRef.current.y)
          : null;
    const targetParentId = resolved?.parentId ?? doc.rootId;
    const { doc: next, newId } = pasteSubtree(doc, clip, targetParentId, resolved?.index);
    setDoc(next);
    select(newId);
    markDirty();
  };

  // Arrow keys move an absolutely/fixed/sticky-positioned element by its
  // top/left offset (Shift = 10px instead of 1px) - a no-op for anything in
  // normal flow, where there's no equivalent single CSS offset to nudge
  // (structural reordering already has a dedicated UI - the Navigator's
  // drag-and-drop). Always edits the Normal state at the current device
  // breakpoint, regardless of whichever state the Settings panel's own
  // toggle happens to be showing - nudging a hover-only offset from the
  // keyboard would be more surprising than useful.
  const handleNudge = (id: ElementId, dx: number, dy: number) => {
    const node = doc.nodes[id];
    if (!node) return;
    // No fallback to defaultPosition() here on purpose - every element is
    // CSS position:relative by default (see BASE_ELEMENT_CSS), but that's
    // an implementation detail, not a deliberate "this element is
    // positioned" choice the user made via the Position field. Nudging an
    // element the user never explicitly positioned would shift it visually
    // while its normal-flow layout slot stays put, which reads as a bug,
    // not a feature - so treat "nothing explicitly set" the same as static.
    const position = resolveValue(node.advanced.position, device, 'normal');
    if (!position || position.type === 'static') return;
    const nextPosition = {
      ...position,
      top: length((position.top?.value ?? 0) + dy, position.top?.unit ?? 'px'),
      left: length((position.left?.value ?? 0) + dx, position.left?.unit ?? 'px'),
    };
    handleUpdate(id, { advanced: { ...node.advanced, position: setValue(node.advanced.position, device, 'normal', nextPosition) } });
  };

  // All editor-level keyboard shortcuts in one place - skipped while focus
  // is in a text field so none of them fight that field's own native
  // behaviour (typing, its own undo, browser find, etc.).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const active = document.activeElement;
      const isTextInput =
        active instanceof HTMLElement &&
        (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);
      if (isTextInput) return;

      const ctrlOrCmd = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if (ctrlOrCmd && (key === 'z' || key === 'y')) {
        e.preventDefault();
        if (key === 'y' || e.shiftKey) redo();
        else undo();
        markDirty();
        return;
      }
      if (ctrlOrCmd && key === 'c' && selectedId) {
        handleCopy(selectedId);
        return;
      }
      if (ctrlOrCmd && key === 'x' && selectedId) {
        e.preventDefault();
        handleCut(selectedId);
        return;
      }
      if (ctrlOrCmd && key === 'v' && clipboardRef.current) {
        e.preventDefault();
        handlePaste();
        return;
      }
      if (ctrlOrCmd && key === 'd' && selectedId) {
        // Browsers bind Ctrl+D to "bookmark this page" - within the editor
        // it should duplicate the selected element instead, matching the
        // context menu's Duplicate item.
        e.preventDefault();
        handleDuplicate(selectedId);
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault();
        handleDelete(selectedId);
        return;
      }
      if (e.key === 'Escape' && selectedId) {
        select(null);
        return;
      }
      if (selectedId && (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        const node = doc.nodes[selectedId];
        const position = node && resolveValue(node.advanced.position, device, 'normal');
        if (!position || position.type === 'static') return; // let the key do its default thing (e.g. scroll)
        e.preventDefault();
        handleNudge(selectedId, dx, dy);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -m-8">
      <div className="flex items-center justify-between gap-4 border-b bg-card px-4 py-2.5 shrink-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Button type="button" variant="ghost" size="icon" onClick={onBack}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-8 w-56 border-transparent bg-transparent font-medium shadow-none hover:border-input focus-visible:border-input"
          />
          <PageSettingsDialog
            title={title}
            slug={slug}
            onSlugChange={setSlug}
            onSlugStatusChange={setSlugStatus}
            excludeId={excludeId}
            seoTitle={seoTitle}
            onSeoTitleChange={setSeoTitle}
            seoDescription={seoDescription}
            onSeoDescriptionChange={setSeoDescription}
            ogImage={ogImage}
            onOgImageChange={setOgImage}
          />
          {status === 'published' && slug && (
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" title="View published page" asChild>
              <a href={`/${slug}`} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              'h-8 w-8 hover:bg-primary hover:text-primary-foreground',
              showNavigator && 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground'
            )}
            title="Layers"
            onClick={() => setShowNavigator((v) => !v)}
          >
            <ListTree className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1 rounded-lg border p-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Undo (Ctrl+Z)"
            disabled={!canUndo}
            onClick={() => {
              undo();
              markDirty();
            }}
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Redo (Ctrl+Shift+Z)"
            disabled={!canRedo}
            onClick={() => {
              redo();
              markDirty();
            }}
          >
            <Redo2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1 rounded-lg border p-1">
          {([
            ['desktop', Monitor],
            ['tablet', Tablet],
            ['mobile', Smartphone],
          ] as const).map(([value, Icon]) => (
            <Button
              key={value}
              type="button"
              variant="ghost"
              size="icon"
              className={cn('h-7 w-7', device === value && 'bg-muted')}
              onClick={() => setDevice(value)}
            >
              <Icon className="h-4 w-4" />
            </Button>
          ))}
        </div>

        <div className="flex flex-1 items-center justify-end gap-2">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-8 w-32 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            size="sm"
            className="gap-2"
            disabled={isSaving || slugStatus === 'checking' || slugStatus === 'taken'}
            onClick={onSave}
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving...' : justSaved ? 'Saved' : 'Save'}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="w-80 shrink-0 border-r bg-card overflow-y-auto">
          {selectedId ? (
            <SettingsPanel
              doc={doc}
              selectedId={selectedId}
              breakpoint={device}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onDeselect={() => select(null)}
            />
          ) : (
            <Toolbox />
          )}
        </div>

        <ContextMenu onOpenChange={(open) => { if (!open) setContextMenuId(null); }}>
          <ContextMenuTrigger
            className="flex-1 min-w-0 overflow-auto bg-muted/40 flex justify-center"
            onContextMenu={(e) => {
              // Deliberately doesn't call e.preventDefault() - Radix's own
              // handler (composed after this one) is what actually opens
              // the menu and suppresses the native browser menu; calling
              // it here too would short-circuit that composition and the
              // menu would never open. See composeEventHandlers in
              // @radix-ui/react-context-menu.
              const targetEl = (e.target as HTMLElement).closest('[data-el-id]');
              const id = targetEl?.getAttribute('data-el-id') ?? null;
              const isRoot = !id || id === doc.rootId;
              setContextMenuId(isRoot ? doc.rootId : id);
              select(isRoot ? null : id);
              contextMenuPasteTargetRef.current = hitTestContainer(document, doc, e.clientX, e.clientY);
            }}
          >
            <Canvas
              doc={doc}
              width={DEVICE_WIDTH[device]}
              enabledBreakpoints={DEVICE_BREAKPOINTS[device]}
              onDrop={(source, target) => {
                if (source.kind === 'move') {
                  setDoc((prev) => moveElement(prev, source.elementId, target.parentId, target.index));
                  markDirty();
                  return;
                }
                const widget = getWidget(source.widgetType);
                if (!widget) return;
                const node = createElement(source.widgetType, { ...widget.defaultContent }, target.parentId);
                if (widget.defaultDesign) node.design = widget.defaultDesign;
                if (widget.defaultAdvanced) node.advanced = widget.defaultAdvanced;
                // A fresh Container defaults to row direction (see its own
                // defaultDesign) - right for a top-level section holding
                // side-by-side columns, but a Container nested inside
                // anything other than the page root is far more often a
                // column itself, stacking its own content vertically. Only
                // this one widget type gets the override (not every
                // isContainer widget) since Container is the one whose row/
                // column choice is genuinely ambiguous by default.
                if (source.widgetType === 'container' && target.parentId !== doc.rootId) {
                  const base = resolveValue(node.design.display, 'desktop', 'normal') ?? defaultDisplay('flex');
                  node.design = { ...node.design, display: literal({ ...base, type: 'flex', direction: 'column' }) };
                }
                setDoc((prev) => insertElement(prev, node, target.parentId, target.index));
                markDirty();
              }}
            />
          </ContextMenuTrigger>
          <ContextMenuContent className="w-56">
            {contextMenuId && contextMenuId !== doc.rootId ? (
              <>
                <ContextMenuItem onSelect={() => handleCut(contextMenuId)}>
                  <Scissors className="mr-2 h-4 w-4" />
                  Cut
                  <ContextMenuShortcut>Ctrl+X</ContextMenuShortcut>
                </ContextMenuItem>
                <ContextMenuItem onSelect={() => handleCopy(contextMenuId)}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy
                  <ContextMenuShortcut>Ctrl+C</ContextMenuShortcut>
                </ContextMenuItem>
                <ContextMenuItem disabled={!hasClipboard} onSelect={() => handlePaste(contextMenuPasteTargetRef.current)}>
                  <ClipboardPaste className="mr-2 h-4 w-4" />
                  Paste
                  <ContextMenuShortcut>Ctrl+V</ContextMenuShortcut>
                </ContextMenuItem>
                <ContextMenuItem onSelect={() => handleDuplicate(contextMenuId)}>
                  <CopyPlus className="mr-2 h-4 w-4" />
                  Duplicate
                  <ContextMenuShortcut>Ctrl+D</ContextMenuShortcut>
                </ContextMenuItem>
                {doc.nodes[contextMenuId]?.parent && (
                  <>
                    <ContextMenuSeparator />
                    <ContextMenuItem onSelect={() => handleSelectParent(contextMenuId)}>
                      <CornerLeftUp className="mr-2 h-4 w-4" />
                      Select Parent
                    </ContextMenuItem>
                  </>
                )}
                <ContextMenuSeparator />
                <ContextMenuItem
                  className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                  onSelect={() => handleDelete(contextMenuId)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                  <ContextMenuShortcut>Del</ContextMenuShortcut>
                </ContextMenuItem>
              </>
            ) : (
              <ContextMenuItem disabled={!hasClipboard} onSelect={() => handlePaste(contextMenuPasteTargetRef.current)}>
                <ClipboardPaste className="mr-2 h-4 w-4" />
                Paste
                <ContextMenuShortcut>Ctrl+V</ContextMenuShortcut>
              </ContextMenuItem>
            )}
          </ContextMenuContent>
        </ContextMenu>
      </div>

      <DragGhost />
      <DropIndicator doc={doc} />
      <SelectionOverlay doc={doc} onDuplicate={handleDuplicate} onDelete={handleDelete} />
      {showNavigator && (
        <Navigator
          doc={doc}
          selectedId={selectedId}
          onSelect={select}
          onRename={handleRename}
          onDuplicate={handleDuplicate}
          onDelete={handleDelete}
          onMove={handleMove}
          onClose={() => setShowNavigator(false)}
        />
      )}
    </div>
  );
}
