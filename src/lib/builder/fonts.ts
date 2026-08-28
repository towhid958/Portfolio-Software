import type { ElementNode } from './document';

export interface FontOption {
  label: string;
  /** The literal CSS font-family value stored on TypographyValue.fontFamily. */
  value: string;
  /** Google Fonts css2 family query fragment (e.g. "Poppins:wght@400;600;700") - omitted for fonts that need no loading (system fonts, or Inter/Space Grotesk which the whole site already loads globally in __root.tsx). */
  googleFontQuery?: string;
}

// A curated starting set, not the full Google Fonts catalogue - matches the
// "basic picker" scope used elsewhere in the control library (see
// IconControl). The two site-default fonts are listed with no
// googleFontQuery since __root.tsx already loads them for every page.
//
// This is deliberately the ONE place the font list is defined - a future
// "custom/uploaded fonts" admin setting can extend this same list (e.g. by
// merging DB-stored entries in here) without touching the control or the
// loading logic, both of which just read from FONT_OPTIONS.
export const FONT_OPTIONS: FontOption[] = [
  { label: 'Inter', value: "'Inter', sans-serif" },
  { label: 'Space Grotesk', value: "'Space Grotesk', sans-serif" },
  { label: 'Roboto', value: "'Roboto', sans-serif", googleFontQuery: 'Roboto:wght@400;500;700' },
  { label: 'Open Sans', value: "'Open Sans', sans-serif", googleFontQuery: 'Open+Sans:wght@400;600;700' },
  { label: 'Lato', value: "'Lato', sans-serif", googleFontQuery: 'Lato:wght@400;700' },
  { label: 'Poppins', value: "'Poppins', sans-serif", googleFontQuery: 'Poppins:wght@400;500;600;700' },
  { label: 'Montserrat', value: "'Montserrat', sans-serif", googleFontQuery: 'Montserrat:wght@400;600;700' },
  { label: 'Nunito', value: "'Nunito', sans-serif", googleFontQuery: 'Nunito:wght@400;600;700' },
  { label: 'Work Sans', value: "'Work Sans', sans-serif", googleFontQuery: 'Work+Sans:wght@400;500;700' },
  { label: 'Raleway', value: "'Raleway', sans-serif", googleFontQuery: 'Raleway:wght@400;600;700' },
  { label: 'Playfair Display', value: "'Playfair Display', serif", googleFontQuery: 'Playfair+Display:wght@400;600;700' },
  { label: 'Merriweather', value: "'Merriweather', serif", googleFontQuery: 'Merriweather:wght@400;700' },
  { label: 'Source Serif 4', value: "'Source Serif 4', serif", googleFontQuery: 'Source+Serif+4:wght@400;600;700' },
  { label: 'JetBrains Mono', value: "'JetBrains Mono', monospace", googleFontQuery: 'JetBrains+Mono:wght@400;600' },
  { label: 'System UI', value: 'system-ui, sans-serif' },
  { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Times New Roman', value: "'Times New Roman', serif" },
];

export function buildGoogleFontsHref(queries: string[]): string | null {
  const unique = Array.from(new Set(queries.filter(Boolean)));
  if (unique.length === 0) return null;
  const families = unique.map((q) => `family=${q}`).join('&');
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}

/**
 * Walks every element's typography (all breakpoints/states) and collects the
 * Google Fonts query fragments actually in use, so only fonts this specific
 * document needs get loaded - not the whole curated list on every page.
 */
export function collectUsedGoogleFontQueries(nodes: Record<string, ElementNode>): string[] {
  const used = new Set<string>();
  for (const node of Object.values(nodes)) {
    const byBreakpoint = node.design?.typography;
    if (!byBreakpoint) continue;
    for (const byState of Object.values(byBreakpoint)) {
      if (!byState) continue;
      for (const typography of Object.values(byState)) {
        const option = FONT_OPTIONS.find((f) => f.value === typography?.fontFamily);
        if (option?.googleFontQuery) used.add(option.googleFontQuery);
      }
    }
  }
  return Array.from(used);
}
