import { createFileRoute } from '@tanstack/react-router';
import { ProjectForm } from '@/components/admin/ProjectForm';

export const Route = createFileRoute('/admin/projects/new')({
  component: RouteComponent,
});

function RouteComponent() {
  return <ProjectForm />;
}
