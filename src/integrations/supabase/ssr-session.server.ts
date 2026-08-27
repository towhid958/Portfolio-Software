import { createServerOnlyFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

function getAccessTokenFromCookies(): string | null {
  const cookieHeader = getRequest()?.headers?.get("cookie") ?? null;
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/(?:^|;\s*)sb-access-token=([^;]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

// SSR counterpart to the access-token cookie mirrored by
// withSessionCookieMirror (see client.ts / cookie-mirror.ts). During
// server-side rendering, route guards (beforeLoad) have no access to the
// browser's localStorage - without this, every full-page refresh of a
// protected route looks logged-out to the server and incorrectly bounces
// an already-logged-in user back to /auth.
export const getSSRAuth = createServerOnlyFn(async (): Promise<{ userId: string; roles: string[] } | null> => {
  const accessToken = getAccessTokenFromCookies();
  if (!accessToken) return null;

  const SUPABASE_URL = process.env["SUPABASE_URL"];
  const SUPABASE_PUBLISHABLE_KEY = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) return null;

  // Anon-key client scoped to the caller's own JWT, so RLS (has_role(auth.uid(), ...))
  // evaluates against the real caller - never the service role.
  const client = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });

  const { data: claims, error } = await client.auth.getClaims(accessToken);
  if (error || !claims?.claims?.sub) return null;

  const userId = claims.claims.sub as string;
  const { data: roleRows } = await client
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  return {
    userId,
    roles: roleRows?.map((r) => r.role) ?? [],
  };
});
