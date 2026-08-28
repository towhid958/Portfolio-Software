import { useState } from 'react';

/**
 * The two background layers that need a real DOM node rather than a CSS
 * variable: the overlay (a real absolutely-positioned div, so it can carry
 * its own opacity independent of the widget's content) and video (there's
 * no CSS mechanism for a video background at all). Both render as extra
 * children ElementRenderer prepends before the widget's real content -
 * position:absolute takes them out of flow, so they don't disturb whatever
 * flex/grid layout the widget itself uses for its real children.
 */
export function BackgroundOverlay() {
  return <div className="builder-el-overlay" aria-hidden="true" />;
}

/**
 * The video's src can't be responsive the way CSS-driven backgrounds are -
 * there's no media-query equivalent for an HTML attribute, so this always
 * plays whatever resolves at desktop/normal regardless of the active
 * breakpoint. Swapping the source per breakpoint would need live JS
 * resolution against the real viewport width, which isn't wired up yet.
 */
export function BackgroundVideo({
  url,
  posterUrl,
  fit = 'cover',
  position = 'center',
}: {
  url: string;
  posterUrl?: string | undefined;
  fit?: 'cover' | 'contain' | undefined;
  position?: string | undefined;
}) {
  const [error, setError] = useState<string | null>(null);
  if (!url) return null;

  if (error) {
    return (
      <div className="builder-el-video flex items-center justify-center bg-destructive/10 p-2 text-center text-[11px] text-destructive">
        Video failed to load: {error}. If this is a page link (YouTube, Vimeo, Drive...) rather than a direct
        file URL, the browser can't play it - use Upload instead, or a direct .mp4/.webm link.
      </div>
    );
  }

  return (
    <video
      className="builder-el-video"
      src={url}
      poster={posterUrl}
      style={{ objectFit: fit, objectPosition: position }}
      autoPlay
      loop
      muted
      playsInline
      aria-hidden="true"
      onError={(e) => {
        const media = e.currentTarget.error;
        setError(media?.message || 'unsupported format or blocked source');
      }}
    />
  );
}
