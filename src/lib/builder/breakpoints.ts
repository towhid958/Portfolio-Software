export type BreakpointId = 'desktop' | 'laptop' | 'tablet' | 'mobileLarge' | 'mobile';

export interface BreakpointDef {
  id: BreakpointId;
  label: string;
  /** null = no max-width (the base, no-media-query rules). */
  maxWidth: number | null;
  defaultEnabled: boolean;
}

// Ordered widest to narrowest - this order IS the inheritance chain used by
// resolveValue: a narrower breakpoint with no explicit value falls back to
// the next entry towards the front of this array.
export const BREAKPOINTS: BreakpointDef[] = [
  { id: 'desktop', label: 'Desktop', maxWidth: null, defaultEnabled: true },
  { id: 'laptop', label: 'Laptop', maxWidth: 1366, defaultEnabled: false },
  { id: 'tablet', label: 'Tablet', maxWidth: 1024, defaultEnabled: true },
  { id: 'mobileLarge', label: 'Large Mobile', maxWidth: 767, defaultEnabled: false },
  { id: 'mobile', label: 'Mobile', maxWidth: 479, defaultEnabled: true },
];

export const DEFAULT_BREAKPOINT: BreakpointId = 'desktop';

export function getBreakpointDef(id: BreakpointId): BreakpointDef {
  const def = BREAKPOINTS.find((b) => b.id === id);
  if (!def) throw new Error(`Unknown breakpoint: ${id}`);
  return def;
}

// From the given breakpoint back to (and including) desktop - the order
// resolveValue walks when a value is missing at the requested breakpoint.
export function getBreakpointChain(from: BreakpointId): BreakpointId[] {
  const index = BREAKPOINTS.findIndex((b) => b.id === from);
  return BREAKPOINTS.slice(0, index + 1)
    .reverse()
    .map((b) => b.id);
}

export const ENABLED_BREAKPOINTS: BreakpointId[] = BREAKPOINTS.filter((b) => b.defaultEnabled).map((b) => b.id);
