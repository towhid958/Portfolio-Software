import { SelectControl } from './SelectControl';
import { LengthControl } from './LengthControl';
import { NumberControl } from './NumberControl';
import { defaultPosition, length, type PositionValue } from '@/lib/builder/valueTypes';

/** Types where top/right/bottom/left actually do something - not 'relative', which is commonly chosen just to establish a containing block with no visual shift intended. */
const OFFSET_TYPES: PositionValue['type'][] = ['absolute', 'fixed', 'sticky'];

const TYPE_OPTIONS = [
  { label: 'Static', value: 'static' },
  { label: 'Relative', value: 'relative' },
  { label: 'Absolute', value: 'absolute' },
  { label: 'Fixed', value: 'fixed' },
  { label: 'Sticky', value: 'sticky' },
];
const OFFSET_UNITS = ['px', '%', 'em', 'rem'] as const;

export function PositionControl({
  value,
  onChange,
}: {
  value: PositionValue | undefined;
  onChange: (v: PositionValue) => void;
}) {
  const v = value ?? defaultPosition();

  const handleTypeChange = (type: PositionValue['type']) => {
    if (!OFFSET_TYPES.includes(type)) {
      onChange({ ...v, type });
      return;
    }
    // Switching into absolute/fixed/sticky - default any offset that's
    // never been touched to 0 rather than leaving it at CSS's own default
    // (auto, which does nothing), so the position change is visible
    // immediately. Anything already set (e.g. from a previous switch) is
    // left alone.
    onChange({
      ...v,
      type,
      top: v.top ?? length(0),
      right: v.right ?? length(0),
      bottom: v.bottom ?? length(0),
      left: v.left ?? length(0),
    });
  };

  return (
    <div className="space-y-2">
      <SelectControl value={v.type} onChange={(type) => handleTypeChange(type as PositionValue['type'])} options={TYPE_OPTIONS} />

      {v.type !== 'static' && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="mb-1 block text-[11px] text-muted-foreground">Top</span>
              <LengthControl value={v.top} onChange={(top) => onChange({ ...v, top })} units={[...OFFSET_UNITS]} />
            </div>
            <div>
              <span className="mb-1 block text-[11px] text-muted-foreground">Right</span>
              <LengthControl value={v.right} onChange={(right) => onChange({ ...v, right })} units={[...OFFSET_UNITS]} />
            </div>
            <div>
              <span className="mb-1 block text-[11px] text-muted-foreground">Bottom</span>
              <LengthControl value={v.bottom} onChange={(bottom) => onChange({ ...v, bottom })} units={[...OFFSET_UNITS]} />
            </div>
            <div>
              <span className="mb-1 block text-[11px] text-muted-foreground">Left</span>
              <LengthControl value={v.left} onChange={(left) => onChange({ ...v, left })} units={[...OFFSET_UNITS]} />
            </div>
          </div>
          <div>
            <span className="mb-1 block text-[11px] text-muted-foreground">Z-Index</span>
            <NumberControl value={v.zIndex ?? 0} onChange={(zIndex) => onChange({ ...v, zIndex })} step={1} />
          </div>
        </>
      )}
    </div>
  );
}
