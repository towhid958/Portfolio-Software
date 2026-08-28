import { Link2, Link2Off } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { box, length, type BoxValue, type LengthUnit } from '@/lib/builder/valueTypes';

const SIDE_LABELS: Record<keyof Pick<BoxValue, 'top' | 'right' | 'bottom' | 'left'>, string> = {
  top: 'T',
  right: 'R',
  bottom: 'B',
  left: 'L',
};

export function DimensionsControl({
  value,
  onChange,
  units = ['px', '%', 'em', 'rem'],
}: {
  value: BoxValue | undefined;
  onChange: (v: BoxValue) => void;
  units?: LengthUnit[] | undefined;
}) {
  const v = value ?? box();
  const unit = v.top.unit;

  const setSide = (side: keyof typeof SIDE_LABELS, num: number) => {
    const next = length(num, unit);
    if (v.linked) {
      onChange({ top: next, right: next, bottom: next, left: next, linked: true });
    } else {
      onChange({ ...v, [side]: next });
    }
  };

  const setUnit = (nextUnit: LengthUnit) => {
    onChange({
      top: { ...v.top, unit: nextUnit },
      right: { ...v.right, unit: nextUnit },
      bottom: { ...v.bottom, unit: nextUnit },
      left: { ...v.left, unit: nextUnit },
      linked: v.linked,
    });
  };

  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-4 gap-1">
        {(Object.keys(SIDE_LABELS) as Array<keyof typeof SIDE_LABELS>).map((side) => (
          <div key={side} className="relative">
            <Input
              type="number"
              value={v[side].value}
              onChange={(e) => {
                const next = e.target.valueAsNumber;
                if (!Number.isNaN(next)) setSide(side, next);
              }}
              className="h-8 pl-5 pr-1 text-center text-xs"
            />
            <span className="pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
              {SIDE_LABELS[side]}
            </span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        <Select value={unit} onValueChange={(u) => setUnit(u as LengthUnit)}>
          <SelectTrigger className="h-7 flex-1 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {units.map((u) => (
              <SelectItem key={u} value={u} className="text-xs">
                {u}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant={v.linked ? 'secondary' : 'ghost'}
          size="icon"
          className="h-7 w-7 shrink-0"
          title={v.linked ? 'Unlink sides' : 'Link sides'}
          onClick={() => onChange({ ...v, linked: !v.linked })}
        >
          {v.linked ? <Link2 className="h-3.5 w-3.5" /> : <Link2Off className="h-3.5 w-3.5" />}
        </Button>
      </div>
    </div>
  );
}
