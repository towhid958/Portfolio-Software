import { SliderControl } from './SliderControl';
import type { FilterValue } from '@/lib/builder/valueTypes';

export function FilterControl({
  value,
  onChange,
}: {
  value: FilterValue | undefined;
  onChange: (v: FilterValue) => void;
}) {
  const v: FilterValue = value ?? {};

  return (
    <div className="space-y-2">
      <div>
        <span className="mb-1 block text-[11px] text-muted-foreground">Blur (px)</span>
        <SliderControl value={v.blur ?? 0} onChange={(blur) => onChange({ ...v, blur })} min={0} max={40} step={1} />
      </div>
      <div>
        <span className="mb-1 block text-[11px] text-muted-foreground">Brightness (%)</span>
        <SliderControl value={v.brightness ?? 100} onChange={(brightness) => onChange({ ...v, brightness })} min={0} max={200} step={5} />
      </div>
      <div>
        <span className="mb-1 block text-[11px] text-muted-foreground">Contrast (%)</span>
        <SliderControl value={v.contrast ?? 100} onChange={(contrast) => onChange({ ...v, contrast })} min={0} max={200} step={5} />
      </div>
      <div>
        <span className="mb-1 block text-[11px] text-muted-foreground">Saturation (%)</span>
        <SliderControl value={v.saturate ?? 100} onChange={(saturate) => onChange({ ...v, saturate })} min={0} max={200} step={5} />
      </div>
      <div>
        <span className="mb-1 block text-[11px] text-muted-foreground">Grayscale (%)</span>
        <SliderControl value={v.grayscale ?? 0} onChange={(grayscale) => onChange({ ...v, grayscale })} min={0} max={100} step={5} />
      </div>
    </div>
  );
}
