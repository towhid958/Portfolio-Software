import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export async function logActivity(module: string, action: string, details: Json = null) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('activity_logs').insert({
      user_id: user.id,
      module,
      action,
      details: details ? (typeof details === 'object' ? details : { value: details }) : null,
    });

    if (error) {
      console.error('Audit Log Error:', error);
    }
  } catch (err) {
    console.error('Audit Log failed to initialize:', err);
  }
}
