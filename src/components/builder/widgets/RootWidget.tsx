import { registerWidget, type WidgetComponentProps } from '@/lib/builder/registry';
import { LayoutTemplate } from 'lucide-react';
import { useBuilderRuntime } from '@/components/builder/runtime/BuilderRuntimeContext';
import { cn } from '@/lib/utils';

function RootComponent({ wiring, children, backgroundLayers }: WidgetComponentProps) {
  const { isEditable } = useBuilderRuntime();
  return (
    <div {...wiring} className={cn('builder-el builder-root h-full min-h-[200px] bg-background', wiring.className)}>
      {backgroundLayers}
      {children}
      {isEditable && !children && (
        // Editor-only prompt - a genuinely empty published page just renders empty.
        <div className="flex h-full min-h-[200px] items-center justify-center border-2 border-dashed border-muted-foreground/25 text-sm text-muted-foreground">
          Drag a widget here to get started
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
