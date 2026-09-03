import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2, Receipt } from 'lucide-react';
import { getOrderBySessionId } from '@/lib/checkout.functions';

const successSearchSchema = z.object({
  session_id: z.string().optional(),
});

export const Route = createFileRoute('/checkout/success')({
  component: CheckoutSuccess,
  validateSearch: (search) => successSearchSchema.parse(search),
});

const MAX_POLL_ATTEMPTS = 8;

function CheckoutSuccess() {
  const { session_id } = Route.useSearch();
  const fetchOrder = useServerFn(getOrderBySessionId);
  const [attempts, setAttempts] = useState(0);

  const { data: order, isLoading } = useQuery({
    queryKey: ['checkout-order', session_id],
    enabled: !!session_id,
    queryFn: () => fetchOrder({ data: { sessionId: session_id! } }),
    // The webhook that creates the order/invoice runs async and can land a
    // moment after Stripe redirects the browser here - poll briefly rather
    // than showing a false "not found" on the very first render.
    refetchInterval: (query) => (query.state.data ? false : 2000),
  });

  useEffect(() => {
    if (!order && session_id) {
      const timer = setTimeout(() => setAttempts((a) => a + 1), 2000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [order, session_id, attempts]);

  const stillWaiting = !!session_id && !order && attempts < MAX_POLL_ATTEMPTS;
  const gaveUp = !!session_id && !order && attempts >= MAX_POLL_ATTEMPTS;
  const invoice = order?.invoices?.[0];
  const packageLabel = order?.gig_packages
    ? `${order.gig_packages.gigs?.title ?? ''} - ${order.gig_packages.name}`.trim()
    : null;

  return (
    <div className="min-h-screen flex items-center justify-center pt-24 pb-20">
      <div className="container max-w-md mx-auto px-4 text-center space-y-8">
        <div className="flex justify-center">
          <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center text-green-600">
            {stillWaiting || (isLoading && session_id) ? (
              <Loader2 className="h-10 w-10 animate-spin" />
            ) : (
              <CheckCircle2 className="h-12 w-12" />
            )}
          </div>
        </div>

        {!session_id ? (
          <div className="space-y-4">
            <h1 className="text-3xl font-bold tracking-tight">Nothing to show here</h1>
            <p className="text-muted-foreground">
              This page confirms an order right after checkout. If you're looking for a past order, check your dashboard or the email we sent you.
            </p>
          </div>
        ) : stillWaiting ? (
          <div className="space-y-4">
            <h1 className="text-3xl font-bold tracking-tight">Confirming your payment...</h1>
            <p className="text-muted-foreground">This usually takes a few seconds. Hang tight.</p>
          </div>
        ) : gaveUp ? (
          <div className="space-y-4">
            <h1 className="text-3xl font-bold tracking-tight">Still processing</h1>
            <p className="text-muted-foreground">
              Your payment is confirmed with Stripe, but it's taking longer than usual to finish setting up your order. Refresh this page in a moment, or check your email for confirmation.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight">Order Confirmed!</h1>
            <p className="text-lg text-muted-foreground">
              Thank you for your purchase. We've received your order and will start working on it shortly.
            </p>
          </div>
        )}

        {order && (
          <div className="p-6 rounded-2xl bg-muted/50 border text-sm text-left space-y-3">
            {packageLabel && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Service</span>
                <span className="font-medium">{packageLabel}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-medium">{order.currency} {order.amount}</span>
            </div>
            {invoice && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Invoice</span>
                <span className="font-medium">{invoice.invoice_number}</span>
              </div>
            )}
            <p className="text-xs text-muted-foreground pt-2 border-t">
              We've emailed your receipt to the address you provided at checkout.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {invoice && order?.user_id && (
            <Button size="lg" variant="outline" className="w-full gap-2" asChild>
              <Link to="/invoices/$id" params={{ id: invoice.id }} target="_blank">
                <Receipt className="h-4 w-4" /> View Full Invoice
              </Link>
            </Button>
          )}
          <Button size="lg" className="w-full font-bold" asChild>
            <Link to="/gigs" search={{ page: 1 }}>Browse More Services</Link>
          </Button>
          <Button variant="ghost" size="lg" className="w-full" asChild>
            <Link to="/">Back to Home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
