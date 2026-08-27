import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckSquare, Circle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export const Route = createFileRoute('/dashboard/tasks')({
  component: TasksPage,
});

const priorityStyles: Record<string, string> = {
  high: 'bg-destructive/10 text-destructive border-destructive/20',
  medium: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  low: 'bg-muted text-muted-foreground',
};

function TasksPage() {
  const queryClient = useQueryClient();

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['client-tasks'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return [];
      const { data, error } = await supabase
        .from('client_tasks')
        .select('*, client_projects(name)')
        .eq('user_id', session.user.id)
        .order('due_date', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const toggleTask = async (id: string, status: string) => {
    const next = status === 'completed' ? 'pending' : 'completed';
    const { error } = await supabase.from('client_tasks').update({ status: next }).eq('id', id);
    if (error) {
      toast.error('Could not update task');
      return;
    }
    toast.success(next === 'completed' ? 'Task marked complete' : 'Task reopened');
    queryClient.invalidateQueries({ queryKey: ['client-tasks'] });
  };

  const pending = tasks?.filter((t) => t.status !== 'completed') ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Task List</h2>
        <p className="text-muted-foreground">
          {pending.length > 0
            ? `You have ${pending.length} task${pending.length === 1 ? '' : 's'} awaiting your action.`
            : 'Review and complete tasks required for your project success.'}
        </p>
      </div>

      {isLoading ? (
        <Card className="p-12 text-center text-muted-foreground">Loading tasks…</Card>
      ) : !tasks || tasks.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center space-y-4">
          <CheckSquare className="h-12 w-12 text-muted-foreground opacity-20" />
          <h3 className="text-lg font-semibold">No Pending Tasks</h3>
          <p className="text-muted-foreground max-w-xs">Everything is up to date! Check back later for any new requirements from your project manager.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const done = task.status === 'completed';
            return (
              <Card key={task.id} className={done ? 'opacity-60' : ''}>
                <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-3">
                  <div className="space-y-1">
                    <CardTitle className={`text-base ${done ? 'line-through' : ''}`}>{task.title}</CardTitle>
                    <CardDescription>
                      {(task.client_projects as { name: string } | null)?.name ?? 'General'}
                      {task.due_date ? ` · Due ${task.due_date}` : ''}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className={priorityStyles[task.priority] ?? ''}>
                    {task.priority}
                  </Badge>
                </CardHeader>
                <CardContent className="flex items-center justify-between gap-4">
                  <p className="text-sm text-muted-foreground">{task.description}</p>
                  <Button size="sm" variant={done ? 'outline' : 'default'} onClick={() => toggleTask(task.id, task.status)}>
                    {done ? <CheckCircle2 className="mr-2 h-4 w-4" /> : <Circle className="mr-2 h-4 w-4" />}
                    {done ? 'Completed' : 'Mark done'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
