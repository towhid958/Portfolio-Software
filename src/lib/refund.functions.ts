import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { getUserRoles, isAdminRole } from '@/lib/authz.server';
import { sendInvoiceEmailCore } from '@/lib/email.functions';
import type Stripe from 'stripe';
import { createStripeClient } from '@/lib/stripe.server';
import { getErrorMessage } from '@/lib/utils';

export const processRefund = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .validator((data) =>
    z
      .object({
        invoiceId: z.string(),
        amount: z.number().optional(),
        reason: z.string().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const roles = await getUserRoles(context.userId);
    if (!isAdminRole(roles)) {
      return { success: false, error: 'Unauthorized: admin access required' };
    }

    const stripeKey = process.env['STRIPE_SECRET_KEY'];

    // 1. Fetch invoice and order
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from('invoices')
      .select('*, orders(*)')
      .eq('id', data.invoiceId)
      .single();

    if (invoiceError || !invoice) {
      return { success: false, error: 'Invoice not found' };
    }

    const order = invoice.orders;
    if (!order) {
      return { success: false, error: 'Order not found for this invoice' };
    }

    // 2. Handle based on payment method
    if (order.payment_method === 'stripe' || !order.payment_method) {
      if (!stripeKey) return { success: false, error: 'Stripe not configured' };
      if (!order.stripe_payment_intent_id)
        return { success: false, error: 'No Stripe payment intent found' };

      const stripe = createStripeClient(stripeKey);

      try {
        const refund = await stripe.refunds.create({
          payment_intent: order.stripe_payment_intent_id,
          amount: data.amount ? Math.round(data.amount * 100) : undefined,
          reason: (data.reason as Stripe.RefundCreateParams['reason']) || 'requested_by_customer',
        } as Stripe.RefundCreateParams);

        // A partial amount doesn't fully settle the invoice/order - only mark
        // them 'refunded' once the full total has been returned.
        const isFullRefund = !data.amount || data.amount >= Number(invoice.total_amount);
        if (isFullRefund) {
          await supabaseAdmin.from('invoices').update({ status: 'refunded' }).eq('id', invoice.id);
          await supabaseAdmin.from('orders').update({ status: 'refunded' }).eq('id', order.id);
        }

        // The customer previously only found out via their bank/card
        // statement - notify them either way, full or partial.
        try {
          await sendInvoiceEmailCore(invoice.id, 'REFUND', true);
        } catch (emailErr) {
          console.error('Failed to send refund email:', emailErr);
        }

        return { success: true, refundId: refund.id };
      } catch (err: unknown) {
        return { success: false, error: getErrorMessage(err) };
      }
    } else {
      // Manual adjustment for Bank/bKash
      try {
        await supabaseAdmin
          .from('invoices')
          .update({
            status: 'refunded',
            notes: `${invoice.notes || ''}\nRefund processed manually. Reason: ${data.reason || 'None'}`,
          })
          .eq('id', invoice.id);

        await supabaseAdmin.from('orders').update({ status: 'refunded' }).eq('id', order.id);

        try {
          await sendInvoiceEmailCore(invoice.id, 'REFUND', true);
        } catch (emailErr) {
          console.error('Failed to send refund email:', emailErr);
        }

        return { success: true, manual: true };
      } catch (err: unknown) {
        return { success: false, error: getErrorMessage(err) };
      }
    }
  });
