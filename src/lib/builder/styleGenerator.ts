import { minify as minifyCss } from 'csso';
import { BREAKPOINTS, type BreakpointId } from './breakpoints';
import { resolveValue, type StateId } from './styleValue';
import { EL_VARS, resolveColorCss, lengthToCss, boxToCss, shadowToCss } from './cssVars';
import {
  effectiveSideBorder,
  filterToCss,
  gradientToCss,
  textShadowToCss,
  transformToCss,
  transitionToCss,
  type AlignSelfValue,
  type BackgroundValue,
  type BorderSide,
  type ColorValue,
  type DisplayValue,
  type IconViewValue,
  type TextFillValue,
} from './valueTypes';
import type { AdvancedProperties, DesignProperties, ElementNode } from './document';

const BORDER_SIDES: BorderSide[] = ['top', 'right', 'bottom', 'left'];
const BORDER_VAR_BY_SIDE = {
  top: { style: EL_VARS.borderTopStyle, width: EL_VARS.borderTopWidth, color: EL_VARS.borderTopColor },
  right: { style: EL_VARS.borderRightStyle, width: EL_VARS.borderRightWidth, color: EL_VARS.borderRightColor },
  bottom: { style: EL_VARS.borderBottomStyle, width: EL_VARS.borderBottomWidth, color: EL_VARS.borderBottomColor },
  left: { style: EL_VARS.borderLeftStyle, width: EL_VARS.borderLeftWidth, color: EL_VARS.borderLeftColor },
} as const;

interface BackgroundLayer {
  color?: string | undefined;
  image?: string | undefined;
  size?: string | undefined;
  position?: string | undefined;
  repeat?: string | undefined;
  opacity?: string | undefined;
}

/**
 * Resolves a BackgroundValue to CSS. Used for both the base background
 * (read straight off .builder-el) and the overlay (read off the real
 * .builder-el-overlay child div ElementRenderer inserts - see cssVars.ts).
 * `video` isn't handled here at all: it has no CSS representation, it's a
 * real <video> element ElementRenderer renders directly (see BackgroundVideo).
 */
function backgroundLayer(bg: BackgroundValue | undefined, tokens: TokenMap): BackgroundLayer {
  if (!bg) return {};
  const opacity = bg.opacity !== undefined ? String(bg.opacity) : undefined;
  if (bg.type === 'color') {
    const c = resolveColorCss(bg.color, tokens);
    return c ? { color: c, opacity } : {};
  }
  if (bg.type === 'gradient') {
    const css = gradientToCss(bg.gradient, (c) => resolveColorCss(c, tokens) ?? 'transparent');
    return css ? { image: css, size: 'cover', position: 'center', repeat: 'no-repeat', opacity } : {};
  }
  if (bg.type === 'image' && bg.image) {
    return {
      image: `url(${JSON.stringify(bg.image.url)})`,
      size: bg.image.size,
      position: bg.image.position,
      repeat: bg.image.repeat,
      opacity,
    };
  }
  return {};
}

interface TextFillLayer {
  color?: string | undefined;
  gradientImage?: string | undefined;
  clip?: string | undefined;
  fillColor?: string | undefined;
  /** Only set in gradient mode - see textFillLayer's comment on why. */
  display?: string | undefined;
}

/** Solid mode just sets the colour; gradient mode drives the inner .builder-el-text wrapper's background-image + background-clip:text (see cssVars.ts) instead of touching --el-text-color at all. */
interface IconShapeLayer {
  bg?: string | undefined;
  borderWidth?: string | undefined;
  borderColor?: string | undefined;
}

/** 'stacked' fills the shape with the secondary colour; 'framed' outlines it with a fixed 2px border instead - both share the one colour field rather than needing a separate control per view. */
function iconShapeLayer(view: IconViewValue | undefined, secondaryColor: ColorValue | undefined, tokens: TokenMap): IconShapeLayer {
  const c = resolveColorCss(secondaryColor, tokens);
  if (!c) return {};
  if (view === 'stacked') return { bg: c };
  if (view === 'framed') return { borderWidth: '2px', borderColor: c };
  return {};
}

