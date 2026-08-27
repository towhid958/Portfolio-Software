import { useMemo, useState } from 'react';
import type { SortDirection } from '@/components/admin/SortableTableHead';

type SortKey = 'title' | 'created_at';

// Shared sort-by-title/sort-by-created_at behavior for the admin content
// list tables (blog, gigs, projects, services) - toggling the same key
// flips direction, picking a new key starts it ascending.
export function useTitleDateSort<T extends { title: string; created_at: string | null }>(items: T[]) {
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');

  const toggleSort = (key: string) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key as SortKey);
      setSortDir('asc');
    }
  };

  const sorted = useMemo(() => {
    const factor = sortDir === 'asc' ? 1 : -1;
    return [...items].sort((a, b) => {
      if (sortKey === 'title') {
        return a.title.localeCompare(b.title) * factor;
      }
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return (aTime - bTime) * factor;
    });
  }, [items, sortKey, sortDir]);

  return { sorted, sortKey, sortDir, toggleSort };
}
