import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Briefcase, Calendar, User } from 'lucide-react';

export const Route = createFileRoute('/dashboard/projects')({
  component: ProjectsPage,
});

const statusStyles: Record<string, string> = {
  in_progress: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  completed: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  on_hold: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
};

function formatStatus(status: string) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function ProjectsPage() {
  const { data: projects, isLoading } = useQuery({
    queryKey: ['client-projects'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return [];
      const { data, error } = await supabase
        .from('client_projects')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Active Projects</h2>
        <p className="text-muted-foreground">Track the status of your ongoing and completed projects.</p>
      </div>

      {isLoading ? (
        <Card className="p-12 text-center text-muted-foreground">Loading projects…</Card>
      ) : !projects || projects.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center space-y-4">
          <Briefcase className="h-12 w-12 text-muted-foreground opacity-20" />
          <h3 className="text-lg font-semibold">No Projects Found</h3>
          <p className="text-muted-foreground max-w-xs">You don't have any active projects yet. Once you purchase a gig or start a service, it will appear here.</p>
        </Card>
      ) : (
        <div className="grid gap-6">
          {projects.map((project) => (
            <Card key={project.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                <div className="space-y-1">
                  <CardTitle className="text-xl">{project.name}</CardTitle>
                  <CardDescription>{project.description}</CardDescription>
                </div>
                <Badge variant="outline" className={statusStyles[project.status] ?? ''}>
                  {formatStatus(project.status)}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{project.progress}%</span>
                  </div>
                  <Progress value={project.progress} />
                </div>
                <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" /> {project.manager_name ?? 'Unassigned'}
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> Due {project.due_date ?? '—'}
                  </div>
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    {project.budget != null ? `${project.currency} ${Number(project.budget).toLocaleString()}` : '—'}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
