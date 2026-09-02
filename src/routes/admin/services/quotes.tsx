import { createFileRoute, redirect } from '@tanstack/react-router';

// This page used to duplicate Requests & Quotes (src/routes/admin/services/requests.tsx),
// which is a strict superset (same quotes table/search/filter/export/detail-
// link, plus inquiries, sorting, and shareable URL state - see the admin
// audit notes). Kept as a redirect rather than deleted outright so any
// existing bookmark/link to this URL still lands somewhere useful instead
// of 404ing.
export const Route = createFileRoute('/admin/services/quotes')({
  beforeLoad: () => {
    throw redirect({ to: '/admin/services/requests', search: { tab: 'quotes', q: '', status: 'all', sort: 'created_at', dir: 'desc' } });
  },
});
