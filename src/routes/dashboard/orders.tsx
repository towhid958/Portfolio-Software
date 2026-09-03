import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShoppingBag, Calendar, Clock, RefreshCw, ExternalLink, Star, Receipt } from 'lucide-react';
import { format } from 'date-fns';

export const Route = createFileRoute('/dashboard/orders')({
  component: ClientOrdersPage,
});

const statusStyles: Record<string, string> = {
  completed: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  pending: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  failed: 'bg-red-500/10 text-red-600 border-red-500/20',
  refunded: 'bg-muted text-muted-foreground',
};

function ClientOrdersPage() {
  const { data: orders, isLoading } = useQuery({
    queryKey: ['client-orders-full'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return [];
      const { data, error } = await supabase
        .from('orders')
        .select('*, gig_packages(name, delivery_time, revisions, features, gigs(title, slug))')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const orderIds = (orders ?? []).map((o) => o.id);
  const { data: invoicesByOrder } = useQuery({
    queryKey: ['client-order-invoices', orderIds],
    enabled: orderIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('id, invoice_number, status, order_id')
        .in('order_id', orderIds);
      if (error) throw error;
      return new Map((data ?? []).map((inv) => [inv.order_id, inv]));
    },
  });

  const completedOrderIds = (orders ?? []).filter((o) => o.status === 'completed').map((o) => o.id);
  const { data: reviewedOrderIds } = useQuery({
    queryKey: ['client-reviewed-orders', completedOrderIds],
    enabled: completedOrderIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gig_reviews')
        .select('order_id')
        .in('order_id', completedOrderIds);
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.order_id));
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">My Orders</h2>
        <p className="text-muted-foreground">Every service you've purchased, with its package details and invoice.</p>
      </div>

      {isLoading ? (
        <Card className="p-12 text-center text-muted-foreground">Loading orders…</Card>
      ) : !orders || orders.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center space-y-4">
          <ShoppingBag className="h-12 w-12 text-muted-foreground opacity-20" />
          <h3 className="text-lg font-semibold">No Orders Yet</h3>
          <p className="text-muted-foreground max-w-xs">Once you purchase a gig or start a service, it'll show up here with full details.</p>
          <Link to="/gigs" search={{ page: 1 }}>
            <Button variant="outline" size="sm">Browse Services</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid gap-6">
          {orders.map((order) => {
            const invoice = invoicesByOrder?.get(order.id);
            const features = (order.gig_packages?.features as string[] | null) ?? [];
            const slug = order.gig_packages?.gigs?.slug;
            const canReview = order.status === 'completed' && !reviewedOrderIds?.has(order.id) && !!slug;

            return (
              <Card key={order.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                  <div className="space-y-1">
                    <CardTitle className="text-xl">{order.gig_packages?.gigs?.title ?? 'Service'}</CardTitle>
                    <CardDescription>{order.gig_packages?.name}</CardDescription>
                  </div>
                  <Badge variant="outline" className={statusStyles[order.status ?? ''] ?? ''}>
                    {order.status}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" /> {order.created_at ? format(new Date(order.created_at), 'PP') : '—'}
                    </div>
                    {order.gig_packages?.delivery_time && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" /> {order.gig_packages.delivery_time} delivery
                      </div>
                    )}
                    {order.gig_packages?.revisions != null && (
                      <div className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4" /> {order.gig_packages.revisions} revision{order.gig_packages.revisions === 1 ? '' : 's'}
                      </div>
                    )}
                  </div>

                  {features.length > 0 && (
                    <ul className="grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
                      {features.map((f, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <span className="h-1 w-1 rounded-full bg-muted-foreground shrink-0" /> {f}
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t">
                    <p className="text-lg font-bold">{order.currency} {order.amount}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      {canReview && (
                        <Link to="/gigs/$slug" params={{ slug: slug! }} hash="reviews">
                          <Button variant="outline" size="sm" className="gap-1.5">
                            <Star className="h-3.5 w-3.5" /> Leave a Review
                          </Button>
                        </Link>
                      )}
                      {invoice && (
                        <Link to="/invoices/$id" params={{ id: invoice.id }} target="_blank">
                          <Button variant="outline" size="sm" className="gap-1.5">
                            <Receipt className="h-3.5 w-3.5" /> Invoice #{invoice.invoice_number}
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
