import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { ServiceForm } from '@/components/admin/ServiceForm';
import { resolveCan, type Role } from '@/lib/rbac';

export const Route = createFileRoute('/admin/services/new')({
  beforeLoad: async ({ context }) => {
    const allowed = resolveCan(context.roles as Role[], context.dbPermissions, 'gigs', 'create');
    if (!allowed) throw redirect({ to: '/admin/services' });
  },
  component: NewService,
});

function NewService() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">New Service</h2>
      </div>
      <ServiceForm
        initialData={{}}
        onSuccess={() => navigate({ to: '/admin/services' })}
      />
    </div>
  );
}
