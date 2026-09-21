/**
 * The shape written into `activity_logs.details` for a `click_offer` event.
 *
 * `details` is an untyped `Json` column, so the public Partners page (writer)
 * and Partner Analytics (reader) previously had no shared contract - the
 * reader reached into it with `as any` at every access. Both sides now import
 * this, so renaming a field breaks the build instead of silently zeroing a
 * chart.
 */
export type OfferClickDetails = {
  offer_id: string;
  offer_title: string;
  partner_name: string;
  destination: string;
  timestamp: string;
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
};

export function asOfferClickDetails(value: unknown): Partial<OfferClickDetails> | null {
  return value && typeof value === 'object' ? (value as Partial<OfferClickDetails>) : null;
}

/** Counts occurrences into a plain tally, used for the traffic-source charts. */
export function tally(keys: Array<string | null | undefined>): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const key of keys) {
    const k = key || 'direct';
    counts[k] = (counts[k] ?? 0) + 1;
  }
  return counts;
}
