import { lengthToCss, boxToCss, shadowToCss, type ColorValue, type TypographyValue } from './valueTypes';

/**
 * Every custom property a widget's root element reads. Generated stylesheets
 * only ever set these variables - never other CSS properties directly - so
 * this list plus BASE_ELEMENT_CSS is the single fixed contract between the
 * style generator and widget markup.
 */
export const EL_VARS = {
  display: '--el-display',
  flexDirection: '--el-flex-direction',
  flexWrap: '--el-flex-wrap',
  justifyContent: '--el-justify-content',
  alignItems: '--el-align-items',
  gap: '--el-gap',
  rowGap: '--el-row-gap',
  columnGap: '--el-column-gap',
  alignSelf: '--el-align-self',
  gridTemplateColumns: '--el-grid-template-columns',
  bgColor: '--el-bg-color',
  bgImage: '--el-bg-image',
  bgSize: '--el-bg-size',
  bgPosition: '--el-bg-position',
  bgRepeat: '--el-bg-repeat',
  /** Read by the real .builder-el-overlay child div ElementRenderer inserts, not by .builder-el itself. */
  overlayColor: '--el-overlay-color',
  overlayImage: '--el-overlay-image',
  overlaySize: '--el-overlay-size',
  overlayPosition: '--el-overlay-position',
  overlayRepeat: '--el-overlay-repeat',
  overlayOpacity: '--el-overlay-opacity',
  textColor: '--el-text-color',
  /** Gradient text mode only - see the comment on the .builder-el rule below. */
  textGradientImage: '--el-text-gradient-image',
  textFillClip: '--el-text-fill-clip',
  /** Only ever set to 'inline-block' in gradient text mode - see textFillLayer's comment in styleGenerator.ts. Unset (revert) the rest of the time, so .builder-el-text doesn't force a display the underlying tag never asked for. */
  textDisplay: '--el-text-display',
  textFillColor: '--el-text-fill-color',
  textAlign: '--el-text-align',
  textShadow: '--el-text-shadow',
  whiteSpace: '--el-white-space',
  fontFamily: '--el-font-family',
  fontSize: '--el-font-size',
  fontWeight: '--el-font-weight',
  textTransform: '--el-text-transform',
  fontStyle: '--el-font-style',
  textDecoration: '--el-text-decoration',
  lineHeight: '--el-line-height',
  letterSpacing: '--el-letter-spacing',
  wordSpacing: '--el-word-spacing',
  borderTopStyle: '--el-border-top-style',
  borderTopWidth: '--el-border-top-width',
  borderTopColor: '--el-border-top-color',
  borderRightStyle: '--el-border-right-style',
  borderRightWidth: '--el-border-right-width',
  borderRightColor: '--el-border-right-color',
  borderBottomStyle: '--el-border-bottom-style',
  borderBottomWidth: '--el-border-bottom-width',
  borderBottomColor: '--el-border-bottom-color',
  borderLeftStyle: '--el-border-left-style',
  borderLeftWidth: '--el-border-left-width',
  borderLeftColor: '--el-border-left-color',
  borderRadius: '--el-border-radius',
  boxShadow: '--el-box-shadow',
  margin: '--el-margin',
  padding: '--el-padding',
  width: '--el-width',
  minWidth: '--el-min-width',
  maxWidth: '--el-max-width',
  height: '--el-height',
  minHeight: '--el-min-height',
  maxHeight: '--el-max-height',
  position: '--el-position',
  top: '--el-top',
  right: '--el-right',
  bottom: '--el-bottom',
  left: '--el-left',
  zIndex: '--el-z-index',
  opacity: '--el-opacity',
  overflowX: '--el-overflow-x',
  overflowY: '--el-overflow-y',
  transform: '--el-transform',
  filter: '--el-filter',
  transition: '--el-transition',
  cursor: '--el-cursor',
  mixBlendMode: '--el-mix-blend-mode',
  /** Read by the .builder-icon-shape wrapper (Icon/Icon List), not .builder-el itself. */
  iconColor: '--el-icon-color',
  iconSize: '--el-icon-size',
  iconBg: '--el-icon-bg',
  iconBorderWidth: '--el-icon-border-width',
  iconBorderColor: '--el-icon-border-color',
  iconRadius: '--el-icon-radius',
  iconPadding: '--el-icon-padding',
  iconItemGap: '--el-icon-item-gap',
  iconTextGap: '--el-icon-text-gap',
  iconTransition: '--el-icon-transition',
  /** Read directly via inline style on the Nav widget's own root, same as the icon gap vars - no dedicated CSS class needed for a single property. */
  navItemGap: '--el-nav-item-gap',
  /** Read by the .builder-anim-* rules below, keyed off the element's own advanced.entranceAnimation - see AdvancedProperties. */
  entranceDuration: '--el-entrance-duration',
  entranceDelay: '--el-entrance-delay',
} as const;

