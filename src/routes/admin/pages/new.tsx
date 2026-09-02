import { createFileRoute, redirect } from '@tanstack/react-router';
import { EditorShell } from '@/components/admin/builder/EditorShell';
import { resolveCan, type Role } from '@/lib/rbac';

export const Route = createFileRoute('/admin/pages/new')({
  beforeLoad: async ({ context }) => {
    const allowed = resolveCan(context.roles as Role[], context.dbPermissions, 'pages', 'create');
    if (!allowed) {
      throw redirect({ to: '/admin/pages' });
    }
  },
  component: () => <EditorShell page={null} />,
});
