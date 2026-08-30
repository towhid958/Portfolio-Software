import { registerWidget, type WidgetComponentProps } from '@/lib/builder/registry';
import { MoveVertical } from 'lucide-react';
import { useBuilderRuntime } from '@/components/builder/runtime/BuilderRuntimeContext';
import { length } from '@/lib/builder/valueTypes';
import { literal } from '@/lib/builder/styleValue';
import { cn } from '@/lib/utils';

// Purely a height, adjustable via the existing Sizing style group - an
// invisible-by-design widget, so the editor draws a dashed guide + label
// over it (isEditable-gated, same as Container/Root's empty-state chrome)
// or it would be unselectable-looking blank space on the canvas.
function SpacerComponent({ wiring }: WidgetComponentProps<Record<string, never>>) {
  const { isEditable } = useBuilderRuntime();
  return (
    <div {...(wiring as any)} className={cn('builder-el builder-spacer relative', wiring.className)}>
      {isEditable && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="w-full border-t border-dashed border-muted-foreground/40" />
          <span className="absolute bg-background px-1.5 text-[10px] text-muted-foreground">Spacer</span>
        </div>
      )}
    </div>
  );
}

registerWidget({
  type: 'spacer',
  label: 'Spacer',
  icon: MoveVertical,
  category: 'basic',
  keywords: ['spacer', 'space', 'gap', 'padding'],
  isContainer: false,
  defaultContent: {},
  defaultAdvanced: { height: literal(length(40)), width: literal(length(100, '%')), overflowX: literal('hidden') },
  // Purely a height - no children to lay out (Display), no text
  // (Typography), and a border on an invisible-by-design spacer would just
  // be confusing (Border).
  excludeStyleGroups: ['Display', 'Typography', 'Border'],
  Component: SpacerComponent,
});
