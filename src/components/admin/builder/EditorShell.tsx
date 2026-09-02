import { useEffect, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
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
  Paintbrush,
  PaintBucket,
  BookmarkPlus,
  Palette,
  Keyboard,
  History,
  UploadCloud,
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
  type DesignProperties,
  type AdvancedProperties,
} from '@/lib/builder/document';
import { getWidget } from '@/lib/builder/registry';
import type { BreakpointId } from '@/lib/builder/breakpoints';
import { resolveValue, setValue, literal } from '@/lib/builder/styleValue';
import { length, defaultDisplay } from '@/lib/builder/valueTypes';
import { isColumnPreset, insertColumnsPreset } from '@/lib/builder/columnPresets';
import { fetchTemplates, createTemplate, TEMPLATES_QUERY_KEY } from '@/lib/builder/templateLibrary';
import { pageVersionsQueryKey } from '@/lib/builder/pageVersions';
import { getThemeSettings, updateThemeSettings } from '@/lib/theme.functions';
import { defaultThemeSettings, type ThemeSettings } from '@/lib/builder/theme';
import { ThemeTokensProvider } from '@/components/builder/theme/ThemeTokensContext';
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
import { SaveTemplateDialog } from './SaveTemplateDialog';
import { ThemeSettingsDialog } from './ThemeSettingsDialog';
import { ShortcutsDialog } from './ShortcutsDialog';
import { PageHistoryDialog } from './PageHistoryDialog';
import { SchedulePublishControl } from './SchedulePublishControl';
import '@/components/builder/widgets';

type DeviceSize = 'desktop' | 'tablet' | 'mobile';
const DEVICE_WIDTH: Record<DeviceSize, string> = { desktop: '100%', tablet: '768px', mobile: '390px' };
const DEVICE_BREAKPOINTS: Record<DeviceSize, BreakpointId[]> = {
  desktop: ['desktop'],
  tablet: ['desktop', 'tablet'],
  mobile: ['desktop', 'tablet', 'mobile'],
};
// Same widths as DEVICE_WIDTH, just spelled out for the toggle's own
// tooltips/label - there was previously no way to tell what width "Tablet"
// or "Mobile" actually simulated short of guessing from the canvas itself.
const DEVICE_LABEL: Record<DeviceSize, string> = { desktop: 'Desktop', tablet: 'Tablet (768px)', mobile: 'Mobile (390px)' };

// "Paste Style" (see handleCopyStyle/handlePasteStyle) copies design
// wholesale but leaves these advanced keys behind - they're per-instance
// identity/metadata, not a transferable look. htmlId especially: blindly
// duplicating a real DOM id onto a second element would create an invalid,
// duplicate-id document.
const STYLE_ADVANCED_EXCLUDED_KEYS = ['hidden', 'customCss', 'name', 'htmlId', 'htmlClasses'] as const;

export interface PageRecord {
  id: string;
  title: string;
  slug: string;
  status: string;
  /** The live/public content - only ever changes on Publish, never on a plain Save. */
  sections: unknown;
  /** The editor's own working copy - Save always writes here. Falls back to `sections` for a row saved before this column existed. */
  draft_sections?: unknown;
  seo_title: string | null;
  seo_description: string | null;
  og_image: string | null;
  updated_at?: string | null;
  published_at?: string | null;
  /** Set via the Schedule control - a pg_cron job (run_scheduled_publishes) checks once a minute and publishes automatically once this passes. */
  scheduled_publish_at?: string | null;
}

// Thrown instead of surfacing Supabase's own zero-rows-matched error
// (PGRST116, from the .single() below) - see saveMutation's conditional
// update, which pairs .eq('updated_at', ...) with this to detect a
// concurrent edit rather than silently letting last-write-wins clobber it.
class SaveConflictError extends Error {}

