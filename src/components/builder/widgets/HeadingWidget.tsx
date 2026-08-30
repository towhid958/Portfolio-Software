import { registerWidget, type WidgetComponentProps } from '@/lib/builder/registry';
import { Heading1 } from 'lucide-react';
import DOMPurify from 'isomorphic-dompurify';
import type { FieldDef } from '@/lib/builder/fields';
import { length } from '@/lib/builder/valueTypes';
import { literal } from '@/lib/builder/styleValue';
import { cn } from '@/lib/utils';

export interface HeadingContent {
  text: string;
  level: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

function HeadingComponent({ content, wiring, backgroundLayers }: WidgetComponentProps<HeadingContent>) {
  const Tag = (content.level || 'h2') as 'h2';
  // Inline tags like <b>/<a> in the text render as real HTML rather than
  // literal text, sanitized the same way blog content is elsewhere in this
  // app (see routes/blog/$slug.tsx) - DOMPurify strips <script>, event
  // handler attributes, javascript: URLs, etc. The HTML goes on an inner
  // span rather than the Tag itself, since dangerouslySetInnerHTML and
  // normal React children (backgroundLayers) can't both be set on one node.
  // That span also carries builder-el-text (see cssVars.ts) - gradient text
  // clips to *this* box, not the heading tag's full block-level width, and
  // leaves the heading's own background alone.
  const html = DOMPurify.sanitize(content.text || 'Heading text');
  return (
    <Tag {...(wiring as any)} className={cn('builder-el builder-heading', wiring.className)}>
      {backgroundLayers}
      <span className="builder-el-text" dangerouslySetInnerHTML={{ __html: html }} />
    </Tag>
  );
}

const contentFields: FieldDef[] = [
  { key: 'text', label: 'Text', control: 'text' },
  {
    key: 'level',
    label: 'Level',
    control: 'select',
    options: [
      { label: 'H1', value: 'h1' },
      { label: 'H2', value: 'h2' },
      { label: 'H3', value: 'h3' },
      { label: 'H4', value: 'h4' },
      { label: 'H5', value: 'h5' },
      { label: 'H6', value: 'h6' },
    ],
  },
];

registerWidget({
  type: 'heading',
  label: 'Heading',
  icon: Heading1,
  category: 'basic',
  keywords: ['heading', 'title', 'text', 'h1', 'h2', 'h3'],
  isContainer: false,
  defaultContent: { text: 'Heading text', level: 'h2' } satisfies HeadingContent,
  defaultAdvanced: { width: literal(length(100, '%')), overflowX: literal('hidden') },
  contentFields,
  Component: HeadingComponent,
});
