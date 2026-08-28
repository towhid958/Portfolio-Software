import { supabase } from '@/integrations/supabase/client';

const SLUGGED_TABLES = ['gigs', 'projects', 'blog_posts', 'services', 'pages'] as const;
export type SluggedTable = (typeof SLUGGED_TABLES)[number];

export function slugify(title: string): string {
  return title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
}

// Single existence check used for live validation as the admin types -
// lets the UI show "already taken" before they ever hit Save, instead of
// discovering it from a failed insert afterward. Pass excludeId when
// checking a slug against a row that already exists (editing), so it
// doesn't collide with itself.
export async function isSlugAvailable(
  table: SluggedTable,
  slug: string,
  excludeId?: string
): Promise<boolean> {
  if (!slug) return false;

  let query = supabase.from(table).select('id').eq('slug', slug).limit(1);
  if (excludeId) query = query.neq('id', excludeId);
  const { data, error } = await query;
  if (error) throw error;
  return !data || data.length === 0;
}

// Appends -2, -3, ... to an already-slugified base until it's unique
// within the table. Used only for the auto-generated-from-title slug
// (never for a slug the admin typed themselves - see SlugField), so a
// title collision resolves quietly instead of blocking on an error.
export async function ensureUniqueSlug(
  table: SluggedTable,
  base: string,
  excludeId?: string
): Promise<string> {
  const normalizedBase = base || 'untitled';
  let candidate = normalizedBase;

  for (let suffix = 2; suffix <= 1000; suffix++) {
    const available = await isSlugAvailable(table, candidate, excludeId);
    if (available) return candidate;
    candidate = `${normalizedBase}-${suffix}`;
  }

  // Astronomically unlikely (1000 titles colliding on the same base slug),
  // but fall back to a value guaranteed unique rather than looping forever.
  return `${normalizedBase}-${Date.now()}`;
}

// Friendly message for the residual race-condition case where two people
// save the same slug at the same moment - live validation avoids this for
// the normal case, but the DB's UNIQUE constraint is still the final
// safety net.
export function isSlugConflictError(error: unknown): boolean {
  const err = error as { code?: string; message?: string } | null;
  return err?.code === '23505' && !!err.message?.includes('slug');
}
