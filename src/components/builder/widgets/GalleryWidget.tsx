import { useEffect, useState } from 'react';
import { registerWidget, type WidgetComponentProps } from '@/lib/builder/registry';
import { GalleryHorizontal, ImageOff } from 'lucide-react';
import type { FieldDef } from '@/lib/builder/fields';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi,
} from '@/components/ui/carousel';
import { length } from '@/lib/builder/valueTypes';
import { literal } from '@/lib/builder/styleValue';
import { useBuilderRuntime } from '@/components/builder/runtime/BuilderRuntimeContext';
import { cn } from '@/lib/utils';

export interface GalleryContent {
  images: Array<{ id: string; url: string | null; alt: string }>;
  layout: 'grid' | 'carousel';
  /** Grid layout only. */
  columns: number;
  /** Carousel layout only, below. */
  showArrows: boolean;
  arrowPosition: 'inside' | 'outside';
  showDots: boolean;
}

function GalleryComponent({ content, wiring }: WidgetComponentProps<GalleryContent>) {
  const { isEditable } = useBuilderRuntime();
  const images = (content.images ?? []).filter((img) => img.url);
  const columns = Math.max(1, Math.min(6, content.columns || 3));
  const [api, setApi] = useState<CarouselApi>();
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setSelectedIndex(api.selectedScrollSnap());
    onSelect();
    api.on('select', onSelect);
    api.on('reInit', onSelect);
    return () => {
      api.off('select', onSelect);
      api.off('reInit', onSelect);
    };
  }, [api]);

  if (images.length === 0) {
    return (
      <div {...(wiring as any)} className={cn('builder-el builder-gallery', wiring.className)}>
        {isEditable && (
          <div className="flex min-h-32 flex-col items-center justify-center gap-2 border-2 border-dashed border-muted-foreground/30 bg-muted/20 py-8 text-muted-foreground">
            <ImageOff className="h-6 w-6" />
            <span className="text-xs">Add images in the Content panel</span>
          </div>
        )}
      </div>
    );
  }

  if (content.layout === 'carousel') {
    const outside = content.arrowPosition === 'outside';
    return (
      <div {...(wiring as any)} className={cn('builder-el builder-gallery', wiring.className)}>
        <Carousel setApi={setApi} className={outside ? 'px-10' : undefined}>
          <CarouselContent>
            {images.map((img) => (
              <CarouselItem key={img.id}>
                <img
                  src={img.url!}
                  alt={img.alt}
                  className="aspect-video w-full rounded-lg object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </CarouselItem>
            ))}
          </CarouselContent>
          {content.showArrows !== false && (
            <>
              <CarouselPrevious className={outside ? undefined : 'left-2'} />
              <CarouselNext className={outside ? undefined : 'right-2'} />
            </>
          )}
        </Carousel>
        {content.showDots && images.length > 1 && (
          <div className="mt-3 flex justify-center gap-2">
            {images.map((img, i) => (
              <button
                key={img.id}
                type="button"
                onClick={() => api?.scrollTo(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={cn('h-2 w-2 rounded-full transition-colors', i === selectedIndex ? 'bg-current' : 'bg-current/25')}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      {...(wiring as any)}
      className={cn('builder-el builder-gallery gap-3', wiring.className)}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {images.map((img) => (
        <img
          key={img.id}
          src={img.url!}
          alt={img.alt}
          className="aspect-square w-full rounded-lg object-cover"
          loading="lazy"
          decoding="async"
        />
      ))}
    </div>
  );
}

const contentFields: FieldDef[] = [
  { key: 'images', label: 'Images', control: 'galleryItems' },
  {
    key: 'layout',
    label: 'Layout',
    control: 'select',
    options: [
      { label: 'Grid', value: 'grid' },
      { label: 'Carousel', value: 'carousel' },
    ],
  },
  { key: 'columns', label: 'Columns (grid)', control: 'number', min: 1, max: 6, step: 1 },
  { key: 'showArrows', label: 'Show Arrows (carousel)', control: 'toggle' },
  {
    key: 'arrowPosition',
    label: 'Arrow Position (carousel)',
    control: 'select',
    options: [
      { label: 'Inside (overlay)', value: 'inside' },
      { label: 'Outside', value: 'outside' },
    ],
  },
  { key: 'showDots', label: 'Show Dots (carousel)', control: 'toggle' },
];

registerWidget({
  type: 'gallery',
  label: 'Gallery',
  icon: GalleryHorizontal,
  category: 'basic',
  keywords: ['gallery', 'carousel', 'slider', 'images', 'portfolio', 'photos'],
  isContainer: false,
  defaultContent: {
    images: [],
    layout: 'grid',
    columns: 3,
    showArrows: true,
    arrowPosition: 'inside',
    showDots: true,
  } satisfies GalleryContent,
  // Explicit grid display so --el-display actually resolves to 'grid' -
  // without this the hardcoded Tailwind `grid` class used to lose to
  // .builder-el's own `display: var(--el-display, block)` rule, which loads
  // after Tailwind's stylesheet and wins at equal specificity. Harmless in
  // carousel mode too: a grid container with a single child (the Carousel
  // div) lays out identically to block there.
  defaultDesign: { display: literal({ type: 'grid' }) },
  // Overflow X: Hidden, same default as every other widget - note this
  // clips the carousel's Previous/Next buttons when Arrow Position is set
  // to Outside (they sit at a negative offset past the widget's own edge).
  // Inside (the default) sits within bounds and isn't affected; Outside
  // needs Overflow X switched to Visible in the Advanced tab to actually show.
  defaultAdvanced: { width: literal(length(100, '%')), overflowX: literal('hidden') },
  contentFields,
  // No text of its own to style, and the grid/carousel's own layout already
  // decides display - Container's normal Display group would just fight it.
  excludeStyleGroups: ['Display', 'Typography'],
  Component: GalleryComponent,
});
