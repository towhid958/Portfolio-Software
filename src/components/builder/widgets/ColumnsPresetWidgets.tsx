import { registerWidget, type WidgetComponentProps } from '@/lib/builder/registry';
import { Columns2, Columns3, Columns4 } from 'lucide-react';

// Toolbox-only entries - dropping one never actually creates a node of this
// type (EditorShell's onDrop intercepts these widgetTypes via
// isColumnPreset() and inserts a row + N column Containers instead, see
// columnPresets.ts), so Component here is unreachable in normal use. It
// still renders a plain div rather than throwing, purely as a defensive
// fallback if a document somehow ends up with one of these types anyway.
function UnreachableComponent({ wiring, children }: WidgetComponentProps) {
  return <div {...(wiring as any)}>{children}</div>;
}

const PRESETS = [
  { type: 'columns-2', label: '2 Columns', icon: Columns2 },
  { type: 'columns-3', label: '3 Columns', icon: Columns3 },
  { type: 'columns-4', label: '4 Columns', icon: Columns4 },
] as const;

for (const preset of PRESETS) {
  registerWidget({
    type: preset.type,
    label: preset.label,
    icon: preset.icon,
    category: 'layout',
    keywords: ['columns', 'grid', 'layout', 'section', 'row'],
    isContainer: false,
    defaultContent: {},
    Component: UnreachableComponent,
  });
}
