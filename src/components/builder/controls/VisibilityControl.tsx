import { Monitor, Tablet, Smartphone } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { BreakpointId } from '@/lib/builder/breakpoints';

const ROWS: Array<{ id: BreakpointId; label: string; icon: typeof Monitor }> = [
  { id: 'desktop', label: 'Desktop', icon: Monitor },
  { id: 'tablet', label: 'Tablet', icon: Tablet },
  { id: 'mobile', label: 'Mobile', icon: Smartphone },
];

// Per-breakpoint only, no state layer - visibility can't be hovered, so this
// doesn't go through the StyleValue/ResponsiveStateField machinery at all.
export function VisibilityControl({
  value,
  onChange,
}: {
  value: Partial<Record<BreakpointId, boolean>> | undefined;
  onChange: (v: Partial<Record<BreakpointId, boolean>>) => void;
}) {
  const hiddenOn = ROWS.filter((r) => value?.[r.id]).map((r) => r.id);

  return (
    <div>
      <span className="mb-1 block text-[11px] text-muted-foreground">Hide on</span>
      <ToggleGroup
        type="multiple"
        value={hiddenOn}
        onValueChange={(next) => {
          const nextValue: Partial<Record<BreakpointId, boolean>> = {};
          for (const row of ROWS) nextValue[row.id] = next.includes(row.id);
          onChange(nextValue);
        }}
        className="justify-start rounded-md border p-0.5"
      >
        {ROWS.map((row) => (
          <ToggleGroupItem key={row.id} value={row.id} title={`Hide on ${row.label}`} className="h-7 w-7 p-0">
            <row.icon className="h-3.5 w-3.5" />
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}
