import type { StyleValue } from './styleValue';

export type LengthUnit = 'px' | '%' | 'em' | 'rem' | 'vw' | 'vh' | 'fr' | 'auto' | 'custom';

export interface LengthValue {
  value: number;
  unit: LengthUnit;
  /** Raw CSS expression, used only when unit is 'custom'. */
  custom?: string;
}

export function length(value: number, unit: LengthUnit = 'px'): LengthValue {
  return { value, unit };
}

export function lengthToCss(v: LengthValue | undefined): string | undefined {
  if (!v) return undefined;
  if (v.unit === 'auto') return 'auto';
  if (v.unit === 'custom') return v.custom || undefined;
  if (v.unit === 'fr') return `${v.value}fr`;
  return `${v.value}${v.unit}`;
}

export interface BoxValue {
  top: LengthValue;
  right: LengthValue;
  bottom: LengthValue;
  left: LengthValue;
  linked: boolean;
}

export function box(all: LengthValue = length(0)): BoxValue {
  return { top: all, right: all, bottom: all, left: all, linked: true };
}

export function boxToCss(v: BoxValue | undefined): string | undefined {
  if (!v) return undefined;
  const t = lengthToCss(v.top) ?? '0';
  const r = lengthToCss(v.right) ?? '0';
  const b = lengthToCss(v.bottom) ?? '0';
  const l = lengthToCss(v.left) ?? '0';
  return `${t} ${r} ${b} ${l}`;
}

export interface ColorValue {
  type: 'literal' | 'token';
  /** A CSS colour string when literal, a token id when a token reference. */
  value: string;
}

export function literalColor(value: string): ColorValue {
  return { type: 'literal', value };
}

export interface TypographyValue {
  type: 'literal' | 'token';
  tokenId?: string;
  fontFamily?: string;
  fontSize?: LengthValue;
  fontWeight?: string;
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline' | 'line-through';
  lineHeight?: LengthValue;
  letterSpacing?: LengthValue;
  wordSpacing?: LengthValue;
}

export interface GradientStop {
  color: ColorValue;
  /** 0-100 */
  position: number;
}

export interface GradientValue {
  type: 'linear' | 'radial';
  /** Degrees, linear only. */
  angle: number;
  stops: GradientStop[];
}

export function defaultGradient(): GradientValue {
  return {
    type: 'linear',
    angle: 90,
    stops: [
      { color: literalColor('#6366f1'), position: 0 },
      { color: literalColor('#8b5cf6'), position: 100 },
    ],
  };
}

export function gradientToCss(v: GradientValue | undefined, resolveColor: (c: ColorValue) => string): string | undefined {
  if (!v || v.stops.length === 0) return undefined;
  const stops = v.stops.map((s) => `${resolveColor(s.color)} ${s.position}%`).join(', ');
  return v.type === 'radial' ? `radial-gradient(circle, ${stops})` : `linear-gradient(${v.angle}deg, ${stops})`;
}

/**
 * Text colour is either a solid fill or a gradient clipped to the glyph
 * shapes (the standard background-clip:text trick - see styleGenerator.ts
 * and .builder-el-text in cssVars.ts). That trick applies to an inner
 * text-wrapping span, not the widget's own root element, so it doesn't
 * interfere with a real box background/image set on the widget itself.
 */
export interface TextFillValue {
  type: 'solid' | 'gradient';
  color?: ColorValue;
  gradient?: GradientValue;
}

/**
 * `video` renders a real <video> element (see ElementRenderer/BackgroundVideo)
 * rather than a CSS background - there's no CSS mechanism for a video
 * background. Its src/fit/position are all resolved once at desktop/normal
 * rather than being fully responsive like the other types (see
 * ElementRenderer for why). `opacity` applies to the whole layer - the
 * Background Overlay control offers it, the base Background control doesn't
 * (see BackgroundControl's allowOpacity prop).
 */
