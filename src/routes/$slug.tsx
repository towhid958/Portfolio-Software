import { useMemo } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { getPageBySlug } from '@/lib/pages.functions';
import { createEmptyDocument, flattenOrder, isPageDocument } from '@/lib/builder/document';
import { generateDocumentCss, minifyDocumentCss } from '@/lib/builder/styleGenerator';
import { BASE_ELEMENT_CSS } from '@/lib/builder/cssVars';
import { buildGoogleFontsHref, collectUsedGoogleFontQueries } from '@/lib/builder/fonts';
import { ENABLED_BREAKPOINTS } from '@/lib/builder/breakpoints';
import { ElementRenderer } from '@/components/builder/ElementRenderer';
import '@/components/builder/widgets';

export const Route = createFileRoute('/$slug')({
  loader: ({ params }) => getPageBySlug({ data: params.slug }),
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: 'Page Not Found | Hasan Kamrul' }] };

    const title = loaderData.seo_title || `${loaderData.title} | Hasan Kamrul`;
    const description = loaderData.seo_description || '';
    const image = loaderData.og_image || '';

    const meta: any[] = [
      { title },
      { name: 'description', content: description },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:type', content: 'website' },
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
    const pageDoc = isPageDocument(loaderData.sections) ? loaderData.sections : null;
    const fontsHref = pageDoc ? buildGoogleFontsHref(collectUsedGoogleFontQueries(pageDoc.nodes)) : null;
    const links = fontsHref ? [{ rel: 'stylesheet', href: fontsHref }] : [];

    return { meta, links };
  },
  component: CustomPage,
});

function CustomPage() {
  const page = Route.useLoaderData();

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
    const raw = `${BASE_ELEMENT_CSS}\n\n${generateDocumentCss(doc.nodes, order, ENABLED_BREAKPOINTS)}`;
    return minifyDocumentCss(raw);
  }, [doc]);

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
      {doc && <ElementRenderer doc={doc} id={doc.rootId} />}
    </>
  );
}
