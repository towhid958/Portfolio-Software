/** RGBA with r/g/b in 0-255 and a in 0-1, the common currency every conversion below goes through. */
export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/**
 * Parses any CSS colour string this control might be handed - hex (3/4/6/8
 * digit), rgb()/rgba(), 'transparent', or a named colour ('rebeccapurple')
 * - into Rgba. Named colours and any other CSS-valid syntax go through a
 * throwaway DOM element and getComputedStyle, since hand-rolling the full
 * CSS colour grammar (hsl(), named colours, etc.) isn't worth it when the
 * browser already implements it.
 */
export function parseCssColor(input: string | undefined): Rgba | null {
  if (!input) return null;
  const str = input.trim();
  if (!str) return null;
  if (str.toLowerCase() === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };

  const hexMatch = /^#([0-9a-fA-F]{3,8})$/.exec(str);
  if (hexMatch?.[1]) {
    let h = hexMatch[1];
    if (h.length === 3 || h.length === 4) {
      h = h.split('').map((c) => c + c).join('');
    }
    if (h.length !== 6 && h.length !== 8) return null;
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
    return { r, g, b, a };
  }

  const rgbMatch = /^rgba?\(([^)]+)\)$/i.exec(str);
  if (rgbMatch?.[1]) {
    const parts = rgbMatch[1].split(',').map((p) => p.trim());
    if (parts.length < 3) return null;
    const r = parseFloat(parts[0] ?? '');
    const g = parseFloat(parts[1] ?? '');
    const b = parseFloat(parts[2] ?? '');
    const a = parts[3] !== undefined ? parseFloat(parts[3]) : 1;
    if ([r, g, b, a].some((n) => Number.isNaN(n))) return null;
    return { r, g, b, a };
  }

  if (typeof document !== 'undefined') {
    const el = document.createElement('div');
    el.style.color = str;
    if (!el.style.color) return null;
    document.body.appendChild(el);
    const computed = getComputedStyle(el).color;
    document.body.removeChild(el);
    if (computed && computed !== str) return parseCssColor(computed);
  }
  return null;
}

function toHexByte(n: number): string {
  return clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0');
}

/** Solid colours serialize as #rrggbb; anything with transparency as rgba() - both are universally supported and rgba() keeps the alpha human-readable in the text field. */
export function rgbaToCss({ r, g, b, a }: Rgba): string {
  if (a >= 1) return `#${toHexByte(r)}${toHexByte(g)}${toHexByte(b)}`;
  const alpha = Math.round(clamp(a, 0, 1) * 100) / 100;
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${alpha})`;
}

export function rgbaToHex6(v: Rgba): string {
  return `#${toHexByte(v.r)}${toHexByte(v.g)}${toHexByte(v.b)}`;
}

export interface Hsv {
  h: number;
  s: number;
  v: number;
}

export function rgbToHsv(r: number, g: number, b: number): Hsv {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  return { h, s, v: max };
}

export function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

/** Common preset swatches shown under the picker, 'Transparent' first since it's the whole reason a plain <input type=color> wasn't enough. */
export const COLOR_PRESETS: Array<{ label: string; css: string }> = [
  { label: 'Transparent', css: 'transparent' },
  { label: 'White', css: '#ffffff' },
  { label: 'Black', css: '#000000' },
  { label: 'Slate', css: '#64748b' },
  { label: 'Red', css: '#ef4444' },
  { label: 'Orange', css: '#f97316' },
  { label: 'Amber', css: '#f59e0b' },
  { label: 'Emerald', css: '#10b981' },
  { label: 'Teal', css: '#14b8a6' },
  { label: 'Sky', css: '#0ea5e9' },
  { label: 'Indigo', css: '#6366f1' },
  { label: 'Violet', css: '#8b5cf6' },
  { label: 'Pink', css: '#ec4899' },
];
