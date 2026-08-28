import { registerWidget, type WidgetComponentProps } from '@/lib/builder/registry';
import { Square } from 'lucide-react';
import type { FieldDef } from '@/lib/builder/fields';
import { box, length } from '@/lib/builder/valueTypes';
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
        showEmptyState && 'border-2 border-dashed border-muted-foreground/30 bg-muted/20',
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
  defaultDesign: { display: literal({ type: 'flex', direction: 'row', gap: length(16) }) },
  defaultAdvanced: { padding: literal(box(length(16))), minHeight: literal(length(80)) },
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
