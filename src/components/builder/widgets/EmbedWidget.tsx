import DOMPurify from 'isomorphic-dompurify';
import { registerWidget, type WidgetComponentProps } from '@/lib/builder/registry';
import { Code2 } from 'lucide-react';
import type { FieldDef } from '@/lib/builder/fields';
import { length } from '@/lib/builder/valueTypes';
import { literal } from '@/lib/builder/styleValue';
import { useBuilderRuntime } from '@/components/builder/runtime/BuilderRuntimeContext';
import { cn } from '@/lib/utils';

export interface EmbedContent {
  html: string;
}

// <script> tags are stripped (see sanitize config below) - this covers
// iframe embeds (YouTube, Vimeo, Google Maps, CodePen, Spotify, etc.),
// which is the overwhelming majority of "paste this embed code" use cases,
// without taking on arbitrary script execution. An embed that specifically
// needs a hydrating <script> (e.g. a raw Twitter/X post embed) won't run -
// same tradeoff Elementor's basic HTML widget makes, vs. its separate,
// explicitly-labeled "unrestricted code" option.
const SANITIZE_CONFIG = {
  ADD_TAGS: ['iframe'],
  ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling', 'loading', 'referrerpolicy'],
};

function EmbedComponent({ content, wiring }: WidgetComponentProps<EmbedContent>) {
  const { isEditable } = useBuilderRuntime();
  const html = DOMPurify.sanitize(content.html || '', SANITIZE_CONFIG);
  const showEmptyState = isEditable && !content.html;
  // Editor-only heads-up for the "why did my Twitter/X embed only show a
  // link" report - a plain length/regex check rather than re-parsing, just
  // to catch the common case (a stripped <script> tag) without pretending
  // to know everything DOMPurify might have removed.
  const scriptWasStripped = isEditable && !showEmptyState && /<script[\s>]/i.test(content.html || '') && !/<script[\s>]/i.test(html);

  return (
    <div {...(wiring as any)} className={cn('builder-el builder-embed', wiring.className)}>
      {showEmptyState ? (
        <div className="flex min-h-[100px] w-full flex-col items-center justify-center gap-2 border-2 border-dashed border-muted-foreground/30 bg-muted/20 py-8 text-muted-foreground">
          <Code2 className="h-6 w-6" />
          <span className="text-xs">Paste embed code (e.g. a YouTube or Google Maps iframe) in the Content panel</span>
        </div>
      ) : (
        <>
          {scriptWasStripped && (
            <div className="mb-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
              This embed's &lt;script&gt; tag was removed for security and won't run - it may not render fully on the
              live page.
            </div>
          )}
          <div dangerouslySetInnerHTML={{ __html: html }} />
        </>
      )}
    </div>
  );
}

const contentFields: FieldDef[] = [
  { key: 'html', label: 'Embed Code', control: 'textarea', placeholder: '<iframe src="..."></iframe>' },
];

registerWidget({
  type: 'embed',
  label: 'Embed',
  icon: Code2,
  category: 'basic',
  keywords: ['embed', 'html', 'iframe', 'code', 'video', 'map', 'custom'],
  isContainer: false,
  defaultContent: { html: '' } satisfies EmbedContent,
  defaultAdvanced: { width: literal(length(100, '%')), overflowX: literal('hidden') },
  contentFields,
  // The embedded content brings its own look - none of the shared style
  // groups (typography, background, border...) reliably reach inside
  // arbitrary third-party markup the way they do for this builder's own
  // widgets, so only Sizing/Position (via Advanced) stay meaningfully
  // useful here.
  excludeStyleGroups: ['Typography', 'Background', 'Background Overlay', 'Border', 'Effects'],
  Component: EmbedComponent,
});
