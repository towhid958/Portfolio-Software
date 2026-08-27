import { createFileRoute, useSearch } from '@tanstack/react-router';
import { z } from 'zod';
import { BlogListing } from '@/components/blog/BlogListing';

const blogSearchSchema = z.object({
  q: z.string().optional(),
});

export const Route = createFileRoute('/blog/')({
  validateSearch: (search) => blogSearchSchema.parse(search),
  component: BlogListingPage,
});

function BlogListingPage() {
  const { q } = useSearch({ from: '/blog/' });
  return <BlogListing q={q} />;
}