// Gradient mode needs .builder-el-text sized to the text itself (inline-
// block), not the widget's full block-level width - otherwise the gradient
// stretches edge to edge of a box usually much wider than the text, so only
// a thin, often near-solid-looking slice of it ends up behind the actual
// glyphs. Solid mode (by far the common case) leaves display alone entirely
// (see the CSS's `revert` fallback) rather than forcing every text wrapper
// on every widget into inline-block whether it needed it or not - that
// blanket override is exactly what broke <th>/<td> (which need their native
// table-cell display) and caused layout issues elsewhere.
function textFillLayer(fill: TextFillValue | undefined, tokens: TokenMap): TextFillLayer {
  if (!fill) return {};
  if (fill.type === 'gradient') {
    const css = gradientToCss(fill.gradient, (c) => resolveColorCss(c, tokens) ?? 'transparent');
    return css ? { gradientImage: css, clip: 'text', fillColor: 'transparent', display: 'inline-block' } : {};
  }
  const c = resolveColorCss(fill.color, tokens);
  return c ? { color: c } : {};
}

interface DisplayLayer {
  display?: string | undefined;
  flexDirection?: string | undefined;
  flexWrap?: string | undefined;
  justifyContent?: string | undefined;
  alignItems?: string | undefined;
  gap?: string | undefined;
  rowGap?: string | undefined;
  columnGap?: string | undefined;
  gridTemplateColumns?: string | undefined;
}

/** flex-direction/flex-wrap only mean something when type is 'flex', grid-template-columns only when 'grid' - only emit the sub-properties that apply to the chosen type, so switching types doesn't leave stale flex rules affecting a grid (or vice versa). rowGap/columnGap only get emitted (overriding the unified `gap`, via the CSS var fallback chain in cssVars.ts) when gapLinked is explicitly false. */
function displayLayer(display: DisplayValue | undefined): DisplayLayer {
  if (!display) return {};
  const gap = lengthToCss(display.gap);
  const split = display.gapLinked === false;
  const rowGap = split ? lengthToCss(display.rowGap ?? display.gap) : undefined;
  const columnGap = split ? lengthToCss(display.columnGap ?? display.gap) : undefined;
  if (display.type === 'flex') {
    return {
      display: 'flex',
      flexDirection: display.direction,
      flexWrap: display.wrap,
      justifyContent: display.justifyContent,
      alignItems: display.alignItems,
      gap,
      rowGap,
      columnGap,
    };
  }
  if (display.type === 'grid') {
    return {
      display: 'grid',
      gridTemplateColumns: display.gridColumns ? `repeat(${display.gridColumns}, 1fr)` : undefined,
      justifyContent: display.justifyContent,
      alignItems: display.alignItems,
      gap,
      rowGap,
      columnGap,
    };
  }
  return { display: display.type };
}

const ALIGN_SELF_CSS: Record<AlignSelfValue, string | undefined> = {
  auto: undefined,
  left: 'flex-start',
  center: 'center',
  right: 'flex-end',
  // 'stretch' is align-self's real keyword for this - 'full' is just the
  // friendlier name shown in the panel (see AlignSelfValue's doc comment).
  full: 'stretch',
};

function alignSelfLayer(value: AlignSelfValue | undefined): string | undefined {
  return value ? ALIGN_SELF_CSS[value] : undefined;
}

/** States a rule may be emitted for - kept in sync with the state switcher in SettingsPanel.tsx. */
const OFFERED_STATES: StateId[] = ['normal', 'hover', 'focus', 'active'];

export const CUSTOM_CSS_SELECTOR_KEYWORD = 'SELECTOR';

export function elementSelector(id: string): string {
  return `[data-el-id="${id}"]`;
}

/**
 * Non-normal states also match a `.builder-preview-<state>` class alternative
 * alongside the real pseudo-class - otherwise there's no way to see a Hover
 * (etc.) value while editing it, since your cursor is over the settings
 * panel, not the canvas element, while you're actually changing the field.
 * The editor toggles this class on the selected element to force-preview
 * whichever state its State switcher is set to (see SettingsPanel).
 */
function stateSelector(id: string, state: StateId): string {
  const base = elementSelector(id);
  return state === 'normal' ? base : `${base}:${state}, ${base}.builder-preview-${state}`;
}

type TokenMap = Record<string, string>;

