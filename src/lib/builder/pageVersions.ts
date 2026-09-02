import { supabase } from '@/integrations/supabase/client';

/**
 * One row per publish (not per save) - see the page_versions migration.
 * A lightweight, scoped version of "revision history": a changelog of what
 * actually went live and when, not a snapshot of every edit.
 */
export interface PageVersion {
  id: string;
  sections: unknown;
  title: string;
  createdAt: string;
}

export function pageVersionsQueryKey(pageId: string) {
  return ['page-versions', pageId] as const;
}

export async function fetchPageVersions(pageId: string): Promise<PageVersion[]> {
  const { data, error } = await supabase
    .from('page_versions')
    .select('id, sections, title, created_at')
    .eq('page_id', pageId)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    sections: row.sections,
    title: row.title,
    createdAt: row.created_at ?? new Date().toISOString(),
  }));
}
