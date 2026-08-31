import type { StyleValue } from './styleValue';
import type { BreakpointId } from './breakpoints';
import type {
  AlignSelfValue,
  BackgroundValue,
  BorderValue,
  BoxValue,
  ColorValue,
  CursorType,
  DisplayValue,
  EntranceAnimationType,
  FilterValue,
  IconViewValue,
  LengthValue,
  MixBlendMode,
  OverflowValue,
  PositionValue,
  ShadowValue,
  TextAlign,
  TextFillValue,
  TextShadowValue,
  TransformValue,
  TransitionValue,
  TypographyValue,
  WhiteSpace,
} from './valueTypes';

export type ElementId = string;

export function newElementId(): ElementId {
  return crypto.randomUUID();
}

/**
 * Visual styling - every widget type has the exact same shape here. This is
 * what makes "paste style" a single object assignment across different
 * widget types instead of a per-widget field list.
 */
export interface DesignProperties {
  display?: StyleValue<DisplayValue>;
  /** Overrides how this element sizes/positions itself along its flex/grid parent's cross axis - see AlignSelfValue's doc comment. */
  alignSelf?: StyleValue<AlignSelfValue>;
  background?: StyleValue<BackgroundValue>;
  backgroundOverlay?: StyleValue<BackgroundValue>;
  textColor?: StyleValue<TextFillValue>;
  typography?: StyleValue<TypographyValue>;
  textAlign?: StyleValue<TextAlign>;
  textShadow?: StyleValue<TextShadowValue>;
  whiteSpace?: StyleValue<WhiteSpace>;
  border?: StyleValue<BorderValue>;
  borderRadius?: StyleValue<BoxValue>;
  boxShadow?: StyleValue<ShadowValue>;
  transform?: StyleValue<TransformValue>;
  filter?: StyleValue<FilterValue>;
  transition?: StyleValue<TransitionValue>;
  cursor?: StyleValue<CursorType>;
  mixBlendMode?: StyleValue<MixBlendMode>;
  /**
   * Icon-specific styling, only ever surfaced in the Style tab for
   * icon-related widgets (Icon, Icon List - see their extraStyleFields) -
   * harmless, unused data on any other widget type, same tradeoff as
   * excludeStyleGroups already makes for fields that don't apply everywhere.
   * Kept on the shared DesignProperties (not a bespoke per-widget schema) so
   * they go through the same responsive/state (hover etc.) machinery as
   * everything else instead of a separate, weaker system.
   */
  iconColor?: StyleValue<ColorValue>;
  iconSize?: StyleValue<LengthValue>;
  /** 'stacked' fills the shape with iconSecondaryColor; 'framed' outlines it instead. */
  iconView?: StyleValue<IconViewValue>;
  iconSecondaryColor?: StyleValue<ColorValue>;
  iconRadius?: StyleValue<BoxValue>;
  /** Space around the icon glyph inside its shape - only visible once iconView isn't 'default'. */
  iconPadding?: StyleValue<BoxValue>;
  /** Icon List only: gap between list items. */
  iconItemGap?: StyleValue<LengthValue>;
  /** Icon List only: gap between each item's icon and its text. */
  iconTextGap?: StyleValue<LengthValue>;
  /**
   * The shared Effects > Transition field only animates properties changing
   * on the widget's own root element - it can't reach the icon's color/
   * shape, which live on the separate .builder-icon-shape wrapper (a CSS
   * transition never applies across elements). This is that same transition
   * shape, applied to the icon wrapper instead.
   */
  iconTransition?: StyleValue<TransitionValue>;
  /** Nav widget only: gap between menu items. */
  navItemGap?: StyleValue<LengthValue>;
}

/** Layout, positioning, visibility, custom CSS, and metadata - shared by every widget, defined once. */
export interface AdvancedProperties {
  margin?: StyleValue<BoxValue>;
  padding?: StyleValue<BoxValue>;
  width?: StyleValue<LengthValue>;
  minWidth?: StyleValue<LengthValue>;
  maxWidth?: StyleValue<LengthValue>;
  height?: StyleValue<LengthValue>;
  minHeight?: StyleValue<LengthValue>;
  maxHeight?: StyleValue<LengthValue>;
  position?: StyleValue<PositionValue>;
  opacity?: StyleValue<number>;
  overflowX?: StyleValue<OverflowValue>;
  overflowY?: StyleValue<OverflowValue>;
  /** Per-breakpoint visibility - distinct from the Navigator's hide-everywhere toggle. */
  hidden?: Partial<Record<BreakpointId, boolean>>;
  customCss?: string;
  name?: string;
  /** Rendered as the element's real id attribute - a stable hook for external CSS/JS/analytics to target. Plain, not responsive: an id shouldn't change per breakpoint. */
  htmlId?: string;
  /** Space-separated extra classes, appended alongside the widget's own builder-el classes. */
  htmlClasses?: string;
  /**
   * Plain (not StyleValue/responsive) - an entrance animation plays once,
   * the first time the element scrolls into view, so a per-breakpoint or
   * per-state variant wouldn't mean anything the way it does for a normal
   * style property. See ElementRenderer's useEntranceReveal for where this
   * is actually read.
   */
  entranceAnimation?: EntranceAnimationType;
  /** ms */
  entranceDuration?: number;
  /** ms */
  entranceDelay?: number;
}

