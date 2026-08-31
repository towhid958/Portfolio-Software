import { SelectControl } from './SelectControl';
import { LengthControl } from './LengthControl';
import type { TypographyValue } from '@/lib/builder/valueTypes';
import { FONT_OPTIONS } from '@/lib/builder/fonts';
import { useThemeTokens } from '@/components/builder/theme/ThemeTokensContext';

const FONT_FAMILY_OPTIONS = FONT_OPTIONS.map((f) => ({ label: f.label, value: f.value }));
// A theme font token is encoded as a synthetic option value ("token:<id>")
// in the SAME dropdown as literal fonts, rather than a separate control -
// keeps font-family a single choice instead of a mode switch. Picking one
// sets TypographyValue.type/tokenId instead of fontFamily; resolved through
// the live theme font map by resolveFontFamilyCss in cssVars.ts, so editing
// the theme's font later updates every element linked to it.
const THEME_FONT_PREFIX = 'token:';
const WEIGHT_OPTIONS = ['400', '500', '600', '700', '800'].map((w) => ({ label: w, value: w }));
const TRANSFORM_OPTIONS = [
  { label: 'None', value: 'none' },
  { label: 'Uppercase', value: 'uppercase' },
  { label: 'Lowercase', value: 'lowercase' },
  { label: 'Capitalize', value: 'capitalize' },
];
const STYLE_OPTIONS = [
  { label: 'Normal', value: 'normal' },
  { label: 'Italic', value: 'italic' },
];
const DECORATION_OPTIONS = [
  { label: 'None', value: 'none' },
  { label: 'Underline', value: 'underline' },
  { label: 'Line-through', value: 'line-through' },
];
const SIZE_UNITS = ['px', 'em', 'rem', '%'] as const;
const SPACING_UNITS = ['px', 'em', 'rem'] as const;

export function TypographyControl({
  value,
  onChange,
}: {
  value: TypographyValue | undefined;
  onChange: (v: TypographyValue) => void;
}) {
  const v: TypographyValue = value ?? { type: 'literal' };
  const { theme } = useThemeTokens();
  const fontFamilyOptions =
    theme.fonts.length > 0
      ? [...theme.fonts.map((f) => ({ label: `${f.name} (theme)`, value: `${THEME_FONT_PREFIX}${f.id}` })), ...FONT_FAMILY_OPTIONS]
      : FONT_FAMILY_OPTIONS;
  const fontFamilySelectValue = v.type === 'token' && v.tokenId ? `${THEME_FONT_PREFIX}${v.tokenId}` : v.fontFamily ?? '';

  return (
    <div className="space-y-2">
      <div>
        <span className="mb-1 block text-[11px] text-muted-foreground">Font family</span>
        <SelectControl
          value={fontFamilySelectValue}
          onChange={(next) => {
            // exactOptionalPropertyTypes forbids assigning `undefined` to
            // fontFamily/tokenId directly - destructure them out instead of
            // overwriting with undefined when switching modes.
            const { fontFamily: _fontFamily, tokenId: _tokenId, ...rest } = v;
            onChange(
              next.startsWith(THEME_FONT_PREFIX)
                ? { ...rest, type: 'token', tokenId: next.slice(THEME_FONT_PREFIX.length) }
                : { ...rest, type: 'literal', fontFamily: next }
            );
          }}
          options={fontFamilyOptions}
          placeholder="Inherit"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <span className="mb-1 block text-[11px] text-muted-foreground">Size</span>
          <LengthControl value={v.fontSize} onChange={(fontSize) => onChange({ ...v, fontSize })} units={[...SIZE_UNITS]} />
        </div>
        <div>
          <span className="mb-1 block text-[11px] text-muted-foreground">Weight</span>
          <SelectControl
            value={v.fontWeight ?? ''}
            onChange={(fontWeight) => onChange({ ...v, fontWeight })}
            options={WEIGHT_OPTIONS}
            placeholder="Inherit"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <span className="mb-1 block text-[11px] text-muted-foreground">Line height</span>
          <LengthControl value={v.lineHeight} onChange={(lineHeight) => onChange({ ...v, lineHeight })} units={[...SIZE_UNITS]} />
        </div>
        <div>
          <span className="mb-1 block text-[11px] text-muted-foreground">Letter spacing</span>
          <LengthControl value={v.letterSpacing} onChange={(letterSpacing) => onChange({ ...v, letterSpacing })} units={[...SPACING_UNITS]} />
        </div>
      </div>
      <div>
        <span className="mb-1 block text-[11px] text-muted-foreground">Word spacing</span>
        <LengthControl value={v.wordSpacing} onChange={(wordSpacing) => onChange({ ...v, wordSpacing })} units={[...SPACING_UNITS]} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <span className="mb-1 block text-[11px] text-muted-foreground">Transform</span>
          <SelectControl
            value={v.textTransform ?? 'none'}
            onChange={(textTransform) =>
              onChange({ ...v, textTransform: textTransform as NonNullable<TypographyValue['textTransform']> })
            }
            options={TRANSFORM_OPTIONS}
          />
        </div>
        <div>
          <span className="mb-1 block text-[11px] text-muted-foreground">Decoration</span>
          <SelectControl
            value={v.textDecoration ?? 'none'}
            onChange={(textDecoration) =>
              onChange({ ...v, textDecoration: textDecoration as NonNullable<TypographyValue['textDecoration']> })
            }
            options={DECORATION_OPTIONS}
          />
        </div>
      </div>
      <div>
        <span className="mb-1 block text-[11px] text-muted-foreground">Style</span>
        <SelectControl
          value={v.fontStyle ?? 'normal'}
          onChange={(fontStyle) => onChange({ ...v, fontStyle: fontStyle as NonNullable<TypographyValue['fontStyle']> })}
          options={STYLE_OPTIONS}
        />
      </div>
    </div>
  );
}
