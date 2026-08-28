import { createFileRoute, redirect } from '@tanstack/react-router';
import { EditorShell } from '@/components/admin/builder/EditorShell';

export const Route = createFileRoute('/admin/pages/new')({
  beforeLoad: async ({ context }) => {
    const allowed = context.roles.some((r) => ['super_admin', 'admin', 'editor'].includes(r));
    if (!allowed) {
      throw redirect({ to: '/admin/pages' });
    }
  },
  component: () => <EditorShell page={null} />,
});
