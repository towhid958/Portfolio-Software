import { createFileRoute, redirect } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { GigForm } from '@/components/admin/GigForm';
import { supabase } from '@/integrations/supabase/client';
import { resolveCan, type Role } from '@/lib/rbac';

export const Route = createFileRoute('/admin/gigs/edit/$gigSlug')({
  beforeLoad: async ({ context }) => {
    const allowed = resolveCan(context.roles as Role[], context.dbPermissions, 'gigs', 'edit');
    if (!allowed) {
      throw redirect({ to: '/admin/gigs' });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { gigSlug } = Route.useParams();
  const { data: gig, isLoading } = useQuery({
    queryKey: ['admin-gig', gigSlug],
    queryFn: async () => {
      const { data, error } = await supabase.from('gigs').select('*').eq('slug', gigSlug).single();
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading gig details...</div>;
  if (!gig) return <div className="p-8 text-center">Gig not found.</div>;

  return <GigForm gig={gig} />;
}
