import type { PageDocument, ElementId, ElementNode } from '@/lib/builder/document';
import { getWidget } from '@/lib/builder/registry';
import type { DropTarget } from './DragDropContext';

/**
 * Compares the cursor against each remaining sibling's midpoint (horizontal
 * for a row-flex container, vertical otherwise, read straight off the
 * container's own computed style so it matches whatever's actually
 * rendered) and returns the index of the first one the cursor is "before".
 * `excludeId` (the element currently being dragged, for a move) is left out
 * of the comparison and the returned index is relative to the list WITH it
 * excluded - exactly what moveElement expects for a same-container reorder
 * (it already operates on the post-removal children array), and harmless
 * for a cross-container move since the dragged element was never one of
 * this container's children to begin with.
 */
function computeInsertionIndex(
  hostDoc: Document,
  containerNode: ElementNode,
  x: number,
  y: number,
  excludeId: ElementId | undefined
): number {
  const containerEl = hostDoc.querySelector(`[data-el-id="${containerNode.id}"]`);
  if (!containerEl) return containerNode.children.length;

  const childIds = containerNode.children.filter((cid) => cid !== excludeId);
  const style = hostDoc.defaultView?.getComputedStyle(containerEl);
  const isRow = style?.display === 'flex' && !!style.flexDirection?.startsWith('row');

  for (let i = 0; i < childIds.length; i++) {
    const childEl = hostDoc.querySelector(`[data-el-id="${childIds[i]}"]`);
    if (!childEl) continue;
    const rect = childEl.getBoundingClientRect();
    const before = isRow ? x < rect.left + rect.width / 2 : y < rect.top + rect.height / 2;
    if (before) return i;
  }
  return childIds.length;
}

/** How close to a container's own outer edge the pointer must be to mean
 * "drop as a sibling of this container" rather than "drop inside it". Capped
 * to a third of the container's size so small containers don't become 100%
 * edge. */
const SIBLING_EDGE_PX = 16;

/**
 * When two containers sit flush against each other (no gap, the common case
 * for stacked full-width sections), every pixel along their shared boundary
 * belongs to one or the other - there's no gap pixel for elementFromPoint to
 * land on their shared parent, so a naive hit test can never target "between
 * them". This checks whether the pointer is within SIBLING_EDGE_PX of the
 * hit container's leading/trailing edge along its PARENT's layout axis, and
 * if so, escalates the hit to the parent instead so the drop lands as a
 * sibling before/after this container rather than nested inside it.
 */
function escalateToParentIfNearEdge(
  hostDoc: Document,
  doc: PageDocument,
  node: ElementNode,
  x: number,
  y: number
): ElementNode | null {
  if (!node.parent) return null;
  const parentNode = doc.nodes[node.parent];
  if (!parentNode) return null;

  const containerEl = hostDoc.querySelector(`[data-el-id="${node.id}"]`);
  const parentEl = hostDoc.querySelector(`[data-el-id="${parentNode.id}"]`);
  if (!containerEl || !parentEl) return null;

  const rect = containerEl.getBoundingClientRect();
  const parentStyle = hostDoc.defaultView?.getComputedStyle(parentEl);
  const parentIsRow = parentStyle?.display === 'flex' && !!parentStyle.flexDirection?.startsWith('row');

  if (parentIsRow) {
    const edge = Math.min(SIBLING_EDGE_PX, rect.width / 3);
    if (x - rect.left < edge || rect.right - x < edge) return parentNode;
  } else {
    const edge = Math.min(SIBLING_EDGE_PX, rect.height / 3);
    if (y - rect.top < edge || rect.bottom - y < edge) return parentNode;
  }
  return null;
}

/**
 * Finds the nearest container under the pointer (walking up from whatever
 * element was hit to the first container ancestor - every leaf widget
 * belongs to some container, and the root is always one), then works out
 * exactly where within it the drop would land via computeInsertionIndex -
 * real per-sibling positioning, not just always appending at the end.
 */
export function hitTestContainer(
  hostDoc: Document,
  doc: PageDocument,
  x: number,
  y: number,
  excludeId?: ElementId
): DropTarget | null {
  const el = hostDoc.elementFromPoint(x, y);
  if (!el) return null;

  const wrapped = el.closest('[data-el-id]');
  const id = wrapped?.getAttribute('data-el-id');
  if (!id) return null;

  let current: ElementId | undefined = id;
  while (current) {
    let node: ElementNode | undefined = doc.nodes[current];
    if (!node) return null;
    if (getWidget(node.type)?.isContainer) {
      // Keep escalating outward while the pointer sits in a "sibling" hot
      // zone, so hovering near the edge of a deeply nested container can
      // still target an outer ancestor's boundary.
      let escalated = escalateToParentIfNearEdge(hostDoc, doc, node, x, y);
      while (escalated) {
        node = escalated;
        escalated = escalateToParentIfNearEdge(hostDoc, doc, node, x, y);
      }
      const index = computeInsertionIndex(hostDoc, node, x, y, excludeId);
      return { parentId: node.id, index, containerId: node.id };
    }
    current = node.parent ?? undefined;
  }
  return null;
}
