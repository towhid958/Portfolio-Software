import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getUserRoles, isAdminRole, isStaffRole } from "@/lib/authz.server";

export const createUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) => z.object({
    email: z.string().email(),
    password: z.string().min(8),
    fullName: z.string().min(2),
    role: z.enum(['admin', 'editor', 'staff', 'user']).default('user'),
  }).parse(data))
  .handler(async ({ data, context }) => {
    const callerRoles = await getUserRoles(context.userId);
    if (!isAdminRole(callerRoles)) {
      throw new Error("Unauthorized: admin access required");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Create the user in Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        full_name: data.fullName
      }
    });

    if (authError) throw authError;
    if (!authUser.user) throw new Error("Failed to create user");

    // 2. Update profile (name is usually handled by trigger, but we ensure it)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ full_name: data.fullName })
      .eq('id', authUser.user.id);
    
    if (profileError) console.error("Profile update error:", profileError);

    // 3. Assign role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: authUser.user.id,
        role: data.role as any
      });

    if (roleError) throw roleError;

    // 4. Log activity
    await supabaseAdmin.from('activity_logs').insert({
      action: 'create_user',
      module: 'users',
      user_id: context.userId,
      details: { 
        new_user_id: authUser.user.id,
        email: data.email,
        role: data.role
      }
    });

    return { success: true, userId: authUser.user.id };
  });

// Lets any authenticated user (including plain clients) discover who's on
// the staff team to start a conversation with, without granting broad read
// access to user_roles (which RLS otherwise restricts to admin/super_admin).
export const getStaffProfiles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: staffRoles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('user_id')
      .in('role', ['admin', 'super_admin', 'editor', 'staff']);

    if (rolesError) throw rolesError;

    const staffIds = Array.from(new Set((staffRoles ?? []).map((r) => r.user_id)));
    if (staffIds.length === 0) return [];

    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email')
      .in('id', staffIds);

    if (profilesError) throw profilesError;
    return profiles ?? [];
  });

// Backs the admin Clients list. Status is derived from real Supabase Auth
// fields (last_sign_in_at / banned_until) rather than a hardcoded "Active"
// badge - a client who has never logged in shows as "invited", and a banned
// one (once a suspend action exists) will correctly show "suspended".
export const getClients = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const roles = await getUserRoles(context.userId);
    if (!isStaffRole(roles)) {
      throw new Error("Unauthorized");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: userRoles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('user_id')
      .eq('role', 'user');

    if (rolesError) throw rolesError;

    const userIds = Array.from(new Set((userRoles ?? []).map((r) => r.user_id)));
    if (userIds.length === 0) return [];

    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, created_at')
      .in('id', userIds);

    if (profilesError) throw profilesError;

    const { data: authList } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const authById = new Map((authList?.users ?? []).map((u) => [u.id, u]));

    return (profiles ?? []).map((profile) => {
      const authUser = authById.get(profile.id);
      const isBanned = !!authUser?.banned_until && new Date(authUser.banned_until) > new Date();
      const status: 'suspended' | 'active' | 'invited' = isBanned
        ? 'suspended'
        : authUser?.last_sign_in_at
          ? 'active'
          : 'invited';

      return {
        ...profile,
        last_sign_in_at: authUser?.last_sign_in_at ?? null,
        status,
      };
    });
  });

// Backs the admin Users list (staff accounts). The page previously queried
// user_roles with no role filter, so plain clients ('user' role) showed up
// in "System Users" too; this scopes to staff roles and adds real last-login/
// suspended status the same way getClients does for the Clients list.
export const getStaffMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const roles = await getUserRoles(context.userId);
    if (!isAdminRole(roles)) {
      throw new Error("Unauthorized");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: staffRoles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('id, user_id, role')
      .in('role', ['super_admin', 'admin', 'editor', 'staff']);

    if (rolesError) throw rolesError;
    if (!staffRoles || staffRoles.length === 0) return [];

    const userIds = Array.from(new Set(staffRoles.map((r) => r.user_id)));

    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email')
      .in('id', userIds);

    if (profilesError) throw profilesError;

    const { data: authList } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const authById = new Map((authList?.users ?? []).map((u) => [u.id, u]));
    const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

    return staffRoles.map((roleRow) => {
      const profile = profileById.get(roleRow.user_id);
      const authUser = authById.get(roleRow.user_id);
      const isBanned = !!authUser?.banned_until && new Date(authUser.banned_until) > new Date();

      return {
        id: roleRow.id,
        user_id: roleRow.user_id,
        role: roleRow.role,
        full_name: profile?.full_name ?? null,
        email: profile?.email ?? null,
        last_sign_in_at: authUser?.last_sign_in_at ?? null,
        is_suspended: isBanned,
      };
    });
  });

