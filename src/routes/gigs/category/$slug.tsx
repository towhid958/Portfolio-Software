import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router';
import { GigsListing } from '@/components/gigs/GigsListing';
import { gigSearchSchema, type GigSearch } from '@/lib/gigSearch';

export const Route = createFileRoute('/gigs/category/$slug')({
  validateSearch: (search) => gigSearchSchema.parse(search),
  component: GigsCategoryPage,
});

function GigsCategoryPage() {
  const { slug } = Route.useParams();
  const search = useSearch({ from: '/gigs/category/$slug' });
  const navigate = useNavigate({ from: '/gigs/category/$slug' });

  const onSearchChange = (updater: (prev: GigSearch) => GigSearch) => {
    navigate({ search: updater });
  };

  return <GigsListing categorySlug={slug} search={search} onSearchChange={onSearchChange} />;
}
