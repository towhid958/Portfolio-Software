import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logActivity } from '@/utils/audit';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Mail,
  MoreHorizontal,
  CheckCircle,
  Trash2,
  User,
  ExternalLink,
  MessageSquare,
  Clock,
  Loader2,
  Lock,
  Reply,
  Search,
  Download
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useRBAC } from '@/hooks/useRBAC';
import { useState, useMemo } from 'react';
import { exportToCSV } from '@/lib/csv-export';
import { usePagination } from '@/hooks/usePagination';
import { ListPagination } from '@/components/admin/ListPagination';

export const Route = createFileRoute('/admin/messages/')({
  component: MessagesManagement,
});

function MessagesManagement() {
  const { can, isLoading: rbacLoading } = useRBAC();
  const queryClient = useQueryClient();
  const [replyingMessage, setReplyingMessage] = useState<any | null>(null);
  const [replyText, setReplyText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: messages, isLoading } = useQuery({
    queryKey: ['admin-messages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contact_messages')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      const { error } = await supabase
        .from('contact_messages')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
      await logActivity('messages', 'update_status', { id, status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-messages'] });
      toast.success('Message status updated');
    },
  });

  const replyMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string, notes: string }) => {
      const { error } = await supabase
        .from('contact_messages')
        .update({ internal_notes: notes, status: 'replied' })
        .eq('id', id);
      if (error) throw error;
      await logActivity('messages', 'reply_message', { id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-messages'] });
      toast.success('Reply saved - the client will see it in their dashboard');
      setReplyingMessage(null);
      setReplyText('');
    },
    onError: (error: any) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contact_messages')
        .delete()
        .eq('id', id);
      if (error) throw error;
      await logActivity('messages', 'delete_message', { id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-messages'] });
      toast.success('Message deleted');
    },
  });

  const filteredMessages = useMemo(() => {
    return (messages ?? []).filter((msg) => {
      const status = msg.status || 'unread';
      const matchesStatus = statusFilter === 'all' || status === statusFilter;
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q ||
        msg.name.toLowerCase().includes(q) ||
        msg.email.toLowerCase().includes(q) ||
        (msg.subject || '').toLowerCase().includes(q) ||
        msg.message.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [messages, searchQuery, statusFilter]);

  const { pageItems: pagedMessages, page, setPage, totalPages, total, pageSize } = usePagination(filteredMessages);

  const handleExport = () => {
    exportToCSV(`messages-${format(new Date(), 'yyyy-MM-dd')}`, filteredMessages.map((msg) => ({
      name: msg.name,
      email: msg.email,
      subject: msg.subject || '',
      status: msg.status || 'unread',
      created_at: msg.created_at,
    })));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (rbacLoading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading...</div>;
  }

  if (!can('messages', 'view')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
        <Lock className="h-12 w-12 text-muted-foreground opacity-20" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground">You don't have permission to view messages.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Messages & Inquiries</h1>
          <p className="text-muted-foreground">Manage gig inquiries and contact form submissions.</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={handleExport} disabled={filteredMessages.length === 0}>
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search messages..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="unread">Unread</SelectItem>
            <SelectItem value="read">Read</SelectItem>
            <SelectItem value="replied">Replied</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sender</TableHead>
              <TableHead>Subject / Type</TableHead>
              <TableHead className="max-w-md">Message</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMessages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  {messages?.length === 0 ? 'No messages found.' : 'No messages match your filters.'}
                </TableCell>
              </TableRow>
            ) : (
              pagedMessages.map((msg) => (
                <TableRow key={msg.id} className={(msg.status || 'unread') === 'unread' ? 'bg-primary/5' : ''}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{msg.name}</span>
                      <span className="text-xs text-muted-foreground">{msg.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{msg.subject || 'General Inquiry'}</span>
                      {msg.subject?.includes('Gig Inquiry:') && (
                         <Badge variant="outline" className="w-fit text-[10px] mt-1 bg-blue-500/5 text-blue-600 border-blue-500/20">
                           Gig Inquiry
                         </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-md">
                    <p className="text-sm line-clamp-2 text-muted-foreground">
                      {msg.message}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={cn(
                        msg.status === 'replied' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' :
                        msg.status === 'read' ? 'bg-green-500/10 text-green-600 border-green-500/20' :
                        'bg-amber-500/10 text-amber-600 border-amber-500/20'
                      )}
                      variant="outline"
                    >
                      {(msg.status || 'unread').toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {msg.created_at ? format(new Date(msg.created_at), 'MMM d, yyyy') : 'N/A'}
                  </TableCell>
                  <TableCell className="text-right">
                    {(can('messages', 'edit') || can('messages', 'delete')) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {can('messages', 'edit') && (
                            <DropdownMenuItem
                              onClick={() => {
                                setReplyingMessage(msg);
                                setReplyText(msg.internal_notes || '');
                              }}
                            >
                              <Reply className="mr-2 h-4 w-4" />
                              {msg.internal_notes ? 'Edit Reply' : 'Reply'}
                            </DropdownMenuItem>
                          )}
                          {can('messages', 'edit') && (
                            <DropdownMenuItem
                              onClick={() => updateStatusMutation.mutate({ id: msg.id, status: (msg.status || 'unread') === 'unread' ? 'read' : 'unread' })}
                            >
                              {(msg.status || 'unread') === 'unread' ? <CheckCircle className="mr-2 h-4 w-4" /> : <Mail className="mr-2 h-4 w-4" />}
                              Mark as {(msg.status || 'unread') === 'unread' ? 'Read' : 'Unread'}
                            </DropdownMenuItem>
                          )}
                          {can('messages', 'delete') && (
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this message?')) {
                                  deleteMutation.mutate(msg.id);
                                }
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <div className="px-4">
          <ListPagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} />
        </div>
      </div>

      <Dialog open={!!replyingMessage} onOpenChange={(open) => !open && setReplyingMessage(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reply to {replyingMessage?.name}</DialogTitle>
            <DialogDescription>
              This reply is shown to the client in their dashboard's Support Center, under their original message. It does not send an email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-3 bg-muted/30 rounded-lg text-sm text-muted-foreground">
              {replyingMessage?.message}
            </div>
            <Textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write your response..."
              className="min-h-[150px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplyingMessage(null)}>Cancel</Button>
            <Button
              onClick={() => replyingMessage && replyMutation.mutate({ id: replyingMessage.id, notes: replyText })}
              disabled={!replyText.trim() || replyMutation.isPending}
            >
              {replyMutation.isPending ? 'Saving...' : 'Save Reply'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
