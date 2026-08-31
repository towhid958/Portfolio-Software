import { useMemo } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { getPageBySlug } from '@/lib/pages.functions';
import { getThemeSettings } from '@/lib/theme.functions';
import { createEmptyDocument, flattenOrder, isPageDocument } from '@/lib/builder/document';
import { generateDocumentCss, minifyDocumentCss } from '@/lib/builder/styleGenerator';
import { BASE_ELEMENT_CSS } from '@/lib/builder/cssVars';
import { buildGoogleFontsHref, collectUsedGoogleFontQueries } from '@/lib/builder/fonts';
import { themeColorMap, themeFontMap, defaultThemeSettings } from '@/lib/builder/theme';
import { ENABLED_BREAKPOINTS } from '@/lib/builder/breakpoints';
import { ElementRenderer } from '@/components/builder/ElementRenderer';
import '@/components/builder/widgets';

export const Route = createFileRoute('/$slug')({
  loader: async ({ params }) => {
    const [page, theme] = await Promise.all([getPageBySlug({ data: params.slug }), getThemeSettings()]);
    return { page, theme };
  },
  head: ({ loaderData, params }) => {
    const page = loaderData?.page;
    const theme = loaderData?.theme ?? defaultThemeSettings();
    if (!page) return { meta: [{ title: 'Page Not Found | Hasan Kamrul' }] };

    const title = page.seo_title || `${page.title} | Hasan Kamrul`;
    const description = page.seo_description || '';
    const image = page.og_image || '';
    // head() runs both server-side (SSR) and client-side (SPA navigation),
    // and FRONTEND_URL is a server-only env var (no VITE_ prefix, so it's
    // never bundled for the browser) - window.location.origin is what's
    // actually reliable on the client, so prefer it there and only fall
    // back to FRONTEND_URL for the server render.
    const origin =
      typeof window !== 'undefined' ? window.location.origin : process.env['FRONTEND_URL'] || 'http://localhost:8080';
    const canonicalUrl = `${origin.replace(/\/$/, '')}/${params.slug}`;

    const meta: any[] = [
      { title },
      { name: 'description', content: description },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: canonicalUrl },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
    ];

    if (image) {
      meta.push({ property: 'og:image', content: image });
      meta.push({ name: 'twitter:image', content: image });
    }

    // Computed at head-time (not in the component) so the font stylesheet
    // is part of the initial SSR response rather than a client-side
    // afterthought - avoids a flash of the fallback font on first paint.
    const pageDoc = isPageDocument(page.sections) ? page.sections : null;
    const fontsHref = pageDoc ? buildGoogleFontsHref(collectUsedGoogleFontQueries(pageDoc.nodes, theme.fonts)) : null;
    const links: any[] = [{ rel: 'canonical', href: canonicalUrl }];
    if (fontsHref) links.push({ rel: 'stylesheet', href: fontsHref });

    // 'script:ld+json' is TanStack Router's own recognized meta-entry shape
    // for structured data - HeadContent special-cases it into a real
    // <script type="application/ld+json"> tag (JSON.stringify + HTML-escape
    // handled internally), which is what actually renders it; the generic
    // `scripts` field this route used to return isn't read by HeadContent
    // at all (it reads `headScripts` instead), so it silently rendered nothing.
    meta.push({
      'script:ld+json': {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: title,
        description: description || undefined,
        url: canonicalUrl,
        image: image || undefined,
      },
    });

    return { meta, links };
  },
  component: CustomPage,
});

function CustomPage() {
  const { page, theme } = Route.useLoaderData();

  // ENABLED_BREAKPOINTS (not the editor's single simulated-width canvas) -
  // this is a real browser viewport, so the generated @media queries apply
  // against the actual screen width exactly as authored.
  const doc = useMemo(() => {
    if (!page) return null;
    return isPageDocument(page.sections) ? page.sections : createEmptyDocument();
  }, [page]);

  const css = useMemo(() => {
    if (!doc) return '';
    const order = flattenOrder(doc);
    const themeTokens = { colors: themeColorMap(theme), fonts: themeFontMap(theme) };
    const raw = `${BASE_ELEMENT_CSS}\n\n${generateDocumentCss(doc.nodes, order, ENABLED_BREAKPOINTS, themeTokens)}`;
    return minifyDocumentCss(raw);
  }, [doc, theme]);

  if (!page) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
        <div className="w-full max-w-md text-center">
          <div className="mb-8 flex justify-center">
            <div className="relative">
              <h1 className="text-9xl font-bold tracking-tighter text-muted-foreground/20">404</h1>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold tracking-tight text-foreground uppercase">Lost in Space</span>
              </div>
            </div>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Page not found.</h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            This page doesn't exist or hasn't been published yet.
          </p>
          <div className="mt-10">
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-full bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:scale-105 hover:bg-primary/90 active:scale-95"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{css}</style>
      {/* Entrance animations only ever get revealed by an IntersectionObserver
          in ElementRenderer - with JS disabled entirely that never runs, so
          without this an animated element would stay at opacity:0 forever.
          Browsers only apply <noscript> content when JS is off, so this is a
          no-op the rest of the time. */}
      <noscript>
        <style>{'[class*="builder-anim-"]{opacity:1!important;transform:none!important;}'}</style>
      </noscript>
      {doc && <ElementRenderer doc={doc} id={doc.rootId} />}
    </>
  );
}
