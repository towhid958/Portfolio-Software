import { createFileRoute, redirect } from '@tanstack/react-router';

// /admin/services/[slug] is the "front view" - it forwards to the public
// service page. Editing lives at /admin/services/edit/[slug].
export const Route = createFileRoute('/admin/services/$serviceSlug')({
  beforeLoad: async ({ params }) => {
    throw redirect({ to: '/services/$slug', params: { slug: params.serviceSlug } });
  },
});