export function emptyDesign(): DesignProperties {
  return {};
}

export function emptyAdvanced(): AdvancedProperties {
  return {};
}

/**
 * One node in the page tree, stored normalized (flat map + parent/children
 * ids) rather than nested, so duplicate/reparent/reorder are O(1) lookups
 * instead of tree walks, and history diffs stay small.
 */
export interface ElementNode {
  id: ElementId;
  type: string;
  parent: ElementId | null;
  children: ElementId[];
  /** Widget-specific properties - shape varies by `type`, defined by that widget's schema. */
  content: Record<string, any>;
  design: DesignProperties;
  advanced: AdvancedProperties;
}

export interface PageDocument {
  rootId: ElementId;
  nodes: Record<ElementId, ElementNode>;
}

export const ROOT_TYPE = 'root';
export const MAX_NESTING_WARNING_DEPTH = 8;
/** Fixed rather than crypto.randomUUID() - the root is always exactly one per document, and a random id here would differ between SSR and hydration, desyncing the DOM's data-el-id from doc.nodes. */
const ROOT_ELEMENT_ID: ElementId = 'root';

export function createElement(
  type: string,
  content: Record<string, any> = {},
  parent: ElementId | null = null
): ElementNode {
  return {
    id: newElementId(),
    type,
    parent,
    children: [],
    content,
    design: emptyDesign(),
    advanced: emptyAdvanced(),
  };
}

export function createEmptyDocument(): PageDocument {
  const root: ElementNode = {
    id: ROOT_ELEMENT_ID,
    type: ROOT_TYPE,
    parent: null,
    children: [],
    content: {},
    design: emptyDesign(),
    advanced: emptyAdvanced(),
  };
  return { rootId: root.id, nodes: { [root.id]: root } };
}

/** A loose shape check for whatever comes back out of the pages.sections JSONB column - guards against stale/foreign data (e.g. the old array-of-blocks shape from before this document model existed) rather than crashing the editor on load. */
export function isPageDocument(value: unknown): value is PageDocument {
  return (
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    typeof (value as PageDocument).rootId === 'string' &&
    !!(value as PageDocument).nodes &&
    typeof (value as PageDocument).nodes === 'object'
  );
}

export function getElement(doc: PageDocument, id: ElementId): ElementNode {
  const node = doc.nodes[id];
  if (!node) throw new Error(`Unknown element: ${id}`);
  return node;
}

/** Every element id in document (pre-order) order - used for style generation and full-tree passes. */
export function flattenOrder(doc: PageDocument, from: ElementId = doc.rootId): ElementId[] {
  const node = doc.nodes[from];
  if (!node) return [];
  return [from, ...node.children.flatMap((childId) => flattenOrder(doc, childId))];
}

export function getDepth(doc: PageDocument, id: ElementId): number {
  let depth = 0;
  let node = doc.nodes[id];
  while (node?.parent) {
    depth += 1;
    node = doc.nodes[node.parent];
  }
  return depth;
}

/** True if `maybeAncestorId` is `id` itself or one of its ancestors - used to block dropping a container into its own descendant. */
export function isAncestor(doc: PageDocument, maybeAncestorId: ElementId, id: ElementId): boolean {
  let current: ElementId | null = id;
  while (current) {
    if (current === maybeAncestorId) return true;
    current = doc.nodes[current]?.parent ?? null;
  }
  return false;
}

export function insertElement(
  doc: PageDocument,
  node: ElementNode,
  parentId: ElementId,
  index?: number
): PageDocument {
  const parent = getElement(doc, parentId);
  const children = [...parent.children];
  const at = index === undefined ? children.length : Math.max(0, Math.min(index, children.length));
  children.splice(at, 0, node.id);

  return {
    ...doc,
    nodes: {
      ...doc.nodes,
      [node.id]: { ...node, parent: parentId },
      [parentId]: { ...parent, children },
    },
  };
}

/** Removes an element and all of its descendants. */
export function removeElement(doc: PageDocument, id: ElementId): PageDocument {
  if (id === doc.rootId) return doc;
  const node = doc.nodes[id];
  if (!node) return doc;

  const toRemove = new Set<ElementId>();
  const collect = (elementId: ElementId) => {
    toRemove.add(elementId);
    doc.nodes[elementId]?.children.forEach(collect);
  };
  collect(id);

  const nodes = { ...doc.nodes };
  toRemove.forEach((removedId) => delete nodes[removedId]);

  const parent = node.parent ? nodes[node.parent] : undefined;
  if (node.parent && parent) {
    nodes[node.parent] = {
      ...parent,
      children: parent.children.filter((c) => c !== id),
    };
  }

  return { ...doc, nodes };
}

