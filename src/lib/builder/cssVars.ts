import { lengthToCss, boxToCss, shadowToCss, type ColorValue } from './valueTypes';

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
}

/**
 * Wraps the actual rendered text (see HeadingWidget etc.) - separate from
 * .builder-el itself so gradient text doesn't fight the widget's own box
 * background for the background-image property, and so the gradient is
 * sized against the text's own shrink-to-fit box rather than the widget's
 * full block-level width (which is usually much wider than short text,
 * making the gradient look wrong or barely visible). In solid-colour mode
 * every one of these is a no-op: --el-text-gradient-image is 'none',
 * --el-text-fill-clip is 'border-box', --el-text-fill-color is
 * 'currentcolor', so the text just inherits color normally.
 */
.builder-el-text {
  display: inline-block;
  max-width: 100%;
  background-image: var(${EL_VARS.textGradientImage}, none);
  -webkit-background-clip: var(${EL_VARS.textFillClip}, border-box);
  background-clip: var(${EL_VARS.textFillClip}, border-box);
  -webkit-text-fill-color: var(${EL_VARS.textFillColor}, currentcolor);
}

.builder-el-overlay {
  position: absolute;
  inset: 0;
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
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
  border-radius: inherit;
}
`.trim();

export function resolveColorCss(color: ColorValue | undefined, tokens: Record<string, string> = {}): string | undefined {
  if (!color) return undefined;
  if (color.type === 'token') return tokens[color.value] ?? color.value;
  return color.value;
}

export { lengthToCss, boxToCss, shadowToCss };
