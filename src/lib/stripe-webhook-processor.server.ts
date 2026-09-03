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
    // customer_details is populated on a completed session even when
    // customer_email wasn't pre-filled (Stripe Checkout always collects an
    // email) - this is the real source of truth for who to bill/email.
    const customerEmail = session.customer_details?.email ?? session.customer_email ?? null;
    const customerName = session.customer_details?.name ?? null;

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
        billing_details: customerEmail ? { email: customerEmail, name: customerName } : null,
      }, { onConflict: 'stripe_session_id' })
      .select('*, gig_packages(name, gigs(title))')
      .single();

    if (orderError) throw orderError;
    if (!order) return;

    // Idempotent: a webhook retry (or a redelivered event) must not create a
    // second invoice for the same order.
    const { data: existingInvoice } = await supabaseAdmin
      .from('invoices')
      .select('id')
      .eq('order_id', order.id)
      .maybeSingle();

    let invoiceId = existingInvoice?.id as string | undefined;

    if (!invoiceId) {
      const packageLabel = order.gig_packages
        ? `${order.gig_packages.gigs?.title ?? ''} - ${order.gig_packages.name}`.trim()
        : 'Service purchase';

      const { data: newInvoice, error: invoiceInsertError } = await supabaseAdmin
        .from('invoices')
        .insert({
          order_id: order.id,
          invoice_number: `INV-${Date.now()}`,
          user_id: order.user_id,
          total_amount: order.amount,
          currency: order.currency,
          items: [{ description: packageLabel, quantity: 1, unit_price: order.amount, total: order.amount }],
          billing_to: { name: customerName || 'Customer', email: customerEmail },
          status: 'paid',
        })
        .select('id')
        .single();

      if (invoiceInsertError) throw invoiceInsertError;
      invoiceId = newInvoice?.id;
    } else {
      await supabaseAdmin.from('invoices').update({ status: 'paid' }).eq('id', invoiceId);
    }

    if (invoiceId) {
      await sendInvoiceEmailCore(invoiceId, 'PAYMENT_CONFIRMATION', true);
    }
  }

  // A card failure during Checkout itself keeps the customer on Stripe's
  // page to retry - it never reaches our webhook as a completed session, so
  // there's usually no order yet to update. This only does something when
  // an order already exists for this PaymentIntent (e.g. a delayed payment
  // method that failed after the session had already completed once).
  if (event.type === 'payment_intent.payment_failed') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('id')
      .eq('stripe_payment_intent_id', paymentIntent.id)
      .maybeSingle();

    if (order) {
      const { data: invoice } = await supabaseAdmin
        .from('invoices')
        .select('id')
        .eq('order_id', order.id)
        .maybeSingle();

      if (invoice) {
        await supabaseAdmin.from('invoices').update({ status: 'unpaid' }).eq('id', invoice.id);
        await sendInvoiceEmailCore(invoice.id, 'PAYMENT_FAILED', true);
      }
    }
  }

  // Catches a refund issued directly from the Stripe Dashboard, which
  // bypasses processRefund (refund.functions.ts) entirely - without this,
  // the order/invoice would silently disagree with what Stripe actually did.
  if (event.type === 'charge.refunded') {
    const charge = event.data.object as Stripe.Charge;
    const paymentIntentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
    if (!paymentIntentId) return;

    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('id, status')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .maybeSingle();

    // No matching order, or processRefund already reconciled this (same
    // charge, e.g. re-delivered event) - nothing to do.
    if (!order || order.status === 'refunded') return;

    // Same policy as processRefund: a partial refund doesn't fully settle
    // the order, so only flip status on a full refund.
    if (charge.amount_refunded < charge.amount) return;

    await supabaseAdmin.from('orders').update({ status: 'refunded' }).eq('id', order.id);

    const { data: invoice } = await supabaseAdmin
      .from('invoices')
      .select('id, status')
      .eq('order_id', order.id)
      .maybeSingle();

    if (invoice && invoice.status !== 'refunded') {
      await supabaseAdmin.from('invoices').update({ status: 'refunded' }).eq('id', invoice.id);
      await sendInvoiceEmailCore(invoice.id, 'REFUND', true);
    }
  }

  // A chargeback needs a human to respond (with evidence) inside Stripe's
  // own dashboard before its deadline - the app can't resolve this on its
  // own, so the only correct automated action is making sure admin notices.
  if (event.type === 'charge.dispute.created') {
    const dispute = event.data.object as Stripe.Dispute;
    const paymentIntentId = typeof dispute.payment_intent === 'string' ? dispute.payment_intent : dispute.payment_intent?.id;
    const note = `Chargeback opened: ${dispute.reason}, ${(dispute.amount / 100).toFixed(2)} ${dispute.currency.toUpperCase()}. Respond in the Stripe Dashboard before the evidence deadline.`;

    if (paymentIntentId) {
      const { data: order } = await supabaseAdmin
        .from('orders')
        .select('id, admin_notes')
        .eq('stripe_payment_intent_id', paymentIntentId)
        .maybeSingle();

      if (order) {
        await supabaseAdmin
          .from('orders')
          .update({ admin_notes: order.admin_notes ? `${order.admin_notes}\n${note}` : note })
          .eq('id', order.id);
      }
    }

    // Broadcast (user_id left unset) so it reaches every admin's
    // notification feed, not just whoever happens to be looking at orders.
    await supabaseAdmin.from('admin_notifications').insert({
      title: 'Chargeback opened',
      message: note,
      type: 'chargeback',
      link: '/admin/orders',
    });
  }
}
