import { Link2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TextControl } from './TextControl';
import { SelectControl } from './SelectControl';
import { MediaControl } from './MediaControl';
import type { BackgroundValue } from '@/lib/builder/valueTypes';

type VideoValue = NonNullable<BackgroundValue['video']>;

const FIT_OPTIONS = [
  { label: 'Cover', value: 'cover' },
  { label: 'Contain', value: 'contain' },
];
const POSITION_OPTIONS = [
  { label: 'Center', value: 'center' },
  { label: 'Top', value: 'top' },
  { label: 'Bottom', value: 'bottom' },
  { label: 'Left', value: 'left' },
  { label: 'Right', value: 'right' },
];

export function VideoControl({ value, onChange }: { value: VideoValue | undefined; onChange: (v: VideoValue) => void }) {
  const v: VideoValue = value ?? { url: '', source: 'link' };
  const source = v.source ?? 'link';

  return (
    <div className="space-y-2">
      <div className="flex gap-1 rounded-md border p-0.5">
        <Button
          type="button"
          variant={source === 'link' ? 'secondary' : 'ghost'}
          size="sm"
          className="h-7 flex-1 gap-1.5 text-xs"
          onClick={() => onChange({ ...v, source: 'link', url: '' })}
        >
          <Link2 className="h-3 w-3" /> Link
        </Button>
        <Button
          type="button"
          variant={source === 'upload' ? 'secondary' : 'ghost'}
          size="sm"
          className="h-7 flex-1 gap-1.5 text-xs"
          onClick={() => onChange({ ...v, source: 'upload', url: '' })}
        >
          <Upload className="h-3 w-3" /> Upload
        </Button>
      </div>

      {source === 'link' ? (
        <TextControl value={v.url} placeholder="https://.../video.mp4" onChange={(url) => onChange({ ...v, url, source: 'link' })} />
      ) : (
        // Same Media Library dialog as Image backgrounds - Library tab lists
        // existing videos only (accept="video" filters the query), Upload
        // tab adds a new one. No bespoke upload button here anymore.
        <MediaControl accept="video" value={v.url} onChange={(url) => onChange({ ...v, url: url ?? '', source: 'upload' })} />
      )}

      <span className="block text-[11px] text-muted-foreground pt-1">Poster image (shown while the video loads)</span>
      <MediaControl value={v.posterUrl} onChange={(posterUrl) => onChange({ ...v, posterUrl: posterUrl ?? undefined })} />

      <div className="grid grid-cols-2 gap-2 pt-1">
        <div>
          <span className="mb-1 block text-[11px] text-muted-foreground">Fit</span>
          <SelectControl value={v.fit ?? 'cover'} onChange={(fit) => onChange({ ...v, fit: fit as VideoValue['fit'] })} options={FIT_OPTIONS} />
        </div>
        <div>
          <span className="mb-1 block text-[11px] text-muted-foreground">Position</span>
          <SelectControl value={v.position ?? 'center'} onChange={(position) => onChange({ ...v, position })} options={POSITION_OPTIONS} />
        </div>
      </div>
    </div>
  );
}
