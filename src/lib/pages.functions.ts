import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

// Only these - never draft_sections - are visible to a plain public visitor.
// draft_sections can hold unpublished/in-progress content, so leaking it
// through the public route (even just in the JSON payload, unrendered)
// would defeat the whole point of the draft/live split.
const PUBLIC_PAGE_COLUMNS = 'id, title, slug, status, sections, seo_title, seo_description, og_image, created_at, updated_at';

export const getPageBySlug = createServerFn({ method: "GET" })
  .validator((input: string | { slug: string; preview?: boolean | undefined }) =>
    typeof input === "string" ? { slug: input, preview: false } : input
  )
  .handler(async ({ data }) => {
    const { slug, preview } = data;

    // Preview: an admin/editor viewing the current draft - including a
    // published page's unpublished edits - before it goes live. Scoped to
    // the caller's own session (see getSSRSupabaseClient) so RLS - not app
    // code - is what decides whether they're allowed to see it; a plain
    // visitor hitting the same ?preview=true link has no session and falls
    // straight through to the published-only lookup below, same as if
    // they'd never passed it.
    // Dynamic import: this file ships to the client bundle (unlike *.server.ts
    // modules), so the cookie/session-reading code must stay out of it unless
    // actually needed.
    if (preview) {
      const { getSSRSupabaseClient } = await import("@/integrations/supabase/ssr-session.server");
      const client = getSSRSupabaseClient();
      if (client) {
        const { data: page } = await client.from("pages").select("*").eq("slug", slug).maybeSingle();
        // Renders the draft, not whatever's currently live - draft_sections
        // is null only for a page that's never been saved since the column
        // was added, in which case sections (its last-known content) is the
        // closest thing to a draft it has.
        if (page) return { ...page, sections: page.draft_sections ?? page.sections };
      }
    }

    const { data: page, error } = await supabase
      .from('pages')
      .select(PUBLIC_PAGE_COLUMNS)
      .eq('slug', slug)
      .eq('status', 'published')
      .single();

    if (error) {
      return null;
    }
    return page;
  });
