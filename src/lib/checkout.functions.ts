import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendInvoiceEmailCore } from "@/lib/email.functions";
import Stripe from "stripe";

// Best-effort session lookup: checkout is available to guests, so unlike
// requireSupabaseAuth this never throws when no/invalid token is present -
// it just means the resulting order/invoice won't be linked to an account.
async function getOptionalUserId(): Promise<string | null> {
  const authHeader = getRequest()?.headers?.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.replace('Bearer ', '');
  if (!token || token.split('.').length !== 3) return null;

  const { data, error } = await supabaseAdmin.auth.getClaims(token);
  if (error || !data?.claims?.sub) return null;

  return data.claims.sub;
}

export const getPackageForCheckout = createServerFn({ method: "GET" })
  .validator((data) => z.object({ packageId: z.string() }).parse(data))
  .handler(async ({ data }) => {
    const { data: pkg, error } = await supabaseAdmin
      .from('gig_packages')
      .select('id, name, price, delivery_time, gigs(title)')
      .eq('id', data.packageId)
      .single();

    if (error || !pkg) throw new Error("Package not found");
    return pkg;
  });

const MAX_PROOF_BYTES = 5 * 1024 * 1024;
const ALLOWED_PROOF_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

// Uploads via the service role rather than trusting the browser to write
// directly to storage - checkout (and this proof submission) is available
// to guests, and this project's storage bucket policies live outside the
// SQL migrations tracked here, so anonymous write access can't be verified.
export const submitManualOrder = createServerFn({ method: "POST" })
  .validator((data) => z.object({
    packageId: z.string(),
    paymentMethod: z.enum(['bkash', 'bank_transfer']),
    email: z.string().email(),
    name: z.string().min(1).nullish(),
    fileName: z.string(),
    fileType: z.enum(ALLOWED_PROOF_TYPES as [string, ...string[]]),
    fileBase64: z.string(),
  }).parse(data))
  .handler(async ({ data }) => {
    const { data: pkg, error: pkgError } = await supabaseAdmin
      .from('gig_packages')
      .select('id, price, name, gigs(title)')
      .eq('id', data.packageId)
      .single();

    if (pkgError || !pkg) throw new Error("Package not found");

    const buffer = Buffer.from(data.fileBase64, 'base64');
    if (buffer.byteLength > MAX_PROOF_BYTES) {
      throw new Error("File must be under 5MB");
    }

    const ext = data.fileName.split('.').pop() || 'jpg';
    const filePath = `payment-proofs/${Math.random().toString(36).slice(2)}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('media')
      .upload(filePath, buffer, { contentType: data.fileType });
    if (uploadError) throw new Error(uploadError.message);

    const { data: { publicUrl } } = supabaseAdmin.storage.from('media').getPublicUrl(filePath);

    const userId = await getOptionalUserId();

    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .insert({
        package_id: pkg.id,
        amount: pkg.price,
        currency: 'USD',
        status: 'pending',
        payment_method: data.paymentMethod,
        payment_proof_url: publicUrl,
        user_id: userId,
        billing_details: { email: data.email, name: data.name || null },
      })
      .select('id')
      .single();

    if (error) throw new Error(error.message);

    // Previously no invoice ever existed until an admin manually clicked
    // "Create Invoice" on the order (and even then with a fake billing
    // email) - now the customer gets a real invoice immediately, marked
    // 'unpaid' until an admin verifies the payment proof.
    const packageLabel = `${(pkg as any).gigs?.title ?? ''} - ${pkg.name}`.trim();
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from('invoices')
      .insert({
        order_id: order.id,
        invoice_number: `INV-${Date.now()}`,
        user_id: userId,
        total_amount: pkg.price,
        currency: 'USD',
        items: [{ description: packageLabel, quantity: 1, unit_price: pkg.price, total: pkg.price }],
        billing_to: { name: data.name || 'Customer', email: data.email },
        status: 'unpaid',
      })
      .select('id')
      .single();

    if (invoiceError) {
      // The order + payment proof are already saved - don't fail the
      // customer's submission over invoice bookkeeping.
      console.error('Failed to create invoice for manual order:', invoiceError);
    } else if (invoice) {
      await sendInvoiceEmailCore(invoice.id, 'INITIAL_INVOICE');
    }

    return { orderId: order.id };
  });

export const createCheckoutSession = createServerFn({ method: "POST" })
  .validator((data) => z.object({ packageId: z.string() }).parse(data))
  .handler(async ({ data }) => {
    const stripeKey = process.env['STRIPE_SECRET_KEY'];

    if (!stripeKey) {
      throw new Error("Stripe is not configured. Please add STRIPE_SECRET_KEY to settings.");
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2025-02-11.acacia" as any,
    });

    // 1. Fetch package details using admin client to ensure we get the price
    const { data: pkg, error: pkgError } = await supabaseAdmin
      .from('gig_packages')
      .select('*, gigs(title)')
      .eq('id', data.packageId)
      .single();

    if (pkgError || !pkg) {
      throw new Error("Package not found");
    }

    // 2. Create the Stripe Checkout Session
    const userId = await getOptionalUserId();

    // Prefills the email field for a signed-in customer (Stripe still lets
    // them change it); guests get Stripe's own required email field with
    // nothing to prefill. Either way, session.customer_details.email on the
    // completed event (read in the webhook) is the actual source of truth.
    let customerEmail: string | undefined;
    if (userId) {
      const { data: profile } = await supabaseAdmin.from('profiles').select('email').eq('id', userId).maybeSingle();
      customerEmail = profile?.email ?? undefined;
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${pkg.gigs?.title} - ${pkg.name}`,
            },
            unit_amount: Math.round(pkg.price * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env['FRONTEND_URL'] || 'http://localhost:8080'}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env['FRONTEND_URL'] || 'http://localhost:8080'}/gigs`,
      ...(userId ? { client_reference_id: userId } : {}),
      ...(customerEmail ? { customer_email: customerEmail } : {}),
      metadata: {
        packageId: pkg.id,
      },
    });

    return { url: session.url };
  });

// Backs /checkout/success. Guests have no account to authenticate with, so
// this is deliberately public - the Stripe session_id in the redirect URL
// (cryptographically random, known only to the actual purchaser) is the
// access token here, the same trust model Stripe's own hosted receipts use.
// Returns only order/package summary fields, never billing_to/billing_details.
export const getOrderBySessionId = createServerFn({ method: "GET" })
  .validator((data) => z.object({ sessionId: z.string() }).parse(data))
  .handler(async ({ data }) => {
    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('id, status, amount, currency, user_id, created_at, gig_packages(name, gigs(title)), invoices(id, invoice_number)')
      .eq('stripe_session_id', data.sessionId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return order;
  });
