import { supabase } from '@/integrations/supabase/client';

export async function logActivity(module: string, action: string, details: any = null) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('activity_logs').insert({
      user_id: user.id,
      module,
      action,
      details: details ? (typeof details === 'object' ? details : { value: details }) : null,
    } as any);

    if (error) {
      console.error('Audit Log Error:', error);
    }
  } catch (err) {
    console.error('Audit Log failed to initialize:', err);
  }
}