export interface BackgroundValue {
  type: 'none' | 'color' | 'gradient' | 'image' | 'video';
  color?: ColorValue;
  gradient?: GradientValue;
  image?: {
    url: string;
    size: 'cover' | 'contain' | 'auto';
    position: string;
    repeat: 'no-repeat' | 'repeat';
  };
  video?: {
    url: string;
    /** Which sub-control last wrote `url` - purely so the panel reopens on the same tab, both write the same `url` field. */
    source?: 'link' | 'upload';
    posterUrl?: string | undefined;
    fit?: 'cover' | 'contain' | undefined;
    position?: string | undefined;
  };
  opacity?: number;
}

/** Whether any breakpoint/state of this StyleValue has a real (non-'none') background set - used to decide whether ElementRenderer needs to insert the overlay/video DOM nodes at all. */
export function hasAnyBackground(sv: StyleValue<BackgroundValue> | undefined): boolean {
  if (!sv) return false;
  return Object.values(sv).some(
    (byState) => byState && Object.values(byState).some((v) => v && v.type !== 'none')
  );
}

/**
 * How an element lays out (display:block/inline/none, participating in its
 * parent) and how it arranges its own children (flex/grid). direction/wrap
 * are flex-only, gridColumns is grid-only (a simple equal-width
 * repeat(N, 1fr) - full grid-template-areas is out of scope); gap and
 * justifyContent/alignItems apply to both, since modern CSS gap and
 * justify-content/align-items work the same way on flex and grid containers.
 */
export interface DisplayValue {
  type: 'block' | 'inline-block' | 'inline' | 'flex' | 'grid' | 'none';
  direction?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  wrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
  justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly';
  alignItems?: 'flex-start' | 'center' | 'flex-end' | 'stretch' | 'baseline';
  /** Used for both axes when gapLinked isn't false; otherwise just the fallback rowGap/columnGap fall back to if they're unset. */
  gap?: LengthValue;
  /** Only read when gapLinked is false - same linked/per-side pattern as BorderValue.perSide. */
  rowGap?: LengthValue;
  columnGap?: LengthValue;
  /** Defaults to true (a single Gap field driving both axes); false splits it into Row Gap / Column Gap. */
  gapLinked?: boolean;
  gridColumns?: number;
}

export function defaultDisplay(type: DisplayValue['type'] = 'block'): DisplayValue {
  return { type };
}

export interface SideBorder {
  style: 'none' | 'solid' | 'dashed' | 'dotted';
  width: LengthValue;
  color: ColorValue;
}

export function defaultSideBorder(): SideBorder {
  return { style: 'none', width: length(1), color: literalColor('#000000') };
}

/** When perSide is false, `all` applies to every edge; when true, each edge uses its own entry. */
export interface BorderValue {
  perSide: boolean;
  all: SideBorder;
  top: SideBorder;
  right: SideBorder;
  bottom: SideBorder;
  left: SideBorder;
}

export function defaultBorder(): BorderValue {
  const side = defaultSideBorder();
  return { perSide: false, all: side, top: side, right: side, bottom: side, left: side };
}

export type BorderSide = 'top' | 'right' | 'bottom' | 'left';

export function effectiveSideBorder(border: BorderValue | undefined, side: BorderSide): SideBorder | undefined {
  if (!border) return undefined;
  return border.perSide ? border[side] : border.all;
}

export interface ShadowValue {
  enabled: boolean;
  x: number;
  y: number;
  blur: number;
  spread: number;
  color: ColorValue;
  inset: boolean;
}

export function shadowToCss(v: ShadowValue | undefined, resolveColor: (c: ColorValue) => string): string | undefined {
  if (!v || !v.enabled) return undefined;
  const inset = v.inset ? 'inset ' : '';
  return `${inset}${v.x}px ${v.y}px ${v.blur}px ${v.spread}px ${resolveColor(v.color)}`;
}

/** text-shadow has no spread or inset - CSS just doesn't support them there, unlike box-shadow. */
export interface TextShadowValue {
  enabled: boolean;
  x: number;
  y: number;
  blur: number;
  color: ColorValue;
}

