import { createFileRoute, redirect } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { PartnerForm } from '@/components/admin/PartnerForm';
import { supabase } from '@/integrations/supabase/client';

export const Route = createFileRoute('/admin/partners/edit/$partnerId')({
  beforeLoad: async ({ context }) => {
    const allowed = context.roles.some((r) => ['super_admin', 'admin', 'editor'].includes(r));
    if (!allowed) {
      throw redirect({ to: '/admin/partners' });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { partnerId } = Route.useParams();
  const { data: partner, isLoading } = useQuery({
    queryKey: ['admin-partner', partnerId],
    queryFn: async () => {
      const { data, error } = await supabase.from('partners').select('*').eq('id', partnerId).single();
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading partner details...</div>;
  if (!partner) return <div className="p-8 text-center">Partner not found.</div>;

  return <PartnerForm partner={partner} />;
}
