import { Link2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TextControl } from './TextControl';
import { MediaControl } from './MediaControl';

export interface VideoUrlValue {
  url: string;
  source?: 'link' | 'upload';
}

// Same Link/Upload toggle pattern as VideoControl (used for Background
// videos), but scoped to just {url, source} - a content Video widget also
// needs autoplay/loop/muted/controls and no fit/position, so it's simpler
// to keep this as its own small control than to generalize VideoControl's
// BackgroundValue['video']-specific shape for one more caller.
export function VideoUrlControl({
  value,
  onChange,
}: {
  value: VideoUrlValue | undefined;
  onChange: (v: VideoUrlValue) => void;
}) {
  const v = value ?? { url: '', source: 'link' as const };
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
        <TextControl
          value={v.url}
          placeholder="YouTube, Vimeo, or direct video URL"
          onChange={(url) => onChange({ ...v, url, source: 'link' })}
        />
      ) : (
        <MediaControl accept="video" value={v.url} onChange={(url) => onChange({ ...v, url: url ?? '', source: 'upload' })} />
      )}
    </div>
  );
}
