import { useMemo, useState, useEffect } from 'react';

// Shared client-side pagination for admin list pages, most of which fetch
// their full result set in one query rather than paging at the DB level.
export function usePagination<T>(items: T[] | undefined, pageSize = 20) {
  const [page, setPage] = useState(1);
  const total = items?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Reset to page 1 whenever the filtered set shrinks below the current page
  // (e.g. a new search term), so the view never renders an empty out-of-range page.
  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [totalPages, page]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return (items ?? []).slice(start, start + pageSize);
  }, [items, page, pageSize]);

  return { pageItems, page, setPage, totalPages, total, pageSize };
}
