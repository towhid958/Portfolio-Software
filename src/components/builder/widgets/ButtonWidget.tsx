import { registerWidget, type WidgetComponentProps } from '@/lib/builder/registry';
import { MousePointerClick } from 'lucide-react';
import type { FieldDef } from '@/lib/builder/fields';
import type { LinkValue } from '@/components/builder/controls/LinkControl';
import { CURATED_ICONS } from '@/components/builder/controls/IconControl';
import { useBuilderRuntime } from '@/components/builder/runtime/BuilderRuntimeContext';
import { box, length, literalColor } from '@/lib/builder/valueTypes';
import { literal } from '@/lib/builder/styleValue';
import { cn } from '@/lib/utils';

export interface ButtonContent {
  text: string;
  link: LinkValue;
  icon?: string;
  iconPosition: 'left' | 'right';
}

// Rendered as a real <a> for correct semantics/SEO on the published page.
// In the editor the same click that would navigate away instead has to just
// select the widget, so default navigation is suppressed there while
// wiring.onClick (selection) still runs - see ImageWidget for the same
// pattern with a link.
function ButtonComponent({ content, wiring }: WidgetComponentProps<ButtonContent>) {
  const { isEditable } = useBuilderRuntime();
  const Icon = content.icon ? CURATED_ICONS[content.icon] : undefined;
  const iconPosition = content.iconPosition || 'left';

  return (
    <a
      {...(wiring as any)}
      href={content.link?.url || '#'}
      target={content.link?.newTab ? '_blank' : undefined}
      rel={content.link?.newTab ? 'noopener noreferrer' : undefined}
      onClick={(e) => {
        if (isEditable) e.preventDefault();
        wiring.onClick?.(e);
      }}
      className={cn('builder-el builder-button', wiring.className)}
    >
      {Icon && iconPosition === 'left' && <Icon className="mr-2 inline-block h-4 w-4 align-middle" />}
      <span className="builder-el-text">{content.text || 'Click here'}</span>
      {Icon && iconPosition === 'right' && <Icon className="ml-2 inline-block h-4 w-4 align-middle" />}
    </a>
  );
}

const contentFields: FieldDef[] = [
  { key: 'text', label: 'Text', control: 'text', placeholder: 'Click here' },
  { key: 'link', label: 'Link', control: 'link' },
  { key: 'icon', label: 'Icon', control: 'icon' },
  {
    key: 'iconPosition',
    label: 'Icon Position',
    control: 'select',
    options: [
      { label: 'Left', value: 'left' },
      { label: 'Right', value: 'right' },
    ],
  },
];

registerWidget({
  type: 'button',
  label: 'Button',
  icon: MousePointerClick,
  category: 'basic',
  keywords: ['button', 'cta', 'link', 'action'],
  isContainer: false,
  defaultContent: { text: 'Click here', link: { url: '' }, iconPosition: 'left' } satisfies ButtonContent,
  // inline-block (not flex) so the button shrink-wraps to its label instead
  // of stretching to fill its parent's width, the way a block-level element
  // would by default - the same reason it's the right choice for text runs.
  defaultDesign: {
    display: literal({ type: 'inline-block' }),
    background: literal({ type: 'color', color: literalColor('#111827') }),
    textColor: literal({ type: 'solid', color: literalColor('#ffffff') }),
    borderRadius: literal(box(length(8))),
    cursor: literal('pointer'),
  },
  defaultAdvanced: {
    padding: literal({ top: length(12), right: length(24), bottom: length(12), left: length(24), linked: false }),
  },
  contentFields,
  Component: ButtonComponent,
});
