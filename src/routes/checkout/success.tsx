import { createFileRoute } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { Link } from '@tanstack/react-router';

export const Route = createFileRoute('/checkout/success')({
  component: CheckoutSuccess,
});

function CheckoutSuccess() {
  return (
    <div className="min-h-screen flex items-center justify-center pt-24 pb-20">
      <div className="container max-w-md mx-auto px-4 text-center space-y-8">
        <div className="flex justify-center">
          <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center text-green-600">
            <CheckCircle2 className="h-12 w-12" />
          </div>
        </div>
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">Order Confirmed!</h1>
          <p className="text-lg text-muted-foreground">
            Thank you for your purchase. We've received your order and will start working on it shortly.
          </p>
        </div>
        <div className="p-6 rounded-2xl bg-muted/50 border border-dashed text-sm text-muted-foreground text-left">
          <p className="font-medium text-foreground mb-2">Next Steps:</p>
          <ul className="space-y-2 list-disc list-inside">
            <li>Check your email for the order receipt.</li>
            <li>We'll contact you via the email provided during checkout.</li>
            <li>Expect an update on your project within 24-48 hours.</li>
          </ul>
        </div>
        <div className="flex flex-col gap-3">
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
