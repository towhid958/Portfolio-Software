import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getSiteConfiguration = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("site_configuration")
      .select("*");

    if (error) throw new Error(error.message);

    return (data ?? []).reduce((acc: any, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {} as Record<string, any>);
  });

export const updateSiteConfiguration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({
      key: z.string(),
      value: z.any(),
      category: z.string()
    }).parse(data)
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("site_configuration")
      .upsert({
        key: data.key,
        value: data.value,
        category: data.category,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });

    if (error) throw new Error(error.message);

    await context.supabase.from('activity_logs').insert({
      user_id: context.userId,
      module: 'settings',
      action: 'update_config',
      details: { key: data.key, category: data.category },
    } as any);

    return { success: true };
  });

export const getPortalSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("client_portal_settings")
      .select("*")
      .order("feature_key");

    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const updatePortalSetting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({
      feature_key: z.string(),
      is_enabled: z.boolean(),
      access_level: z.string()
    }).parse(data)
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("client_portal_settings")
      .upsert({
        feature_key: data.feature_key,
        is_enabled: data.is_enabled,
        access_level: data.access_level,
        updated_at: new Date().toISOString()
      }, { onConflict: 'feature_key' });

    if (error) throw new Error(error.message);

    await context.supabase.from('activity_logs').insert({
      user_id: context.userId,
      module: 'settings',
      action: 'update_portal_config',
      details: { feature: data.feature_key },
    } as any);

    return { success: true };
  });