/** Moves an existing element to a new parent/index. Refuses to move an element into its own descendant, or to move the root. */
export function moveElement(
  doc: PageDocument,
  id: ElementId,
  newParentId: ElementId,
  index?: number
): PageDocument {
  if (id === doc.rootId) return doc;
  if (isAncestor(doc, id, newParentId)) return doc;

  const node = doc.nodes[id];
  const newParent = doc.nodes[newParentId];
  if (!node || !newParent) return doc;

  const nodes = { ...doc.nodes };

  const oldParentId = node.parent;
  if (oldParentId) {
    const oldParent = nodes[oldParentId];
    if (oldParent) {
      nodes[oldParentId] = { ...oldParent, children: oldParent.children.filter((c) => c !== id) };
    }
  }

  const children = [...(oldParentId === newParentId ? nodes[newParentId]!.children : newParent.children)];
  const at = index === undefined ? children.length : Math.max(0, Math.min(index, children.length));
  children.splice(at, 0, id);

  nodes[id] = { ...node, parent: newParentId };
  nodes[newParentId] = { ...(nodes[newParentId] ?? newParent), children };

  return { ...doc, nodes };
}

/**
 * Recursively clones `id` and its descendants with fresh ids throughout,
 * returning a small standalone `{nodes, rootId}` tree rather than inserting
 * it anywhere - the shared primitive behind both duplicateElement (clone +
 * insert in the same doc, same call) and copy/paste (clone now, insert
 * later - possibly more than once, so it's re-run per paste rather than
 * reusing one fixed set of ids, which would collide the second time the
 * same clipboard content gets pasted). Takes a plain node map rather than a
 * whole PageDocument so it works equally well reading from a live doc
 * (copy) or from a previously-cloned clipboard snapshot (paste).
 */
export function cloneSubtree(
  nodes: Record<ElementId, ElementNode>,
  id: ElementId,
  newParentId: ElementId | null
): { nodes: Record<ElementId, ElementNode>; rootId: ElementId } {
  const out: Record<ElementId, ElementNode> = {};
  const clone = (sourceId: ElementId, parentId: ElementId | null): ElementId => {
    const source = nodes[sourceId];
    if (!source) throw new Error(`Unknown element: ${sourceId}`);
    const freshId = newElementId();
    const clonedChildren = source.children.map((childId) => clone(childId, freshId));
    out[freshId] = { ...source, id: freshId, parent: parentId, children: clonedChildren };
    return freshId;
  };
  const rootId = clone(id, newParentId);
  return { nodes: out, rootId };
}

/** Duplicates a subtree in place, inserted immediately after the original. */
export function duplicateElement(doc: PageDocument, id: ElementId): { doc: PageDocument; newId: ElementId } {
  const original = getElement(doc, id);
  if (!original.parent) return { doc, newId: id };
  const originalParentId = original.parent;

  const { nodes: clonedNodes, rootId: newId } = cloneSubtree(doc.nodes, id, originalParentId);
  const nodes = { ...doc.nodes, ...clonedNodes };

  const parent = nodes[originalParentId];
  if (parent) {
    const originalIndex = parent.children.indexOf(id);
    const children = [...parent.children];
    children.splice(originalIndex + 1, 0, newId);
    nodes[originalParentId] = { ...parent, children };
  }

  return { doc: { ...doc, nodes }, newId };
}

export interface ClipboardSubtree {
  nodes: Record<ElementId, ElementNode>;
  rootId: ElementId;
}

/** Snapshots `id` and its descendants into a detached tree for the in-editor clipboard (see EditorShell) - independent of `doc` from this point on, so it stays pasteable even after the source element is later deleted or the doc is undone/redone. */
export function copySubtree(doc: PageDocument, id: ElementId): ClipboardSubtree {
  return cloneSubtree(doc.nodes, id, null);
}

/** Inserts a clipboard snapshot into `targetParentId` at `index`, re-cloning it with fresh ids first - see cloneSubtree's doc comment for why a stored snapshot can't be inserted with its own ids verbatim (a second paste of the same clipboard would collide with the first). */
export function pasteSubtree(
  doc: PageDocument,
  clipboard: ClipboardSubtree,
  targetParentId: ElementId,
  index?: number
): { doc: PageDocument; newId: ElementId } {
  const parent = getElement(doc, targetParentId);
  const { nodes: clonedNodes, rootId: newId } = cloneSubtree(clipboard.nodes, clipboard.rootId, targetParentId);

  const nodes = { ...doc.nodes, ...clonedNodes };
  const children = [...parent.children];
  const at = index === undefined ? children.length : Math.max(0, Math.min(index, children.length));
  children.splice(at, 0, newId);
  nodes[targetParentId] = { ...parent, children };

  return { doc: { ...doc, nodes }, newId };
}

export function renameElement(doc: PageDocument, id: ElementId, name: string): PageDocument {
  const node = getElement(doc, id);
  return {
    ...doc,
    nodes: { ...doc.nodes, [id]: { ...node, advanced: { ...node.advanced, name } } },
  };
}

export function updateElement(
  doc: PageDocument,
  id: ElementId,
  patch: Partial<Pick<ElementNode, 'content' | 'design' | 'advanced'>>
): PageDocument {
  const node = getElement(doc, id);
  return {
    ...doc,
    nodes: { ...doc.nodes, [id]: { ...node, ...patch } },
  };
}