/**
 * Every {varName: cssValue} pair that applies to one element at one
 * breakpoint + state - always ALL of EL_VARS, every one. CSS custom
 * properties inherit through the DOM by default, so if an element with no
 * background of its own simply omitted --el-bg-color, it would silently
 * pick up its parent's value instead of the true "unset" default. Writing
 * 'initial' (the guaranteed-invalid value for an unregistered custom
 * property, which var()'s fallback treats as unset) for every property this
 * element doesn't set cuts that inheritance at each element, the same way
 * resolveValue already resolves breakpoint/state fully rather than trusting
 * the cascade to infer it.
 */
function collectDeclarations(
  design: DesignProperties,
  advanced: AdvancedProperties,
  breakpoint: BreakpointId,
  state: StateId,
  tokens: TokenMap
): Record<string, string> {
  const decls: Record<string, string> = {};
  const set = (varName: string, value: string | undefined) => {
    decls[varName] = value ?? 'initial';
  };

  const display = resolveValue(design.display, breakpoint, state);
  const displayValues = displayLayer(display);
  set(EL_VARS.display, displayValues.display);
  set(EL_VARS.flexDirection, displayValues.flexDirection);
  set(EL_VARS.flexWrap, displayValues.flexWrap);
  set(EL_VARS.justifyContent, displayValues.justifyContent);
  set(EL_VARS.alignItems, displayValues.alignItems);
  set(EL_VARS.gap, displayValues.gap);
  set(EL_VARS.rowGap, displayValues.rowGap);
  set(EL_VARS.columnGap, displayValues.columnGap);
  set(EL_VARS.gridTemplateColumns, displayValues.gridTemplateColumns);
  set(EL_VARS.alignSelf, alignSelfLayer(resolveValue(design.alignSelf, breakpoint, state)));

  const bg = resolveValue(design.background, breakpoint, state);
  const bgLayer = backgroundLayer(bg, tokens);
  set(EL_VARS.bgColor, bgLayer.color);
  set(EL_VARS.bgImage, bgLayer.image);
  set(EL_VARS.bgSize, bgLayer.size);
  set(EL_VARS.bgPosition, bgLayer.position);
  set(EL_VARS.bgRepeat, bgLayer.repeat);

  const overlay = resolveValue(design.backgroundOverlay, breakpoint, state);
  const overlayLayer = backgroundLayer(overlay, tokens);
  set(EL_VARS.overlayColor, overlayLayer.color);
  set(EL_VARS.overlayImage, overlayLayer.image);
  set(EL_VARS.overlaySize, overlayLayer.size);
  set(EL_VARS.overlayPosition, overlayLayer.position);
  set(EL_VARS.overlayRepeat, overlayLayer.repeat);
  set(EL_VARS.overlayOpacity, overlayLayer.opacity);

  const textFill = resolveValue(design.textColor, breakpoint, state);
  const textFillValues = textFillLayer(textFill, tokens);
  set(EL_VARS.textColor, textFillValues.color);
  set(EL_VARS.textGradientImage, textFillValues.gradientImage);
  set(EL_VARS.textFillClip, textFillValues.clip);
  set(EL_VARS.textFillColor, textFillValues.fillColor);
  set(EL_VARS.textDisplay, textFillValues.display);
  set(EL_VARS.textAlign, resolveValue(design.textAlign, breakpoint, state));
  set(EL_VARS.whiteSpace, resolveValue(design.whiteSpace, breakpoint, state));

  const textShadow = resolveValue(design.textShadow, breakpoint, state);
  set(EL_VARS.textShadow, textShadowToCss(textShadow, (c) => resolveColorCss(c, tokens) ?? 'transparent'));

  const typography = resolveValue(design.typography, breakpoint, state);
  set(EL_VARS.fontFamily, typography?.fontFamily);
  set(EL_VARS.fontSize, lengthToCss(typography?.fontSize));
  set(EL_VARS.fontWeight, typography?.fontWeight);
  set(EL_VARS.textTransform, typography?.textTransform);
  set(EL_VARS.fontStyle, typography?.fontStyle);
  set(EL_VARS.textDecoration, typography?.textDecoration);
  set(EL_VARS.lineHeight, lengthToCss(typography?.lineHeight));
  set(EL_VARS.letterSpacing, lengthToCss(typography?.letterSpacing));
  set(EL_VARS.wordSpacing, lengthToCss(typography?.wordSpacing));

  const border = resolveValue(design.border, breakpoint, state);
  for (const side of BORDER_SIDES) {
    const s = effectiveSideBorder(border, side);
    const vars = BORDER_VAR_BY_SIDE[side];
    set(vars.style, s?.style);
    set(vars.width, lengthToCss(s?.width));
    set(vars.color, resolveColorCss(s?.color, tokens));
  }

  set(EL_VARS.borderRadius, boxToCss(resolveValue(design.borderRadius, breakpoint, state)));

  const shadow = resolveValue(design.boxShadow, breakpoint, state);
  set(EL_VARS.boxShadow, shadowToCss(shadow, (c) => resolveColorCss(c, tokens) ?? 'transparent'));

  set(EL_VARS.margin, boxToCss(resolveValue(advanced.margin, breakpoint, state)));
  set(EL_VARS.padding, boxToCss(resolveValue(advanced.padding, breakpoint, state)));
  set(EL_VARS.width, lengthToCss(resolveValue(advanced.width, breakpoint, state)));
  set(EL_VARS.minWidth, lengthToCss(resolveValue(advanced.minWidth, breakpoint, state)));
  set(EL_VARS.maxWidth, lengthToCss(resolveValue(advanced.maxWidth, breakpoint, state)));
  set(EL_VARS.height, lengthToCss(resolveValue(advanced.height, breakpoint, state)));
  set(EL_VARS.minHeight, lengthToCss(resolveValue(advanced.minHeight, breakpoint, state)));
  set(EL_VARS.maxHeight, lengthToCss(resolveValue(advanced.maxHeight, breakpoint, state)));

  const position = resolveValue(advanced.position, breakpoint, state);
  set(EL_VARS.position, position?.type);
  if (position?.type && position.type !== 'static') {
    set(EL_VARS.top, lengthToCss(position.top));
    set(EL_VARS.right, lengthToCss(position.right));
    set(EL_VARS.bottom, lengthToCss(position.bottom));
    set(EL_VARS.left, lengthToCss(position.left));
    set(EL_VARS.zIndex, position.zIndex !== undefined ? String(position.zIndex) : undefined);
  } else {
    set(EL_VARS.top, undefined);
    set(EL_VARS.right, undefined);
    set(EL_VARS.bottom, undefined);
    set(EL_VARS.left, undefined);
    set(EL_VARS.zIndex, undefined);
  }

  const opacity = resolveValue(advanced.opacity, breakpoint, state);
  set(EL_VARS.opacity, opacity !== undefined ? String(opacity) : undefined);

  set(EL_VARS.overflowX, resolveValue(advanced.overflowX, breakpoint, state));
  set(EL_VARS.overflowY, resolveValue(advanced.overflowY, breakpoint, state));

  set(EL_VARS.transform, transformToCss(resolveValue(design.transform, breakpoint, state)));
  set(EL_VARS.filter, filterToCss(resolveValue(design.filter, breakpoint, state)));
  set(EL_VARS.transition, transitionToCss(resolveValue(design.transition, breakpoint, state)));
  set(EL_VARS.cursor, resolveValue(design.cursor, breakpoint, state));
  set(EL_VARS.mixBlendMode, resolveValue(design.mixBlendMode, breakpoint, state));

  const iconView = resolveValue(design.iconView, breakpoint, state);
  const iconShape = iconShapeLayer(iconView, resolveValue(design.iconSecondaryColor, breakpoint, state), tokens);
  set(EL_VARS.iconColor, resolveColorCss(resolveValue(design.iconColor, breakpoint, state), tokens));
  set(EL_VARS.iconSize, lengthToCss(resolveValue(design.iconSize, breakpoint, state)));
  set(EL_VARS.iconBg, iconShape.bg);
  set(EL_VARS.iconBorderWidth, iconShape.borderWidth);
  set(EL_VARS.iconBorderColor, iconShape.borderColor);
  set(EL_VARS.iconRadius, boxToCss(resolveValue(design.iconRadius, breakpoint, state)));
  set(EL_VARS.iconPadding, boxToCss(resolveValue(design.iconPadding, breakpoint, state)));
  set(EL_VARS.iconItemGap, lengthToCss(resolveValue(design.iconItemGap, breakpoint, state)));
  set(EL_VARS.iconTextGap, lengthToCss(resolveValue(design.iconTextGap, breakpoint, state)));
  set(EL_VARS.iconTransition, transitionToCss(resolveValue(design.iconTransition, breakpoint, state)));

  return decls;
}

