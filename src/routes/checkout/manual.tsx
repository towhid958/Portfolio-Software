import { createFileRoute, Link } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { useState, useEffect } from 'react';
import { z } from 'zod';
import { toast } from 'sonner';
import { Banknote, CheckCircle2, Upload, Loader2, X } from 'lucide-react';
import { getPackageForCheckout, submitManualOrder } from '@/lib/checkout.functions';

const manualCheckoutSearchSchema = z.object({
  packageId: z.string().optional(),
  method: z.enum(['bkash', 'bank_transfer']).optional(),
});

export const Route = createFileRoute('/checkout/manual')({
  component: ManualCheckout,
  validateSearch: (search) => manualCheckoutSearchSchema.parse(search),
});

function ManualCheckout() {
  const { packageId, method = 'bank_transfer' } = Route.useSearch();
  const fetchPackage = useServerFn(getPackageForCheckout);
  const submitOrder = useServerFn(submitManualOrder);

  const [proofFile, setProofFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedOrderId, setSubmittedOrderId] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');

  // Without a real email, an admin verifying this payment has no way to
  // send a receipt/invoice - previously nothing captured one at all here.
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) setEmail(session.user.email);
      const fullName = (session?.user?.user_metadata as any)?.['full_name'];
      if (fullName) setName(fullName);
    });
  }, []);

  const { data: bankDetails } = useQuery({
    queryKey: ['bank-details'],
    queryFn: async () => {
      const { data, error } = await supabase.from('bank_details').select('*').eq('is_active', true).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: pkg, isLoading: isLoadingPackage } = useQuery({
    queryKey: ['checkout-package', packageId],
    queryFn: () => fetchPackage({ data: { packageId: packageId! } }),
    enabled: !!packageId,
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/heic'].includes(file.type)) {
      toast.error('Please attach a JPG, PNG, WebP, or HEIC image');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File must be under 5MB');
      return;
    }
    setProofFile(file);
  };

  const handleSubmit = async () => {
    if (!packageId) {
      toast.error('Missing package. Please start checkout again from the gig page.');
      return;
    }
    if (!proofFile) {
      toast.error('Please attach a screenshot of your payment confirmation.');
      return;
    }
    if (!email.trim()) {
      toast.error('Please enter your email so we can send your invoice.');
      return;
    }

    setIsSubmitting(true);
    try {
      const fileBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1] ?? '');
        };
        reader.onerror = () => reject(new Error('Could not read the selected file'));
        reader.readAsDataURL(proofFile);
      });

      const result = await submitOrder({
        data: {
          packageId,
          paymentMethod: method,
          email: email.trim(),
          name: name.trim() || null,
          fileName: proofFile.name,
          fileType: proofFile.type,
          fileBase64,
        },
      });

      setSubmittedOrderId(result.orderId);
      toast.success('Payment proof submitted');
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit payment proof');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submittedOrderId) {
    return (
      <div className="container max-w-2xl mx-auto py-24">
        <Card>
          <CardContent className="pt-8 pb-10 text-center space-y-4">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
            <h2 className="text-2xl font-bold">Payment proof submitted</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              We've received your order and payment confirmation. We'll verify it and follow up by email shortly.
            </p>
            <p className="text-xs text-muted-foreground">Order reference: {submittedOrderId}</p>
            <Button asChild className="mt-2">
              <Link to="/gigs" search={{ page: 1 }}>Back to Gigs</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto py-24">
      <Card>
        <CardHeader>
          <CardTitle>Complete Your Payment</CardTitle>
          <CardDescription>Follow the instructions below to complete your order manually.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {packageId && (
            <div className="p-4 border rounded-lg flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {isLoadingPackage ? 'Loading order details...' : (pkg as any)?.gigs?.title}
                </p>
                <p className="font-bold">{pkg?.name} Package</p>
              </div>
              {pkg && <p className="text-xl font-bold">${pkg.price}</p>}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Your Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Your Name (optional)</Label>
              <Input
                id="name"
                placeholder="Jane Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          <div className="p-4 bg-muted rounded-lg space-y-2">
            <h3 className="font-bold flex items-center gap-2">
              <Banknote className="h-5 w-5" /> {method === 'bkash' ? 'bKash Payment Details' : 'Bank Transfer Details'}
            </h3>
            {method === 'bkash' ? (
              <p>bKash Number: {bankDetails?.bkash_number}</p>
            ) : (
              <>
                <p>Account Name: {bankDetails?.account_name}</p>
                <p>Bank: {bankDetails?.bank_name}</p>
                <p>Account Number: {bankDetails?.account_number}</p>
              </>
            )}
          </div>

          <div className="p-4 border rounded-lg">
            <h3 className="font-bold mb-2">Next Steps:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Transfer the amount to the account above.</li>
              <li>Take a screenshot of the payment confirmation.</li>
              <li>Attach it below and submit — we'll verify it and follow up by email.</li>
            </ol>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Payment Screenshot</label>
            {proofFile ? (
              <div className="flex items-center justify-between p-3 border rounded-lg text-sm">
                <span className="truncate">{proofFile.name}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setProofFile(null)} aria-label="Remove attached file">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 p-6 border border-dashed rounded-lg cursor-pointer hover:border-primary/50 transition-colors text-sm text-muted-foreground">
                <Upload className="h-6 w-6" />
                Click to select a screenshot (max 5MB)
                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </label>
            )}
          </div>

          <Button className="w-full" onClick={handleSubmit} disabled={isSubmitting || !proofFile || !email.trim()}>
            {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            {isSubmitting ? 'Submitting...' : 'Upload Payment Proof'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
