import { Switch } from '@/components/ui/switch';
import { ColorControl } from './ColorControl';
import { literalColor, type ShadowValue } from '@/lib/builder/valueTypes';

const AXES: Array<{ key: 'x' | 'y' | 'blur' | 'spread'; label: string }> = [
  { key: 'x', label: 'X' },
  { key: 'y', label: 'Y' },
  { key: 'blur', label: 'Blur' },
  { key: 'spread', label: 'Spread' },
];

export function ShadowControl({
  value,
  onChange,
}: {
  value: ShadowValue | undefined;
  onChange: (v: ShadowValue) => void;
}) {
  const v: ShadowValue = value ?? {
    enabled: false,
    x: 0,
    y: 4,
    blur: 12,
    spread: 0,
    color: literalColor('rgba(0,0,0,0.25)'),
    inset: false,
  };

  return (
    <div className="space-y-2">
      <label className="flex items-center justify-between text-xs text-muted-foreground">
        Enable shadow
        <Switch checked={v.enabled} onCheckedChange={(enabled) => onChange({ ...v, enabled })} />
      </label>
      {v.enabled && (
        <>
          <div className="grid grid-cols-4 gap-1">
            {AXES.map(({ key, label }) => (
              <div key={key} className="relative">
                <input
                  type="number"
                  value={v[key]}
                  onChange={(e) => {
                    const num = e.target.valueAsNumber;
                    if (!Number.isNaN(num)) onChange({ ...v, [key]: num });
                  }}
                  className="h-8 w-full rounded-md border bg-transparent px-1.5 pt-3 text-center text-xs"
                />
                <span className="pointer-events-none absolute left-1.5 top-0.5 text-[9px] text-muted-foreground">
                  {label}
                </span>
              </div>
            ))}
          </div>
          <ColorControl value={v.color} onChange={(color) => onChange({ ...v, color })} />
          <label className="flex items-center justify-between text-xs text-muted-foreground">
            Inset
            <Switch checked={v.inset} onCheckedChange={(inset) => onChange({ ...v, inset })} />
          </label>
        </>
      )}
    </div>
  );
}
