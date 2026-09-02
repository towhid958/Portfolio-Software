import { createFileRoute, redirect } from '@tanstack/react-router';
import { TestimonialForm } from '@/components/admin/TestimonialForm';
import { resolveCan, type Role } from '@/lib/rbac';

export const Route = createFileRoute('/admin/testimonials/new')({
  beforeLoad: async ({ context }) => {
    const allowed = resolveCan(context.roles as Role[], context.dbPermissions, 'testimonials', 'create');
    if (!allowed) {
      throw redirect({ to: '/admin/testimonials' });
    }
  },
  component: () => <TestimonialForm />,
});
