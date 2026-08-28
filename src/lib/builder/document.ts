import type { StyleValue } from './styleValue';
import type { BreakpointId } from './breakpoints';
import type {
  BackgroundValue,
  BorderValue,
  BoxValue,
  CursorType,
  DisplayValue,
  FilterValue,
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

/** Recursively duplicates a subtree with fresh ids throughout, inserted immediately after the original. */
export function duplicateElement(doc: PageDocument, id: ElementId): { doc: PageDocument; newId: ElementId } {
  const original = getElement(doc, id);
  if (!original.parent) return { doc, newId: id };

  const nodes = { ...doc.nodes };
  const originalParentId = original.parent;

  const cloneSubtree = (sourceId: ElementId, newParentId: ElementId | null): ElementId => {
    const source = getElement(doc, sourceId);
    const freshId = newElementId();
    const clonedChildren = source.children.map((childId) => cloneSubtree(childId, freshId));
    nodes[freshId] = {
      ...source,
      id: freshId,
      parent: newParentId,
      children: clonedChildren,
    };
    return freshId;
  };

  const newId = cloneSubtree(id, originalParentId);

  const parent = nodes[originalParentId];
  if (parent) {
    const originalIndex = parent.children.indexOf(id);
    const children = [...parent.children];
    children.splice(originalIndex + 1, 0, newId);
    nodes[originalParentId] = { ...parent, children };
  }

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
