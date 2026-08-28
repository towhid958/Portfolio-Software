import { Link2, Link2Off } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SelectControl } from './SelectControl';
import { ColorControl } from './ColorControl';
import { LengthControl } from './LengthControl';
import { defaultBorder, type BorderSide, type BorderValue, type SideBorder } from '@/lib/builder/valueTypes';

const WIDTH_UNITS = ['px', 'em', 'rem'] as const;

const STYLE_OPTIONS = [
  { label: 'None', value: 'none' },
  { label: 'Solid', value: 'solid' },
  { label: 'Dashed', value: 'dashed' },
  { label: 'Dotted', value: 'dotted' },
];

const SIDES: Array<{ key: BorderSide; label: string }> = [
  { key: 'top', label: 'Top' },
  { key: 'right', label: 'Right' },
  { key: 'bottom', label: 'Bottom' },
  { key: 'left', label: 'Left' },
];

function SideEditor({ value, onChange }: { value: SideBorder; onChange: (v: SideBorder) => void }) {
  return (
    <div className="space-y-2">
      <SelectControl
        value={value.style}
        onChange={(style) => onChange({ ...value, style: style as SideBorder['style'] })}
        options={STYLE_OPTIONS}
      />
      {value.style !== 'none' && (
        <>
          <div>
            <span className="mb-1 block text-[11px] text-muted-foreground">Width</span>
            <LengthControl value={value.width} onChange={(width) => onChange({ ...value, width })} units={[...WIDTH_UNITS]} />
          </div>
          <ColorControl value={value.color} onChange={(color) => onChange({ ...value, color })} />
        </>
      )}
    </div>
  );
}

export function BorderControl({
  value,
  onChange,
}: {
  value: BorderValue | undefined;
  onChange: (v: BorderValue) => void;
}) {
  const v = value ?? defaultBorder();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">Apply to each side individually</span>
        <Button
          type="button"
          variant={v.perSide ? 'secondary' : 'ghost'}
          size="icon"
          className="h-7 w-7 shrink-0"
          title={v.perSide ? 'Switch to a single border for all sides' : 'Switch to per-side borders'}
          onClick={() => onChange({ ...v, perSide: !v.perSide })}
        >
          {v.perSide ? <Link2Off className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
        </Button>
      </div>

      {v.perSide ? (
        <div className="space-y-3">
          {SIDES.map(({ key, label }) => (
            <div key={key} className="space-y-1.5 rounded-md border p-2">
              <span className="text-[11px] font-medium">{label}</span>
              <SideEditor value={v[key]} onChange={(side) => onChange({ ...v, [key]: side })} />
            </div>
          ))}
        </div>
      ) : (
        <SideEditor value={v.all} onChange={(all) => onChange({ ...v, all })} />
      )}
    </div>
  );
}
