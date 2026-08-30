import { registerWidget, type WidgetComponentProps } from '@/lib/builder/registry';
import { Square } from 'lucide-react';
import type { FieldDef } from '@/lib/builder/fields';
import { box, length, literalColor } from '@/lib/builder/valueTypes';
import { literal } from '@/lib/builder/styleValue';
import { useBuilderRuntime } from '@/components/builder/runtime/BuilderRuntimeContext';
import { cn } from '@/lib/utils';

// display/direction/gap now live in the shared Style tab's Display section
// (design.display) rather than here - a Container is just a tag choice now,
// everything about how it lays out is the same Display control any widget
// gets. The empty-state minHeight/padding still live in defaultAdvanced/
// defaultDesign below so a freshly-dropped Container still looks right.
export interface ContainerContent {
  tag: 'div' | 'section' | 'header' | 'footer' | 'article' | 'aside' | 'nav';
}

function ContainerComponent({ content, wiring, children, backgroundLayers }: WidgetComponentProps<ContainerContent>) {
  const { isEditable } = useBuilderRuntime();
  const Tag = (content.tag || 'div') as 'div';
  const showEmptyState = isEditable && !children;

  return (
    <Tag
      {...(wiring as any)}
      className={cn(
        'builder-el builder-container',
        // No bg-* here - the real default background (see defaultDesign
        // below) already wins over any Tailwind background class on this
        // element (same .builder-el-vs-Tailwind precedence as everywhere
        // else in this file), so a class here would be dead/misleading.
        showEmptyState && 'border-2 border-dashed border-muted-foreground/30',
        wiring.className
      )}
    >
      {backgroundLayers}
      {children}
      {showEmptyState && (
        // Absolutely positioned so it centers regardless of the container's
        // own Display settings (block, flex with any alignment, grid...) -
        // it's a placeholder overlay, not a layout participant. Editor-only:
        // on the published page an empty container should just be empty,
        // not show editing chrome as if it were real content.
        <span className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
          Container (empty)
        </span>
      )}
    </Tag>
  );
}

const contentFields: FieldDef[] = [
  {
    key: 'tag',
    label: 'HTML Tag',
    control: 'select',
    options: [
      { label: 'div', value: 'div' },
      { label: 'section', value: 'section' },
      { label: 'header', value: 'header' },
      { label: 'footer', value: 'footer' },
      { label: 'article', value: 'article' },
      { label: 'aside', value: 'aside' },
      { label: 'nav', value: 'nav' },
    ],
  },
];

registerWidget({
  type: 'container',
  label: 'Container',
  icon: Square,
  category: 'layout',
  keywords: ['container', 'section', 'column', 'wrapper', 'flex', 'grid', 'div'],
  isContainer: true,
  defaultContent: { tag: 'div' } satisfies ContainerContent,
  defaultDesign: {
    display: literal({ type: 'flex', direction: 'row', gap: length(16) }),
    background: literal({ type: 'color', color: literalColor('#eaeaea') }),
  },
  // minWidth matters just as much as minHeight here, not just for looks:
  // an empty container dropped into a ROW-direction flex parent has no
  // content to size its main axis against, so without it the container
  // collapses to near-zero width (just its own horizontal padding) and
  // becomes a barely-visible, hard-to-target sliver - easy to mistake for
  // "the drop didn't work" when nesting a second container inside a
  // row-flex one. minHeight covers the equivalent COLUMN-parent case.
  //
  // width 100% matches the same "shrink-wraps an empty box" issue as
  // Divider/Video default to full width for, and overflow hidden is the
  // sane default for a layout wrapper - content that overflows its bounds
  // (an oversized image, a rotated child) should be clipped by default
  // rather than silently spilling into whatever's next in the stack; both
  // remain fully overridable per-instance in the Advanced tab.
  defaultAdvanced: {
    padding: literal(box(length(16))),
    minWidth: literal(length(80)),
    minHeight: literal(length(80)),
    width: literal(length(100, '%')),
    overflowX: literal('hidden'),
    overflowY: literal('hidden'),
  },
  contentFields,
  // A Container has no text of its own - it's a pure layout wrapper, so
  // nothing in the Typography group has anything to apply to on the element
  // itself (and, since typography/colour deliberately no longer cascade to
  // children - see collectDeclarations in styleGenerator.ts - setting them
  // here wouldn't do anything to its contents either). Excluded by group,
  // not by individual field key, so it stays correct if more fields get
  // added to Typography later. Text-bearing widgets (Heading, and future
  // Text/Button/etc.) keep it.
  excludeStyleGroups: ['Typography'],
  Component: ContainerComponent,
});
