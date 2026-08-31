import { AlignLeft, AlignCenter, AlignRight, AlignJustify, StretchHorizontal, type LucideIcon } from 'lucide-react';
import type { LengthUnit } from './valueTypes';

export type ControlType =
  | 'text'
  | 'textarea'
  | 'richtext'
  | 'number'
  | 'slider'
  | 'dimensions'
  | 'length'
  | 'select'
  | 'iconButtons'
  | 'toggle'
  | 'color'
  | 'textFill'
  | 'link'
  | 'media'
  | 'icon'
  | 'iconListItems'
  | 'stringList'
  | 'tableData'
  | 'datetime'
  | 'galleryItems'
  | 'navItems'
  | 'videoUrl'
  | 'display'
  | 'position'
  | 'background'
  | 'backgroundOverlay'
  | 'typography'
  | 'textShadow'
  | 'border'
  | 'shadow'
  | 'transform'
  | 'filter'
  | 'transition';

export interface SelectOptionDef {
  label: string;
  value: string;
}

export interface IconOptionDef extends SelectOptionDef {
  icon: LucideIcon;
}

/**
 * One editable property. `key` is a path into the node's content object (for
 * widget-specific Content-tab fields) or into design/advanced (for the two
 * shared schemas below). `responsive` fields are StyleValue<T>-shaped and go
 * through ResponsiveStateField; everything else is a plain get/set.
 */
export interface FieldDef {
  key: string;
  label: string;
  control: ControlType;
  responsive?: boolean;
  /** Groups fields into collapsible sections in the Style tab - fields sharing a group render under one accordion item, in list order. */
  group?: string;
  /** Which node property this field reads/writes - 'design' (the default) or 'advanced'. Lets a field like Sizing's Margin live in the Style tab's UI while its data stays in AdvancedProperties, same as it always has. */
  source?: 'design' | 'advanced';
  options?: SelectOptionDef[] | IconOptionDef[];
  min?: number;
  max?: number;
  step?: number;
  units?: LengthUnit[];
  placeholder?: string;
  /** Only meaningful for a 'media' field: when the picked asset's natural
   * width/height are known (picked from the library, where they're already
   * stored - never for a bare pasted URL), also write them into these two
   * sibling content keys. Lets a widget like Image render real width/height
   * attributes (avoids a layout shift while the image loads) without every
   * widget needing its own bespoke multi-value control. */
  dimensionKeys?: { width: string; height: string };
}

const WIDTH_UNITS: LengthUnit[] = ['px', '%', 'em', 'rem', 'vw', 'auto'];
const HEIGHT_UNITS: LengthUnit[] = ['px', '%', 'em', 'rem', 'vh', 'auto'];

/**
 * Shared across every widget type, grouped into the Style tab's accordion
 * sections. Most read/write DesignProperties (the default source); Position
 * and Sizing read/write AdvancedProperties instead (source: 'advanced') -
 * same fields the Advanced tab used to hold directly, only the UI moved.
 * Array order is display order (SettingsPanel groups by first occurrence):
 * Display, Position, Sizing, Background, Background Overlay, Border,
 * Typography, Effects.
 */
