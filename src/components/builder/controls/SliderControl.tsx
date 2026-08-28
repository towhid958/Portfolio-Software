import { Slider } from '@/components/ui/slider';

export function SliderControl({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number | undefined;
  max?: number | undefined;
  step?: number | undefined;
}) {
  return (
    <div className="flex items-center gap-3">
      <Slider
        value={[Number.isFinite(value) ? value : min]}
        onValueChange={([v]) => v !== undefined && onChange(v)}
        min={min}
        max={max}
        step={step}
        className="flex-1"
      />
      <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
        {Number.isFinite(value) ? value : min}
      </span>
    </div>
  );
}
