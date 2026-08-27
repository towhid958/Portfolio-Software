import { createFileRoute, redirect } from '@tanstack/react-router';

// /admin/blog/[slug] is the "front view" - it forwards to the public post
// page. Editing lives at /admin/blog/edit/[slug].
export const Route = createFileRoute('/admin/blog/$postSlug')({
  beforeLoad: async ({ params }) => {
    throw redirect({ to: '/blog/$slug', params: { slug: params.postSlug } });
  },
});
