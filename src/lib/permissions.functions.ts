import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { Database } from "@/integrations/supabase/types";

type Role = Database['public']['Enums']['app_role'];

export const getModulePermissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("module_permissions")
      .select("*");

    if (error) throw new Error(error.message);
    return data;
  });

export const updateModulePermission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({
      id: z.string().optional(),
      role: z.string(),
      module: z.string(),
      can_view: z.boolean(),
      can_create: z.boolean(),
      can_edit: z.boolean(),
      can_delete: z.boolean(),
    }).parse(data)
  )
  .handler(async ({ data, context }) => {
    const payload: any = {
      role: data.role as Role,
      module: data.module,
      can_view: data.can_view,
      can_create: data.can_create,
      can_edit: data.can_edit,
      can_delete: data.can_delete,
      updated_at: new Date().toISOString(),
    };

    if (data.id) {
      payload.id = data.id;
    }

    const { error } = await context.supabase
      .from("module_permissions")
      .upsert(payload);

    if (error) throw new Error(error.message);
    return { success: true };
  });

export const getUserRolesList = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_roles")
      .select("*, profiles:user_id(email, full_name)");

    if (error) throw new Error(error.message);
    return data;
  });

export const addUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({
      user_id: z.string(),
      role: z.string(),
    }).parse(data)
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("user_roles")
      .insert({
        user_id: data.user_id,
        role: data.role as Role,
      });

    if (error) throw new Error(error.message);
    return { success: true };
  });

export const removeUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({
      id: z.string(),
    }).parse(data)
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("user_roles")
      .delete()
      .eq("id", data.id);

    if (error) throw new Error(error.message);
    return { success: true };
  });
