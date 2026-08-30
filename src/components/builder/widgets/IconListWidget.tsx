import { registerWidget, type WidgetComponentProps } from '@/lib/builder/registry';
import { List, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import type { FieldDef } from '@/lib/builder/fields';
import { CURATED_ICONS } from '@/components/builder/controls/IconControl';
import { newIconListItem, type IconListItem } from '@/components/builder/controls/IconListItemsControl';
import { literalColor, type ColorValue } from '@/lib/builder/valueTypes';
import { resolveColorCss } from '@/lib/builder/cssVars';
import { useBuilderRuntime } from '@/components/builder/runtime/BuilderRuntimeContext';
import { cn } from '@/lib/utils';

export interface IconListContent {
  items: IconListItem[];
  direction: 'vertical' | 'horizontal';
  /** Vertical: aligns each row within the list's own width (align-items). Horizontal: positions the row of items within the list's width (justify-content). Same three options either way since both ultimately map to flex-start/center/flex-end. */
  alignment: 'left' | 'center' | 'right';
  /** Whether the icon sits before or after each item's text. */
  iconPosition: 'left' | 'right';
  /** px */
  iconSize: number;
  /** Own dedicated field, separate from Style > Typography > Text Color (which drives the item labels) - so icons and labels can be coloured independently. */
  iconColor: ColorValue;
}

const ALIGN_TO_FLEX: Record<IconListContent['alignment'], string> = {
  left: 'flex-start',
  center: 'center',
  right: 'flex-end',
};

// Direction is set via a plain inline style rather than the shared Display
// group (excluded below) - it needs to react live to the direction field on
// every render, but design.display is data set once at drop time, and an
// inline style reliably wins over .builder-el's own class-based
// `display: var(--el-display, block)` regardless of source order (an inline
// style always outranks a stylesheet rule for the same property), so there
// is no specificity fight to worry about the way there was for
// Button/Divider's *default* display.
function IconListComponent({ content, wiring }: WidgetComponentProps<IconListContent>) {
  const { isEditable } = useBuilderRuntime();
  const direction = content.direction || 'vertical';
  const alignment = content.alignment || 'left';
  const iconPosition = content.iconPosition || 'left';
  const iconSize = content.iconSize || 20;
  const iconColor = resolveColorCss(content.iconColor);
  const items = content.items?.length ? content.items : [newIconListItem()];
  const alignFlex = ALIGN_TO_FLEX[alignment];

  return (
    <ul
      {...(wiring as any)}
      className={cn('builder-el builder-icon-list m-0 list-none p-0', wiring.className)}
      style={
        direction === 'horizontal'
          ? { display: 'flex', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: alignFlex, gap: '8px 24px' }
          : { display: 'flex', flexDirection: 'column', alignItems: alignFlex, gap: '8px' }
      }
    >
      {items.map((item) => {
        const Icon = item.icon ? CURATED_ICONS[item.icon] : undefined;
        const iconEl = Icon && (
          <Icon style={{ width: iconSize, height: iconSize, display: 'block', color: iconColor }} className="shrink-0" />
        );
        const textEl = <span className="builder-el-text">{item.text}</span>;
        const row = iconPosition === 'right' ? (
          <>
            {textEl}
            {iconEl}
          </>
        ) : (
          <>
            {iconEl}
            {textEl}
          </>
        );
        // The link is per-item, not the whole widget - these anchors don't
        // carry their own selection wiring (only the root <ul> does; a
        // click still reaches it via normal bubbling), they just need
        // their own navigation suppressed in the editor the same way
        // Button/Image do it on their own root.
        if (item.link?.url) {
          return (
            <li key={item.id}>
              <a
                href={item.link.url || '#'}
                target={item.link.newTab ? '_blank' : undefined}
                rel={item.link.newTab ? 'noopener noreferrer' : undefined}
                onClick={(e) => isEditable && e.preventDefault()}
                className="flex items-center gap-2 no-underline hover:underline"
              >
                {row}
              </a>
            </li>
          );
        }
        return (
          <li key={item.id} className="flex items-center gap-2">
            {row}
          </li>
        );
      })}
    </ul>
  );
}

const contentFields: FieldDef[] = [
  { key: 'items', label: 'Items', control: 'iconListItems' },
  {
    key: 'direction',
    label: 'Direction',
    control: 'select',
    options: [
      { label: 'Vertical', value: 'vertical' },
      { label: 'Horizontal', value: 'horizontal' },
    ],
  },
  {
    key: 'alignment',
    label: 'Alignment',
    control: 'iconButtons',
    options: [
      { label: 'Left', value: 'left', icon: AlignLeft },
      { label: 'Center', value: 'center', icon: AlignCenter },
      { label: 'Right', value: 'right', icon: AlignRight },
    ],
  },
  {
    key: 'iconPosition',
    label: 'Icon Position',
    control: 'select',
    options: [
      { label: 'Before Text', value: 'left' },
      { label: 'After Text', value: 'right' },
    ],
  },
  { key: 'iconSize', label: 'Icon Size (px)', control: 'number', min: 8, max: 80, step: 1 },
  { key: 'iconColor', label: 'Icon Color', control: 'color' },
];

registerWidget({
  type: 'icon-list',
  label: 'Icon List',
  icon: List,
  category: 'basic',
  keywords: ['icon list', 'list', 'features', 'checklist'],
  isContainer: false,
  defaultContent: {
    items: [newIconListItem(), newIconListItem(), newIconListItem()],
    direction: 'vertical',
    alignment: 'left',
    iconPosition: 'left',
    iconSize: 20,
    iconColor: literalColor('#111827'),
  } satisfies IconListContent,
  contentFields,
  // Direction is its own dedicated field above, not the generic Display
  // group's flex controls - which, if left visible, would look like dead
  // controls (the inline style always wins, so nothing there would
  // visibly do anything).
  excludeStyleGroups: ['Display'],
  // Item labels are real text, so Typography (font/size/decoration/Text
  // Color) applies to them same as any text-bearing widget - only
  // textAlign/whiteSpace/textShadow are excluded as not obviously useful
  // for short list-item labels. The icons have their own dedicated Icon
  // Color field above instead of following Text Color, so icons and
  // labels can be coloured independently.
  excludeStyleFields: ['textAlign', 'whiteSpace', 'textShadow'],
  Component: IconListComponent,
});
