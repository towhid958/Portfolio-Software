import { SelectControl } from './SelectControl';
import { ColorControl } from './ColorControl';
import { GradientControl } from './GradientControl';
import { defaultGradient, literalColor, type TextFillValue } from '@/lib/builder/valueTypes';

export function TextFillControl({
  value,
  onChange,
}: {
  value: TextFillValue | undefined;
  onChange: (v: TextFillValue) => void;
}) {
  const type = value?.type ?? 'solid';

  return (
    <div className="space-y-2">
      <SelectControl
        value={type}
        onChange={(next) =>
          onChange(
            next === 'gradient'
              ? { type: 'gradient', gradient: value?.gradient ?? defaultGradient() }
              : { type: 'solid', color: value?.color ?? literalColor('#000000') }
          )
        }
        options={[
          { label: 'Solid', value: 'solid' },
          { label: 'Gradient', value: 'gradient' },
        ]}
      />
      {type === 'solid' && <ColorControl value={value?.color} onChange={(color) => onChange({ type: 'solid', color })} />}
      {type === 'gradient' && (
        <GradientControl value={value?.gradient} onChange={(gradient) => onChange({ type: 'gradient', gradient })} />
      )}
    </div>
  );
}
