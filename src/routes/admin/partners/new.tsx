import { createFileRoute, redirect } from '@tanstack/react-router'
import { supabase } from '@/integrations/supabase/client';

export const Route = createFileRoute('/admin/partners/new')({
  beforeLoad: async ({ context }) => {
    const allowed = context.roles.some((r) => ['super_admin', 'admin', 'editor'].includes(r));
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