export function EditorShell({ page }: { page: PageRecord | null }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const fetchThemeSettings = useServerFn(getThemeSettings);
  const saveThemeSettings = useServerFn(updateThemeSettings);
  const { data: theme } = useQuery({ queryKey: ['builder-theme'], queryFn: () => fetchThemeSettings() });
  const themeMutation = useMutation({
    mutationFn: (next: ThemeSettings) => saveThemeSettings({ data: next }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['builder-theme'] });
      toast.success('Theme saved');
    },
    onError: (error: any) => toast.error(`Theme save failed: ${error.message}`),
  });

  // The draft, not the live sections - Save always continues from whatever
  // was last saved as a draft (or, absent one, the current live content),
  // never from a stale in-editor copy of what's actually public.
  const initialSections = page ? (page.draft_sections ?? page.sections) : undefined;
  const { doc, setDoc, undo, redo, canUndo, canRedo } = useDocHistory(
    isPageDocument(initialSections) ? initialSections : createEmptyDocument()
  );
  const [device, setDevice] = useState<DeviceSize>('desktop');
  const [title, setTitle] = useState(page?.title ?? 'Untitled Page');
  const [slug, setSlug] = useState(page?.slug ?? '');
  const [status, setStatus] = useState(page?.status ?? 'draft');
  const [seoTitle, setSeoTitle] = useState(page?.seo_title ?? '');
  const [seoDescription, setSeoDescription] = useState(page?.seo_description ?? '');
  const [ogImage, setOgImage] = useState(page?.og_image ?? '');
  const [scheduledPublishAt, setScheduledPublishAt] = useState<string | null>(page?.scheduled_publish_at ?? null);
  // Whether a saved draft exists that visitors haven't seen yet - the
  // concrete, persistent answer to "what's the difference between Save and
  // Publish" (see handleSaveSuccess, which flips this after every save/
  // publish; initialized here from whatever was already true when this
  // session opened, e.g. someone saved a draft yesterday and never published it).
  const [hasUnpublishedChanges, setHasUnpublishedChanges] = useState(() =>
    page ? JSON.stringify(page.draft_sections ?? page.sections) !== JSON.stringify(page.sections) : false
  );
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

  // A safety net against a crashed tab or an accidental force-close slipping
  // past the beforeunload prompt above - not a substitute for Save (no
  // server round-trip, and a real Save always clears this key below). Keyed
  // per-page so drafting on one page never clobbers another's snapshot.
  const autosaveKey = `builder-autosave:${page?.id ?? 'new'}`;
  const autosaveStateRef = useRef({ doc, title, slug, status, seoTitle, seoDescription, ogImage, isDirty });
  autosaveStateRef.current = { doc, title, slug, status, seoTitle, seoDescription, ogImage, isDirty };

  useEffect(() => {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(autosaveKey);
    } catch {
      return;
    }
    if (!raw) return;
    try {
      const snapshot = JSON.parse(raw) as typeof autosaveStateRef.current & { savedAt: number };
      toast('Unsaved changes found from a previous session', {
        description: `Autosaved ${new Date(snapshot.savedAt).toLocaleString()}`,
        duration: 20000,
        action: {
          label: 'Restore',
          onClick: () => {
            setDoc(snapshot.doc);
            setTitle(snapshot.title);
            setSlug(snapshot.slug);
            setStatus(snapshot.status);
            setSeoTitle(snapshot.seoTitle);
            setSeoDescription(snapshot.seoDescription);
            setOgImage(snapshot.ogImage);
            setIsDirty(true);
          },
        },
        cancel: {
          label: 'Discard',
          onClick: () => {
            try {
              localStorage.removeItem(autosaveKey);
            } catch {
              // ignore
            }
          },
        },
      });
    } catch {
      try {
        localStorage.removeItem(autosaveKey);
      } catch {
        // ignore
      }
    }
    // Only ever check once, right after this page's editor mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      const snapshot = autosaveStateRef.current;
      if (!snapshot.isDirty) return;
      try {
        localStorage.setItem(autosaveKey, JSON.stringify({ ...snapshot, savedAt: Date.now() }));
      } catch {
        // Storage full/unavailable (private browsing, quota) - autosave is
        // best-effort, Save is still the real save path.
      }
    }, 15000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The last updated_at this tab actually wrote (or loaded) - compared
  // against the row's current value on every save so a second admin's
  // concurrent edit is detected instead of silently overwritten. Updated
  // after every successful save (not just seeded from `page` once), since a
  // second save in the same session must compare against this tab's own
  // prior write, not the value from when the editor first opened.
  const lastKnownUpdatedAtRef = useRef<string | null>(page?.updated_at ?? null);

  // Shared by both mutations below (kept as a plain function, not a
  // useMutation itself, so Save and Publish get independent isPending flags
  // instead of one shared one that can't tell which button is spinning).
  // `publish` is the only thing that decides whether `sections` (the live
  // content) moves - a plain Save only ever touches `draft_sections`, which
  // is what actually fixes "editing an already-published page overwrites it
  // instantly": that overwrite target no longer exists.
  // scheduleAt: undefined means "leave scheduled_publish_at untouched"
  // (a plain Save shouldn't clobber a pending schedule set earlier); a real
  // value or null is an explicit set/clear from the Schedule control itself.
  async function performSave({ publish, scheduleAt }: { publish: boolean; scheduleAt?: string | null }) {
    // The status dropdown can't be trusted to flip a page live on its own -
    // draft -> published only ever happens through Publish (which also
    // copies draft_sections into sections below); a plain Save picking up a
    // premature "Published" selection would otherwise set status without
    // ever touching the live content, recreating the exact "published but
    // stale/empty" bug this draft/live split exists to prevent. Going the
    // other way (published -> draft on a plain Save) is safe as-is - it only
    // hides an already-valid `sections` from public view.
    const effectiveStatus = publish ? 'published' : status === 'published' && page?.status !== 'published' ? (page?.status ?? 'draft') : status;

    const payload: {
      title: string;
      slug: string;
      status: string;
      draft_sections: any;
      seo_title: string | null;
      seo_description: string | null;
      og_image: string | null;
      sections?: any;
      published_at?: string;
      scheduled_publish_at?: string | null;
    } = {
      title,
      slug,
      status: effectiveStatus,
      draft_sections: doc as any,
      seo_title: seoTitle || null,
      seo_description: seoDescription || null,
      og_image: ogImage || null,
    };
    if (publish) {
      payload.sections = doc as any;
      payload.published_at = new Date().toISOString();
      // Publishing now supersedes any pending schedule - nothing left to fire later.
      payload.scheduled_publish_at = null;
    } else if (scheduleAt !== undefined) {
      payload.scheduled_publish_at = scheduleAt;
    }

    const insertVersionSnapshot = async (pageId: string) => {
      const { data: auth } = await supabase.auth.getUser();
      await supabase
        .from('page_versions')
        .insert({ page_id: pageId, sections: doc as any, title, created_by: auth.user?.id ?? null });
    };

    if (page?.id) {
      let query = supabase.from('pages').update(payload).eq('id', page.id);
      // Only guard when we actually have a baseline to compare against - an
      // old row saved before `updated_at` existed shouldn't be permanently
      // unsaveable.
      if (lastKnownUpdatedAtRef.current) {
        query = query.eq('updated_at', lastKnownUpdatedAtRef.current);
      }
      const { data, error } = await query.select('updated_at').single();
      if (error) {
        // PGRST116: the .single() found zero rows - the id matched but the
        // updated_at guard didn't, meaning someone else saved this page
        // since we last read/wrote it.
        if (error.code === 'PGRST116') throw new SaveConflictError();
        throw error;
      }
      lastKnownUpdatedAtRef.current = data.updated_at;
      if (publish) await insertVersionSnapshot(page.id);
      // Not a real diff (no field-level before/after) - just which
      // top-level fields moved since this page was loaded, so
      // activity-logs.tsx has something more useful to show than "page was
      // saved" for every single edit. Compared against the draft this
      // editor actually loaded, not the live `sections` (which Save no
      // longer touches at all).
      const changed = [
        page.title !== title && 'title',
        page.slug !== slug && 'slug',
        page.status !== payload.status && 'status',
        (page.seo_title ?? '') !== seoTitle && 'seo_title',
        (page.seo_description ?? '') !== seoDescription && 'seo_description',
        (page.og_image ?? '') !== ogImage && 'og_image',
        JSON.stringify(doc) !== JSON.stringify(isPageDocument(initialSections) ? initialSections : null) && 'content',
      ].filter((v): v is string => typeof v === 'string');
      await logActivity('pages', publish ? 'publish_page' : 'update_page', { id: page.id, title, slug, changed });
      return { id: page.id, slug, published: publish, savedStatus: effectiveStatus };
    }
    const { data, error } = await supabase.from('pages').insert(payload).select().single();
    if (error) throw error;
    lastKnownUpdatedAtRef.current = data.updated_at;
    if (publish) await insertVersionSnapshot(data.id);
    await logActivity('pages', publish ? 'publish_page' : 'create_page', { id: data.id, title, slug });
    return { id: data.id as string, slug: data.slug as string, published: publish, savedStatus: effectiveStatus };
  }

  // `opts.toast` off lets scheduleMutation reuse all the same bookkeeping
  // (invalidate queries, clear dirty/autosave, sync a status the server
  // silently overrode) without also firing the generic "Page saved" toast -
  // it shows its own, schedule-specific one instead.
  function handleSaveSuccess(
    result: { id: string; slug: string; published: boolean; savedStatus: string },
    opts: { toast: boolean } = { toast: true }
  ) {
    queryClient.invalidateQueries({ queryKey: ['admin-pages'] });
    if (result.published) queryClient.invalidateQueries({ queryKey: pageVersionsQueryKey(result.id) });
    setIsDirty(false);
    setJustSaved(true);
    setHasUnpublishedChanges(!result.published);
    // Keeps the dropdown truthful when performSave silently declined to
    // apply a premature "Published" selection (see its own comment) - without
    // this the Select would keep showing "Published" while the row actually
    // stayed in its previous status.
    if (result.savedStatus !== status) {
      setStatus(result.savedStatus);
      if (!result.published && opts.toast) {
        toast('"Published" only takes effect via the Publish button', {
          description: 'Your other changes were saved as a draft.',
        });
      }
    }
    try {
      localStorage.removeItem(autosaveKey);
    } catch {
      // ignore
    }
    if (!opts.toast) return;
    if (!page?.id) {
      toast.success(result.published ? 'Page created and published' : 'Page created');
      navigate({ to: '/admin/pages/edit/$pageSlug', params: { pageSlug: result.slug } });
    } else {
      toast.success(result.published ? 'Page published' : 'Page saved');
    }
  }

  function handleSaveError(error: any) {
    if (error instanceof SaveConflictError) {
      toast.error('Someone else saved changes to this page since you opened it.', {
        description: 'Reload to see the latest version before saving over it - your local edits stay in this tab until you do.',
        duration: 15000,
        action: { label: 'Reload', onClick: () => window.location.reload() },
      });
      return;
    }
    if (isSlugConflictError(error)) {
      toast.error('That URL is already in use - pick a different one in Page Settings.');
      return;
    }
    toast.error(`Save failed: ${error.message}`);
  }

  const saveMutation = useMutation({
    mutationFn: () => performSave({ publish: false }),
    onSuccess: handleSaveSuccess,
    onError: handleSaveError,
  });

  const publishMutation = useMutation({
    mutationFn: () => performSave({ publish: true }),
    onSuccess: handleSaveSuccess,
    onError: handleSaveError,
  });

  // Also does a plain save first (via performSave, not a separate step) -
  // so scheduling captures whatever's on screen right now, same as clicking
  // Publish would. `run_scheduled_publishes` (pg_cron, once a minute) is
  // what actually flips status/sections once this time passes - see its own
  // migration.
  const scheduleMutation = useMutation({
    mutationFn: (at: string | null) => performSave({ publish: false, scheduleAt: at }),
    onSuccess: (result, at) => {
      handleSaveSuccess(result, { toast: false });
      setScheduledPublishAt(at);
      toast.success(at ? `Publish scheduled for ${new Date(at).toLocaleString()}` : 'Schedule canceled');
    },
    onError: handleSaveError,
  });

  const handleBack = () => {
    if (isDirty && !confirm('You have unsaved changes. Leave without saving?')) return;
    navigate({ to: '/admin/pages' });
  };

  const handleSave = () => saveMutation.mutate();

  // Only the "already live, pushing newer edits out" case gets a confirm -
  // going from Draft to Published, or the very first publish of a new
  // page, is exactly what clicking Publish while in that state means; there's
  // nothing to warn about that the button's own label doesn't already say.
  const handlePublish = () => {
    if (page?.id && page.status === 'published') {
      if (!confirm('Push your current draft live now? This replaces what visitors currently see.')) return;
    }
    publishMutation.mutate();
  };

  return (
    <DragDropProvider>
      <SelectionProvider>
        <ThemeTokensProvider
          theme={theme ?? defaultThemeSettings()}
          save={(next) => themeMutation.mutate(next)}
          isSaving={themeMutation.isPending}
        >
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
          pageId={page?.id}
          savedSlug={page?.slug}
          savedStatus={page?.status}
          onSave={handleSave}
          isSaving={saveMutation.isPending}
          onPublish={handlePublish}
          isPublishing={publishMutation.isPending}
          scheduledPublishAt={scheduledPublishAt}
          onSchedule={(at) => scheduleMutation.mutate(at)}
          isScheduling={scheduleMutation.isPending}
          hasUnpublishedChanges={hasUnpublishedChanges || isDirty}
          justSaved={justSaved}
          onBack={handleBack}
        />
        </ThemeTokensProvider>
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
  pageId,
  savedSlug,
  savedStatus,
  onSave,
  isSaving,
  onPublish,
  isPublishing,
  scheduledPublishAt,
  onSchedule,
  isScheduling,
  hasUnpublishedChanges,
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
  /** Undefined for a page that's never been saved - History has nothing to show yet, and there's no page_id to query it by. */
  pageId?: string | undefined;
  /** The slug/status this page was last saved under (not the live-edited state above) - a Preview/View link has to point at what's actually in the database, not whatever's still unsaved in the canvas. */
  savedSlug?: string | undefined;
  savedStatus?: string | undefined;
  onSave: () => void;
  isSaving: boolean;
  onPublish: () => void;
  isPublishing: boolean;
  scheduledPublishAt: string | null;
  onSchedule: (at: string | null) => void;
  isScheduling: boolean;
  /** Save vs. Publish's whole reason to exist, made visible: true whenever the saved draft (or the canvas right now) differs from what's actually live. */
  hasUnpublishedChanges: boolean;
  justSaved: boolean;
  onBack: () => void;
}) {
  const { selectedId, selectedIds, select, selectMany, clearSelection } = useSelection();
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
  // The canvas's own scrollable viewport - handed to SelectionOverlay so it
  // can clip the hover/selection borders to this area instead of them
  // painting over the toolbar/sidebar when a selected element scrolls near
  // the edge (position: fixed by itself has no notion of "stay inside this
  // one scroll container").
  // HTMLSpanElement, not Div - Radix's ContextMenuTrigger (see below) renders
  // as a <span>, even though the flex/overflow classes on it make it behave
  // like a block-level scroll container visually.
  const canvasViewportRef = useRef<HTMLSpanElement | null>(null);

  // Undo/redo can bring back a document where a currently-selected id no
  // longer exists (undoing past a delete's own select(null)/clearSelection
  // doesn't restore it; undoing an insert/duplicate removes the very
  // element that's selected) - getElement() throws on an unknown id, so
  // leaving a stale selection in place would crash SettingsPanel the next
  // render. Prunes the whole multi-selection, not just the primary id.
  useEffect(() => {
    const stale = selectedIds.filter((id) => !doc.nodes[id]);
    if (stale.length > 0) selectMany(selectedIds.filter((id) => doc.nodes[id]));
  }, [doc, selectedIds, selectMany]);

  const handleUpdate = (id: ElementId, patch: Record<string, any>) => {
    setDoc((prev) => updateElement(prev, id, patch), { coalesceKey: id });
    markDirty();
  };

  const handleDelete = (id: ElementId) => {
    setDoc((prev) => removeElement(prev, id));
    select(null);
    markDirty();
  };

  // Ids that turn out to already be gone (a selected child whose selected
  // ancestor got removed first, in the same batch) are skipped rather than
  // letting removeElement throw on an id that no longer exists.
  const handleDeleteMany = (ids: ElementId[]) => {
    setDoc((prev) => ids.reduce((d, id) => (d.nodes[id] ? removeElement(d, id) : d), prev));
    clearSelection();
    markDirty();
  };

  const handleDuplicate = (id: ElementId) => {
    const { doc: next, newId } = duplicateElement(doc, id);
    setDoc(next);
    select(newId);
    markDirty();
  };

  // Selects the newly created copies afterward, same as single-duplicate
  // selecting its one new copy - lets you immediately drag the duplicated
  // group somewhere else without having to reselect it.
  const handleDuplicateMany = (ids: ElementId[]) => {
    let next = doc;
    const newIds: ElementId[] = [];
    for (const id of ids) {
      if (!next.nodes[id]) continue;
      const result = duplicateElement(next, id);
      next = result.doc;
      newIds.push(result.newId);
    }
    setDoc(next);
    selectMany(newIds);
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

  // Separate from the whole-element clipboard above - copies only design +
  // advanced, never content/children, and pastes by merging onto whatever's
  // currently selected rather than inserting a new element. design is a
  // wholesale object copy (every widget's design has the exact identical
  // shape, by design - see DesignProperties' own doc comment: "this is what
  // makes paste style a single object assignment across different widget
  // types" - this feature is that assignment).
  const styleClipboardRef = useRef<{ design: DesignProperties; advanced: AdvancedProperties } | null>(null);
  const [hasStyleClipboard, setHasStyleClipboard] = useState(false);

  const handleCopyStyle = (id: ElementId) => {
    const node = doc.nodes[id];
    if (!node) return;
    const advanced = { ...node.advanced };
    for (const key of STYLE_ADVANCED_EXCLUDED_KEYS) delete advanced[key];
    styleClipboardRef.current = { design: { ...node.design }, advanced };
    setHasStyleClipboard(true);
  };

  const handlePasteStyle = (id: ElementId) => {
    const clip = styleClipboardRef.current;
    const node = doc.nodes[id];
    if (!clip || !node) return;
    handleUpdate(id, { design: { ...clip.design }, advanced: { ...node.advanced, ...clip.advanced } });
  };

  // The one bulk style operation offered for a multi-selection - full
  // per-field editing across a heterogeneous set of widget types would need
  // its own "apply to all" semantics per field (see the multi-select
  // sidebar's own comment), but Paste Style is already a single object
  // assignment that works identically across any widget type, so extending
  // it to many elements at once needs no new machinery. One setDoc call
  // (not one per element) so it's a single undo step.
  const handlePasteStyleMany = (ids: ElementId[]) => {
    const clip = styleClipboardRef.current;
    if (!clip) return;
    setDoc((prev) =>
      ids.reduce((d, id) => {
        const node = d.nodes[id];
        if (!node) return d;
        return updateElement(d, id, { design: { ...clip.design }, advanced: { ...node.advanced, ...clip.advanced } });
      }, prev)
    );
    markDirty();
  };

  // "Save as Section" (see Toolbox's Sections tab and templateLibrary.ts) -
  // dialog visibility is just "is there a target id", opened from the
  // context menu rather than owning its own trigger button. The query below
  // is shared (by TEMPLATES_QUERY_KEY) with Toolbox's own SectionsTab, which
  // reads from the same React Query cache rather than each holding its own
  // copy - saving here invalidates it, and Toolbox picks up the new section
  // without any prop-drilling between the two.
  const queryClient = useQueryClient();
  const { data: templates } = useQuery({ queryKey: TEMPLATES_QUERY_KEY, queryFn: fetchTemplates });
  const [saveTemplateTargetId, setSaveTemplateTargetId] = useState<ElementId | null>(null);
  const createTemplateMutation = useMutation({
    mutationFn: (vars: { name: string; subtree: ClipboardSubtree }) => createTemplate(vars.name, vars.subtree),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEMPLATES_QUERY_KEY });
      toast.success('Section saved');
    },
    onError: (error: any) => toast.error(`Failed to save section: ${error.message}`),
  });
  const handleSaveTemplate = (name: string) => {
    if (!saveTemplateTargetId) return;
    createTemplateMutation.mutate({ name, subtree: copySubtree(doc, saveTemplateTargetId) });
  };

  const [showThemeDialog, setShowThemeDialog] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  // Loads a past published version back into the current draft for review -
  // deliberately not an immediate republish (see PageHistoryDialog's own
  // Restore button title), so a restored version still goes through the
  // normal Save/Publish flow rather than silently going live on click.
  const handleRestoreVersion = (sections: unknown) => {
    if (!isPageDocument(sections)) return;
    setDoc(sections);
    markDirty();
    setShowHistory(false);
    toast('Version restored into the draft', { description: 'Review it, then Publish to make it live.' });
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
      // Alt-modified variants checked before their plain counterparts below,
      // so Ctrl+Alt+C/V short-circuit here instead of also matching the
      // plain Ctrl+C/V element-clipboard handlers (which don't check
      // e.altKey themselves). Copy Style still requires exactly one source
      // element (copying "the style" of several different elements at once
      // isn't a coherent single clipboard entry) - Paste Style, unlike the
      // element clipboard, is fine applying to every selected element at
      // once (see handlePasteStyleMany).
      if (ctrlOrCmd && e.altKey && key === 'c' && selectedIds.length === 1 && selectedId) {
        e.preventDefault();
        handleCopyStyle(selectedId);
        return;
      }
      if (ctrlOrCmd && e.altKey && key === 'v' && selectedIds.length > 0 && styleClipboardRef.current) {
        e.preventDefault();
        if (selectedIds.length > 1) handlePasteStyleMany(selectedIds);
        else if (selectedId) handlePasteStyle(selectedId);
        return;
      }
      if (ctrlOrCmd && key === 'c' && selectedIds.length === 1 && selectedId) {
        handleCopy(selectedId);
        return;
      }
      if (ctrlOrCmd && key === 'x' && selectedIds.length === 1 && selectedId) {
        e.preventDefault();
        handleCut(selectedId);
        return;
      }
      if (ctrlOrCmd && key === 'v' && clipboardRef.current) {
        e.preventDefault();
        handlePaste();
        return;
      }
      if (ctrlOrCmd && key === 'd' && selectedIds.length > 0) {
        // Browsers bind Ctrl+D to "bookmark this page" - within the editor
        // it should duplicate the selection instead, matching the context
        // menu's Duplicate item (and the multi-select bulk bar's).
        e.preventDefault();
        if (selectedIds.length > 1) handleDuplicateMany(selectedIds);
        else handleDuplicate(selectedId!);
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0) {
        e.preventDefault();
        if (selectedIds.length > 1) handleDeleteMany(selectedIds);
        else handleDelete(selectedId!);
        return;
      }
      if (e.key === 'Escape' && selectedIds.length > 0) {
        clearSelection();
        return;
      }
      // '?' (Shift+/ on most layouts) for the shortcuts cheat-sheet - same
      // convention as Notion/Linear/Slack, and the only one of these
      // shortcuts otherwise undiscoverable without already knowing it exists.
      if (e.key === '?') {
        e.preventDefault();
        setShowShortcuts((v) => !v);
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
    // Plain h-full, no more -m-8/calc(100vh-4rem) cancellation math - the
    // admin layout renders no header and no padding around the editor
    // (see AdminLayout.tsx's isPageEditorRoute branch), so this now simply
    // fills its parent <main> exactly, which is itself the full viewport height.
    <div className="flex flex-col h-full">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b bg-card px-4 py-2.5 shrink-0">
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
          {savedSlug && (
            // Draft preview (getPageBySlug's ?preview=1 branch renders
            // draft_sections, not the live sections) - always meaningful
            // now, even for an already-published page, since the two can
            // genuinely differ until the next Publish.
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title="Preview draft"
              asChild
            >
              <a href={`/${savedSlug}?preview=true`} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}
          {savedSlug && savedStatus === 'published' && (
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" title="View published page" asChild>
              <a href={`/${savedSlug}`} target="_blank" rel="noreferrer">
                <UploadCloud className="h-4 w-4" />
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
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title="Site Theme"
            onClick={() => setShowThemeDialog(true)}
          >
            <Palette className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title="Keyboard Shortcuts (?)"
            onClick={() => setShowShortcuts(true)}
          >
            <Keyboard className="h-4 w-4" />
          </Button>
          {pageId && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title="Publish History"
              onClick={() => setShowHistory(true)}
            >
              <History className="h-4 w-4" />
            </Button>
          )}
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
              title={DEVICE_LABEL[value]}
            >
              <Icon className="h-4 w-4" />
            </Button>
          ))}
          {/* Persistent, not just on-hover - the whole point is knowing the
              current width at a glance while working, not having to mouse
              over the toggle to check. Omitted for Desktop, which isn't a
              fixed width to begin with (100% of the available canvas area). */}
          {device !== 'desktop' && (
            <span className="px-1.5 text-xs font-medium text-muted-foreground">{DEVICE_WIDTH[device]}</span>
          )}
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
          {pageId && (
            <SchedulePublishControl
              scheduledPublishAt={scheduledPublishAt}
              onSchedule={onSchedule}
              isPending={isScheduling}
              disabled={isSaving || isPublishing}
            />
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={isSaving || isPublishing || isScheduling || slugStatus === 'checking' || slugStatus === 'taken'}
            onClick={onSave}
            title="Save your draft privately - visitors won't see this until you Publish"
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving...' : justSaved ? 'Saved' : 'Save'}
          </Button>
          <Button
            type="button"
            size="sm"
            className="relative gap-2"
            disabled={isSaving || isPublishing || isScheduling || slugStatus === 'checking' || slugStatus === 'taken'}
            onClick={onPublish}
            title={
              hasUnpublishedChanges
                ? 'Make your current draft the live page visitors see'
                : 'Already live - nothing new to publish'
            }
          >
            {hasUnpublishedChanges && (
              <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-background" />
            )}
            <UploadCloud className="h-4 w-4" />
            {isPublishing ? 'Publishing...' : 'Publish'}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="w-80 shrink-0 border-r bg-card overflow-y-auto">
          {selectedIds.length > 1 ? (
            // Multiple elements selected - full per-field editing across a
            // heterogeneous set of widget types is a much bigger feature
            // (every field would need "apply to all" semantics); Paste Style
            // (copy one element's whole look with Ctrl+Alt+C, then apply it
            // to the rest of the selection here) covers the common "make
            // these match" case without that, on top of the same bulk
            // actions as the canvas's floating bar.
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
              <p className="text-sm font-medium">{selectedIds.length} elements selected</p>
              <p className="text-xs text-muted-foreground">
                {hasStyleClipboard
                  ? 'Paste the copied style onto all selected elements, duplicate or delete the group, or click a single element to edit it.'
                  : 'Individual style editing isn\'t available for a multi-selection - duplicate or delete the group, or click a single element to edit it.'}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {hasStyleClipboard && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => handlePasteStyleMany(selectedIds)}
                  >
                    <PaintBucket className="h-3.5 w-3.5" />
                    Paste Style
                  </Button>
                )}
                <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => handleDuplicateMany(selectedIds)}>
                  <CopyPlus className="h-3.5 w-3.5" />
                  Duplicate
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-destructive hover:text-destructive"
                  onClick={() => handleDeleteMany(selectedIds)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={clearSelection}>
                Clear selection
              </Button>
            </div>
          ) : selectedId ? (
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
            ref={canvasViewportRef}
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
              // Right-clicking something already inside the current multi-
              // selection keeps that whole selection (so the menu can offer
              // bulk actions on it) instead of collapsing down to just the
              // one element under the cursor - matches Explorer/Figma-style
              // multi-select right-click behavior.
              const keepMultiSelection = !isRoot && !!id && selectedIds.length > 1 && selectedIds.includes(id);
              if (!keepMultiSelection) select(isRoot ? null : id);
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
                if (source.kind === 'template') {
                  const template = templates?.find((t) => t.id === source.templateId);
                  if (!template) return;
                  setDoc((prev) => pasteSubtree(prev, template.subtree, target.parentId, target.index).doc);
                  markDirty();
                  return;
                }
                if (isColumnPreset(source.widgetType)) {
                  setDoc((prev) => insertColumnsPreset(prev, source.widgetType, target.parentId, target.index));
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
            {selectedIds.length > 1 ? (
              // Right-clicked an element that's already part of the current
              // multi-selection (see onContextMenu above, which preserves
              // rather than collapses it in that case) - only bulk actions
              // make sense across a set of possibly-different widget types.
              <>
                <ContextMenuItem disabled={!hasStyleClipboard} onSelect={() => handlePasteStyleMany(selectedIds)}>
                  <PaintBucket className="mr-2 h-4 w-4" />
                  Paste Style ({selectedIds.length})
                  <ContextMenuShortcut>Ctrl+Alt+V</ContextMenuShortcut>
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onSelect={() => handleDuplicateMany(selectedIds)}>
                  <CopyPlus className="mr-2 h-4 w-4" />
                  Duplicate ({selectedIds.length})
                  <ContextMenuShortcut>Ctrl+D</ContextMenuShortcut>
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem
                  className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                  onSelect={() => handleDeleteMany(selectedIds)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete ({selectedIds.length})
                  <ContextMenuShortcut>Del</ContextMenuShortcut>
                </ContextMenuItem>
              </>
            ) : contextMenuId && contextMenuId !== doc.rootId ? (
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
                <ContextMenuSeparator />
                <ContextMenuItem onSelect={() => handleCopyStyle(contextMenuId)}>
                  <Paintbrush className="mr-2 h-4 w-4" />
                  Copy Style
                  <ContextMenuShortcut>Ctrl+Alt+C</ContextMenuShortcut>
                </ContextMenuItem>
                <ContextMenuItem disabled={!hasStyleClipboard} onSelect={() => handlePasteStyle(contextMenuId)}>
                  <PaintBucket className="mr-2 h-4 w-4" />
                  Paste Style
                  <ContextMenuShortcut>Ctrl+Alt+V</ContextMenuShortcut>
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
                <ContextMenuItem onSelect={() => setSaveTemplateTargetId(contextMenuId)}>
                  <BookmarkPlus className="mr-2 h-4 w-4" />
                  Save as Section
                </ContextMenuItem>
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
      <SelectionOverlay
        doc={doc}
        onDuplicate={handleDuplicate}
        onDelete={handleDelete}
        onDuplicateMany={handleDuplicateMany}
        onDeleteMany={handleDeleteMany}
        onPasteStyleMany={hasStyleClipboard ? handlePasteStyleMany : undefined}
        viewportRef={canvasViewportRef}
      />
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
      <SaveTemplateDialog
        open={saveTemplateTargetId !== null}
        onOpenChange={(open) => {
          if (!open) setSaveTemplateTargetId(null);
        }}
        onSave={handleSaveTemplate}
      />
      <ThemeSettingsDialog open={showThemeDialog} onOpenChange={setShowThemeDialog} />
      <ShortcutsDialog open={showShortcuts} onOpenChange={setShowShortcuts} />
      <PageHistoryDialog
        pageId={pageId}
        open={showHistory}
        onOpenChange={setShowHistory}
        onRestore={handleRestoreVersion}
      />
    </div>
  );
}
