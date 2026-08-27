import { supabaseAdmin } from "@/integrations/supabase/client.server";

const STAFF_ROLES = ['admin', 'super_admin', 'editor'];
const ADMIN_ROLES = ['admin', 'super_admin'];

export async function getUserRoles(userId: string): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);
  return data?.map((r) => r.role) ?? [];
}

export function isStaffRole(roles: string[]): boolean {
  return roles.some((r) => STAFF_ROLES.includes(r));
}

export function isAdminRole(roles: string[]): boolean {
  return roles.some((r) => ADMIN_ROLES.includes(r));
}
