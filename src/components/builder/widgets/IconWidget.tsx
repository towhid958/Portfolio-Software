import { registerWidget, type WidgetComponentProps } from '@/lib/builder/registry';
import { Star } from 'lucide-react';
import type { FieldDef } from '@/lib/builder/fields';
import type { LinkValue } from '@/components/builder/controls/LinkControl';
import { CURATED_ICONS } from '@/components/builder/controls/IconControl';
import { useBuilderRuntime } from '@/components/builder/runtime/BuilderRuntimeContext';
import { literalColor, type ColorValue } from '@/lib/builder/valueTypes';
import { literal } from '@/lib/builder/styleValue';
import { resolveColorCss } from '@/lib/builder/cssVars';
import { cn } from '@/lib/utils';

export interface IconContent {
  icon: string;
  /** px */
  size: number;
  color: ColorValue;
  link?: LinkValue;
}

// A dedicated Color field in the Content tab rather than the shared
// Typography > Text Color one - "Typography" doesn't mean anything for an
// icon, and burying its one colour choice under that label made it hard to
// find (same reasoning as Divider's Content-tab colour). The whole
// Typography group is excluded below since nothing else in it applies
// either. Applied as a plain inline style (the icon is a lucide <svg>,
// which strokes with currentColor by default) rather than through the
// responsive CSS-var system - an icon's colour doesn't need to vary by
// breakpoint any more than Divider's does.
function IconComponent({ content, wiring }: WidgetComponentProps<IconContent>) {
  const { isEditable } = useBuilderRuntime();
  const Icon = content.icon ? CURATED_ICONS[content.icon] : undefined;
  const size = content.size || 32;
  const color = resolveColorCss(content.color);
  const hasLink = !!content.link?.url;
  const rootClassName = cn('builder-el builder-icon', wiring.className);
  const inner = Icon ? <Icon style={{ width: size, height: size, display: 'block', color }} /> : null;

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
  { key: 'color', label: 'Color', control: 'color' },
  { key: 'size', label: 'Size (px)', control: 'number', min: 8, max: 200, step: 1 },
  { key: 'link', label: 'Link (optional)', control: 'link' },
];

registerWidget({
  type: 'icon',
  label: 'Icon',
  icon: Star,
  category: 'basic',
  keywords: ['icon', 'symbol', 'glyph'],
  isContainer: false,
  defaultContent: { icon: 'Star', size: 32, color: literalColor('#111827') } satisfies IconContent,
  // inline-block so it shrink-wraps to the icon's own size instead of
  // stretching block-level to its container's width - same reasoning as
  // Button.
  defaultDesign: { display: literal({ type: 'inline-block' }) },
  contentFields,
  // Nothing in Typography applies to an SVG icon - colour is its own
  // dedicated Content-tab field above instead.
  excludeStyleGroups: ['Typography'],
  Component: IconComponent,
});
