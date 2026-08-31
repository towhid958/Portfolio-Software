import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { SITE_SETTINGS_THEME_KEY, defaultThemeSettings, isThemeSettings, type ThemeSettings } from '@/lib/builder/theme';

// No auth middleware - `site_settings` has a public SELECT policy (`USING
// (true)`), and the public page renderer ($slug.tsx) needs this same read,
// unauthenticated. Mirrors getPageBySlug's plain-client shape in pages.functions.ts.
export const getThemeSettings = createServerFn({ method: 'GET' }).handler(async (): Promise<ThemeSettings> => {
  const { data, error } = await supabase.from('site_settings').select('value').eq('key', SITE_SETTINGS_THEME_KEY).maybeSingle();
  if (error || !data || !isThemeSettings(data.value)) return defaultThemeSettings();
  return data.value;
});

const themeSettingsSchema = z.object({
  colors: z.array(z.object({ id: z.string(), name: z.string(), value: z.string() })),
  fonts: z.array(
    z.object({ id: z.string(), name: z.string(), value: z.string(), googleFontQuery: z.string().optional() })
  ),
});

// RLS on site_settings additionally restricts writes to admin/super_admin -
// requireSupabaseAuth only proves the caller is signed in, so a non-admin
// authenticated user's upsert is rejected at the database, same
// defense-in-depth pattern as updateSiteConfiguration in settings.functions.ts.
export const updateThemeSettings = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .validator((data) => themeSettingsSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from('site_settings')
      .upsert({ key: SITE_SETTINGS_THEME_KEY, value: data, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    if (error) throw new Error(error.message);

    await context.supabase.from('activity_logs').insert({
      user_id: context.userId,
      module: 'settings',
      action: 'update_theme',
      details: { colorCount: data.colors.length, fontCount: data.fonts.length },
    } as any);

    return { success: true };
  });
