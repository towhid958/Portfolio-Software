import { useState } from 'react';
import { registerWidget, type WidgetComponentProps } from '@/lib/builder/registry';
import { Menu, X } from 'lucide-react';
import type { FieldDef } from '@/lib/builder/fields';
import { NAV_STYLE_FIELDS } from '@/lib/builder/fields';
import { newNavItem, type NavItem } from '@/components/builder/controls/NavItemsControl';
import { length } from '@/lib/builder/valueTypes';
import { literal } from '@/lib/builder/styleValue';
import { useBuilderRuntime } from '@/components/builder/runtime/BuilderRuntimeContext';
import { cn } from '@/lib/utils';

export interface NavWidgetContent {
  items: NavItem[];
  direction: 'horizontal' | 'vertical';
  alignment: 'left' | 'center' | 'right';
  /** Horizontal nav only - collapses into a hamburger toggle below 768px instead of just wrapping. Opt-in and defaults falsy so existing navs render unchanged. */
  mobileMenu?: boolean;
}

const ALIGN_TO_FLEX: Record<NavWidgetContent['alignment'], string> = {
  left: 'flex-start',
  center: 'center',
  right: 'flex-end',
};

// Direction/alignment are plain inline styles rather than the shared
// Display group, same reasoning as IconList: they need to react live to
// content fields, and an inline style always wins over .builder-el's own
// class-based display rule regardless of source order, so there's no
// specificity fight to worry about.
function NavComponent({ content, wiring }: WidgetComponentProps<NavWidgetContent>) {
  const { isEditable } = useBuilderRuntime();
  const [mobileOpen, setMobileOpen] = useState(false);
  const direction = content.direction || 'horizontal';
  const alignment = content.alignment || 'left';
  const items = content.items?.length ? content.items : [newNavItem()];
  const alignFlex = ALIGN_TO_FLEX[alignment];
  const itemGap = 'var(--el-nav-item-gap, 24px)';
  // Vertical nav is typically a compact sidebar already - collapsing is a
  // horizontal-header concern, so the toggle only applies there.
  const collapsible = direction === 'horizontal' && !!content.mobileMenu;

  const links = items.map((item) =>
    item.link?.url ? (
      <a
        key={item.id}
        href={item.link.url || '#'}
        target={item.link.newTab ? '_blank' : undefined}
        rel={item.link.newTab ? 'noopener noreferrer' : undefined}
        onClick={(e) => isEditable && e.preventDefault()}
        className="builder-el-text no-underline hover:underline"
      >
        {item.label}
      </a>
    ) : (
      <span key={item.id} className="builder-el-text">
        {item.label}
      </span>
    ),
  );

  if (collapsible) {
    return (
      <nav
        {...(wiring as any)}
        className={cn('builder-el builder-nav builder-nav-mobile', wiring.className)}
        style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: itemGap }}
      >
        <button
          type="button"
          className="builder-nav-toggle"
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <div
          className={cn('builder-nav-items', mobileOpen && 'is-open')}
          style={{ ['--builder-nav-justify' as string]: alignFlex, gap: itemGap } as React.CSSProperties}
        >
          {links}
        </div>
      </nav>
    );
  }

  return (
    <nav
      {...(wiring as any)}
      className={cn('builder-el builder-nav', wiring.className)}
      style={
        direction === 'horizontal'
          ? { display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: alignFlex, gap: itemGap }
          : { display: 'flex', flexDirection: 'column', alignItems: alignFlex, gap: itemGap }
      }
    >
      {links}
    </nav>
  );
}

const contentFields: FieldDef[] = [
  { key: 'items', label: 'Links', control: 'navItems' },
  {
    key: 'direction',
    label: 'Direction',
    control: 'select',
    options: [
      { label: 'Horizontal', value: 'horizontal' },
      { label: 'Vertical', value: 'vertical' },
    ],
  },
  {
    key: 'alignment',
    label: 'Alignment',
    control: 'select',
    options: [
      { label: 'Left', value: 'left' },
      { label: 'Center', value: 'center' },
      { label: 'Right', value: 'right' },
    ],
  },
  { key: 'mobileMenu', label: 'Collapse to Menu on Mobile (horizontal)', control: 'toggle' },
];

registerWidget({
  type: 'nav',
  label: 'Nav Menu',
  icon: Menu,
  category: 'basic',
  keywords: ['nav', 'menu', 'navigation', 'links', 'header'],
  isContainer: false,
  defaultContent: {
    items: [newNavItem(), newNavItem(), newNavItem()],
    direction: 'horizontal',
    alignment: 'left',
  } satisfies NavWidgetContent,
  defaultAdvanced: { width: literal(length(100, '%')), overflowX: literal('hidden') },
  contentFields,
  // Direction/alignment are their own dedicated fields above, not the
  // generic Display group's flex controls, which would look like dead
  // controls here (the inline style always wins).
  excludeStyleGroups: ['Display'],
  // Link labels are real text, so Typography applies to them same as any
  // text-bearing widget.
  extraStyleFields: NAV_STYLE_FIELDS,
  Component: NavComponent,
});
