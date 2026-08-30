import { registerWidget, type WidgetComponentProps } from '@/lib/builder/registry';
import { Star } from 'lucide-react';
import type { FieldDef } from '@/lib/builder/fields';
import { ICON_STYLE_FIELDS } from '@/lib/builder/fields';
import type { LinkValue } from '@/components/builder/controls/LinkControl';
import { CURATED_ICONS } from '@/components/builder/controls/IconControl';
import { IconShape } from './IconShape';
import { useBuilderRuntime } from '@/components/builder/runtime/BuilderRuntimeContext';
import { length } from '@/lib/builder/valueTypes';
import { literal } from '@/lib/builder/styleValue';
import { cn } from '@/lib/utils';

export interface IconContent {
  icon: string;
  link?: LinkValue;
}

// Color/size/view all moved to the Style tab (ICON_STYLE_FIELDS) so they get
// the same responsive + hover/focus/active machinery as every other style
// field, instead of a plain Content-tab value with no state support - see
// IconShape/.builder-icon-shape for where they're actually applied.
function IconComponent({ content, wiring }: WidgetComponentProps<IconContent>) {
  const { isEditable } = useBuilderRuntime();
  const Icon = content.icon ? CURATED_ICONS[content.icon] : undefined;
  const hasLink = !!content.link?.url;
  const rootClassName = cn('builder-el builder-icon', wiring.className);
  const inner = Icon ? <IconShape icon={Icon} /> : null;

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
        {inner}
      </a>
    );
  }

  return (
    <div {...(wiring as any)} className={rootClassName}>
      {inner}
    </div>
  );
}

const contentFields: FieldDef[] = [
  { key: 'icon', label: 'Icon', control: 'icon' },
  { key: 'link', label: 'Link (optional)', control: 'link' },
];

registerWidget({
  type: 'icon',
  label: 'Icon',
  icon: Star,
  category: 'basic',
  keywords: ['icon', 'symbol', 'glyph'],
  isContainer: false,
  defaultContent: { icon: 'Star' } satisfies IconContent,
  // inline-block so it shrink-wraps to the icon's own size instead of
  // stretching block-level to its container's width - same reasoning as
  // Button.
  defaultDesign: { display: literal({ type: 'inline-block' }) },
  defaultAdvanced: { width: literal(length(100, '%')), overflowX: literal('hidden') },
  contentFields,
  // Nothing in Typography applies to an SVG icon - color/size/shape live in
  // the dedicated Icon group (extraStyleFields) instead.
  excludeStyleGroups: ['Typography'],
  extraStyleFields: ICON_STYLE_FIELDS,
  Component: IconComponent,
});
