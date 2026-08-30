import { Children, useState } from 'react';
import { registerWidget, type WidgetComponentProps } from '@/lib/builder/registry';
import { PanelsTopLeft } from 'lucide-react';
import type { FieldDef } from '@/lib/builder/fields';
import { length } from '@/lib/builder/valueTypes';
import { literal } from '@/lib/builder/styleValue';
import { useBuilderRuntime } from '@/components/builder/runtime/BuilderRuntimeContext';
import { cn } from '@/lib/utils';

export interface TabsContent {
  labels: string[];
  tabStyle: 'underline' | 'pills';
}

// Each tab's content is simply the Nth child dropped into this container -
// label[i] names child[i], purely by position (see StringListControl's
// comment for why that's safe against reordering). All children actually
// render into the DOM at all times; only the inactive ones are display:none
// - a real "hide, don't unhide" toggle rather than conditionally not
// rendering, so a still-selected child inside a tab that just lost focus
// doesn't vanish out from under the editor mid-edit, and so switching tabs
// is instant with no re-mount.
function TabsComponent({ content, wiring, children, childIds }: WidgetComponentProps<TabsContent>) {
  const { isEditable } = useBuilderRuntime();
  const [activeIndex, setActiveIndex] = useState(0);
  const labels = content.labels?.length ? content.labels : ['Tab 1'];
  const panels = Children.toArray(children);
  const clampedActive = Math.min(activeIndex, Math.max(labels.length - 1, 0));
  const isPills = content.tabStyle === 'pills';

  return (
    <div {...(wiring as any)} className={cn('builder-el builder-tabs', wiring.className)}>
      <div className={cn('flex flex-wrap gap-1', !isPills && 'border-b border-current/15')} role="tablist">
        {labels.map((label, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === clampedActive}
            onClick={() => setActiveIndex(i)}
            className={cn(
              'builder-el-text px-3 py-2 text-sm font-medium transition-colors',
              isPills
                ? i === clampedActive
                  ? 'rounded-md bg-current/10'
                  : 'rounded-md opacity-60 hover:opacity-100'
                : i === clampedActive
                  ? 'border-b-2 border-current'
                  : 'border-b-2 border-transparent opacity-60 hover:opacity-100',
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="pt-3">
        {labels.map((_, i) => (
          <div key={childIds?.[i] ?? i} style={{ display: i === clampedActive ? 'block' : 'none' }}>
            {panels[i] ??
              (isEditable && (
                <div className="flex min-h-20 items-center justify-center border-2 border-dashed border-muted-foreground/30 bg-muted/20 text-xs text-muted-foreground">
                  Drop a Container here for this tab
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}

const contentFields: FieldDef[] = [
  { key: 'labels', label: 'Tabs', control: 'stringList', placeholder: 'tab' },
  {
    key: 'tabStyle',
    label: 'Tab Style',
    control: 'select',
    options: [
      { label: 'Underline', value: 'underline' },
      { label: 'Pills', value: 'pills' },
    ],
  },
];

registerWidget({
  type: 'tabs',
  label: 'Tabs',
  icon: PanelsTopLeft,
  category: 'layout',
  keywords: ['tabs', 'tabbed', 'panels'],
  isContainer: true,
  defaultContent: { labels: ['Tab 1', 'Tab 2', 'Tab 3'], tabStyle: 'underline' } satisfies TabsContent,
  defaultAdvanced: { width: literal(length(100, '%')), overflowX: literal('hidden') },
  contentFields,
  Component: TabsComponent,
});
