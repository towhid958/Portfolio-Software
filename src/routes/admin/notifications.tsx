import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { 
  Bell, 
  Check, 
  Info, 
  AlertCircle, 
  ExternalLink, 
  Trash2, 
  CheckCircle2, 
  MailOpen,
  Inbox
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Link } from '@tanstack/react-router';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { useRBAC } from '@/hooks/useRBAC';
import { AdminLayout } from '@/components/admin/AdminLayout';

export const Route = createFileRoute('/admin/notifications')({
  component: NotificationsPage,
});

function NotificationsPage() {
  const queryClient = useQueryClient();
  const { can, isLoading: rbacLoading } = useRBAC();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['admin-notifications-full'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];

      // Admin/super_admin RLS grants full-table SELECT, so without this
      // scope the admin's own list would also include every client-targeted
      // notification (document_shared, task_assigned, invoice_sent, ...) -
      // those belong in the client's own feed, not mixed into admin's.
      const { data, error } = await (supabase as any)
        .from('admin_notifications')
        .select('*')
        .or(`user_id.is.null,user_id.eq.${session.user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as any[];
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('admin_notifications')
        .update({ is_read: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notifications-full'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from('admin_notifications')
        .update({ is_read: true })
        .eq('is_read', false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notifications-full'] });
      toast.success('All notifications marked as read');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('admin_notifications')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notifications-full'] });
      toast.success('Notification deleted');
    },
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'review_new':
        return <Info className="h-5 w-5 text-blue-500" />;
      case 'review_approved':
        return <Check className="h-5 w-5 text-green-500" />;
      case 'review_rejected':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'testimonial_requested':
        return <Bell className="h-5 w-5 text-purple-500" />;
      case 'chargeback':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Bell className="h-5 w-5 text-muted-foreground" />;
    }
  };

  if (rbacLoading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading...</div>;
  }

  if (!can('dashboard', 'view')) {
    return <div>Access Denied</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">Manage your system alerts and notifications.</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={!notifications?.some(n => !n.is_read) || markAllAsReadMutation.isPending}
          >
            <MailOpen className="mr-2 h-4 w-4" /> Mark all as read
          </Button>
        </div>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading notifications...</div>
        ) : !notifications || notifications.length === 0 ? (
          <div className="p-20 text-center flex flex-col items-center">
            <Inbox className="h-12 w-12 text-muted-foreground opacity-20 mb-4" />
            <h3 className="text-lg font-medium">No notifications</h3>
            <p className="text-muted-foreground">You're all caught up!</p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((notification) => (
              <div 
                key={notification.id} 
                className={cn(
                  "p-6 transition-colors hover:bg-muted/30 flex gap-4 relative group",
                  !notification.is_read && "bg-primary/5"
                )}
              >
                <div className="mt-1">{getIcon(notification.type)}</div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className={cn("font-semibold", !notification.is_read && "text-primary")}>
                      {notification.title}
                    </h4>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground pr-12">
                    {notification.message}
                  </p>
                  <div className="flex items-center gap-4 pt-2">
                    {notification.link && (
                      <Button variant="link" className="p-0 h-auto text-xs" asChild>
                        <Link to={notification.link as any} onClick={() => markAsReadMutation.mutate(notification.id)}>
                          View Details <ExternalLink className="ml-1 h-3 w-3" />
                        </Link>
                      </Button>
                    )}
                    {!notification.is_read && (
                      <Button 
                        variant="ghost" 
                        className="h-auto p-0 text-xs text-muted-foreground hover:text-primary"
                        onClick={() => markAsReadMutation.mutate(notification.id)}
                      >
                        <CheckCircle2 className="mr-1 h-3 w-3" /> Mark as read
                      </Button>
                    )}
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => deleteMutation.mutate(notification.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