/**
 * The fixed declarations every widget root carries, reading the variables
 * above. This is what makes a mobile font-size override or a hover colour
 * work from the same stored data - the generated stylesheet only ever
 * changes the variable, never these rules.
 *
 * position defaults to relative (not static) so every element is a valid
 * containing block for the absolutely-positioned overlay/video children
 * ElementRenderer inserts - relative with no offsets is visually identical
 * to static, so this doesn't change anyone's layout. An explicit Position
 * value from the Advanced panel still overrides it.
 */
export const BASE_ELEMENT_CSS = `
.builder-el {
  display: var(${EL_VARS.display}, block);
  flex-direction: var(${EL_VARS.flexDirection}, row);
  flex-wrap: var(${EL_VARS.flexWrap}, nowrap);
  justify-content: var(${EL_VARS.justifyContent}, normal);
  align-items: var(${EL_VARS.alignItems}, normal);
  row-gap: var(${EL_VARS.rowGap}, var(${EL_VARS.gap}, 0));
  column-gap: var(${EL_VARS.columnGap}, var(${EL_VARS.gap}, 0));
  align-self: var(${EL_VARS.alignSelf}, auto);
  grid-template-columns: var(${EL_VARS.gridTemplateColumns}, none);
  background-color: var(${EL_VARS.bgColor}, transparent);
  background-image: var(${EL_VARS.bgImage}, none);
  background-size: var(${EL_VARS.bgSize}, auto);
  background-position: var(${EL_VARS.bgPosition}, 0 0);
  background-repeat: var(${EL_VARS.bgRepeat}, repeat);
  color: var(${EL_VARS.textColor}, var(--color-foreground));
  text-align: var(${EL_VARS.textAlign}, left);
  text-shadow: var(${EL_VARS.textShadow}, none);
  white-space: var(${EL_VARS.whiteSpace}, normal);
  font-family: var(${EL_VARS.fontFamily}, var(--font-sans));
  font-size: var(${EL_VARS.fontSize}, medium);
  font-weight: var(${EL_VARS.fontWeight}, normal);
  text-transform: var(${EL_VARS.textTransform}, none);
  font-style: var(${EL_VARS.fontStyle}, normal);
  text-decoration: var(${EL_VARS.textDecoration}, none);
  line-height: var(${EL_VARS.lineHeight}, normal);
  letter-spacing: var(${EL_VARS.letterSpacing}, normal);
  word-spacing: var(${EL_VARS.wordSpacing}, normal);
  border-top-style: var(${EL_VARS.borderTopStyle}, none);
  border-top-width: var(${EL_VARS.borderTopWidth}, 0);
  border-top-color: var(${EL_VARS.borderTopColor}, transparent);
  border-right-style: var(${EL_VARS.borderRightStyle}, none);
  border-right-width: var(${EL_VARS.borderRightWidth}, 0);
  border-right-color: var(${EL_VARS.borderRightColor}, transparent);
  border-bottom-style: var(${EL_VARS.borderBottomStyle}, none);
  border-bottom-width: var(${EL_VARS.borderBottomWidth}, 0);
  border-bottom-color: var(${EL_VARS.borderBottomColor}, transparent);
  border-left-style: var(${EL_VARS.borderLeftStyle}, none);
  border-left-width: var(${EL_VARS.borderLeftWidth}, 0);
  border-left-color: var(${EL_VARS.borderLeftColor}, transparent);
  border-radius: var(${EL_VARS.borderRadius}, 0);
  box-shadow: var(${EL_VARS.boxShadow}, none);
  margin: var(${EL_VARS.margin}, 0);
  padding: var(${EL_VARS.padding}, 0);
  width: var(${EL_VARS.width}, auto);
  min-width: var(${EL_VARS.minWidth}, 0);
  max-width: var(${EL_VARS.maxWidth}, none);
  height: var(${EL_VARS.height}, auto);
  min-height: var(${EL_VARS.minHeight}, 0);
  max-height: var(${EL_VARS.maxHeight}, none);
  position: var(${EL_VARS.position}, relative);
  top: var(${EL_VARS.top}, auto);
  right: var(${EL_VARS.right}, auto);
  bottom: var(${EL_VARS.bottom}, auto);
  left: var(${EL_VARS.left}, auto);
  z-index: var(${EL_VARS.zIndex}, auto);
  opacity: var(${EL_VARS.opacity}, 1);
  overflow-x: var(${EL_VARS.overflowX}, visible);
  overflow-y: var(${EL_VARS.overflowY}, visible);
  transform: var(${EL_VARS.transform}, none);
  filter: var(${EL_VARS.filter}, none);
  transition: var(${EL_VARS.transition}, none);
  cursor: var(${EL_VARS.cursor}, auto);
  mix-blend-mode: var(${EL_VARS.mixBlendMode}, normal);
  /* Scopes z-index below to this element's own children (see
     .builder-el-overlay/.builder-el-video) rather than the page's shared
     stacking context - isolate has no visual effect of its own, unlike the
     opacity/transform tricks sometimes used for the same purpose. */
  isolation: isolate;
}

/**
 * Wraps the actual rendered text (see HeadingWidget etc.) - separate from
 * .builder-el itself so gradient text doesn't fight the widget's own box
 * background for the background-image property, and so the gradient is
 * sized against the text's own shrink-to-fit box rather than the widget's
 * full block-level width (which is usually much wider than short text,
 * making the gradient look wrong or barely visible). In solid-colour mode
 * (by far the common case) every one of these is a no-op:
 * --el-text-gradient-image is 'none', --el-text-fill-clip is 'border-box',
 * --el-text-fill-color is 'currentcolor', and - the important one -
 * --el-text-display is unset, so the CSS 'revert' keyword hands display
 * back to whatever the underlying tag's own default is (block for a div or
 * h2, inline for a span) instead of forcing inline-block on every text
 * wrapper regardless of context. That blanket inline-block used to be
 * unconditional, and broke anything that depends on its own real display
 * value - table th/td losing table-cell being the concrete case that
 * surfaced it.
 */
.builder-el-text {
  display: var(${EL_VARS.textDisplay}, revert);
  max-width: 100%;
  background-image: var(${EL_VARS.textGradientImage}, none);
  -webkit-background-clip: var(${EL_VARS.textFillClip}, border-box);
  background-clip: var(${EL_VARS.textFillClip}, border-box);
  -webkit-text-fill-color: var(${EL_VARS.textFillColor}, currentcolor);
}

/**
 * Wraps an icon glyph (Icon widget, each Icon List item) - a separate class
 * from .builder-el itself so an icon's own color/shape can carry a hover
 * state independently of the widget root's own Background/Border groups
 * (which still mean "the whole widget's outer box", same as ever). border
 * is unconditionally solid; --el-icon-border-width stays 0 for the
 * 'default'/'stacked' views, so there's nothing to see either way.
 */
.builder-icon-shape {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(${EL_VARS.iconColor}, currentcolor);
  background-color: var(${EL_VARS.iconBg}, transparent);
  border-style: solid;
  border-width: var(${EL_VARS.iconBorderWidth}, 0);
  border-color: var(${EL_VARS.iconBorderColor}, transparent);
  border-radius: var(${EL_VARS.iconRadius}, 0);
  padding: var(${EL_VARS.iconPadding}, 0);
  transition: var(${EL_VARS.iconTransition}, none);
}

.builder-el-overlay {
  position: absolute;
  inset: 0;
  /* A positioned element paints ABOVE static in-flow content regardless of
     DOM order (a CSS 2.1 stacking rule) - pointer-events:none only stops
     clicks, not painting, so without a negative z-index this covered every
     widget's real content (text, children...) whenever an overlay/video was
     set. Negative places it behind in-flow content but still above this
     element's own background/border, which combined with the isolation
     above (scoping that comparison to this element rather than the whole
     page) is exactly "a layer between this element's background and its
     content". */
  z-index: -1;
  pointer-events: none;
  border-radius: inherit;
  background-color: var(${EL_VARS.overlayColor}, transparent);
  background-image: var(${EL_VARS.overlayImage}, none);
  background-size: var(${EL_VARS.overlaySize}, cover);
  background-position: var(${EL_VARS.overlayPosition}, center);
  background-repeat: var(${EL_VARS.overlayRepeat}, no-repeat);
  opacity: var(${EL_VARS.overlayOpacity}, 1);
}

.builder-el-video {
  position: absolute;
  inset: 0;
  /* Same reasoning as .builder-el-overlay's z-index above - a background
     video has the identical "absolute-positioned layer covers real content"
     problem. */
  z-index: -1;
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
  border-radius: inherit;
}

/**
 * Entrance animations - ElementRenderer adds the builder-anim-<type> class
 * (from advanced.entranceAnimation) plus builder-anim-in the first time the
 * element scrolls into view (see useEntranceReveal), so each of these is
 * "hidden/offset starting state" + "revealed end state" pair driven by a
 * plain class toggle rather than a keyframe animation - simpler to trigger
 * once from JS and to reason about.
 *
 * Wrapped in prefers-reduced-motion: no-preference so a user who's asked
 * their OS for reduced motion never gets the hidden starting state at all -
 * content just renders normally, immediately, with no dependency on JS
 * ever running to reveal it.
 */
@media (prefers-reduced-motion: no-preference) {
  [class*="builder-anim-"] {
    transition-duration: var(${EL_VARS.entranceDuration}, 600ms);
    transition-delay: var(${EL_VARS.entranceDelay}, 0ms);
    transition-timing-function: ease-out;
  }
  .builder-anim-fade-in { opacity: 0; transition-property: opacity; }
  .builder-anim-slide-up { opacity: 0; transform: translateY(24px); transition-property: opacity, transform; }
  .builder-anim-slide-down { opacity: 0; transform: translateY(-24px); transition-property: opacity, transform; }
  .builder-anim-slide-left { opacity: 0; transform: translateX(24px); transition-property: opacity, transform; }
  .builder-anim-slide-right { opacity: 0; transform: translateX(-24px); transition-property: opacity, transform; }
  .builder-anim-zoom-in { opacity: 0; transform: scale(0.92); transition-property: opacity, transform; }

  .builder-anim-in {
    opacity: 1 !important;
    transform: none !important;
  }
}

/**
 * Nav widget's opt-in "Collapse to Menu on Mobile" (see NavWidget.tsx) - a
 * fixed 768px breakpoint independent of the per-element design breakpoint
 * system above (BREAKPOINTS in breakpoints.ts), since this is a structural
 * show/hide of two fixed pieces (toggle button vs. item list), not a
 * per-property value that editor's own device-preview/Advanced panel needs
 * to reach. Only ever applied when the widget opts in via the
 * .builder-nav-mobile class, so a Nav widget that doesn't use it renders
 * identically to before this existed.
 */
.builder-nav-toggle {
  display: none;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: inherit;
}
.builder-nav-items {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: var(--builder-nav-justify, flex-start);
}
@media (max-width: 768px) {
  .builder-nav-mobile .builder-nav-toggle {
    display: inline-flex;
  }
  .builder-nav-mobile .builder-nav-items {
    display: none;
    width: 100%;
  }
  .builder-nav-mobile .builder-nav-items.is-open {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-start;
    gap: 12px;
  }
}
`.trim();

export function resolveColorCss(color: ColorValue | undefined, tokens: Record<string, string> = {}): string | undefined {
  if (!color) return undefined;
  if (color.type === 'token') return tokens[color.value] ?? color.value;
  return color.value;
}

/** Mirrors resolveColorCss for TypographyValue's own token indirection - see ThemeSettings in theme.ts for where the `fonts` map comes from. */
export function resolveFontFamilyCss(typography: TypographyValue | undefined, fonts: Record<string, string> = {}): string | undefined {
  if (!typography) return undefined;
  if (typography.type === 'token' && typography.tokenId) return fonts[typography.tokenId] ?? typography.fontFamily;
  return typography.fontFamily;
}

export { lengthToCss, boxToCss, shadowToCss };
