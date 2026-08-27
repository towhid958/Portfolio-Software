import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { supabase } from '@/integrations/supabase/client';
import { getSystemStatus } from '@/lib/system-status.functions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Users,
  Briefcase,
  FolderKanban,
  MessageSquare,
  TrendingUp,
  Clock,
  Handshake,
  FileText,
  Quote,
  Plus,
  CreditCard,
  Lock,
  History as HistoryIcon,
  ShieldCheck,
  AlertTriangle,
  DollarSign
} from 'lucide-react';
import { useRBAC } from '@/hooks/useRBAC';
import { format, formatDistanceToNow } from 'date-fns';

export const Route = createFileRoute('/admin/')({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { can } = useRBAC();
  const fetchSystemStatus = useServerFn(getSystemStatus);

  const { data: servicesCount } = useQuery({
    queryKey: ['admin-stats-services'],
    queryFn: async () => {
      const { count } = await supabase.from('services').select('*', { count: 'exact', head: true });
      return count || 0;
    }
  });

  const { data: projectsCount } = useQuery({
    queryKey: ['admin-stats-projects'],
    queryFn: async () => {
      const { count } = await supabase.from('projects').select('*', { count: 'exact', head: true });
      return count || 0;
    }
  });

  const { data: gigsCount } = useQuery({
    queryKey: ['admin-stats-gigs'],
    queryFn: async () => {
      const { count } = await supabase.from('gigs').select('*', { count: 'exact', head: true });
      return count || 0;
    }
  });

  const { data: partnersCount } = useQuery({
    queryKey: ['admin-stats-partners'],
    queryFn: async () => {
      const { count } = await supabase.from('partners').select('*', { count: 'exact', head: true });
      return count || 0;
    }
  });

  const { data: blogCount } = useQuery({
    queryKey: ['admin-stats-blog'],
    queryFn: async () => {
      const { count } = await supabase.from('blog_posts').select('*', { count: 'exact', head: true });
      return count || 0;
    }
  });

  const { data: messagesCount } = useQuery({
    queryKey: ['admin-stats-messages'],
    queryFn: async () => {
      const { count } = await supabase.from('contact_messages').select('*', { count: 'exact', head: true }).eq('status', 'unread');
      return count || 0;
    }
  });

  const { data: ordersCount } = useQuery({
    queryKey: ['admin-stats-orders'],
    queryFn: async () => {
      const { count } = await supabase.from('orders').select('*', { count: 'exact', head: true });
      return count || 0;
    }
  });

  const { data: clientsCount } = useQuery({
    queryKey: ['admin-stats-clients'],
    queryFn: async () => {
      const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      return count || 0;
    }
  });

  const { data: usersCount } = useQuery({
    queryKey: ['admin-stats-users'],
    queryFn: async () => {
      const { count } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .in('role', ['super_admin', 'admin', 'editor', 'staff']);
      return count || 0;
    },
    enabled: can('admin', 'view'),
  });

  const { data: revenue } = useQuery({
    queryKey: ['admin-stats-revenue'],
    queryFn: async () => {
      const { data } = await supabase.from('invoices').select('total_amount').eq('status', 'paid');
      return (data ?? []).reduce((sum, inv) => sum + (inv.total_amount ?? 0), 0);
    },
    enabled: can('orders', 'view'),
  });

  const { data: recentActivity } = useQuery({
    queryKey: ['admin-recent-activity'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('id, action, module, created_at, profiles:user_id(full_name, email)')
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
    enabled: can('admin', 'view'),
  });

  const { data: systemStatus, isError: systemStatusError } = useQuery({
    queryKey: ['admin-system-status'],
    queryFn: () => fetchSystemStatus(),
    enabled: can('admin', 'view'),
    staleTime: 60_000,
    retry: 1,
  });

  const systemHealthy = systemStatus
    ? systemStatus.database && systemStatus.storage
    : systemStatusError
      ? false
      : undefined;

  return (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {can('orders', 'view') && (
          <Link to="/admin/orders">
            <Card className="hover:bg-muted/50 transition-all cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Orders</CardTitle>
                <CreditCard className="h-4 w-4 text-green-500 opacity-70" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{ordersCount?.toString() || '0'}</div>
                <p className="text-[10px] text-muted-foreground mt-1 font-medium">Processing & Completed</p>
              </CardContent>
            </Card>
          </Link>
        )}
        <Link to="/admin/clients">
          <Card className="hover:bg-muted/50 transition-all cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Clients</CardTitle>
              <Users className="h-4 w-4 text-primary opacity-70" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{clientsCount?.toString() || '0'}</div>
              <p className="text-[10px] text-muted-foreground mt-1 font-medium">View & Manage Clients</p>
            </CardContent>
          </Card>
        </Link>
        {can('admin', 'view') && (
          <Link to="/admin/users">
            <Card className="hover:bg-muted/50 transition-all cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Staff Users</CardTitle>
                <Users className="h-4 w-4 text-blue-500 opacity-70" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{usersCount?.toString() || '0'}</div>
                <p className="text-[10px] text-muted-foreground mt-1 font-medium">RBAC & Permissions</p>
              </CardContent>
            </Card>
          </Link>
        )}
        {can('messages', 'view') && (
          <Link to="/admin/messages">
            <Card className="hover:bg-muted/50 transition-all cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Inquiries</CardTitle>
                <MessageSquare className="h-4 w-4 text-primary opacity-70" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{messagesCount?.toString() || '0'}</div>
                <p className="text-[10px] text-muted-foreground mt-1 font-medium">Unread Messages</p>
              </CardContent>
            </Card>
          </Link>
        )}
        {can('orders', 'view') && (
          <Card className="bg-primary/5">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-green-500 opacity-70" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${(revenue ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
              <p className="text-[10px] text-muted-foreground mt-1 font-medium">From paid invoices</p>
            </CardContent>
          </Card>
        )}
        {can('admin', 'view') && (
          <Card className={systemHealthy === false ? "bg-destructive/5" : "bg-primary/5"}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">System Status</CardTitle>
              {systemHealthy === false ? (
                <AlertTriangle className="h-4 w-4 text-destructive opacity-70" />
              ) : (
                <ShieldCheck className="h-4 w-4 text-primary opacity-70" />
              )}
            </CardHeader>
            <CardContent>
              {systemStatusError ? (
                <div className="text-2xl font-bold text-destructive">Unable to Check</div>
              ) : systemStatus === undefined ? (
                <div className="text-2xl font-bold text-muted-foreground">Checking...</div>
              ) : systemHealthy ? (
                <div className="text-2xl font-bold text-green-500">Online</div>
              ) : (
                <div className="text-2xl font-bold text-destructive">Attention Needed</div>
              )}
              <p className="text-[10px] text-muted-foreground mt-1 font-medium">
                {systemStatusError
                  ? 'The status check itself failed - see server logs'
                  : systemStatus === undefined
                    ? 'Checking database and storage...'
                    : systemHealthy
                      ? 'Database and storage responding'
                      : [
                          !systemStatus.database && 'database unreachable',
                          !systemStatus.storage && 'storage unreachable',
                        ].filter(Boolean).join(', ')}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {can('gigs', 'view') && (
          <Link to="/admin/gigs">
            <Card className="hover:bg-muted/50 transition-all cursor-pointer border-l-4 border-l-primary">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Active Gigs</CardTitle>
                <TrendingUp className="h-4 w-4 text-primary opacity-70" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{gigsCount?.toString() || '0'}</div></CardContent>
            </Card>
          </Link>
        )}
        {can('projects', 'view') && (
          <Link to="/admin/projects">
            <Card className="hover:bg-muted/50 transition-all cursor-pointer border-l-4 border-l-primary">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Portfolio Projects</CardTitle>
                <FolderKanban className="h-4 w-4 text-primary opacity-70" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{projectsCount?.toString() || '0'}</div></CardContent>
            </Card>
          </Link>
        )}
        {can('blog', 'view') && (
          <Link to="/admin/blog">
            <Card className="hover:bg-muted/50 transition-all cursor-pointer border-l-4 border-l-primary">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Blog Posts</CardTitle>
                <FileText className="h-4 w-4 text-primary opacity-70" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{blogCount?.toString() || '0'}</div></CardContent>
            </Card>
          </Link>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Quick Links</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
             {can('about', 'view') && (
               <Button variant="outline" className="h-24 flex-col gap-2" asChild>
                  <Link to="/admin/about">
                    <Users className="h-6 w-6" />
                    Edit About Me
                  </Link>
               </Button>
             )}
             {can('testimonials', 'view') && (
               <Button variant="outline" className="h-24 flex-col gap-2" asChild>
                  <Link to="/admin/testimonials">
                    <Quote className="h-6 w-6" />
                    Manage Testimonials
                  </Link>
               </Button>
             )}
             {can('blog', 'create') && (
               <Button variant="outline" className="h-24 flex-col gap-2" asChild>
                  <Link to="/admin/blog/new">
                    <Plus className="h-6 w-6" />
                    Write New Post
                  </Link>
               </Button>
             )}
             {can('gigs', 'create') && (
               <Button variant="outline" className="h-24 flex-col gap-2" asChild>
                  <Link to="/admin/gigs/new">
                    <TrendingUp className="h-6 w-6" />
                    Create Gig
                  </Link>
               </Button>
             )}
          </CardContent>
        </Card>

        {can('admin', 'view') && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Activity</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/admin/activity-logs">View all</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {recentActivity === undefined ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
              ) : (
                <div className="space-y-4">
                  {recentActivity.map((entry: any) => (
                    <div key={entry.id} className="flex items-center gap-4 border-b pb-4 last:border-0 last:pb-0">
                      <div className="rounded-full bg-muted p-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {(entry.profiles?.full_name || entry.profiles?.email || 'Someone')} — {entry.action.replace(/_/g, ' ')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {entry.module} · {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
