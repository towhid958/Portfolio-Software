import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SelectControl } from './SelectControl';
import { ColorControl } from './ColorControl';
import { defaultGradient, literalColor, type GradientValue } from '@/lib/builder/valueTypes';

export function GradientControl({
  value,
  onChange,
}: {
  value: GradientValue | undefined;
  onChange: (v: GradientValue) => void;
}) {
  const v = value ?? defaultGradient();

  const setStop = (index: number, patch: Partial<GradientValue['stops'][number]>) => {
    const stops = v.stops.map((s, i) => (i === index ? { ...s, ...patch } : s));
    onChange({ ...v, stops });
  };

  const addStop = () => {
    onChange({ ...v, stops: [...v.stops, { color: literalColor('#ffffff'), position: 50 }] });
  };

  const removeStop = (index: number) => {
    if (v.stops.length <= 2) return;
    onChange({ ...v, stops: v.stops.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <SelectControl
          value={v.type}
          onChange={(type) => onChange({ ...v, type: type as GradientValue['type'] })}
          options={[
            { label: 'Linear', value: 'linear' },
            { label: 'Radial', value: 'radial' },
          ]}
        />
        {v.type === 'linear' && (
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={0}
              max={360}
              value={v.angle}
              onChange={(e) => {
                const num = e.target.valueAsNumber;
                if (!Number.isNaN(num)) onChange({ ...v, angle: num });
              }}
              className="h-8 w-full rounded-md border bg-transparent px-2 text-sm"
            />
            <span className="text-xs text-muted-foreground">deg</span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {v.stops.map((stop, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="flex-1">
              <ColorControl value={stop.color} onChange={(color) => setStop(i, { color })} />
            </div>
            <div className="flex w-20 items-center gap-1">
              <input
                type="number"
                min={0}
                max={100}
                value={stop.position}
                onChange={(e) => {
                  const num = e.target.valueAsNumber;
                  if (!Number.isNaN(num)) setStop(i, { position: num });
                }}
                className="h-8 w-full rounded-md border bg-transparent px-1.5 text-center text-xs"
              />
              <span className="text-xs text-muted-foreground">%</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              disabled={v.stops.length <= 2}
              onClick={() => removeStop(i)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={addStop}>
        <Plus className="h-3 w-3" /> Add color stop
      </Button>
    </div>
  );
}
