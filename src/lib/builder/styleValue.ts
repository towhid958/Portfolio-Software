import { type BreakpointId, getBreakpointChain } from './breakpoints';

export type StateId = 'normal' | 'hover' | 'focus' | 'active';
export const STATES: StateId[] = ['normal', 'hover', 'focus', 'active'];
export const DEFAULT_STATE: StateId = 'normal';

/**
 * A styleable value: breakpoint is the outer dimension, state the inner one.
 * Any key at either level may be absent - that's what "missing" means to
 * resolveValue and hasOwnValue below.
 */
export type StyleValue<T> = Partial<Record<BreakpointId, Partial<Record<StateId, T>>>>;

/**
 * What actually applies at a given breakpoint + state: walk breakpoints from
 * the requested one outward to desktop (the outer dimension), and at each
 * breakpoint tried, prefer the requested state but fall back to that same
 * breakpoint's 'normal' before moving further out (the inner dimension).
 */
export function resolveValue<T>(
  value: StyleValue<T> | undefined,
  breakpoint: BreakpointId,
  state: StateId
): T | undefined {
  if (!value) return undefined;
  for (const bp of getBreakpointChain(breakpoint)) {
    const atBreakpoint = value[bp];
    if (!atBreakpoint) continue;
    if (state !== 'normal' && atBreakpoint[state] !== undefined) return atBreakpoint[state];
    if (atBreakpoint.normal !== undefined) return atBreakpoint.normal;
  }
  return undefined;
}

/**
 * Whether this exact breakpoint (no inheritance) holds an explicit value for
 * this exact state (no falling back to normal) - used to show which controls
 * are overridden on the current device/state and offer to reset them.
 */
export function hasOwnValue<T>(value: StyleValue<T> | undefined, breakpoint: BreakpointId, state: StateId): boolean {
  return value?.[breakpoint]?.[state] !== undefined;
}

export function setValue<T>(
  value: StyleValue<T> | undefined,
  breakpoint: BreakpointId,
  state: StateId,
  newValue: T
): StyleValue<T> {
  return {
    ...value,
    [breakpoint]: {
      ...value?.[breakpoint],
      [state]: newValue,
    },
  };
}

export function clearValue<T>(
  value: StyleValue<T> | undefined,
  breakpoint: BreakpointId,
  state: StateId
): StyleValue<T> | undefined {
  const atBreakpoint = value?.[breakpoint];
  if (!atBreakpoint || atBreakpoint[state] === undefined) return value;

  const nextStates = { ...atBreakpoint };
  delete nextStates[state];

  const next = { ...value };
  if (Object.keys(nextStates).length > 0) {
    next[breakpoint] = nextStates;
  } else {
    delete next[breakpoint];
  }
  return next;
}

/** A single-value convenience for properties with no per-breakpoint variation (e.g. a boolean flag). */
export function literal<T>(value: T): StyleValue<T> {
  return { desktop: { normal: value } };
}
