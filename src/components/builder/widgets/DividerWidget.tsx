import { registerWidget, type WidgetComponentProps } from '@/lib/builder/registry';
import { Minus } from 'lucide-react';
import type { FieldDef } from '@/lib/builder/fields';
import { length, literalColor, type ColorValue } from '@/lib/builder/valueTypes';
import { literal } from '@/lib/builder/styleValue';
import { resolveColorCss } from '@/lib/builder/cssVars';
import { cn } from '@/lib/utils';

export type DividerLineStyle = 'solid' | 'dashed' | 'dotted';

export interface DividerContent {
  color: ColorValue;
  style: DividerLineStyle;
  /** px */
  weight: number;
}

// A dedicated Color/Style/Weight trio directly in the Content tab, rather
// than routing through the generic (multi-side) Border style group - a
// divider is conceptually just "one line", and burying that one colour
// choice inside Border's per-side editor made it hard to even find (see the
// excludeStyleGroups below, which hides Border for exactly this reason so
// there's only one place to set it). Rendered as a plain inline style,
// bypassing the responsive breakpoint/state system entirely - a divider's
// line doesn't realistically need to vary by breakpoint.
//
// The line itself is a separate inner element, vertically centered by the
// root's flex layout (see defaultDesign below) - a border always sits flush
// against one edge of its own box (there's no such thing as "a border in
// the middle" of a single element), so with the padding that makes this
// widget easy to click living on the root, the line has to be its own
// child to actually land in the middle of that padded space instead of
// stuck to whichever edge the border was declared on.
function DividerComponent({ content, wiring }: WidgetComponentProps<DividerContent>) {
  const color = resolveColorCss(content.color) ?? '#e5e7eb';
  const weight = content.weight || 1;
  return (
    <div {...(wiring as any)} role="separator" className={cn('builder-el builder-divider', wiring.className)}>
      <span
        className="block w-full"
        style={{ borderBottomStyle: content.style || 'solid', borderBottomWidth: `${weight}px`, borderBottomColor: color }}
      />
    </div>
  );
}

const contentFields: FieldDef[] = [
  { key: 'color', label: 'Color', control: 'color' },
  {
    key: 'style',
    label: 'Style',
    control: 'select',
    options: [
      { label: 'Solid', value: 'solid' },
      { label: 'Dashed', value: 'dashed' },
      { label: 'Dotted', value: 'dotted' },
    ],
  },
  { key: 'weight', label: 'Weight (px)', control: 'number', min: 1, max: 20, step: 1 },
];

registerWidget({
  type: 'divider',
  label: 'Divider',
  icon: Minus,
  category: 'basic',
  keywords: ['divider', 'separator', 'line', 'hr', 'rule'],
  isContainer: false,
  defaultContent: { color: literalColor('#e5e7eb'), style: 'solid', weight: 1 } satisfies DividerContent,
  // display/alignItems here isn't exposed in the Style tab (Display is
  // excluded below) - it's what centers the inner line within the root's
  // padding, not a setting the user needs to touch themselves. Can't use a
  // plain Tailwind class for this instead: the canvas's generated
  // stylesheet is injected after Tailwind's in the document, so
  // `display: var(--el-display, block)` from .builder-el would win over a
  // hardcoded `flex` class at equal specificity and silently undo it.
  defaultDesign: { display: literal({ type: 'flex', direction: 'row', alignItems: 'center' }) },
  defaultAdvanced: {
    // Explicit 100% width - a flex row parent's main axis defaults to
    // shrink-to-content (an empty div has none, so it collapses to
    // nothing), unlike a column parent's cross axis, which stretches
    // automatically. Without this the divider is only ever visible when
    // the parent happens to be in column direction.
    width: literal(length(100, '%')),
    // Padding, not margin - margin sits outside the element's own bounding
    // box, so a margin-only gap leaves just the ~1px line itself
    // hit-testable/selectable. Symmetric top/bottom so the flex-centered
    // line (see DividerComponent) lands with equal space on both sides.
    padding: literal({ top: length(16), right: length(0), bottom: length(16), left: length(0), linked: false }),
    overflowX: literal('hidden'),
  },
  contentFields,
  // Display has nothing to offer a childless single-line widget; Typography
  // has no text; Border is superseded by the Color/Style/Weight fields
  // above - leaving it visible would just be a second, conflicting place to
  // set the same line.
  excludeStyleGroups: ['Display', 'Typography', 'Border'],
  Component: DividerComponent,
});
