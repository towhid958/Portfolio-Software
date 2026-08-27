import { createFileRoute } from '@tanstack/react-router';
import { BlogListing } from '@/components/blog/BlogListing';

export const Route = createFileRoute('/blog/category/$slug')({
  component: BlogCategoryPage,
});

function BlogCategoryPage() {
  const { slug } = Route.useParams();
  return <BlogListing categorySlug={slug} />;
}
