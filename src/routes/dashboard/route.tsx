import { createFileRoute, redirect, useRouter, Link, Outlet } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { 
  Loader2, 
  AlertCircle, 
  ShieldAlert,
  LayoutDashboard, 
  FileText, 
  Settings, 
  LogOut, 
  CreditCard, 
  LifeBuoy, 
  UserCircle,
  Briefcase,
  CheckSquare,
  MessageSquare,
  ShoppingBag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSSRAuth, getSSRSupabaseClient } from '@/integrations/supabase/ssr-session.server';
import { getRequireEmailVerification } from '@/lib/public-site-config.functions';
import { NotificationBell } from '@/components/admin/NotificationBell';

const STAFF_ROLES = ['super_admin', 'admin', 'editor', 'staff'];

// Maps a client_portal_settings.feature_key to the dashboard route it gates.
// A client_tasks page has no matching feature_key (only 'projects',
// 'documents', 'billing', 'support', 'messaging' are seeded in Settings >
// Client Portal), so /dashboard/tasks is intentionally always available.
const FEATURE_ROUTES: Record<string, string> = {
  projects: '/dashboard/projects',
  documents: '/dashboard/documents',
  billing: '/dashboard/billing',
  support: '/dashboard/support',
  messaging: '/dashboard/messages',
};

export const Route = createFileRoute('/dashboard')({
  beforeLoad: async ({ location }) => {
    let roles: string[];
    let portalFeatures: Record<string, boolean> = {};

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

      const ssrClient = getSSRSupabaseClient();
      if (ssrClient) {
        const { data: features } = await ssrClient.from('client_portal_settings').select('feature_key, is_enabled');
        portalFeatures = Object.fromEntries((features ?? []).map((f) => [f.feature_key, f.is_enabled ?? true]));
      }
    } else {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Auth check failed:', error);
        throw error;
      }

      if (!session) {
        throw redirect({
          to: '/auth',
          search: {
            redirect: location.href
          }
        });
      }

      // Check for email verification - cheap local check first so the
      // config round-trip only happens for an actually-unconfirmed
      // session. Gated on Settings > Account > "Require email
      // verification" (site_configuration.require_email_verification),
      // defaulting to on.
      if (!session.user.email_confirmed_at && (await getRequireEmailVerification())) {
        // Sign out and redirect to auth if email not verified
        await supabase.auth.signOut();
        throw redirect({
          to: '/auth',
          search: {
            error: 'Please verify your email address to access the portal.',
          },
        });
      }

      const { data: roleRows } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id);
      roles = roleRows?.map(r => r.role) ?? [];

      const { data: features } = await supabase.from('client_portal_settings').select('feature_key, is_enabled');
      portalFeatures = Object.fromEntries((features ?? []).map((f) => [f.feature_key, f.is_enabled ?? true]));
    }

    // The client dashboard is for client accounts only - staff/admin
    // accounts belong in /admin, so they never share a login "view" with
    // clients even though both can authenticate through the same form.
    const hasAdminAccess = roles.some(r => STAFF_ROLES.includes(r));
    if (hasAdminAccess) {
      throw redirect({ to: '/admin' });
    }

    // Settings > Client Portal toggles (client_portal_settings) previously had
    // no consumer - disabling a feature there had zero effect on the client
    // dashboard. Block direct navigation to a disabled feature's route here;
    // the nav itself is filtered in DashboardLayout below using the same data.
    for (const [featureKey, routePath] of Object.entries(FEATURE_ROUTES)) {
      if (portalFeatures[featureKey] === false && location.pathname.startsWith(routePath)) {
        throw redirect({ to: '/dashboard' });
      }
    }

    return { portalFeatures };
  },
  pendingComponent: () => (
    <div className="flex min-h-screen items-center justify-center bg-muted/30">
      <div className="flex flex-col items-center gap-4 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <div className="space-y-1">
          <p className="text-lg font-semibold">Verifying Session</p>
          <p className="text-sm text-muted-foreground italic">Securing your workspace...</p>
        </div>
      </div>
    </div>
  ),
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="flex justify-center">
            <div className="rounded-full bg-destructive/10 p-6">
              <ShieldAlert className="h-12 w-12 text-destructive" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Access Verification Failed</h1>
            <p className="text-muted-foreground">
              We encountered a problem while trying to verify your access credentials. This could be due to a temporary connection issue.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Button 
              onClick={() => {
                router.invalidate();
                reset();
              }}
              className="w-full"
            >
              Retry Authentication
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/'}
              className="w-full"
            >
              Return Home
            </Button>
          </div>
          {process.env['NODE_ENV'] === 'development' && (
            <div className="mt-4 rounded-lg bg-black/5 p-4 text-left">
              <p className="text-xs font-mono text-muted-foreground break-all">
                {error instanceof Error ? error.message : 'Unknown error'}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  },
  component: DashboardLayout,
});

function DashboardLayout() {
  const { portalFeatures } = Route.useRouteContext();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const allNavItems = [
    { to: '/dashboard', label: 'Overview', icon: LayoutDashboard, featureKey: null },
    { to: '/dashboard/orders', label: 'Orders', icon: ShoppingBag, featureKey: null },
    { to: '/dashboard/projects', label: 'Projects', icon: Briefcase, featureKey: 'projects' },
    { to: '/dashboard/tasks', label: 'My Tasks', icon: CheckSquare, featureKey: null },
    { to: '/dashboard/documents', label: 'Documents', icon: FileText, featureKey: 'documents' },
    { to: '/dashboard/messages', label: 'Messages', icon: MessageSquare, featureKey: 'messaging' },
    { to: '/dashboard/billing', label: 'Billing', icon: CreditCard, featureKey: 'billing' },
    { to: '/dashboard/support', label: 'Support', icon: LifeBuoy, featureKey: 'support' },
    { to: '/dashboard/profile', label: 'Account', icon: UserCircle, featureKey: null },
  ];
  const navItems = allNavItems.filter((item) => !item.featureKey || portalFeatures[item.featureKey] !== false);

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="w-64 border-r bg-card flex flex-col fixed inset-y-0 z-50">
        <div className="p-6 border-b">
          <Link to="/" className="text-xl font-bold tracking-tight text-primary">HASAN KAMRUL</Link>
          <p className="text-xs text-muted-foreground mt-1 text-nowrap">Secure Client Portal</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: true, includeSearch: false }}
              activeProps={{ className: "bg-primary text-primary-foreground shadow-sm" }}
              inactiveProps={{ className: "hover:bg-muted" }}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200"
            >
              <item.icon className="h-4 w-4" /> 
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t">
          <Button variant="ghost" className="w-full justify-start gap-3 hover:bg-destructive/10 hover:text-destructive" onClick={handleLogout}>
            <LogOut className="h-4 w-4" /> Logout
          </Button>
        </div>
      </aside>
      <main className="flex-1 pl-64">
        <header className="flex h-16 items-center justify-end border-b bg-card px-8">
          <NotificationBell viewAllPath="/dashboard/notifications" />
        </header>
        <div className="max-w-6xl mx-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}