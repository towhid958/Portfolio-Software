import { createFileRoute, redirect } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { ProjectForm } from '@/components/admin/ProjectForm';
import { resolveCan, type Role } from '@/lib/rbac';

export const Route = createFileRoute('/admin/projects/edit/$projectSlug')({
  beforeLoad: async ({ context }) => {
    const allowed = resolveCan(context.roles as Role[], context.dbPermissions, 'projects', 'edit');
    if (!allowed) {
      throw redirect({ to: '/admin/projects' });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { projectSlug } = Route.useParams();
  const { data: project, isLoading } = useQuery({
    queryKey: ['admin-project', projectSlug],
    queryFn: async () => {
      const { data, error } = await supabase.from('projects').select('*').eq('slug', projectSlug).single();
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading project details...</div>;
  if (!project) return <div className="p-8 text-center">Project not found.</div>;

  return <ProjectForm project={project} />;
}
