import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { sendInvoiceEmailCore } from "@/lib/email.functions";

// Shared by the live Stripe webhook handler (stripe-webhook.ts) and the
// admin-triggered "Retry" action (webhooks.functions.ts) so a failed event
// can be reprocessed from its already-stored payload without needing a new
// signed delivery from Stripe.
export async function processStripeEvent(supabaseAdmin: SupabaseClient, event: Stripe.Event) {
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .upsert({
        stripe_session_id: session.id,
        package_id: session.metadata?.['packageId'] ?? null,
        amount: session.amount_total ? session.amount_total / 100 : 0,
        currency: session.currency || 'USD',
        status: 'completed',
        stripe_payment_intent_id: session.payment_intent as string,
        user_id: session.client_reference_id || null,
      }, { onConflict: 'stripe_session_id' })
      .select()
      .single();

    if (orderError) throw orderError;

    if (order) {
      const { data: updatedInvoices, error: invoiceError } = await supabaseAdmin
        .from('invoices')
        .update({ status: 'paid' })
        .eq('order_id', order.id)
        .select();

      if (!invoiceError) {
        const updatedInvoice = updatedInvoices?.[0];
        if (updatedInvoice) {
          await sendInvoiceEmailCore(updatedInvoice.id, 'PAYMENT_CONFIRMATION');
        }
      } else {
        console.error('Error updating invoice status:', invoiceError);
      }
    }
  }

  if (event.type === 'invoice.payment_succeeded') {
    const stripeInvoice = event.data.object as Stripe.Invoice;
    const orderId = stripeInvoice.metadata?.['orderId'];
    if (orderId) {
      const { data: invoices } = await supabaseAdmin
        .from('invoices')
        .update({ status: 'paid' })
        .eq('order_id', orderId)
        .select();

      if (invoices && invoices.length > 0 && invoices[0]) {
        await sendInvoiceEmailCore(invoices[0].id, 'PAYMENT_CONFIRMATION');
      }
    }
  }

  if (event.type === 'invoice.payment_failed') {
    const stripeInvoice = event.data.object as Stripe.Invoice;
    const orderId = stripeInvoice.metadata?.['orderId'];
    if (orderId) {
      const { data: invoices } = await supabaseAdmin
        .from('invoices')
        .update({ status: 'unpaid' })
        .eq('order_id', orderId)
        .select();

      if (invoices && invoices.length > 0 && invoices[0]) {
        await sendInvoiceEmailCore(invoices[0].id, 'PAYMENT_FAILED');
      }
    }
  }
}
