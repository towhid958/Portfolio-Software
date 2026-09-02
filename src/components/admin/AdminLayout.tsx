import React from 'react';
import { 
  LayoutDashboard, 
  Bell,
  Briefcase, 
  FolderKanban, 
  FileText, 
  Users, 
  Settings, 
  MessageSquare,
  Package,
  Handshake,
  CreditCard,
  LogOut,
  Mail,
  Menu,
  ChevronLeft,
  Shield,
  Quote,
  ClipboardList,
  UserCircle,
  BarChart2,
  Terminal,
  Image as ImageIcon,
  Activity,
  Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Link, useLocation, useRouter } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { useRBAC } from '@/hooks/useRBAC';
import { NotificationBell } from './NotificationBell';
import { isPageEditorRoute as matchesPageEditorRoute } from '@/lib/builder/editorRoute';

const sidebarItems = [
  { icon: LayoutDashboard, label: 'Dashboard', to: '/admin', module: 'dashboard' },
  { icon: Bell, label: 'Notifications', to: '/admin/notifications' as any, module: 'dashboard' },
  { icon: Users, label: 'Clients', to: '/admin/clients' as any, module: 'clients' },
  { icon: CreditCard, label: 'Orders', to: '/admin/orders', module: 'orders' },
  { icon: FileText, label: 'Invoices', to: '/admin/invoices', module: 'orders' },
  { icon: Briefcase, label: 'Custom Services', to: '/admin/services-custom' as any, module: 'services_custom' },
  { icon: Briefcase, label: 'Standard Services', to: '/admin/services', module: 'gigs' },
  // 'Quote Requests' used to be a separate sidebar item pointing at
  // /admin/services/quotes - that page was a strict subset of this one
  // (quotes only, no inquiries, no sorting/shareable URL state) and now
  // just redirects here, so it no longer needs its own nav entry.
  { icon: ClipboardList, label: 'Requests & Quotes', to: '/admin/services/requests' as any, module: 'gigs' },
  { icon: Package, label: 'Gigs', to: '/admin/gigs', module: 'gigs' },
  { icon: FolderKanban, label: 'Projects', to: '/admin/projects', module: 'projects' },
  { icon: Handshake, label: 'Partners', to: '/admin/partners', module: 'partners' },
  { icon: BarChart2, label: 'Partner Analytics', to: '/admin/partners/analytics', module: 'partners' },
  { icon: FileText, label: 'Blog', to: '/admin/blog', module: 'blog' },
  { icon: Layers, label: 'Pages', to: '/admin/pages' as any, module: 'pages' },
  { icon: MessageSquare, label: 'Team Chat', to: '/admin/chat' as any, module: 'messages' },
  { icon: MessageSquare, label: 'Inquiries Inbox', to: '/admin/messages', module: 'messages' },
  { icon: ImageIcon, label: 'Media Library', to: '/admin/media', module: 'media' },
  { icon: FileText, label: 'Client Documents', to: '/admin/documents', module: 'documents' },
  { icon: Quote, label: 'Testimonials', to: '/admin/testimonials', module: 'testimonials' },
  { icon: UserCircle, label: 'About', to: '/admin/about', module: 'about' },
  { icon: Users, label: 'Users', to: '/admin/users', module: 'users' },
  { icon: Shield, label: 'Permissions', to: '/admin/users/permissions' as any, module: 'users' },
  { icon: Mail, label: 'Email Templates', to: '/admin/settings/email-templates' as any, module: 'settings' },
  { icon: Terminal, label: 'Webhook Logs', to: '/admin/webhooks', module: 'settings' },
  { icon: Activity, label: 'Audit Logs', to: '/admin/activity-logs' as any, module: 'settings' },
  { icon: Settings, label: 'Settings', to: '/admin/settings', module: 'settings' },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [displayName, setDisplayName] = React.useState<string | null>(null);
  const router = useRouter();
  const location = useLocation();
  const { can, roles, userEmail } = useRBAC();

  // The page builder wants the canvas to have as much room as possible - no
  // sidebar competing for width, no header/breadcrumb bar competing for
  // height (the editor already has its own toolbar with a back button and
  // page title, so this outer one is pure redundancy there). Auto-collapses
  // on entry rather than locking the sidebar shut - re-fires only when this
  // boolean itself flips (entering/leaving the editor), so toggling the
  // sidebar back open by hand while still on the page still works normally.
  const isPageEditorRoute = matchesPageEditorRoute(location.pathname);
  React.useEffect(() => {
    setIsCollapsed(isPageEditorRoute);
  }, [isPageEditorRoute]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase.from('profiles').select('full_name').eq('id', session.user.id).single();
      if (!cancelled) setDisplayName(data?.full_name ?? null);
    })();
    return () => { cancelled = true; };
  }, []);

  const pageTitle = React.useMemo(() => {
    const match = sidebarItems
      .filter((item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`))
      .sort((a, b) => b.to.length - a.to.length)[0];
    return match?.label ?? 'Admin';
  }, [location.pathname]);

  const welcomeName = displayName || userEmail?.split('@')[0] || 'there';

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: '/' });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-muted/30">
      {/* Sidebar */}
      <aside 
        className={cn(
          "relative flex flex-col border-r bg-card transition-all duration-300",
          isCollapsed ? "w-20" : "w-64"
        )}
      >
        <div className="flex h-16 items-center justify-between px-4 border-b">
          {!isCollapsed && <span className="text-lg font-bold">Admin Panel</span>}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? <Menu className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </Button>
        </div>
        
        <ScrollArea className="flex-1">
          <nav className="flex flex-col gap-2 p-4">
            {sidebarItems.map((item) => {
              const isSuperAdminOnly = ['users', 'settings'].includes(item.module);
              const isSuperAdmin = roles.includes('super_admin');
              
              let hasPermission = item.module === 'dashboard' || can(item.module, 'view');
              
              if (isSuperAdminOnly && !isSuperAdmin) {
                hasPermission = false;
              }
              
              if (!hasPermission) return null;

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  activeOptions={{ exact: true, includeSearch: false }}
                  activeProps={{ className: "bg-primary text-primary-foreground" }}
                  inactiveProps={{ className: "hover:bg-muted" }}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isCollapsed && "justify-center px-0"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {!isCollapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </nav>
        </ScrollArea>

        <div className="p-4 border-t">
          <Button 
            variant="ghost" 
            className={cn("w-full justify-start gap-3", isCollapsed && "justify-center")}
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
            {!isCollapsed && <span>Logout</span>}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      {isPageEditorRoute ? (
        // No header, no padding - EditorShell fills this exactly and
        // manages its own internal scrolling (left panel, canvas), so
        // there's nothing here for this <main> to scroll either.
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      ) : (
        <main className="flex-1 overflow-y-auto">
          <header className="flex h-16 items-center justify-between border-b bg-card px-8">
            <h1 className="text-xl font-bold">{pageTitle}</h1>
            <div className="flex items-center gap-4">
              <NotificationBell />
              <div className="h-8 w-px bg-border mx-2" />
              <span className="text-sm text-muted-foreground capitalize">Welcome, {welcomeName}</span>
            </div>
          </header>
          <div className="p-8">
            {children}
          </div>
        </main>
      )}
    </div>
  );
}
