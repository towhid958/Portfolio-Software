import { createFileRoute } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';

interface SitemapEntry {
  loc: string;
  lastmod?: string | null;
}

// Every published row across these tables gets one URL each - all five
// share the same slug/status/updated_at shape (see the individual public
// listing queries this mirrors: blog/index.tsx, GigsListing.tsx,
// ProjectsListing.tsx, services.tsx, pages.functions.ts), so one query
// shape covers all of them instead of five bespoke ones.
const CONTENT_SOURCES: Array<{ table: 'blog_posts' | 'gigs' | 'projects' | 'services'; base: string }> = [
  { table: 'blog_posts', base: '/blog' },
  { table: 'gigs', base: '/gigs' },
  { table: 'projects', base: '/projects' },
  { table: 'services', base: '/services' },
];

// Static, always-public pages that aren't rows in any content table.
const STATIC_PATHS = ['/', '/blog', '/gigs', '/projects', '/services', '/partners'];

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function entryToXml(entry: SitemapEntry): string {
  const lastmod = entry.lastmod ? `<lastmod>${entry.lastmod.slice(0, 10)}</lastmod>` : '';
  return `<url><loc>${escapeXml(entry.loc)}</loc>${lastmod}</url>`;
}

export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: async () => {
        const siteUrl = (process.env['FRONTEND_URL'] || 'http://localhost:8080').replace(/\/$/, '');

        const entries: SitemapEntry[] = STATIC_PATHS.map((path) => ({ loc: `${siteUrl}${path}` }));

        const contentResults = await Promise.all(
          CONTENT_SOURCES.map(({ table }) =>
            supabase.from(table).select('slug, updated_at').eq('status', 'published'),
          ),
        );

        contentResults.forEach((result, i) => {
          const { base } = CONTENT_SOURCES[i]!;
          for (const row of result.data ?? []) {
            entries.push({ loc: `${siteUrl}${base}/${row.slug}`, lastmod: row.updated_at });
          }
        });

        // Custom pages built in the page builder - published only, same
        // rule getPageBySlug applies for the public $slug.tsx route.
        // published_at (not updated_at) - updated_at now also bumps on a
        // plain draft save that never touches the live content, which
        // would otherwise claim a stale lastmod changed when nothing public
        // actually did.
        const { data: pages } = await supabase.from('pages').select('slug, updated_at, published_at').eq('status', 'published');
        for (const row of pages ?? []) {
          entries.push({ loc: `${siteUrl}/${row.slug}`, lastmod: row.published_at ?? row.updated_at });
        }

        // Category listing pages (/blog/category/:slug etc.) - these are
        // real, indexable routes (BlogListing/GigsListing/ProjectsListing
        // filtered by category) that were previously missing entirely.
        const CATEGORY_SOURCES: Array<{ table: 'blog_categories' | 'gig_categories' | 'project_categories'; base: string }> = [
          { table: 'blog_categories', base: '/blog/category' },
          { table: 'gig_categories', base: '/gigs/category' },
          { table: 'project_categories', base: '/projects/category' },
        ];
        const categoryResults = await Promise.all(
          CATEGORY_SOURCES.map(({ table }) => supabase.from(table).select('slug')),
        );
        categoryResults.forEach((result, i) => {
          const { base } = CATEGORY_SOURCES[i]!;
          for (const row of result.data ?? []) {
            entries.push({ loc: `${siteUrl}${base}/${row.slug}` });
          }
        });

        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.map(entryToXml).join('\n')}\n</urlset>`;

        return new Response(xml, {
          headers: {
            'Content-Type': 'application/xml',
            'Cache-Control': 'public, max-age=3600',
          },
        });
      },
    },
  },
});
