import { createFileRoute, redirect } from '@tanstack/react-router';

// /admin/gigs/[slug] is the "front view" - it forwards to the public gig
// page. Editing lives at /admin/gigs/edit/[slug].
export const Route = createFileRoute('/admin/gigs/$gigSlug')({
  beforeLoad: async ({ params }) => {
    throw redirect({ to: '/gigs/$slug', params: { slug: params.gigSlug } });
  },
});
