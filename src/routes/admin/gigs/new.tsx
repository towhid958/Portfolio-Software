import { createFileRoute, redirect } from '@tanstack/react-router'
import { supabase } from '@/integrations/supabase/client';
import { resolveCan, type Role } from '@/lib/rbac';

export const Route = createFileRoute('/admin/gigs/new')({
  beforeLoad: async ({ context }) => {
    const allowed = resolveCan(context.roles as Role[], context.dbPermissions, 'gigs', 'create');
    if (!allowed) {
      throw redirect({ to: '/admin/gigs' });
    }
  },
  component: RouteComponent,
})

import { GigForm } from '@/components/admin/GigForm';

function RouteComponent() {
  return <GigForm />
}
