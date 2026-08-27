import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { supabase } from '@/integrations/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, AlertCircle, CheckCircle2, Clock, RotateCcw, Search, Download } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useState } from 'react';
import { retryWebhookEvent } from '@/lib/webhooks.functions';
import { exportToCSV } from '@/lib/csv-export';
import { usePagination } from '@/hooks/usePagination';
import { ListPagination } from '@/components/admin/ListPagination';

export const Route = createFileRoute('/admin/webhooks')({
  component: WebhookLogsPage,
});

function WebhookLogsPage() {
  const queryClient = useQueryClient();
  const retryFn = useServerFn(retryWebhookEvent);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: logs, isLoading } = useQuery({
    queryKey: ['admin-webhook-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('webhook_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    }
  });

  const filteredLogs = (logs ?? []).filter((log) => {
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || log.event_type.toLowerCase().includes(q) || log.event_id.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const { pageItems: pagedLogs, page, setPage, totalPages, total, pageSize } = usePagination(filteredLogs);

  const handleExport = () => {
    exportToCSV(`webhook-logs-${format(new Date(), 'yyyy-MM-dd')}`, filteredLogs.map((log) => ({
      event_type: log.event_type,
      event_id: log.event_id,
      status: log.status,
      created_at: log.created_at,
      error_message: log.error_message || '',
    })));
  };

  const retryMutation = useMutation({
    mutationFn: (logId: string) => retryFn({ data: { logId } }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['admin-webhook-logs'] });
      if (result.success) {
        toast.success('Event reprocessed successfully');
      } else {
        toast.error('Retry failed: ' + result.error);
      }
    },
    onError: (error: any) => toast.error(error.message),
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-yellow-500 animate-pulse" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Success</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="bg-red-500/10 text-red-500 border-red-500/20">Failed</Badge>;
      case 'processing':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Processing</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center">Loading webhook logs...</div>;
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Webhook Logs</h1>
          <p className="text-muted-foreground mt-1">Troubleshoot Stripe events and processing status.</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={handleExport} disabled={filteredLogs.length === 0}>
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search event type or ID..."
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
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Events</CardTitle>
          <CardDescription>The last 100 webhook events received from Stripe.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <th className="w-[50px]">Status</th>
                <th>Event Type</th>
                <th>Event ID</th>
                <th>Date</th>
                <th className="text-right">Actions</th>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {logs?.length === 0 ? 'No webhook events logged yet.' : 'No events match your filters.'}
                  </TableCell>
                </TableRow>
              ) : (
                pagedLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="flex items-center justify-center">
                        {getStatusIcon(log.status)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{log.event_type}</div>
                      {log.error_message && (
                        <div className="text-xs text-red-500 mt-1 truncate max-w-[200px]">
                          {log.error_message}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {log.event_id}
                    </TableCell>
                    <TableCell className="text-sm">
                      {log.created_at ? format(new Date(log.created_at), 'MMM d, HH:mm:ss') : '-'}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {log.status === 'failed' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => retryMutation.mutate(log.id)}
                          disabled={retryMutation.isPending}
                        >
                          <RotateCcw className={`h-4 w-4 mr-2 ${retryMutation.isPending ? 'animate-spin' : ''}`} /> Retry
                        </Button>
                      )}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4 mr-2" /> Details
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              {getStatusIcon(log.status)}
                              {log.event_type}
                            </DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <div className="text-muted-foreground mb-1">Status</div>
                                {getStatusBadge(log.status)}
                              </div>
                              <div>
                                <div className="text-muted-foreground mb-1">Received</div>
                                <div>{log.created_at ? format(new Date(log.created_at), 'PPPP p') : '-'}</div>
                              </div>
                              <div className="col-span-2">
                                <div className="text-muted-foreground mb-1">Event ID</div>
                                <div className="font-mono bg-muted p-2 rounded text-xs">{log.event_id}</div>
                              </div>
                              {log.error_message && (
                                <div className="col-span-2">
                                  <div className="text-muted-foreground mb-1">Error Message</div>
                                  <div className="bg-red-500/10 text-red-600 p-3 rounded text-sm border border-red-500/20">
                                    {log.error_message}
                                  </div>
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="text-muted-foreground mb-2 text-sm font-medium">Payload</div>
                              <pre className="bg-slate-950 text-slate-50 p-4 rounded-lg overflow-x-auto text-xs font-mono">
                                {JSON.stringify(log.payload, null, 2)}
                              </pre>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <ListPagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} />
        </CardContent>
      </Card>
    </div>
  );
}