import { createFileRoute } from '@tanstack/react-router';
import { ProjectsListing } from '@/components/projects/ProjectsListing';

export const Route = createFileRoute('/projects/')({
  component: ProjectsPage,
});

function ProjectsPage() {
  return <ProjectsListing />;
}
