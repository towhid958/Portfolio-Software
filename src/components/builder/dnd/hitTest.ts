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
    const node: ElementNode | undefined = doc.nodes[current];
    if (!node) return null;
    if (getWidget(node.type)?.isContainer) {
      const index = computeInsertionIndex(hostDoc, node, x, y, excludeId);
      return { parentId: node.id, index, containerId: node.id };
    }
    current = node.parent ?? undefined;
  }
  return null;
}
