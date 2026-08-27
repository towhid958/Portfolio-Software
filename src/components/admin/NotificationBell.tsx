import React, { useEffect, useState } from 'react';
import { Bell, Check, Info, AlertCircle, X, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useRBAC } from '@/hooks/useRBAC';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { Link } from '@tanstack/react-router';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AdminNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export function NotificationBell() {
  const { roles, can } = useRBAC();
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const fetchNotifications = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Use casting to avoid TS errors with potentially ungenerated types
    const { data, error } = await (supabase as any)
      .from('admin_notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching notifications:', error);
      return;
    }

    setNotifications((data as any[]) || []);
    setUnreadCount(((data as any[]) || []).filter((n) => !n.is_read).length);
  };

  useEffect(() => {
    fetchNotifications();

    // Subscribe to new notifications
    const channel = supabase
      .channel('admin_notifications_changes')
      .on(
        'postgres_changes' as any,
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_notifications',
        },
        (payload: any) => {
          const newNotif = payload.new as AdminNotification;
          setNotifications((prev) => [newNotif, ...prev.slice(0, 19)]);
          setUnreadCount((prev) => prev + 1);
          
          // Show toast for new notification
          toast(newNotif.title, {
            description: newNotif.message,
            action: newNotif.link ? {
              label: 'View',
              onClick: () => window.location.href = newNotif.link!
            } : undefined
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const markAsRead = async (id: string) => {
    const { error } = await (supabase as any)
      .from('admin_notifications')
      .update({ is_read: true })
      .eq('id', id);

    if (error) {
      toast.error('Failed to mark notification as read');
      return;
    }

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;

    const { error } = await (supabase as any)
      .from('admin_notifications')
      .update({ is_read: true })
      .in('id', unreadIds);

    if (error) {
      toast.error('Failed to mark all as read');
      return;
    }

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'review_new':
        return <Info className="h-4 w-4 text-blue-500" />;
      case 'review_approved':
        return <Check className="h-4 w-4 text-green-500" />;
      case 'review_rejected':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] animate-in zoom-in"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h4 className="font-semibold text-sm">Notifications</h4>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-auto py-0 px-2 text-xs text-primary"
              onClick={markAllAsRead}
            >
              Mark all as read
            </Button>
          )}
        </div>
        <ScrollArea className="h-[350px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-8 text-center px-4">
              <Bell className="h-8 w-8 text-muted-foreground opacity-20 mb-2" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div 
                  key={notification.id}
                  className={cn(
                    "p-4 transition-colors hover:bg-muted/50 relative group",
                    !notification.is_read && "bg-primary/5"
                  )}
                >
                  <div className="flex gap-3">
                    <div className="mt-1">{getIcon(notification.type)}</div>
                    <div className="flex-1 space-y-1">
                      <p className={cn("text-sm font-medium leading-none", !notification.is_read && "text-primary")}>
                        {notification.title}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </span>
                        {notification.link && (
                          <Link 
                            to={notification.link as any}
                            className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
                            onClick={() => {
                              markAsRead(notification.id);
                              setIsOpen(false);
                            }}
                          >
                            View <ExternalLink className="h-2 w-2" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                  {!notification.is_read && (
                    <button 
                      onClick={() => markAsRead(notification.id)}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded"
                      title="Mark as read"
                    >
                      <Check className="h-3 w-3 text-muted-foreground" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        <div className="p-2 border-t text-center">
          <Button variant="ghost" size="sm" className="w-full text-xs" asChild onClick={() => setIsOpen(false)}>
            <Link to={"/admin/notifications" as any}>
              View All Notifications
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
