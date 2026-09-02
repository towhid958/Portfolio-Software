import { createFileRoute, redirect } from '@tanstack/react-router'
import { supabase } from '@/integrations/supabase/client';
import { resolveCan, type Role } from '@/lib/rbac';

export const Route = createFileRoute('/admin/blog/new')({
  beforeLoad: async ({ context }) => {
    const allowed = resolveCan(context.roles as Role[], context.dbPermissions, 'blog', 'create');
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