export function textShadowToCss(v: TextShadowValue | undefined, resolveColor: (c: ColorValue) => string): string | undefined {
  if (!v || !v.enabled) return undefined;
  return `${v.x}px ${v.y}px ${v.blur}px ${resolveColor(v.color)}`;
}

export type TextAlign = 'left' | 'center' | 'right' | 'justify';
export type WhiteSpace = 'normal' | 'nowrap' | 'pre-wrap';

/**
 * Position type plus its offsets/z-index as one compound value, so the
 * control can show top/right/bottom/left/z-index only when type isn't
 * 'static' (they're no-ops otherwise) without needing a general
 * cross-field conditional-visibility system - it's all local state inside
 * PositionControl, the same way BorderControl already hides width/colour
 * when style is 'none'.
 */
export interface PositionValue {
  type: 'static' | 'relative' | 'absolute' | 'fixed' | 'sticky';
  top?: LengthValue;
  right?: LengthValue;
  bottom?: LengthValue;
  left?: LengthValue;
  zIndex?: number;
}

// 'relative', not 'static' - matches BASE_ELEMENT_CSS's own fallback
// (position: var(--el-position, relative)), so the panel shows what's
// actually applied by default instead of a value that looks unset but
// silently renders differently.
export function defaultPosition(): PositionValue {
  return { type: 'relative' };
}

export type CursorType = 'default' | 'pointer' | 'move' | 'not-allowed' | 'text' | 'grab' | 'zoom-in' | 'help';

export interface TransformValue {
  translateX?: LengthValue;
  translateY?: LengthValue;
  /** Degrees. */
  rotate?: number;
  /** Percent - 100 is unscaled, matching the CSS scale() convention of 1 = 100%. */
  scale?: number;
  /** Degrees. */
  skewX?: number;
  skewY?: number;
}

export function transformToCss(v: TransformValue | undefined): string | undefined {
  if (!v) return undefined;
  const parts: string[] = [];
  if (v.translateX || v.translateY) {
    parts.push(`translate(${lengthToCss(v.translateX) ?? '0'}, ${lengthToCss(v.translateY) ?? '0'})`);
  }
  if (v.rotate) parts.push(`rotate(${v.rotate}deg)`);
  if (v.scale !== undefined && v.scale !== 100) parts.push(`scale(${v.scale / 100})`);
  if (v.skewX) parts.push(`skewX(${v.skewX}deg)`);
  if (v.skewY) parts.push(`skewY(${v.skewY}deg)`);
  return parts.length > 0 ? parts.join(' ') : undefined;
}

export interface FilterValue {
  /** px */
  blur?: number;
  /** Percent, 100 = normal. */
  brightness?: number;
  contrast?: number;
  saturate?: number;
  /** Percent, 0-100. */
  grayscale?: number;
}

export function filterToCss(v: FilterValue | undefined): string | undefined {
  if (!v) return undefined;
  const parts: string[] = [];
  if (v.blur) parts.push(`blur(${v.blur}px)`);
  if (v.brightness !== undefined && v.brightness !== 100) parts.push(`brightness(${v.brightness}%)`);
  if (v.contrast !== undefined && v.contrast !== 100) parts.push(`contrast(${v.contrast}%)`);
  if (v.saturate !== undefined && v.saturate !== 100) parts.push(`saturate(${v.saturate}%)`);
  if (v.grayscale) parts.push(`grayscale(${v.grayscale}%)`);
  return parts.length > 0 ? parts.join(' ') : undefined;
}

export interface TransitionValue {
  /** ms */
  duration: number;
  easing: 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear';
}

export function transitionToCss(v: TransitionValue | undefined): string | undefined {
  if (!v || !v.duration) return undefined;
  return `all ${v.duration}ms ${v.easing || 'ease'}`;
}

export type OverflowValue = 'visible' | 'hidden' | 'scroll' | 'auto';

export type MixBlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'difference'
  | 'exclusion'
  | 'hue'
  | 'saturation'
  | 'color'
  | 'luminosity';
