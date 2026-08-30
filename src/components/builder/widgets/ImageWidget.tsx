import { registerWidget, type WidgetComponentProps } from '@/lib/builder/registry';
import { Image as ImageIcon } from 'lucide-react';
import type { FieldDef } from '@/lib/builder/fields';
import type { LinkValue } from '@/components/builder/controls/LinkControl';
import { useBuilderRuntime } from '@/components/builder/runtime/BuilderRuntimeContext';
import { length } from '@/lib/builder/valueTypes';
import { literal } from '@/lib/builder/styleValue';
import { cn } from '@/lib/utils';

export type ImageFit = 'cover' | 'contain' | 'fill' | 'none';

export interface ImageContent {
  src: string | null;
  alt: string;
  fit: ImageFit;
  link?: LinkValue;
  /** Natural dimensions of the picked asset, captured alongside `src` (see
   * the `src` field's dimensionKeys) - rendered as real width/height
   * attributes so the browser can reserve the right space before the image
   * loads instead of the page jumping once it arrives. Absent on images
   * picked before this existed, or on anything not chosen from the media
   * library - the <img> just renders without them, same as before. */
  width?: number | null;
  height?: number | null;
}

// object-fit isn't part of the shared CSS-var style system (it only makes
// sense on an <img>, not the generic .builder-el contract every other
// widget shares), so it's a plain Content-tab field applied as an inline
// style directly on the <img> instead.
function ImageComponent({ content, wiring, backgroundLayers }: WidgetComponentProps<ImageContent>) {
  const { isEditable } = useBuilderRuntime();
  const hasLink = !!content.link?.url;
  const showEmptyState = isEditable && !content.src;

  const inner = content.src ? (
    <img
      src={content.src}
      alt={content.alt || ''}
      draggable={false}
      className="block h-full w-full"
      style={{ objectFit: content.fit || 'cover' }}
      loading="lazy"
      decoding="async"
      // Real width/height (not CSS) let the browser reserve the image's
      // aspect ratio before it loads, even though this element's actual
      // rendered box is governed by CSS (width/height here only seed the
      // intrinsic aspect ratio, never override a CSS size).
      width={content.width || undefined}
      height={content.height || undefined}
    />
  ) : (
    showEmptyState && (
      <div className="flex min-h-[140px] w-full flex-col items-center justify-center gap-2 border-2 border-dashed border-muted-foreground/30 bg-muted/20 py-8 text-muted-foreground">
        <ImageIcon className="h-6 w-6" />
        <span className="text-xs">Select an image in the Content panel</span>
      </div>
    )
  );

  const rootClassName = cn('builder-el builder-image block', wiring.className);

  // Only an <a> in the editor when there's a real link to preview against -
  // clicking still has to select the widget, not navigate away, so the
  // native click is suppressed while wiring.onClick (selection) still runs.
  if (hasLink) {
    return (
      <a
        {...(wiring as any)}
        href={content.link!.url || '#'}
        target={content.link!.newTab ? '_blank' : undefined}
        rel={content.link!.newTab ? 'noopener noreferrer' : undefined}
        onClick={(e) => {
          if (isEditable) e.preventDefault();
          wiring.onClick?.(e);
        }}
        className={rootClassName}
      >
        {backgroundLayers}
        {inner}
      </a>
    );
  }

  return (
    <div {...(wiring as any)} className={rootClassName}>
      {backgroundLayers}
      {inner}
    </div>
  );
}

const contentFields: FieldDef[] = [
  { key: 'src', label: 'Image', control: 'media', dimensionKeys: { width: 'width', height: 'height' } },
  { key: 'alt', label: 'Alt Text', control: 'text', placeholder: 'Describe the image' },
  {
    key: 'fit',
    label: 'Fit',
    control: 'select',
    options: [
      { label: 'Cover', value: 'cover' },
      { label: 'Contain', value: 'contain' },
      { label: 'Fill', value: 'fill' },
      { label: 'None', value: 'none' },
    ],
  },
  { key: 'link', label: 'Link', control: 'link' },
];

registerWidget({
  type: 'image',
  label: 'Image',
  icon: ImageIcon,
  category: 'basic',
  keywords: ['image', 'photo', 'picture', 'img'],
  isContainer: false,
  defaultContent: { src: null, alt: '', fit: 'cover' } satisfies ImageContent,
  // Before an image is chosen there's no intrinsic content to size the
  // widget's own root against, so - same reasoning as Container's
  // minWidth/minHeight - a fresh Image dropped into a ROW-direction flex
  // parent would collapse to a near-invisible sliver despite the
  // placeholder's own min-height (that's on an inner div, not this
  // element's own box, so it doesn't stop the ROOT's main-axis width from
  // collapsing to zero).
  // Both axes hidden, not just X - an object-fit image needs its own
  // overflow clipped on both dimensions to actually crop, same as the
  // (previously dead, now removed) hardcoded overflow-hidden class this
  // replaces: it never won against .builder-el's own var-driven overflow
  // rule, which loads after Tailwind's stylesheet at equal specificity.
  defaultAdvanced: {
    minWidth: literal(length(120)),
    width: literal(length(100, '%')),
    overflowX: literal('hidden'),
    overflowY: literal('hidden'),
  },
  contentFields,
  // No text on an Image itself - same reasoning as Container excluding it.
  excludeStyleGroups: ['Typography'],
  Component: ImageComponent,
});
