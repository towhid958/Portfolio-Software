import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShoppingBag, FileText, CheckCircle2, Receipt, ExternalLink, Briefcase, CheckSquare, MessageSquare, Lock, Download } from 'lucide-react';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/dashboard/')({
  component: DashboardOverview,
});

function DashboardOverview() {
  const queryClient = useQueryClient();

  const { data: orders } = useQuery({
    queryKey: ['client-orders'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return [];
      const { data, error } = await supabase
        .from('orders')
        .select('*, gig_packages(name, gigs(title))')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const { data: invoices } = useQuery({
    queryKey: ['client-invoices'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return [];
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const { data: documentsCount } = useQuery({
    queryKey: ['client-docs-count'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return 0;
      const { count } = await supabase
        .from('client_documents')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id);
      return count || 0;
    }
  });

  const { data: recentDocuments } = useQuery({
    queryKey: ['client-recent-docs'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return [];
      const { data, error } = await supabase
        .from('client_documents')
        .select('id, title, description, file_type, file_size, created_at')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    }
  });

  const { data: projects } = useQuery({
    queryKey: ['client-projects-overview'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return [];
      const { data, error } = await supabase
        .from('client_projects')
        .select('id, status')
        .eq('user_id', session.user.id);
      if (error) throw error;
      return data ?? [];
    }
  });

  const { data: tasks } = useQuery({
    queryKey: ['client-tasks-overview'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return [];
      const { data, error } = await supabase
        .from('client_tasks')
        .select('id, status')
        .eq('user_id', session.user.id);
      if (error) throw error;
      return data ?? [];
    }
  });

  const { data: conversationCount } = useQuery({
    queryKey: ['client-conversation-count'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return 0;
      const { count } = await supabase
        .from('conversation_participants')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id);
      return count || 0;
    }
  });

  const downloadDocument = async (documentId: string) => {
    try {
      const { getSecureDownloadUrl } = await import('@/lib/documents.functions');
      const { signedUrl } = await getSecureDownloadUrl({ data: { documentId } });
      window.open(signedUrl, '_blank', 'noopener');
    } catch (err: any) {
      toast.error(err?.message || 'Could not open the document');
    }
  };

  // Real-time subscriptions
  useEffect(() => {
    let mounted = true;

    const setupSubscriptions = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id || !mounted) return;

      const userId = session.user.id;

      const channel = supabase
        .channel('dashboard-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
            filter: `user_id=eq.${userId}`
          },
          (payload) => {
            queryClient.invalidateQueries({ queryKey: ['client-orders'] });
            if (payload.eventType === 'UPDATE') {
              toast.info(`Order status updated to: ${payload.new['status']}`);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'invoices',
            filter: `user_id=eq.${userId}`
          },
          (payload) => {
            queryClient.invalidateQueries({ queryKey: ['client-invoices'] });
            if (payload.eventType === 'UPDATE') {
              toast.info(`Invoice status updated to: ${payload.new['status']}`);
            }
          }
        )

        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    const cleanupPromise = setupSubscriptions();

    return () => {
      mounted = false;
      cleanupPromise.then(cleanup => cleanup?.());
    };
  }, [queryClient]);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'paid':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'pending':
      case 'unpaid':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'cancelled':
      case 'failed':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };


  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome Back</h1>
          <p className="text-muted-foreground mt-1">Here's a real-time overview of your services, billing, and documents.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/dashboard/support">
            <Button variant="outline" size="sm">Get Help</Button>
          </Link>
          <Link to="/dashboard/profile">
            <Button size="sm">Manage Profile</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <Briefcase className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projects?.filter(p => p.status !== 'completed' && p.status !== 'cancelled').length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Ongoing engagements</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
            <CheckSquare className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tasks?.filter(t => t.status !== 'completed').length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting your action</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Conversations</CardTitle>
            <MessageSquare className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversationCount || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Active message threads</p>

          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
            <ShoppingBag className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {orders?.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Currently in progress</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Unpaid Invoices</CardTitle>
            <Receipt className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">
              {invoices?.filter(i => i.status === 'unpaid').length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Requires your attention</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Vault Items</CardTitle>
            <FileText className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{documentsCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Shared project files</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Account Status</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">Active</div>
            <p className="text-xs text-muted-foreground mt-1">Verified Client</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Service History</CardTitle>
              <CardDescription>Your latest gig purchases and statuses.</CardDescription>
            </div>
            <Link to="/gigs" search={{ page: 1 }}>
              <Button variant="ghost" size="sm">Browse More</Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="relative overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase bg-muted/50 border-b">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Service</th>
                    <th className="px-6 py-3 font-semibold">Status</th>
                    <th className="px-6 py-3 text-right font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {orders?.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-muted-foreground italic">No orders found.</td>
                    </tr>
                  ) : orders?.slice(0, 5).map(order => (
                    <tr key={order.id} className="group hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium">{order.gig_packages?.gigs?.title}</div>
                        <div className="text-xs text-muted-foreground">{order.gig_packages?.name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className={getStatusColor(order.status || '')}>
                          {order.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right font-medium">${order.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Links</CardTitle>
            <CardDescription>Frequently used actions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link to="/dashboard/projects" className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors group">
              <div className="p-2 bg-primary/10 rounded-md group-hover:bg-primary/20 transition-colors">
                <Briefcase className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold">My Projects</div>
                <div className="text-xs text-muted-foreground">Track progress</div>
              </div>
            </Link>
            <Link to="/dashboard/messages" className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors group">
              <div className="p-2 bg-blue-500/10 rounded-md group-hover:bg-blue-500/20 transition-colors">
                <MessageSquare className="h-4 w-4 text-blue-500" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold">Messages</div>
                <div className="text-xs text-muted-foreground">Contact support</div>
              </div>
            </Link>
            <Link to="/dashboard/documents" className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors group">
              <div className="p-2 bg-indigo-500/10 rounded-md group-hover:bg-indigo-500/20 transition-colors">
                <FileText className="h-4 w-4 text-indigo-500" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold">View Documents</div>
                <div className="text-xs text-muted-foreground">Access project files</div>
              </div>
            </Link>
            <Link to="/dashboard/billing" className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors group">
              <div className="p-2 bg-yellow-500/10 rounded-md group-hover:bg-yellow-500/20 transition-colors">
                <Receipt className="h-4 w-4 text-yellow-500" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold">Billing Details</div>
                <div className="text-xs text-muted-foreground">Manage payments</div>
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-indigo-500" />
              Secure Document Vault
            </CardTitle>
            <CardDescription>Latest files shared with you. Links are signed and expire in 5 minutes.</CardDescription>
          </div>
          <Link to="/dashboard/documents">
            <Button variant="ghost" size="sm">Open Vault</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {!recentDocuments || recentDocuments.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
              <FileText className="h-10 w-10 text-muted-foreground opacity-20" />
              <p className="text-sm text-muted-foreground">No documents have been shared with you yet.</p>
            </div>
          ) : (
            <div className="divide-y rounded-md border">
              {recentDocuments.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between gap-4 p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="rounded-md bg-indigo-500/10 p-2">
                      <FileText className="h-4 w-4 text-indigo-500" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{doc.title}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {doc.description || doc.file_type || 'Document'}
                        {doc.file_size ? ` · ${(doc.file_size / 1024).toFixed(0)} KB` : ''}
                      </div>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="gap-2 shrink-0" onClick={() => downloadDocument(doc.id)}>
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
