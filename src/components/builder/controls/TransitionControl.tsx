import { SliderControl } from './SliderControl';
import { SelectControl } from './SelectControl';
import type { TransitionValue } from '@/lib/builder/valueTypes';

const EASING_OPTIONS = [
  { label: 'Ease', value: 'ease' },
  { label: 'Ease In', value: 'ease-in' },
  { label: 'Ease Out', value: 'ease-out' },
  { label: 'Ease In Out', value: 'ease-in-out' },
  { label: 'Linear', value: 'linear' },
];

// Makes a Hover-state change (colour, transform, opacity, ...) animate
// instead of snapping - set it on the Normal state so it applies whichever
// direction the state changes, not just the transition into Hover.
export function TransitionControl({
  value,
  onChange,
}: {
  value: TransitionValue | undefined;
  onChange: (v: TransitionValue) => void;
}) {
  const v: TransitionValue = value ?? { duration: 0, easing: 'ease' };

  return (
    <div className="space-y-2">
      <div>
        <span className="mb-1 block text-[11px] text-muted-foreground">Duration (ms)</span>
        <SliderControl value={v.duration} onChange={(duration) => onChange({ ...v, duration })} min={0} max={2000} step={50} />
      </div>
      <div>
        <span className="mb-1 block text-[11px] text-muted-foreground">Easing</span>
        <SelectControl value={v.easing} onChange={(easing) => onChange({ ...v, easing: easing as TransitionValue['easing'] })} options={EASING_OPTIONS} />
      </div>
    </div>
  );
}
