import { createFileRoute, redirect } from '@tanstack/react-router'
import { supabase } from '@/integrations/supabase/client';

export const Route = createFileRoute('/admin/gigs/new')({
  beforeLoad: async ({ context }) => {
    const allowed = context.roles.some((r) => ['super_admin', 'admin', 'editor'].includes(r));
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
