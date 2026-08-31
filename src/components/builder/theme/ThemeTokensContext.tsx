import { createContext, useContext, useMemo } from 'react';
import { defaultThemeSettings, themeColorMap, themeFontMap, type ThemeSettings } from '@/lib/builder/theme';

interface ThemeTokensApi {
  theme: ThemeSettings;
  colorMap: Record<string, string>;
  fontMap: Record<string, string>;
  save: (next: ThemeSettings) => void;
  isSaving: boolean;
}

const ThemeTokensCtx = createContext<ThemeTokensApi | null>(null);

// Lets ColorControl/TypographyControl (many layers deep under SettingsPanel)
// read the site's theme tokens without threading a prop through every
// intermediate component - only the editor provides this; the public
// renderer ($slug.tsx) only needs the resolved maps for styleGenerator, not
// these controls, so it never mounts this provider.
export function ThemeTokensProvider({
  theme,
  save,
  isSaving,
  children,
}: {
  theme: ThemeSettings;
  save: (next: ThemeSettings) => void;
  isSaving: boolean;
  children: React.ReactNode;
}) {
  const value = useMemo<ThemeTokensApi>(
    () => ({ theme, colorMap: themeColorMap(theme), fontMap: themeFontMap(theme), save, isSaving }),
    [theme, save, isSaving]
  );
  return <ThemeTokensCtx.Provider value={value}>{children}</ThemeTokensCtx.Provider>;
}

// Safe outside a provider (e.g. a control rendered in a context without one)
// - falls back to an empty theme rather than throwing, since colour/typography
// controls should keep working even before theme data has loaded.
export function useThemeTokens(): ThemeTokensApi {
  const ctx = useContext(ThemeTokensCtx);
  if (ctx) return ctx;
  return { theme: defaultThemeSettings(), colorMap: {}, fontMap: {}, save: () => {}, isSaving: false };
}
