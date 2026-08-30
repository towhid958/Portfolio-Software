import { registerWidget, type WidgetComponentProps } from '@/lib/builder/registry';
import { Quote, Star, User } from 'lucide-react';
import type { FieldDef } from '@/lib/builder/fields';
import { length } from '@/lib/builder/valueTypes';
import { literal } from '@/lib/builder/styleValue';
import { cn } from '@/lib/utils';

export interface TestimonialContent {
  quote: string;
  authorName: string;
  authorTitle: string;
  authorAvatar: string | null;
  /** 0-5; 0 hides the star row entirely. */
  rating: number;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="mb-2 flex gap-0.5 text-amber-500" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className="h-4 w-4" fill={i < rating ? 'currentColor' : 'none'} />
      ))}
    </div>
  );
}

function TestimonialComponent({ content, wiring }: WidgetComponentProps<TestimonialContent>) {
  const rating = Math.max(0, Math.min(5, content.rating ?? 0));

  return (
    <div {...(wiring as any)} className={cn('builder-el builder-testimonial', wiring.className)}>
      {rating > 0 && <StarRating rating={rating} />}
      <Quote className="mb-2 h-6 w-6 opacity-30" />
      <blockquote className="builder-el-text mb-4">{content.quote}</blockquote>
      <div className="flex items-center gap-3">
        {content.authorAvatar ? (
          <img
            src={content.authorAvatar}
            alt={content.authorName || ''}
            className="h-11 w-11 shrink-0 rounded-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted">
            <User className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
        <div>
          <div className="builder-el-text font-semibold leading-tight">{content.authorName}</div>
          {content.authorTitle && <div className="text-sm leading-tight opacity-70">{content.authorTitle}</div>}
        </div>
      </div>
    </div>
  );
}

const contentFields: FieldDef[] = [
  { key: 'quote', label: 'Quote', control: 'textarea', placeholder: 'What they said...' },
  { key: 'authorName', label: 'Author Name', control: 'text', placeholder: 'Jane Doe' },
  { key: 'authorTitle', label: 'Author Title', control: 'text', placeholder: 'CEO, Company' },
  { key: 'authorAvatar', label: 'Author Avatar', control: 'media' },
  { key: 'rating', label: 'Rating (0-5)', control: 'slider', min: 0, max: 5, step: 1 },
];

registerWidget({
  type: 'testimonial',
  label: 'Testimonial',
  icon: Quote,
  category: 'basic',
  keywords: ['testimonial', 'review', 'quote', 'client', 'rating'],
  isContainer: false,
  defaultContent: {
    quote: 'This service exceeded our expectations from start to finish.',
    authorName: 'Jane Doe',
    authorTitle: 'CEO, Company',
    authorAvatar: null,
    rating: 5,
  } satisfies TestimonialContent,
  defaultAdvanced: { width: literal(length(100, '%')), overflowX: literal('hidden') },
  contentFields,
  Component: TestimonialComponent,
});
