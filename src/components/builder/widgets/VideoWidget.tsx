import { registerWidget, type WidgetComponentProps } from '@/lib/builder/registry';
import { Video as VideoIcon } from 'lucide-react';
import type { FieldDef } from '@/lib/builder/fields';
import type { VideoUrlValue } from '@/components/builder/controls/VideoUrlControl';
import { useBuilderRuntime } from '@/components/builder/runtime/BuilderRuntimeContext';
import { length } from '@/lib/builder/valueTypes';
import { literal } from '@/lib/builder/styleValue';
import { cn } from '@/lib/utils';

export interface VideoContent {
  video: VideoUrlValue;
  posterUrl?: string | null;
  autoplay: boolean;
  loop: boolean;
  muted: boolean;
  controls: boolean;
}

type ParsedVideo = { type: 'youtube' | 'vimeo'; id: string } | { type: 'file' };

// YouTube/Vimeo links embed as an iframe; anything else (including an
// uploaded file) plays as a real <video> - one URL field covers both,
// pattern-matched here rather than making the user pick a "source type"
// up front. `source` ('link' vs 'upload') only decides which input the
// Video field itself shows - both end up as a plain url string here.
function parseVideoUrl(url: string): ParsedVideo {
  const youtube = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/.exec(url);
  if (youtube?.[1]) return { type: 'youtube', id: youtube[1] };
  const vimeo = /vimeo\.com\/(?:video\/)?(\d+)/.exec(url);
  if (vimeo?.[1]) return { type: 'vimeo', id: vimeo[1] };
  return { type: 'file' };
}

function buildEmbedSrc(parsed: { type: 'youtube' | 'vimeo'; id: string }, content: VideoContent): string {
  const params = new URLSearchParams();
  if (content.autoplay) params.set('autoplay', '1');
  if (content.controls === false) params.set('controls', '0');
  if (parsed.type === 'youtube') {
    if (content.muted) params.set('mute', '1');
    // YouTube only loops via the playlist param, set to its own video id.
    if (content.loop) {
      params.set('loop', '1');
      params.set('playlist', parsed.id);
    }
    return `https://www.youtube-nocookie.com/embed/${parsed.id}?${params.toString()}`;
  }
  if (content.muted) params.set('muted', '1');
  if (content.loop) params.set('loop', '1');
  return `https://player.vimeo.com/video/${parsed.id}?${params.toString()}`;
}

function VideoComponent({ content, wiring }: WidgetComponentProps<VideoContent>) {
  const { isEditable } = useBuilderRuntime();
  const rootClassName = cn('builder-el builder-video-widget block aspect-video', wiring.className);
  const url = content.video?.url;

  if (!url) {
    if (!isEditable) return <div {...(wiring as any)} className={rootClassName} />;
    return (
      <div {...(wiring as any)} className={rootClassName}>
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 border-2 border-dashed border-muted-foreground/30 bg-muted/20 text-muted-foreground">
          <VideoIcon className="h-6 w-6" />
          <span className="text-xs">Add a video in the Content panel</span>
        </div>
      </div>
    );
  }

  const parsed = parseVideoUrl(url);

  if (parsed.type === 'file') {
    return (
      <div {...(wiring as any)} className={rootClassName}>
        <video
          src={url}
          poster={content.posterUrl || undefined}
          controls={content.controls !== false}
          autoPlay={content.autoplay}
          loop={content.loop}
          muted={content.muted}
          playsInline
          className="block h-full w-full"
          style={{ objectFit: 'cover' }}
        />
      </div>
    );
  }

  return (
    <div {...(wiring as any)} className={rootClassName}>
      <iframe
        src={buildEmbedSrc(parsed, content)}
        title="Embedded video"
        className="block h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
      />
    </div>
  );
}

const contentFields: FieldDef[] = [
  { key: 'video', label: 'Video', control: 'videoUrl' },
  { key: 'posterUrl', label: 'Poster Image', control: 'media' },
  { key: 'autoplay', label: 'Autoplay', control: 'toggle' },
  { key: 'loop', label: 'Loop', control: 'toggle' },
  { key: 'muted', label: 'Muted', control: 'toggle' },
  { key: 'controls', label: 'Show Controls', control: 'toggle' },
];

registerWidget({
  type: 'video',
  label: 'Video',
  icon: VideoIcon,
  category: 'basic',
  keywords: ['video', 'youtube', 'vimeo', 'embed', 'player'],
  isContainer: false,
  defaultContent: {
    video: { url: '', source: 'link' },
    posterUrl: null,
    autoplay: false,
    loop: false,
    muted: false,
    controls: true,
  } satisfies VideoContent,
  defaultAdvanced: {
    // Same reasoning as Divider/Image - a flex row parent's main axis
    // shrink-wraps an otherwise-empty box, so without an explicit width
    // the placeholder/player can end up invisible depending on the
    // parent's flex direction.
    width: literal(length(100, '%')),
    // Both axes hidden - see ImageWidget's identical note on the same
    // (previously dead) hardcoded overflow-hidden class this replaces.
    overflowX: literal('hidden'),
    overflowY: literal('hidden'),
  },
  contentFields,
  excludeStyleGroups: ['Typography'],
  Component: VideoComponent,
});
