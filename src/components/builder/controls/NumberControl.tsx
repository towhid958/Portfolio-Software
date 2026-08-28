import { Input } from '@/components/ui/input';

export function NumberControl({
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number | undefined;
  max?: number | undefined;
  step?: number | undefined;
}) {
  return (
    <Input
      type="number"
      value={Number.isFinite(value) ? value : 0}
      min={min}
      max={max}
      step={step}
      onChange={(e) => {
        const next = e.target.valueAsNumber;
        if (!Number.isNaN(next)) onChange(next);
      }}
      className="h-8 text-sm"
    />
  );
}