// Backs the admin Client Detail page - a single view of one client's profile,
// orders, invoices, documents, and conversations. Previously there was no way
// to see a client's activity in one place; staff had to cross-reference the
// Orders/Invoices/Documents lists by name.
export const getClientDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data) => z.object({ clientId: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    const roles = await getUserRoles(context.userId);
    if (!isStaffRole(roles)) {
      throw new Error("Unauthorized");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', data.clientId)
      .single();
    if (profileError || !profile) throw new Error("Client not found");

    const [
      { data: authUser },
      { data: orders },
      { data: invoices },
      { data: documents },
      { data: participantRows },
      { data: projects },
      { data: tasks },
    ] = await Promise.all([
      supabaseAdmin.auth.admin.getUserById(data.clientId),
      supabaseAdmin.from('orders').select('*').eq('user_id', data.clientId).order('created_at', { ascending: false }),
      supabaseAdmin.from('invoices').select('*').eq('user_id', data.clientId).order('created_at', { ascending: false }),
      supabaseAdmin.from('client_documents').select('*').eq('user_id', data.clientId).order('created_at', { ascending: false }),
      supabaseAdmin.from('conversation_participants').select('conversation_id').eq('user_id', data.clientId),
      supabaseAdmin.from('client_projects').select('*').eq('user_id', data.clientId).order('created_at', { ascending: false }),
      supabaseAdmin.from('client_tasks').select('*').eq('user_id', data.clientId).order('created_at', { ascending: false }),
    ]);

    const conversationIds = Array.from(new Set((participantRows ?? []).map((r) => r.conversation_id)));
    const { data: conversations } = conversationIds.length > 0
      ? await supabaseAdmin
          .from('conversations')
          .select('id, title, type, last_message_at')
          .in('id', conversationIds)
          .order('last_message_at', { ascending: false })
      : { data: [] };

    const isBanned = !!authUser?.user?.banned_until && new Date(authUser.user.banned_until) > new Date();

    return {
      profile,
      status: (isBanned ? 'suspended' : authUser?.user?.last_sign_in_at ? 'active' : 'invited') as 'suspended' | 'active' | 'invited',
      last_sign_in_at: authUser?.user?.last_sign_in_at ?? null,
      orders: orders ?? [],
      invoices: invoices ?? [],
      documents: documents ?? [],
      conversations: conversations ?? [],
      projects: projects ?? [],
      tasks: tasks ?? [],
    };
  });

// Suspend/unsuspend a staff account. Only super_admins may call this, and
// suspending another super_admin (or yourself) is blocked - locking out the
// only account able to reverse the action would be unrecoverable without
// direct DB access.
export const setStaffSuspended = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) => z.object({
    userId: z.string(),
    suspended: z.boolean(),
  }).parse(data))
  .handler(async ({ data, context }) => {
    const callerRoles = await getUserRoles(context.userId);
    if (!callerRoles.includes('super_admin')) {
      throw new Error("Unauthorized: super admin access required");
    }
    if (data.userId === context.userId) {
      throw new Error("You can't suspend your own account");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const targetRoles = await getUserRoles(data.userId);
    if (targetRoles.includes('super_admin')) {
      throw new Error("Super admin accounts can't be suspended from here");
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      ban_duration: data.suspended ? '87600h' : 'none',
    });
    if (error) throw new Error(error.message);

    await supabaseAdmin.from('activity_logs').insert({
      action: data.suspended ? 'suspend_user' : 'unsuspend_user',
      module: 'users',
      user_id: context.userId,
      details: { target_user_id: data.userId },
    });

    return { success: true };
  });
