import { createFileRoute } from '@tanstack/react-router';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { processStripeEvent } from '@/lib/stripe-webhook-processor.server';

export const Route = createFileRoute('/api/public/stripe-webhook')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const stripeKey = process.env['STRIPE_SECRET_KEY'];
        const webhookSecret = process.env['STRIPE_WEBHOOK_SECRET'];

        if (!stripeKey || !webhookSecret) {
          return new Response('Stripe configuration missing', { status: 500 });
        }

        const stripe = new Stripe(stripeKey, {
          apiVersion: "2025-02-11.acacia" as any,
        });

        const signature = request.headers.get('stripe-signature');
        if (!signature) {
          return new Response('No stripe-signature header', { status: 400 });
        }

        const body = await request.text();
        let event: Stripe.Event;

        try {
          event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
        } catch (err: any) {
          console.error(`Webhook signature verification failed: ${err.message}`);
          return new Response(`Webhook Error: ${err.message}`, { status: 400 });
        }

        // Idempotency: Stripe may redeliver the same event on timeout/retry.
        // Skip re-processing (and re-sending emails) if it already succeeded.
        const { data: existingLog } = await supabaseAdmin
          .from('webhook_logs')
          .select('id, status')
          .eq('event_id', event.id)
          .eq('status', 'success')
          .maybeSingle();

        if (existingLog) {
          return new Response('ok (already processed)', { status: 200 });
        }

        // Log the start of webhook processing. Upsert on event_id so a
        // retry of a previously-failed event updates the same log row
        // instead of failing on the unique event_id constraint.
        const { data: logEntry, error: logError } = await supabaseAdmin
          .from('webhook_logs')
          .upsert({
            event_id: event.id,
            event_type: event.type,
            payload: event as any,
            status: 'processing'
          }, { onConflict: 'event_id' })
          .select()
          .single();

        try {
          await processStripeEvent(supabaseAdmin, event);

          // Mark log as successful
          if (logEntry) {
            await supabaseAdmin
              .from('webhook_logs')
              .update({
                status: 'success',
                processed_at: new Date().toISOString()
              })
              .eq('id', logEntry.id);
          }

          return new Response('ok', { status: 200 });
        } catch (err: any) {
          console.error(`Webhook processing failed: ${err.message}`);
          
          // Log the failure
          if (logEntry) {
            await supabaseAdmin
              .from('webhook_logs')
              .update({
                status: 'failed',
                error_message: err.message,
                processed_at: new Date().toISOString()
              })
              .eq('id', logEntry.id);
          }
          
          return new Response(`Processing Error: ${err.message}`, { status: 500 });
        }
      }
    }
  }
});