function declsToCssBlock(selector: string, decls: Record<string, string>): string {
  const keys = Object.keys(decls);
  if (keys.length === 0) return '';
  const body = keys.map((k) => `  ${k}: ${decls[k]};`).join('\n');
  return `${selector} {\n${body}\n}`;
}

function visibilityBlock(id: string, hidden: AdvancedProperties['hidden']): string {
  if (!hidden) return '';
  const rules: string[] = [];
  for (const bp of BREAKPOINTS) {
    if (!hidden[bp.id]) continue;
    const rule = `${elementSelector(id)} { display: none !important; }`;
    rules.push(bp.maxWidth === null ? rule : `@media (max-width: ${bp.maxWidth}px) {\n  ${rule}\n}`);
  }
  return rules.join('\n\n');
}

/**
 * Generates the full scoped stylesheet for one element: base rules first,
 * then each narrower breakpoint as a descending max-width query. This order
 * is load-bearing - each breakpoint+state combination is fully resolved in
 * JS first (via resolveValue), so the emitted CSS is correct by
 * construction rather than depending on the browser's cascade to infer
 * inheritance across breakpoints and states.
 */
export function generateElementCss(
  node: ElementNode,
  enabledBreakpoints: BreakpointId[],
  tokens: TokenMap = {}
): string {
  const orderedEnabled = BREAKPOINTS.filter((b) => enabledBreakpoints.includes(b.id));
  const blocks: string[] = [];

  for (const bp of orderedEnabled) {
    const bpBlocks: string[] = [];
    for (const state of OFFERED_STATES) {
      const decls = collectDeclarations(node.design, node.advanced, bp.id, state, tokens);
      const block = declsToCssBlock(stateSelector(node.id, state), decls);
      if (block) bpBlocks.push(block);
    }
    if (bpBlocks.length === 0) continue;

    if (bp.maxWidth === null) {
      blocks.push(bpBlocks.join('\n'));
    } else {
      const indented = bpBlocks.join('\n').split('\n').map((l) => (l ? `  ${l}` : l)).join('\n');
      blocks.push(`@media (max-width: ${bp.maxWidth}px) {\n${indented}\n}`);
    }
  }

  const visibility = visibilityBlock(node.id, node.advanced.hidden);
  if (visibility) blocks.push(visibility);

  if (node.advanced.customCss) {
    const withSelector = node.advanced.customCss.replaceAll(
      CUSTOM_CSS_SELECTOR_KEYWORD,
      elementSelector(node.id)
    );
    blocks.push(withSelector);
  }

  return blocks.join('\n\n');
}

/** Concatenates every element's stylesheet, in document order, for a full-page render (initial editor load, or publish). */
export function generateDocumentCss(
  nodes: Record<string, ElementNode>,
  order: string[],
  enabledBreakpoints: BreakpointId[],
  tokens: TokenMap = {}
): string {
  return order
    .map((id) => nodes[id])
    .filter((n): n is ElementNode => !!n)
    .map((n) => generateElementCss(n, enabledBreakpoints, tokens))
    .filter(Boolean)
    .join('\n\n');
}

/**
 * Minifies a full page's generated CSS for the public render - not used in
 * the editor, where the indented output is easier to read in devtools.
 * Pure-JS (csso, no native binding) deliberately: this runs per-request in
 * the published page's SSR path, which on this project's Cloudflare Workers
 * deploy target can't load a native addon the way a Node build step could.
 * csso silently drops whatever it can't parse rather than erroring, which
 * would be a real risk against a user's raw `customCss` field - so an
 * empty result from non-empty input is treated as a parse casualty and the
 * original, unminified CSS is kept instead of losing their styles.
 */
export function minifyDocumentCss(css: string): string {
  if (!css) return css;
  try {
    const { css: minified } = minifyCss(css);
    return minified || css;
  } catch {
    return css;
  }
}