export const STYLE_FIELDS: FieldDef[] = [
  { key: 'display', label: 'Display', control: 'display', responsive: true, group: 'Display' },
  {
    key: 'alignSelf',
    label: 'Alignment',
    control: 'iconButtons',
    responsive: true,
    group: 'Display',
    options: [
      { label: 'Left', value: 'left', icon: AlignLeft },
      { label: 'Center', value: 'center', icon: AlignCenter },
      { label: 'Right', value: 'right', icon: AlignRight },
      { label: 'Full Width', value: 'full', icon: StretchHorizontal },
    ],
  },
  { key: 'position', label: 'Position', control: 'position', responsive: true, group: 'Position', source: 'advanced' },
  { key: 'margin', label: 'Margin', control: 'dimensions', responsive: true, units: ['px', '%', 'em', 'rem', 'auto'], group: 'Sizing', source: 'advanced' },
  { key: 'padding', label: 'Padding', control: 'dimensions', responsive: true, units: ['px', '%', 'em', 'rem'], group: 'Sizing', source: 'advanced' },
  { key: 'width', label: 'Width', control: 'length', responsive: true, units: WIDTH_UNITS, group: 'Sizing', source: 'advanced' },
  { key: 'minWidth', label: 'Min Width', control: 'length', responsive: true, units: WIDTH_UNITS, group: 'Sizing', source: 'advanced' },
  { key: 'maxWidth', label: 'Max Width', control: 'length', responsive: true, units: WIDTH_UNITS, group: 'Sizing', source: 'advanced' },
  { key: 'height', label: 'Height', control: 'length', responsive: true, units: HEIGHT_UNITS, group: 'Sizing', source: 'advanced' },
  { key: 'minHeight', label: 'Min Height', control: 'length', responsive: true, units: HEIGHT_UNITS, group: 'Sizing', source: 'advanced' },
  { key: 'maxHeight', label: 'Max Height', control: 'length', responsive: true, units: HEIGHT_UNITS, group: 'Sizing', source: 'advanced' },
  { key: 'background', label: 'Background', control: 'background', responsive: true, group: 'Background' },
  { key: 'backgroundOverlay', label: 'Overlay', control: 'backgroundOverlay', responsive: true, group: 'Background Overlay' },
  { key: 'border', label: 'Border', control: 'border', responsive: true, group: 'Border' },
  { key: 'borderRadius', label: 'Corner Radius', control: 'dimensions', responsive: true, units: ['px', '%'], group: 'Border' },
  { key: 'boxShadow', label: 'Box Shadow', control: 'shadow', responsive: true, group: 'Border' },
  { key: 'textColor', label: 'Text Color', control: 'textFill', responsive: true, group: 'Typography' },
  { key: 'typography', label: 'Typography', control: 'typography', responsive: true, group: 'Typography' },
  {
    key: 'textAlign',
    label: 'Align',
    control: 'iconButtons',
    responsive: true,
    group: 'Typography',
    options: [
      { label: 'Left', value: 'left', icon: AlignLeft },
      { label: 'Center', value: 'center', icon: AlignCenter },
      { label: 'Right', value: 'right', icon: AlignRight },
      { label: 'Justify', value: 'justify', icon: AlignJustify },
    ],
  },
  {
    key: 'whiteSpace',
    label: 'Wrapping',
    control: 'select',
    responsive: true,
    group: 'Typography',
    options: [
      { label: 'Normal', value: 'normal' },
      { label: "Don't wrap", value: 'nowrap' },
      { label: 'Preserve line breaks', value: 'pre-wrap' },
    ],
  },
  { key: 'textShadow', label: 'Text Shadow', control: 'textShadow', responsive: true, group: 'Typography' },
  { key: 'transform', label: 'Transform', control: 'transform', responsive: true, group: 'Effects' },
  { key: 'filter', label: 'Filter', control: 'filter', responsive: true, group: 'Effects' },
  { key: 'transition', label: 'Transition', control: 'transition', responsive: true, group: 'Effects' },
  { key: 'opacity', label: 'Opacity', control: 'slider', responsive: true, min: 0, max: 1, step: 0.05, group: 'Effects', source: 'advanced' },
  {
    key: 'cursor',
    label: 'Cursor',
    control: 'select',
    responsive: true,
    group: 'Effects',
    options: [
      { label: 'Default', value: 'default' },
      { label: 'Pointer', value: 'pointer' },
      { label: 'Move', value: 'move' },
      { label: 'Text', value: 'text' },
      { label: 'Grab', value: 'grab' },
      { label: 'Zoom In', value: 'zoom-in' },
      { label: 'Help', value: 'help' },
      { label: 'Not Allowed', value: 'not-allowed' },
    ],
  },
  {
    key: 'mixBlendMode',
    label: 'Blend Mode',
    control: 'select',
    responsive: true,
    group: 'Effects',
    options: [
      { label: 'Normal', value: 'normal' },
      { label: 'Multiply', value: 'multiply' },
      { label: 'Screen', value: 'screen' },
      { label: 'Overlay', value: 'overlay' },
      { label: 'Darken', value: 'darken' },
      { label: 'Lighten', value: 'lighten' },
      { label: 'Color Dodge', value: 'color-dodge' },
      { label: 'Color Burn', value: 'color-burn' },
      { label: 'Difference', value: 'difference' },
      { label: 'Exclusion', value: 'exclusion' },
      { label: 'Hue', value: 'hue' },
      { label: 'Saturation', value: 'saturation' },
      { label: 'Color', value: 'color' },
      { label: 'Luminosity', value: 'luminosity' },
    ],
  },
];

