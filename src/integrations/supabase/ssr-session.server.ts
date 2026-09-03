import { createServerOnlyFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { mapDbPermissionRows, type DbPermissions } from "@/lib/rbac";
import { supabaseAdmin } from "./client.server";

function getAccessTokenFromCookies(): string | null {
  const cookieHeader = getRequest()?.headers?.get("cookie") ?? null;
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/(?:^|;\s*)sb-access-token=([^;]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

// Anon-key client scoped to the caller's own JWT (from the mirrored session
// cookie - see withSessionCookieMirror in client.ts / cookie-mirror.ts), so
// RLS (has_role(auth.uid(), ...)) evaluates against the real caller, never
// the service role. Returns null when there's no session to scope to, e.g.
// an anonymous visitor's SSR request.
export const getSSRSupabaseClient = createServerOnlyFn((): SupabaseClient<Database> | null => {
  const accessToken = getAccessTokenFromCookies();
  if (!accessToken) return null;

  const SUPABASE_URL = process.env["SUPABASE_URL"];
  const SUPABASE_PUBLISHABLE_KEY = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) return null;

  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
});

// SSR counterpart to the access-token cookie mirrored by
// withSessionCookieMirror (see client.ts / cookie-mirror.ts). During
// server-side rendering, route guards (beforeLoad) have no access to the
// browser's localStorage - without this, every full-page refresh of a
// protected route looks logged-out to the server and incorrectly bounces
// an already-logged-in user back to /auth.
export const getSSRAuth = createServerOnlyFn(
  async (): Promise<{ userId: string; roles: string[]; dbPermissions: DbPermissions; emailConfirmed: boolean } | null> => {
    const client = getSSRSupabaseClient();
    if (!client) return null;

    const accessToken = getAccessTokenFromCookies();
    if (!accessToken) return null;

    const { data: claims, error } = await client.auth.getClaims(accessToken);
    if (error || !claims?.claims?.sub) return null;

    const userId = claims.claims.sub as string;
    // Fetched alongside roles (not just roles alone) so a route guard on
    // the server - which has no access to the client-only useRBAC context -
    // can still resolve the same admin-editable module_permissions
    // overrides that the React-side `can()` does. See admin/route.tsx's
    // beforeLoad, which builds a `can` function from this and hands it to
    // every child route via context.
    //
    // email_confirmed_at isn't a JWT claim, so it's fetched via the admin
    // API (service role) rather than derived from the token - previously
    // the SSR branch of admin/route.tsx and dashboard/route.tsx skipped the
    // email-verification gate entirely, since this function had no way to
    // answer that question at all.
    const [{ data: roleRows }, { data: permRows }, { data: authUser }] = await Promise.all([
      client.from("user_roles").select("role").eq("user_id", userId),
      client.from("module_permissions").select("*"),
      supabaseAdmin.auth.admin.getUserById(userId),
    ]);

    return {
      userId,
      roles: roleRows?.map((r) => r.role) ?? [],
      dbPermissions: mapDbPermissionRows(permRows ?? []),
      emailConfirmed: !!authUser?.user?.email_confirmed_at,
    };
  }
);
