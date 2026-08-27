import { createFileRoute, redirect } from '@tanstack/react-router'
import { supabase } from '@/integrations/supabase/client';

export const Route = createFileRoute('/admin/blog/new')({
  beforeLoad: async ({ context }) => {
    const allowed = context.roles.some((r) => ['super_admin', 'admin', 'editor'].includes(r));
    if (!allowed) {
      throw redirect({ to: '/admin/blog' });
    }
  },
  component: RouteComponent,
})

import { BlogForm } from '@/components/admin/BlogForm';

function RouteComponent() {
  return <BlogForm />
}
