import { LengthControl } from './LengthControl';
import { NumberControl } from './NumberControl';
import type { TransformValue } from '@/lib/builder/valueTypes';

const TRANSLATE_UNITS = ['px', '%', 'em', 'rem'] as const;

export function TransformControl({
  value,
  onChange,
}: {
  value: TransformValue | undefined;
  onChange: (v: TransformValue) => void;
}) {
  const v: TransformValue = value ?? {};

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <span className="mb-1 block text-[11px] text-muted-foreground">Move X</span>
          <LengthControl value={v.translateX} onChange={(translateX) => onChange({ ...v, translateX })} units={[...TRANSLATE_UNITS]} />
        </div>
        <div>
          <span className="mb-1 block text-[11px] text-muted-foreground">Move Y</span>
          <LengthControl value={v.translateY} onChange={(translateY) => onChange({ ...v, translateY })} units={[...TRANSLATE_UNITS]} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <span className="mb-1 block text-[11px] text-muted-foreground">Rotate (deg)</span>
          <NumberControl value={v.rotate ?? 0} onChange={(rotate) => onChange({ ...v, rotate })} step={1} />
        </div>
        <div>
          <span className="mb-1 block text-[11px] text-muted-foreground">Scale (%)</span>
          <NumberControl value={v.scale ?? 100} onChange={(scale) => onChange({ ...v, scale })} min={0} step={5} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <span className="mb-1 block text-[11px] text-muted-foreground">Skew X (deg)</span>
          <NumberControl value={v.skewX ?? 0} onChange={(skewX) => onChange({ ...v, skewX })} step={1} />
        </div>
        <div>
          <span className="mb-1 block text-[11px] text-muted-foreground">Skew Y (deg)</span>
          <NumberControl value={v.skewY ?? 0} onChange={(skewY) => onChange({ ...v, skewY })} step={1} />
        </div>
      </div>
    </div>
  );
}
