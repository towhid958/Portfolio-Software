import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type Stripe from "stripe";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getUserRoles, isAdminRole } from "@/lib/authz.server";
import { processStripeEvent } from "@/lib/stripe-webhook-processor.server";

// Reprocesses a failed webhook event from its already-stored payload, without
// needing Stripe to redeliver it - admin-only, since it bypasses the usual
// signature verification (the payload was already verified once, at the time
// it was first logged).
export const retryWebhookEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) => z.object({ logId: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    const roles = await getUserRoles(context.userId);
    if (!isAdminRole(roles)) {
      throw new Error("Unauthorized: admin access required");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: logEntry, error: fetchError } = await supabaseAdmin
      .from('webhook_logs')
      .select('*')
      .eq('id', data.logId)
      .single();

    if (fetchError || !logEntry) throw new Error("Webhook log not found");

    await supabaseAdmin.from('webhook_logs').update({ status: 'processing' }).eq('id', logEntry.id);

    try {
      await processStripeEvent(supabaseAdmin, logEntry.payload as unknown as Stripe.Event);

      await supabaseAdmin.from('webhook_logs').update({
        status: 'success',
        error_message: null,
        processed_at: new Date().toISOString(),
      }).eq('id', logEntry.id);

      await supabaseAdmin.from('activity_logs').insert({
        action: 'retry_webhook',
        module: 'settings',
        user_id: context.userId,
        details: { log_id: logEntry.id, event_type: logEntry.event_type },
      });

      return { success: true };
    } catch (err: any) {
      await supabaseAdmin.from('webhook_logs').update({
        status: 'failed',
        error_message: err.message,
        processed_at: new Date().toISOString(),
      }).eq('id', logEntry.id);

      return { success: false, error: err.message };
    }
  });
