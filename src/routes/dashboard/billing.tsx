import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Receipt, Download, ExternalLink, CreditCard } from 'lucide-react';

export const Route = createFileRoute('/dashboard/billing')({
  component: ClientBilling,
});

const formatPaymentMethod = (method: string | null) => {
  switch (method) {
    case 'card': return 'Card (Stripe)';
    case 'bank_transfer': return 'Bank Transfer';
    case 'bkash': return 'bKash';
    case 'manual': return 'Manual';
    default: return method || 'Not set yet';
  }
};

function ClientBilling() {
  const { data: invoices, isLoading } = useQuery({
    queryKey: ['client-billing-invoices'],
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

  const { data: lastPaymentMethod } = useQuery({
    queryKey: ['client-last-payment-method'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return null;
      const { data, error } = await supabase
        .from('orders')
        .select('payment_method')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data?.payment_method ?? null;
    }
  });

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'unpaid': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'failed': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Billing & Invoices</h1>
        <p className="text-muted-foreground mt-1">Manage your payments and download historical invoices.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Payment Method</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded">
                <CreditCard className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">{formatPaymentMethod(lastPaymentMethod ?? null)}</p>
                <p className="text-xs text-muted-foreground">From your most recent order</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice History</CardTitle>
          <CardDescription>All your service invoices in one place.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase bg-muted/50 border-b">
                <tr>
                  <th className="px-6 py-3">Invoice #</th>
                  <th className="px-6 py-3">Issue Date</th>
                  <th className="px-6 py-3 text-right">Amount</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  [1, 2].map(i => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={5} className="px-6 py-4 bg-muted/20 h-12"></td>
                    </tr>
                  ))
                ) : invoices?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">No invoices found.</td>
                  </tr>
                ) : invoices?.map(invoice => (
                  <tr key={invoice.id} className="group hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-medium">{invoice.invoice_number}</td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {new Date(invoice.issue_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right font-medium">
                      {invoice.currency} {invoice.total_amount || (invoice.items as any[] || []).reduce((acc, item) => acc + (item.total || 0), 0)}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className={getStatusColor(invoice.status || '')}>
                        {invoice.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <a href={`/invoices/${invoice.id}`} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="sm" className="gap-2">
                          <ExternalLink className="h-4 w-4" />
                          View
                        </Button>
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
