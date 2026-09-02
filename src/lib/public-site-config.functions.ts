import { createServerFn } from "@tanstack/react-start";

const PUBLIC_KEYS = [
  "public_email",
  "contact_phone",
  "business_address",
  "privacy_policy_url",
  "ga_measurement_id",
  "max_upload_mb",
  "allowed_file_types",
  "signed_link_minutes",
  "docs_log_downloads",
] as const;

export interface PublicSiteConfig {
  publicEmail: string | null;
  contactPhone: string | null;
  businessAddress: string | null;
  privacyPolicyUrl: string | null;
  gaMeasurementId: string | null;
  /** Settings > Documents > "Max upload size (MB)" - also read here (not just via getSiteConfiguration) because DocumentUpload.tsx runs for the 'editor' role too, and site_configuration's RLS is admin/super_admin only. */
  maxUploadMb: number | null;
  /** Settings > Documents > "Allowed file types" - comma-separated extensions, e.g. "pdf, png, jpg". */
  allowedFileTypes: string | null;
  /** Settings > Documents > "Signed link lifetime (minutes)" - how long a document's secure download URL stays valid. */
  signedLinkMinutes: number | null;
  /** Settings > Documents > "Log every download" - whether a document download gets its own activity_logs row. Defaults to on. */
  logDownloads: boolean;
}

/**
 * A hand-picked, public-safe slice of site_configuration - that table's own
 * RLS is admin-only (no anon/public policy at all), so a plain client-side
 * query from a public page (Footer, root route) would just fail. Reads via
 * the service-role client instead and returns only these specific keys,
 * rather than opening the whole table (which also holds things like
 * password-policy settings) to public read.
 */
export const getPublicSiteConfig = createServerFn({ method: "GET" }).handler(async (): Promise<PublicSiteConfig> => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("site_configuration").select("key, value").in("key", PUBLIC_KEYS);

  const raw = Object.fromEntries((data ?? []).map((row) => [row.key, row.value])) as Record<string, unknown>;
  const str = (key: string): string | null => (typeof raw[key] === "string" && raw[key] ? (raw[key] as string) : null);
  const num = (key: string): number | null => (typeof raw[key] === "number" ? (raw[key] as number) : null);

  return {
    publicEmail: str("public_email"),
    contactPhone: str("contact_phone"),
    businessAddress: str("business_address"),
    privacyPolicyUrl: str("privacy_policy_url"),
    gaMeasurementId: str("ga_measurement_id"),
    maxUploadMb: num("max_upload_mb"),
    allowedFileTypes: str("allowed_file_types"),
    signedLinkMinutes: num("signed_link_minutes"),
    logDownloads: raw["docs_log_downloads"] !== false,
  };
});

/**
 * Just the one flag the pre-auth email-verification gates need
 * (admin/route.tsx, auth.callback.tsx, dashboard/route.tsx) - checked at a
 * point where the signing-in user has a valid session but (by definition,
 * for an unconfirmed account) no assigned role yet, so RLS would block
 * even their own read of site_configuration. Defaults to true (the
 * previous hardcoded, unconditional behavior) when unset, so an empty
 * config doesn't accidentally turn verification off.
 */
export const getRequireEmailVerification = createServerFn({ method: "GET" }).handler(async (): Promise<boolean> => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("site_configuration")
    .select("value")
    .eq("key", "require_email_verification")
    .maybeSingle();
  return data?.value !== false;
});
