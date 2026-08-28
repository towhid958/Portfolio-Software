import { ArrowRight, ArrowDown, ArrowLeft, ArrowUp } from 'lucide-react';
import { SelectControl } from './SelectControl';
import { IconButtonGroupControl } from './IconButtonGroupControl';
import { SliderControl } from './SliderControl';
import { LengthControl } from './LengthControl';
import type { DisplayValue } from '@/lib/builder/valueTypes';

const GAP_UNITS = ['px', '%', 'em', 'rem'] as const;

const TYPE_OPTIONS = [
  { label: 'Block', value: 'block' },
  { label: 'Flex', value: 'flex' },
  { label: 'Grid', value: 'grid' },
  { label: 'Inline Block', value: 'inline-block' },
  { label: 'Inline', value: 'inline' },
  { label: 'None (hidden)', value: 'none' },
];
const WRAP_OPTIONS = [
  { label: "Don't wrap", value: 'nowrap' },
  { label: 'Wrap', value: 'wrap' },
  { label: 'Wrap reverse', value: 'wrap-reverse' },
];
const JUSTIFY_OPTIONS = [
  { label: 'Start', value: 'flex-start' },
  { label: 'Center', value: 'center' },
  { label: 'End', value: 'flex-end' },
  { label: 'Space between', value: 'space-between' },
  { label: 'Space around', value: 'space-around' },
  { label: 'Space evenly', value: 'space-evenly' },
];
const ALIGN_OPTIONS = [
  { label: 'Start', value: 'flex-start' },
  { label: 'Center', value: 'center' },
  { label: 'End', value: 'flex-end' },
  { label: 'Stretch', value: 'stretch' },
  { label: 'Baseline', value: 'baseline' },
];

export function DisplayControl({
  value,
  onChange,
}: {
  value: DisplayValue | undefined;
  onChange: (v: DisplayValue) => void;
}) {
  const v: DisplayValue = value ?? { type: 'block' };
  const gapLinked = v.gapLinked !== false;

  function toggleGapLinked() {
    if (gapLinked) {
      // Splitting - seed Row/Column from the current unified gap so nothing visually jumps.
      const next: DisplayValue = { ...v, gapLinked: false };
      const seededRowGap = v.rowGap ?? v.gap;
      const seededColumnGap = v.columnGap ?? v.gap;
      if (seededRowGap) next.rowGap = seededRowGap;
      if (seededColumnGap) next.columnGap = seededColumnGap;
      onChange(next);
    } else {
      onChange({ ...v, gapLinked: true });
    }
  }

  return (
    <div className="space-y-2">
      <SelectControl value={v.type} onChange={(type) => onChange({ ...v, type: type as DisplayValue['type'] })} options={TYPE_OPTIONS} />

      {v.type === 'flex' && (
        <>
          <div>
            <span className="mb-1 block text-[11px] text-muted-foreground">Direction</span>
            <IconButtonGroupControl
              value={v.direction ?? 'row'}
              onChange={(direction) => onChange({ ...v, direction: direction as NonNullable<DisplayValue['direction']> })}
              options={[
                { label: 'Row', value: 'row', icon: ArrowRight },
                { label: 'Row Reverse', value: 'row-reverse', icon: ArrowLeft },
                { label: 'Column', value: 'column', icon: ArrowDown },
                { label: 'Column Reverse', value: 'column-reverse', icon: ArrowUp },
              ]}
            />
          </div>
          <div>
            <span className="mb-1 block text-[11px] text-muted-foreground">Wrap</span>
            <SelectControl value={v.wrap ?? 'nowrap'} onChange={(wrap) => onChange({ ...v, wrap: wrap as NonNullable<DisplayValue['wrap']> })} options={WRAP_OPTIONS} />
          </div>
        </>
      )}

      {v.type === 'grid' && (
        <div>
          <span className="mb-1 block text-[11px] text-muted-foreground">Columns</span>
          <SliderControl value={v.gridColumns ?? 2} onChange={(gridColumns) => onChange({ ...v, gridColumns })} min={1} max={12} step={1} />
        </div>
      )}

      {(v.type === 'flex' || v.type === 'grid') && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="mb-1 block text-[11px] text-muted-foreground">Justify Content</span>
              <SelectControl
                value={v.justifyContent ?? 'flex-start'}
                onChange={(justifyContent) => onChange({ ...v, justifyContent: justifyContent as NonNullable<DisplayValue['justifyContent']> })}
                options={JUSTIFY_OPTIONS}
              />
            </div>
            <div>
              <span className="mb-1 block text-[11px] text-muted-foreground">Align Items</span>
              <SelectControl
                value={v.alignItems ?? 'stretch'}
                onChange={(alignItems) => onChange({ ...v, alignItems: alignItems as NonNullable<DisplayValue['alignItems']> })}
                options={ALIGN_OPTIONS}
              />
            </div>
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">Gap</span>
              <button
                type="button"
                onClick={toggleGapLinked}
                className="text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                {gapLinked ? 'Split' : 'Link'}
              </button>
            </div>
            {gapLinked ? (
              <LengthControl value={v.gap} onChange={(gap) => onChange({ ...v, gap })} units={[...GAP_UNITS]} />
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="mb-1 block text-[10px] text-muted-foreground">Row</span>
                  <LengthControl value={v.rowGap ?? v.gap} onChange={(rowGap) => onChange({ ...v, rowGap })} units={[...GAP_UNITS]} />
                </div>
                <div>
                  <span className="mb-1 block text-[10px] text-muted-foreground">Column</span>
                  <LengthControl value={v.columnGap ?? v.gap} onChange={(columnGap) => onChange({ ...v, columnGap })} units={[...GAP_UNITS]} />
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
