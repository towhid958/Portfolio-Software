import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useServerFn } from '@tanstack/react-start';
import { sendInvoiceEmail } from '@/lib/email.functions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { logActivity } from '@/utils/audit';
import { format } from 'date-fns';
import { Plus, Eye, FileText, Download, CheckCircle2, XCircle, Clock, Mail, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useState, useMemo } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { exportToCSV } from '@/lib/csv-export';
import { usePagination } from '@/hooks/usePagination';
import { ListPagination } from '@/components/admin/ListPagination';


const ordersSearchSchema = z.object({
  prefillAmount: z.string().optional(),
  prefillNotes: z.string().optional(),
  prefillEmail: z.string().optional(),
});

export const Route = createFileRoute('/admin/orders/')({
  component: OrdersManagement,
  validateSearch: (search) => ordersSearchSchema.parse(search),
});

const emptyNewOrder = {
  clientEmail: '',
  clientUserId: '' as string | null,
  amount: '',
  currency: 'USD',
  payment_method: 'manual' as 'manual' | 'bank_transfer' | 'bkash' | 'stripe',
  status: 'completed' as 'pending' | 'completed',
  admin_notes: '',
};

function OrdersManagement() {
  const queryClient = useQueryClient();
  const search = Route.useSearch();
  const sendEmail = useServerFn(sendInvoiceEmail);
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(!!search.prefillAmount);
  const [newOrder, setNewOrder] = useState(() => ({
    ...emptyNewOrder,
    amount: search.prefillAmount || '',
    admin_notes: search.prefillNotes || '',
    clientEmail: search.prefillEmail || '',
  }));
  const [clientSearch, setClientSearch] = useState('');

  const { data: clientResults } = useQuery({
    queryKey: ['order-client-search', clientSearch],
    queryFn: async () => {
      if (clientSearch.length < 3) return [];
      const { data } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .ilike('email', `%${clientSearch}%`)
        .limit(5);
      return data || [];
    },
    enabled: clientSearch.length >= 3,
  });

  const createOrderMutation = useMutation({
    mutationFn: async (values: typeof newOrder) => {
      const { data, error } = await supabase
        .from('orders')
        .insert({
          user_id: values.clientUserId || null,
          amount: Number(values.amount),
          currency: values.currency,
          status: values.status,
          payment_method: values.payment_method,
          admin_notes: values.admin_notes || null,
          billing_details: values.clientEmail ? { email: values.clientEmail } : null,
        } as any)
        .select()
        .single();
      if (error) throw error;
      await logActivity('orders', 'create_manual_order', { id: data.id, amount: values.amount });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      toast.success('Order created successfully');
      setIsNewOrderOpen(false);
      setNewOrder(emptyNewOrder);
      setClientSearch('');
    },
    onError: (error: any) => toast.error(error.message),
  });

  const { data: orders, isLoading } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*, gig_packages(name, gigs(title))')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredOrders = useMemo(() => {
    return (orders ?? []).filter((order: any) => {
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q
        || order.id.toLowerCase().includes(q)
        || (order.payment_method || '').toLowerCase().includes(q)
        || (order.gig_packages?.gigs?.title || '').toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [orders, searchQuery, statusFilter]);

  const { pageItems: pagedOrders, page, setPage, totalPages, total, pageSize } = usePagination(filteredOrders);

  const handleExport = () => {
    exportToCSV(`orders-${format(new Date(), 'yyyy-MM-dd')}`, filteredOrders.map((o: any) => ({
      id: o.id,
      customer: o.user_id ? 'Authenticated' : 'Guest',
      payment_method: o.payment_method || 'stripe',
      amount: o.amount,
      currency: o.currency,
      status: o.status,
      created_at: o.created_at,
    })));
  };

  const createInvoiceMutation = useMutation({
    mutationFn: async (order: any) => {
      const invoiceNumber = `INV-${Date.now()}`;
      const { data, error } = await supabase.from('invoices').insert({
        order_id: order.id,
        invoice_number: invoiceNumber,
        user_id: order.user_id,
        total_amount: order.amount,
        currency: order.currency,
        items: [{
          description: `${order.gig_packages?.gigs?.title} - ${order.gig_packages?.name}`,
          quantity: 1,
          unit_price: order.amount,
          total: order.amount
        }],
        billing_to: {
          name: 'Customer',
          email: order.user_id ? 'Authenticated User' : 'Guest'
        },
        status: 'draft'
      }).select().single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      toast.success('Invoice created successfully');
      
      // Trigger initial invoice email
      try {
        await sendEmail({ data: { invoiceId: data.id, type: 'INITIAL_INVOICE' } });
        toast.info('Notification email sent to customer');
      } catch (err) {
        console.error('Failed to send invoice email:', err);
      }
      
      window.open(`/invoices/${data.id}`, '_blank');
    },
    onError: (error: any) => toast.error(error.message)
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Order Management</h2>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={handleExport} disabled={filteredOrders.length === 0}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Button className="gap-2" onClick={() => setIsNewOrderOpen(true)}>
            <Plus className="h-4 w-4" /> New Order
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search orders..."
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
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase bg-muted/50">
                <tr>
                  <th className="px-6 py-3 font-bold">Order ID</th>
                  <th className="px-6 py-3 font-bold">Customer</th>
                  <th className="px-6 py-3 font-bold">Method</th>
                  <th className="px-6 py-3 font-bold">Amount</th>
                  <th className="px-6 py-3 font-bold">Status</th>
                  <th className="px-6 py-3 font-bold">Resend Status</th>
                  <th className="px-6 py-3 font-bold">Actions</th>

                </tr>
              </thead>
              <tbody className="divide-y">
                {pagedOrders.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                      {isLoading ? 'Loading orders...' : 'No orders found.'}
                    </td>
                  </tr>
                )}
                {pagedOrders.map((order: any) => (
                  <tr key={order.id} className="bg-card hover:bg-muted/30">
                    <td className="px-6 py-4 font-mono text-xs">{order.id.split('-')[0]}</td>
                    <td className="px-6 py-4">{order.user_id ? 'Authenticated' : 'Guest'}</td>
                    <td className="px-6 py-4">
                      <Badge variant="outline">{order.payment_method || 'stripe'}</Badge>
                    </td>
                    <td className="px-6 py-4 font-bold">${order.amount}</td>
                    <td className="px-6 py-4">
                      <Badge className={order.status === 'completed' ? 'bg-green-500' : ''}>{order.status}</Badge>
                    </td>
                    <td className="px-6 py-4">
                      {order.last_email_sent_at ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1.5 cursor-help">
                                {(order.last_email_status as any)?.success ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-destructive" />
                                )}
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(order.last_email_sent_at), 'MMM d')}
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-xs space-y-1">
                                <p className="font-semibold">Last Notification</p>
                                <p>Sent: {format(new Date(order.last_email_sent_at), 'MMM d, p')}</p>
                                <p>Status: {(order.last_email_status as any)?.success ? 'Success' : 'Failed'}</p>
                                {(order.last_email_status as any)?.error && (
                                  <p className="text-destructive">Error: {(order.last_email_status as any).error}</p>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Not sent</span>
                      )}
                    </td>
                    <td className="px-6 py-4 flex gap-2">

                      <Button size="sm" variant="ghost" title="Create Invoice" onClick={() => createInvoiceMutation.mutate(order)}>
                        <FileText className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        title="View Proof"
                        disabled={!order.payment_proof_url}
                        onClick={() => order.payment_proof_url && window.open(order.payment_proof_url, '_blank', 'noopener,noreferrer')}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ListPagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} />
        </CardContent>
      </Card>

      <Dialog open={isNewOrderOpen} onOpenChange={(open) => { setIsNewOrderOpen(open); if (!open) { setNewOrder(emptyNewOrder); setClientSearch(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Client (optional)</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by email..."
                  className="pl-8"
                  value={clientSearch}
                  onChange={(e) => {
                    setClientSearch(e.target.value);
                    setNewOrder((o) => ({ ...o, clientUserId: null, clientEmail: e.target.value }));
                  }}
                />
              </div>
              {newOrder.clientUserId && (
                <p className="text-xs text-muted-foreground">Linked to account: {newOrder.clientEmail}</p>
              )}
              {clientResults && clientResults.length > 0 && !newOrder.clientUserId && (
                <div className="border rounded-md divide-y bg-muted/50">
                  {clientResults.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                      onClick={() => {
                        setNewOrder((o) => ({ ...o, clientUserId: user.id, clientEmail: user.email }));
                        setClientSearch(user.email);
                      }}
                    >
                      <div className="font-medium">{user.full_name || 'No Name'}</div>
                      <div className="text-xs text-muted-foreground">{user.email}</div>
                    </button>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">Leave blank for a guest order, e.g. from a won custom-service quote.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-order-amount">Amount</Label>
                <Input
                  id="new-order-amount"
                  type="number"
                  min={0}
                  step="0.01"
                  value={newOrder.amount}
                  onChange={(e) => setNewOrder((o) => ({ ...o, amount: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-order-currency">Currency</Label>
                <Input
                  id="new-order-currency"
                  value={newOrder.currency}
                  onChange={(e) => setNewOrder((o) => ({ ...o, currency: e.target.value.toUpperCase() }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={newOrder.payment_method} onValueChange={(v: any) => setNewOrder((o) => ({ ...o, payment_method: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="bkash">bKash</SelectItem>
                    <SelectItem value="stripe">Stripe</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={newOrder.status} onValueChange={(v: any) => setNewOrder((o) => ({ ...o, status: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-order-notes">Admin Notes</Label>
              <Textarea
                id="new-order-notes"
                value={newOrder.admin_notes}
                onChange={(e) => setNewOrder((o) => ({ ...o, admin_notes: e.target.value }))}
                placeholder="e.g. Won quote #abc123 - custom web dev project"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewOrderOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createOrderMutation.mutate(newOrder)}
              disabled={createOrderMutation.isPending || !newOrder.amount || Number(newOrder.amount) <= 0}
            >
              {createOrderMutation.isPending ? 'Creating...' : 'Create Order'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
