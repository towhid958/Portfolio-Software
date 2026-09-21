import Stripe from 'stripe';

/**
 * The Stripe API version this codebase is written against.
 *
 * The installed SDK types `apiVersion` as `LatestApiVersion` - a single
 * string literal for whatever version that release ships with - so pinning
 * any older version is a type error by construction. Pinning deliberately
 * is the whole point (an account-level version bump must not silently
 * change request/response shapes under us), so the cast stays, but it is
 * made exactly once here instead of at each `new Stripe(...)` call site.
 *
 * Raising this means re-reading Stripe's upgrade notes, not just editing
 * the string.
 */
export const STRIPE_API_VERSION = '2025-02-11.acacia' as Stripe.LatestApiVersion;

/** Every server-side Stripe client goes through here, so the pin holds. */
export function createStripeClient(secretKey: string): Stripe {
  return new Stripe(secretKey, { apiVersion: STRIPE_API_VERSION });
}
