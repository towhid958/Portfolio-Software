import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { getSSRAuth } from '@/integrations/supabase/ssr-session.server';
import { mapDbPermissionRows, type DbPermissions } from '@/lib/rbac';
import { getRequireEmailVerification } from '@/lib/public-site-config.functions';

const STAFF_ROLES = ['super_admin', 'admin', 'editor', 'staff'];

export const Route = createFileRoute('/admin')({
  beforeLoad: async ({ location }) => {
    let roles: string[];
    let dbPermissions: DbPermissions;

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

      if (!auth.emailConfirmed && (await getRequireEmailVerification())) {
        throw redirect({
          to: '/auth',
          search: { error: 'Please verify your email address to access the admin portal.' },
        });
      }

      roles = auth.roles;
      dbPermissions = auth.dbPermissions;
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

      // Check for email verification - the cheap local check comes first
      // so the extra round-trip for the config flag only ever happens for
      // an actually-unconfirmed session, not on every admin navigation.
      // Gated on Settings > Account > "Require email verification"
      // (site_configuration.require_email_verification), defaulting to on.
      if (!session.user.email_confirmed_at && (await getRequireEmailVerification())) {
        // Sign out and redirect to auth if email not verified
        await supabase.auth.signOut();
        throw redirect({
          to: '/auth',
          search: {
            error: 'Please verify your email address to access the admin portal.',
          },
        });
      }

      // Check for any role that allows admin access, and the same
      // module_permissions overrides useRBAC reads client-side - fetched
      // once here rather than by every child route's own beforeLoad, and
      // exposed to them via context.dbPermissions (see below).
      const [{ data: roleRows }, { data: permRows }] = await Promise.all([
        supabase.from('user_roles').select('role').eq('user_id', session.user.id),
        supabase.from('module_permissions').select('*'),
      ]);
      roles = roleRows?.map(r => r.role) ?? [];
      dbPermissions = mapDbPermissionRows(permRows ?? []);
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

    // Expose the already-resolved roles (and now dbPermissions, the same
    // module_permissions overrides used above) to child routes via context,
    // so their own beforeLoad checks (e.g. "editors only" on a specific
    // form) don't need to re-resolve the session themselves - doing that
    // with the client-only supabase.auth.getSession() call is exactly what
    // was causing those routes to log the user out on every page refresh.
    // Not a `can` function itself - beforeLoad's return value has to be
    // serializable, and a closure isn't - so a child route calls the same
    // pure resolveCan(context.roles, context.dbPermissions, module, action)
    // from '@/lib/rbac' directly, which is what actually lets a route guard
    // respect the Permissions page's per-role toggles instead of a
    // hardcoded role list frozen at whatever the route was first written with.
    return { roles, dbPermissions };
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
