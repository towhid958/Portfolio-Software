import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import type { Json } from '@/integrations/supabase/types';

export const getSiteConfiguration = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from('site_configuration').select('*');

    if (error) throw new Error(error.message);

    return (data ?? []).reduce<Record<string, Json>>((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});
  });

export const updateSiteConfiguration = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .validator((data) =>
    z
      .object({
        key: z.string(),
        value: z.any(),
        category: z.string(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from('site_configuration').upsert(
      {
        key: data.key,
        value: data.value,
        category: data.category,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' },
    );

    if (error) throw new Error(error.message);

    await context.supabase.from('activity_logs').insert({
      user_id: context.userId,
      module: 'settings',
      action: 'update_config',
      details: { key: data.key, category: data.category },
    });

    return { success: true };
  });

export const getPortalSettings = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from('client_portal_settings')
      .select('*')
      .order('feature_key');

    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const updatePortalSetting = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .validator((data) =>
    z
      .object({
        feature_key: z.string(),
        is_enabled: z.boolean(),
        access_level: z.string(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from('client_portal_settings').upsert(
      {
        feature_key: data.feature_key,
        is_enabled: data.is_enabled,
        access_level: data.access_level,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'feature_key' },
    );

    if (error) throw new Error(error.message);

    await context.supabase.from('activity_logs').insert({
      user_id: context.userId,
      module: 'settings',
      action: 'update_portal_config',
      details: { feature: data.feature_key },
    });

    return { success: true };
  });

/**
 * Read a site-configuration value as a string.
 *
 * `site_settings.value` is a `Json` column, so a raw read is
 * `string | number | boolean | object | array`. Consumers overwhelmingly want
 * a string (input defaultValue, an href, a footer line) and previously got one
 * only because the config map was typed `any` - a numeric or boolean row would
 * have been handed straight to a DOM prop.
 */
export function configString(
  config: Record<string, Json> | undefined | null,
  key: string,
  fallback = '',
): string {
  const value = config?.[key];
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return fallback;
}

/**
 * Read a site-configuration value as a boolean.
 *
 * Separate from configString because `!!configString(config, 'x')` is wrong for
 * booleans - a stored `false` stringifies to "false", which is truthy.
 */
export function configBoolean(
  config: Record<string, Json> | undefined | null,
  key: string,
  fallback = false,
): boolean {
  const value = config?.[key];
  return typeof value === 'boolean' ? value : fallback;
}