/**
 * Icon/Icon List's own Style-tab group (see WidgetDefinition.extraStyleFields)
 * - responsive and stateful like everything in STYLE_FIELDS, so Hover/Focus/
 * Active work here the same way they do for every shared field. Icon List
 * appends ICON_LIST_EXTRA_FIELDS on top for its two gap controls, which have
 * no meaning for a single Icon.
 */
export const ICON_STYLE_FIELDS: FieldDef[] = [
  { key: 'iconColor', label: 'Color', control: 'color', responsive: true, group: 'Icon' },
  { key: 'iconSize', label: 'Size', control: 'length', responsive: true, units: ['px', 'em', 'rem'], group: 'Icon' },
  {
    key: 'iconView',
    label: 'View',
    control: 'select',
    responsive: true,
    group: 'Icon',
    options: [
      { label: 'Default', value: 'default' },
      { label: 'Stacked', value: 'stacked' },
      { label: 'Framed', value: 'framed' },
    ],
  },
  { key: 'iconSecondaryColor', label: 'Secondary Color', control: 'color', responsive: true, group: 'Icon' },
  { key: 'iconRadius', label: 'Shape Radius', control: 'dimensions', responsive: true, units: ['px', '%'], group: 'Icon' },
  { key: 'iconPadding', label: 'Shape Padding', control: 'dimensions', responsive: true, units: ['px', 'em', 'rem'], group: 'Icon' },
  // The shared Effects > Transition field can't reach the icon - it applies
  // to the widget's root element, but the icon's color/shape live on the
  // separate .builder-icon-shape wrapper, which a transition never crosses
  // into. This is the same control, just wired to that wrapper instead.
  { key: 'iconTransition', label: 'Transition', control: 'transition', responsive: true, group: 'Icon' },
];

export const ICON_LIST_EXTRA_FIELDS: FieldDef[] = [
  { key: 'iconItemGap', label: 'Item Gap', control: 'length', responsive: true, units: ['px', 'em', 'rem'], group: 'Icon' },
  { key: 'iconTextGap', label: 'Icon-Text Gap', control: 'length', responsive: true, units: ['px', 'em', 'rem'], group: 'Icon' },
];

/** Nav widget's own Style-tab group (see WidgetDefinition.extraStyleFields). */
export const NAV_STYLE_FIELDS: FieldDef[] = [
  { key: 'navItemGap', label: 'Item Gap', control: 'length', responsive: true, units: ['px', 'em', 'rem'], group: 'Nav' },
];

const OVERFLOW_OPTIONS: SelectOptionDef[] = [
  { label: 'Visible', value: 'visible' },
  { label: 'Hidden', value: 'hidden' },
  { label: 'Scroll', value: 'scroll' },
  { label: 'Auto', value: 'auto' },
];

/**
 * What's left of AdvancedProperties directly in the Advanced tab once
 * Position, Sizing, and Opacity moved into the Style tab (see STYLE_FIELDS)
 * - overflow, plus `hidden`/`customCss`/`name` which aren't StyleValue-shaped
 * and are rendered directly by SettingsPanel instead of through this list.
 */
export const ADVANCED_FIELDS: FieldDef[] = [
  { key: 'overflowX', label: 'Overflow X', control: 'select', responsive: true, options: OVERFLOW_OPTIONS },
  { key: 'overflowY', label: 'Overflow Y', control: 'select', responsive: true, options: OVERFLOW_OPTIONS },
  // Plain (no `responsive: true`) - see AdvancedProperties.entranceAnimation
  // for why a one-time scroll-triggered reveal doesn't need a per-breakpoint
  // or per-state variant the way every other field here does.
  {
    key: 'entranceAnimation',
    label: 'Entrance Animation',
    control: 'select',
    options: [
      { label: 'None', value: 'none' },
      { label: 'Fade In', value: 'fade-in' },
      { label: 'Slide Up', value: 'slide-up' },
      { label: 'Slide Down', value: 'slide-down' },
      { label: 'Slide Left', value: 'slide-left' },
      { label: 'Slide Right', value: 'slide-right' },
      { label: 'Zoom In', value: 'zoom-in' },
    ],
  },
  { key: 'entranceDuration', label: 'Duration (ms)', control: 'number', min: 100, max: 3000, step: 50 },
  { key: 'entranceDelay', label: 'Delay (ms)', control: 'number', min: 0, max: 3000, step: 50 },
];
