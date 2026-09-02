import { createFileRoute, redirect } from '@tanstack/react-router'
import { supabase } from '@/integrations/supabase/client';
import { resolveCan, type Role } from '@/lib/rbac';

export const Route = createFileRoute('/admin/partners/new')({
  beforeLoad: async ({ context }) => {
    const allowed = resolveCan(context.roles as Role[], context.dbPermissions, 'partners', 'create');
    if (!allowed) {
      throw redirect({ to: '/admin/partners' });
    }
  },
  component: RouteComponent,
})

import { PartnerForm } from '@/components/admin/PartnerForm';

function RouteComponent() {
  return <PartnerForm />
}
