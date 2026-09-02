import { createFileRoute, redirect } from '@tanstack/react-router';
import { ProjectForm } from '@/components/admin/ProjectForm';
import { resolveCan, type Role } from '@/lib/rbac';

export const Route = createFileRoute('/admin/projects/new')({
  beforeLoad: async ({ context }) => {
    const allowed = resolveCan(context.roles as Role[], context.dbPermissions, 'projects', 'create');
    if (!allowed) {
      throw redirect({ to: '/admin/projects' });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  return <ProjectForm />;
}
