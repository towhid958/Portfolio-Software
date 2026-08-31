/**
 * Site-wide design tokens (global colors/fonts) - the piece ColorValue's and
 * TypographyValue's `type: 'token'` fields were scaffolded for (see
 * resolveColorCss/resolveFontFamilyCss in cssVars.ts). Stored as one row in
 * the existing, already-migrated, already-RLS'd `site_settings` key/value
 * table (public SELECT, admin-only write) - reusing it instead of a new
 * migration, matching the same reasoning as templateLibrary.ts's choice of
 * localStorage: no new backend surface for a feature that's pure JSON.
 */
export interface ThemeColorToken {
  id: string;
  name: string;
  /** A literal CSS color - a token's own definition is never itself a token reference. */
  value: string;
}

export interface ThemeFontToken {
  id: string;
  name: string;
  /** The literal CSS font-family value, same shape as FontOption.value in fonts.ts. */
  value: string;
  /** Carried over from the FONT_OPTIONS entry this token was set to, if any - see fonts.ts. */
  googleFontQuery?: string;
}

export interface ThemeSettings {
  colors: ThemeColorToken[];
  fonts: ThemeFontToken[];
}

export const SITE_SETTINGS_THEME_KEY = 'builder_theme';

export function defaultThemeSettings(): ThemeSettings {
  return { colors: [], fonts: [] };
}

export function isThemeSettings(value: unknown): value is ThemeSettings {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return Array.isArray(v['colors']) && Array.isArray(v['fonts']);
}

export function themeColorMap(theme: ThemeSettings): Record<string, string> {
  return Object.fromEntries(theme.colors.map((c) => [c.id, c.value]));
}

export function themeFontMap(theme: ThemeSettings): Record<string, string> {
  return Object.fromEntries(theme.fonts.map((f) => [f.id, f.value]));
}
