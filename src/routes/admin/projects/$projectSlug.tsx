import { createFileRoute, redirect } from '@tanstack/react-router';

// /admin/projects/[slug] is the "front view" - it forwards to the public
// case study page. Editing lives at /admin/projects/edit/[slug].
export const Route = createFileRoute('/admin/projects/$projectSlug')({
  beforeLoad: async ({ params }) => {
    throw redirect({ to: '/projects/$slug', params: { slug: params.projectSlug } });
  },
});
