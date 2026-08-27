import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { ServiceForm } from '@/components/admin/ServiceForm';

export const Route = createFileRoute('/admin/services/edit/$serviceSlug')({
  beforeLoad: async ({ context }) => {
    const allowed = context.roles.some((r) => ['super_admin', 'admin', 'editor'].includes(r));
    if (!allowed) {
      throw redirect({ to: '/admin/services' });
    }
  },
  component: EditService,
});

function EditService() {
  const { serviceSlug } = Route.useParams();
  const navigate = useNavigate();

  const { data: service, isLoading } = useQuery({
    queryKey: ['admin-service', serviceSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select(`
          *,
          package_links:service_packages_link(gig_id)
        `)
        .eq('slug', serviceSlug)
        .single();

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading service...</div>;
  if (!service) return <div className="p-8 text-center">Service not found.</div>;

  const initialData = {
    ...service,
    package_ids: (service as any).package_links?.map((l: any) => l.gig_id) || []
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Edit Service</h2>
      </div>
      <ServiceForm
        initialData={initialData}
        onSuccess={() => navigate({ to: '/admin/services' })}
      />
    </div>
  );
}
