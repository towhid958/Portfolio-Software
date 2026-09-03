import { registerWidget, type WidgetComponentProps } from '@/lib/builder/registry';
import { LayoutTemplate, Plus } from 'lucide-react';
import { useBuilderRuntime } from '@/components/builder/runtime/BuilderRuntimeContext';
import { cn } from '@/lib/utils';

function RootComponent({ wiring, children, backgroundLayers }: WidgetComponentProps) {
  const { isEditable } = useBuilderRuntime();
  return (
    <div
      {...wiring}
      // (not h-full/min-h-* for sizing - those fight .builder-el's own
      // `height: var(--el-display, auto)` and lose, since the canvas's
      // generated stylesheet loads after Tailwind's)
      className={cn('builder-el builder-root bg-background', wiring.className)}
      // flex: '1 0 auto' - grow to fill Canvas's flex-column wrapper when
      // content is shorter than the viewport (flex-grow:1), but never
      // *shrink* below its own natural content+padding size (flex-shrink:0)
      // when content is taller. That second part matters: Tailwind's
      // flex-1 utility is `flex: 1 1 0%`, and combined with .builder-el's
      // own `min-height: var(--el-min-height, 0)` (root has no explicit
      // min-height, so this is 0 - removing the flex item's normal
      // "never shrink below content" floor), a shrinkable root was being
      // squeezed back down to exactly fill the viewport even when its
      // content+padding wanted to be taller, quietly erasing the bottom
      // reserve below whenever the page was already full. flex-shrink:0
      // makes that impossible - the reserve is a real per-page minimum.
      style={{ flex: '1 0 auto', minHeight: 200 }}
    >
      {backgroundLayers}
      {children}
      {isEditable && !children && (
        // Editor-only prompt - a genuinely empty published page just renders empty.
        <div className="flex h-full min-h-[200px] items-center justify-center border-2 border-dashed border-muted-foreground/25 text-sm text-muted-foreground">
          Drag a widget here to get started
        </div>
      )}
      {isEditable && children && (
        // A real, visible drop zone below the last element rather than
        // invisible reserved padding - same purpose (always somewhere to
        // drop a new top-level section, even once the page already fills
        // the canvas - see flex-shrink:0 above, which is what keeps this
        // from getting squeezed away), but reads as an intentional part of
        // the editor UI instead of a stray gap. Same dashed-placeholder
        // language as the empty-page prompt above, not its own thing.
        // Accepts any widget, not just a Container - the label is a
        // nudge toward the most common use (adding another section), not
        // a restriction; hitTestContainer resolves a drop here the same
        // way it already does for the empty-page prompt, since this is
        // just a plain child with no data-el-id of its own.
        <div className="p-4 bg-white">
          <div className="flex h-28 cursor-pointer items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-muted-foreground/25 text-sm text-muted-foreground transition-colors hover:border-muted-foreground/40 hover:text-foreground">
            <Plus className="h-4 w-4" />
            Add Container
          </div>
        </div>
      )}
    </div>
  );
}

registerWidget({
  type: 'root',
  label: 'Page',
  icon: LayoutTemplate,
  category: 'layout',
  keywords: [],
  isContainer: true,
  defaultContent: {},
  Component: RootComponent,
});
