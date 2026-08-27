import { createFileRoute } from '@tanstack/react-router';
import { ProjectsListing } from '@/components/projects/ProjectsListing';

export const Route = createFileRoute('/projects/category/$slug')({
  component: ProjectsCategoryPage,
});

function ProjectsCategoryPage() {
  const { slug } = Route.useParams();
  return <ProjectsListing categorySlug={slug} />;
}
