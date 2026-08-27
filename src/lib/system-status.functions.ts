import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getUserRoles, isStaffRole } from "@/lib/authz.server";

// Public, unauthenticated check for the maintenance-mode banner. site_configuration's
// RLS only grants read access to `authenticated`, so anonymous visitors - the actual
// audience for this flag - can't query it client-side; this reads via supabaseAdmin
// and returns only the two fields that are meant to be public.
export const getPublicMaintenanceStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data } = await supabaseAdmin
    .from('site_configuration')
    .select('key, value')
    .in('key', ['maintenance_mode', 'maintenance_message']);

  const row = (key: string) => data?.find((r) => r.key === key)?.value;

  return {
    enabled: row('maintenance_mode') === true,
    message: (row('maintenance_message') as string | null) || null,
  };
});

// Real health/configuration checks, shared by the admin dashboard's status
// card and the Settings page's Integrations/System tabs - all three
// previously showed hardcoded "Connected"/"Healthy"/"Online" text that
// didn't reflect anything real.
export const getSystemStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const roles = await getUserRoles(context.userId);
    if (!isStaffRole(roles)) {
      throw new Error("Unauthorized");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [dbCheck, storageCheck] = await Promise.all([
      supabaseAdmin.from('site_configuration').select('key').limit(1),
      supabaseAdmin.storage.from('media').list('', { limit: 1 }),
    ]);

    return {
      database: !dbCheck.error,
      storage: !storageCheck.error,
      stripeConfigured: !!process.env['STRIPE_SECRET_KEY'],
      resendConfigured: !!process.env['RESEND_API_KEY'],
    };
  });
