import { registerWidget, type WidgetComponentProps } from '@/lib/builder/registry';
import { Type } from 'lucide-react';
import DOMPurify from 'isomorphic-dompurify';
import type { FieldDef } from '@/lib/builder/fields';
import { cn } from '@/lib/utils';

export interface TextContent {
  html: string;
}

// Same sanitize-then-render-on-an-inner-span pattern as HeadingWidget - see
// that file for why the span is separate from the tag and carries
// builder-el-text. RichTextControl (a cut-down version of the blog post
// editor) is reused as-is rather than building a lighter editor just for
// this widget - it already covers everything a paragraph block needs.
function TextComponent({ content, wiring, backgroundLayers }: WidgetComponentProps<TextContent>) {
  const html = DOMPurify.sanitize(content.html || '<p>Add your text here. Click to edit.</p>');
  return (
    <div {...(wiring as any)} className={cn('builder-el builder-text', wiring.className)}>
      {backgroundLayers}
      <div className="builder-el-text" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

const contentFields: FieldDef[] = [{ key: 'html', label: 'Content', control: 'richtext' }];

registerWidget({
  type: 'text',
  label: 'Text',
  icon: Type,
  category: 'basic',
  keywords: ['text', 'paragraph', 'copy', 'body'],
  isContainer: false,
  defaultContent: { html: '<p>Add your text here. Click to edit.</p>' } satisfies TextContent,
  contentFields,
  Component: TextComponent,
});
