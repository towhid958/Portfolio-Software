import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/robots.txt')({
  server: {
    handlers: {
      GET: async () => {
        const siteUrl = (process.env['FRONTEND_URL'] || 'http://localhost:8080').replace(/\/$/, '');

        const body = [
          'User-agent: *',
          'Allow: /',
          'Disallow: /admin',
          'Disallow: /dashboard',
          'Disallow: /api',
          'Disallow: /checkout',
          `Sitemap: ${siteUrl}/sitemap.xml`,
          '',
        ].join('\n');

        return new Response(body, {
          headers: {
            'Content-Type': 'text/plain',
            'Cache-Control': 'public, max-age=3600',
          },
        });
      },
    },
  },
});
