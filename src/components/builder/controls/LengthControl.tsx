import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { length, type LengthUnit, type LengthValue } from '@/lib/builder/valueTypes';

export function LengthControl({
  value,
  onChange,
  units = ['px', '%', 'em', 'rem', 'vw', 'vh', 'auto'],
}: {
  value: LengthValue | undefined;
  onChange: (v: LengthValue) => void;
  units?: LengthUnit[] | undefined;
}) {
  const v = value ?? length(0, units.includes('auto') ? 'auto' : units[0]);

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="number"
        value={v.unit === 'auto' ? '' : v.value}
        disabled={v.unit === 'auto'}
        placeholder={v.unit === 'auto' ? 'auto' : undefined}
        onChange={(e) => {
          const num = e.target.valueAsNumber;
          if (!Number.isNaN(num)) onChange(length(num, v.unit));
        }}
        className="h-8 w-full rounded-md border bg-transparent px-2 text-sm disabled:opacity-50"
      />
      <Select value={v.unit} onValueChange={(unit) => onChange(unit === 'auto' ? length(0, 'auto') : length(v.value, unit as LengthUnit))}>
        <SelectTrigger className="h-8 w-20 shrink-0 text-xs">
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
    </div>
  );
}
