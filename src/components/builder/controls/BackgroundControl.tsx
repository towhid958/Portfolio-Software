import { SelectControl } from './SelectControl';
import { ColorControl } from './ColorControl';
import { GradientControl } from './GradientControl';
import { MediaControl } from './MediaControl';
import { SliderControl } from './SliderControl';
import { VideoControl } from './VideoControl';
import { defaultGradient, literalColor, type BackgroundValue } from '@/lib/builder/valueTypes';

const IMAGE_SIZE_OPTIONS = [
  { label: 'Cover', value: 'cover' },
  { label: 'Contain', value: 'contain' },
  { label: 'Auto', value: 'auto' },
];
const IMAGE_REPEAT_OPTIONS = [
  { label: "Don't repeat", value: 'no-repeat' },
  { label: 'Repeat', value: 'repeat' },
];
const IMAGE_POSITION_OPTIONS = [
  { label: 'Center', value: 'center center' },
  { label: 'Top', value: 'center top' },
  { label: 'Bottom', value: 'center bottom' },
  { label: 'Left', value: 'left center' },
  { label: 'Right', value: 'right center' },
];

export function BackgroundControl({
  value,
  onChange,
  allowVideo = true,
  allowOpacity = false,
}: {
  value: BackgroundValue | undefined;
  onChange: (v: BackgroundValue) => void;
  /** Off for Background Overlay - a video overlay isn't offered, only the base Background can be a video. */
  allowVideo?: boolean;
  /** On for Background Overlay only - the base Background has no opacity control. */
  allowOpacity?: boolean;
}) {
  const type = value?.type ?? 'none';
  const image = value?.image ?? { url: '', size: 'cover' as const, position: 'center center', repeat: 'no-repeat' as const };
  const video = value?.video ?? { url: '', source: 'link' as const };

  const typeOptions = [
    { label: 'Transparent', value: 'none' },
    { label: 'Solid Color', value: 'color' },
    { label: 'Gradient', value: 'gradient' },
    { label: 'Image', value: 'image' },
    ...(allowVideo ? [{ label: 'Video', value: 'video' }] : []),
  ];

  return (
    <div className="space-y-2">
      <SelectControl
        value={type}
        onChange={(next) => {
          if (next === 'color') onChange({ ...value, type: 'color', color: value?.color ?? literalColor('#ffffff') });
          else if (next === 'gradient') onChange({ ...value, type: 'gradient', gradient: value?.gradient ?? defaultGradient() });
          else if (next === 'image') onChange({ ...value, type: 'image', image });
          else if (next === 'video') onChange({ ...value, type: 'video', video });
          else onChange({ type: 'none' });
        }}
        options={typeOptions}
      />

      {type === 'color' && <ColorControl value={value?.color} onChange={(color) => onChange({ ...value, type: 'color', color })} />}

      {type === 'gradient' && (
        <GradientControl value={value?.gradient} onChange={(gradient) => onChange({ ...value, type: 'gradient', gradient })} />
      )}

      {type === 'image' && (
        <div className="space-y-2">
          <MediaControl value={image.url} onChange={(url) => onChange({ ...value, type: 'image', image: { ...image, url: url ?? '' } })} />
          <SelectControl
            value={image.size}
            onChange={(size) => onChange({ ...value, type: 'image', image: { ...image, size: size as typeof image.size } })}
            options={IMAGE_SIZE_OPTIONS}
          />
          <SelectControl
            value={image.position}
            onChange={(position) => onChange({ ...value, type: 'image', image: { ...image, position } })}
            options={IMAGE_POSITION_OPTIONS}
          />
          <SelectControl
            value={image.repeat}
            onChange={(repeat) => onChange({ ...value, type: 'image', image: { ...image, repeat: repeat as typeof image.repeat } })}
            options={IMAGE_REPEAT_OPTIONS}
          />
        </div>
      )}

      {allowVideo && type === 'video' && (
        <VideoControl value={video} onChange={(next) => onChange({ ...value, type: 'video', video: next })} />
      )}

      {allowOpacity && type !== 'none' && (
        <div className="space-y-1.5 pt-1">
          <span className="block text-[11px] text-muted-foreground">Opacity</span>
          <SliderControl
            value={value?.opacity ?? 1}
            onChange={(opacity) => onChange({ ...(value as BackgroundValue), opacity })}
            min={0}
            max={1}
            step={0.05}
          />
        </div>
      )}
    </div>
  );
}
