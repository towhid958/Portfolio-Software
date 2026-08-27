import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { getSSRAuth } from '@/integrations/supabase/ssr-session.server';

const STAFF_ROLES = ['super_admin', 'admin', 'editor', 'staff'];

export const Route = createFileRoute('/admin')({
  beforeLoad: async ({ location }) => {
    let roles: string[];

    if (typeof window === 'undefined') {
      // SSR: localStorage isn't available here, so fall back to the
      // access-token cookie mirrored by withSessionCookieMirror.
      const auth = await getSSRAuth();
      if (!auth) {
        throw redirect({
          to: '/auth',
          search: { redirect: location.href },
        });
      }
      roles = auth.roles;
    } else {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw redirect({
          to: '/auth',
          search: {
            redirect: location.href,
          },
        });
      }

      // Check for email verification
      if (!session.user.email_confirmed_at) {
        // Sign out and redirect to auth if email not verified
        await supabase.auth.signOut();
        throw redirect({
          to: '/auth',
          search: {
            error: 'Please verify your email address to access the admin portal.',
          },
        });
      }

      // Check for any role that allows admin access
      const { data: roleRows } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id);
      roles = roleRows?.map(r => r.role) ?? [];
    }

    // Only users with an assigned staff role may enter the admin area.
    const hasAdminAccess = roles.some(r => STAFF_ROLES.includes(r));

    if (!hasAdminAccess) {
      throw redirect({ to: '/dashboard' });
    }

    // Protection for sensitive administrative routes (Activity Logs, etc.)
    const sensitiveRoutes = ['/admin/activity-logs', '/admin/users', '/admin/settings', '/admin/webhooks'];
    if (sensitiveRoutes.some(path => location.pathname.startsWith(path))) {
      const isSuperAdmin = roles.includes('super_admin');
      if (!isSuperAdmin) {
        throw redirect({ to: '/admin' });
      }
    }

    // Expose the already-resolved roles to child routes via context, so
    // their own beforeLoad checks (e.g. "editors only" on a specific form)
    // don't need to re-resolve the session themselves - doing that with
    // the client-only supabase.auth.getSession() call is exactly what was
    // causing those routes to log the user out on every page refresh.
    return { roles };
  },
  component: AdminLayoutWrapper,
});

function AdminLayoutWrapper() {
  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  );
}
