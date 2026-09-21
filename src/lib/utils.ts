import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Cycles a non-empty list, e.g. to rotate a fixed palette across however many
 * items a query returns. The modulo already guarantees a hit, but indexing by
 * a computed number is `T | undefined` under noUncheckedIndexedAccess; falling
 * back to element 0 (which the tuple type proves exists) keeps this honest
 * without a non-null assertion at the call site.
 */
export function cycle<T>(items: readonly [T, ...T[]], index: number): T {
  return items[index % items.length] ?? items[0];
}

/**
 * Narrows a caught value to a displayable message.
 *
 * Catch clauses were typed `any` across the app, which is unsound - a throw
 * can be any value, so `error.message` silently produces `undefined` for a
 * non-Error and renders "undefined" in a toast. Supabase/PostgREST errors are
 * plain objects rather than Error instances, so the object branch matters.
 */
export function getErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error) return error;
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message) return message;
  }
  return fallback;
}
