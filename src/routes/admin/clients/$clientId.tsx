import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { useState } from 'react';
import { toast } from 'sonner';
import { getClientDetail } from '@/lib/users.functions';
import { getSecureDownloadUrl } from '@/lib/documents.functions';
import { supabase } from '@/integrations/supabase/client';
import { useRBAC } from '@/hooks/useRBAC';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import {
  ChevronLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  ShoppingBag,
  FileText,
  FolderOpen,
  MessageSquare,
  ExternalLink,
  Loader2,
  Briefcase,
  CheckSquare,
  Plus,
  Pencil,
  Trash2,
} from 'lucide-react';

const PROJECT_STATUSES = ['in_progress', 'on_hold', 'completed', 'cancelled'];
const TASK_STATUSES = ['pending', 'completed'];
const TASK_PRIORITIES = ['low', 'medium', 'high'];

function formatLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

interface ClientProjectForm {
  name: string;
  description: string;
  status: string;
  progress: string;
  budget: string;
  currency: string;
  manager_name: string;
  start_date: string;
  due_date: string;
}

const emptyProjectForm: ClientProjectForm = {
  name: '', description: '', status: 'in_progress', progress: '0',
  budget: '', currency: 'USD', manager_name: '', start_date: '', due_date: '',
};

interface ClientTaskForm {
  title: string;
  description: string;
  status: string;
  priority: string;
  due_date: string;
  project_id: string;
}

const emptyTaskForm: ClientTaskForm = {
  title: '', description: '', status: 'pending', priority: 'medium', due_date: '', project_id: 'none',
};

export const Route = createFileRoute('/admin/clients/$clientId')({
  component: ClientDetailPage,
});

function ClientDetailPage() {
  const { clientId } = Route.useParams();
  const { can } = useRBAC();
  const fetchClientDetail = useServerFn(getClientDetail);
  const fetchSecureUrl = useServerFn(getSecureDownloadUrl);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-client-detail', clientId],
    queryFn: () => fetchClientDetail({ data: { clientId } }),
  });

  const invalidateDetail = () => queryClient.invalidateQueries({ queryKey: ['admin-client-detail', clientId] });

  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [projectForm, setProjectForm] = useState<ClientProjectForm>(emptyProjectForm);

  const openCreateProject = () => {
    setEditingProjectId(null);
    setProjectForm(emptyProjectForm);
    setIsProjectDialogOpen(true);
  };
  const openEditProject = (project: NonNullable<typeof data>['projects'][number]) => {
    setEditingProjectId(project.id);
    setProjectForm({
      name: project.name ?? '',
      description: project.description ?? '',
      status: project.status ?? 'in_progress',
      progress: String(project.progress ?? 0),
      budget: project.budget != null ? String(project.budget) : '',
      currency: project.currency ?? 'USD',
      manager_name: project.manager_name ?? '',
      start_date: project.start_date ?? '',
      due_date: project.due_date ?? '',
    });
    setIsProjectDialogOpen(true);
  };

  const saveProjectMutation = useMutation({
    mutationFn: async () => {
      if (!projectForm.name.trim()) throw new Error('Project name is required');
      const payload = {
        user_id: clientId,
        name: projectForm.name.trim(),
        description: projectForm.description || null,
        status: projectForm.status,
        progress: Math.max(0, Math.min(100, Number(projectForm.progress) || 0)),
        budget: projectForm.budget ? Number(projectForm.budget) : null,
        currency: projectForm.currency || 'USD',
        manager_name: projectForm.manager_name || null,
        start_date: projectForm.start_date || null,
        due_date: projectForm.due_date || null,
      };
      const { error } = editingProjectId
        ? await supabase.from('client_projects').update(payload).eq('id', editingProjectId)
        : await supabase.from('client_projects').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(editingProjectId ? 'Project updated' : 'Project assigned to client');
      setIsProjectDialogOpen(false);
      invalidateDetail();
    },
    onError: (err: any) => toast.error(err.message || 'Failed to save project'),
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('client_projects').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Project removed');
      invalidateDetail();
    },
    onError: (err: any) => toast.error(err.message || 'Failed to delete project'),
  });

  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskForm, setTaskForm] = useState<ClientTaskForm>(emptyTaskForm);

  const openCreateTask = () => {
    setEditingTaskId(null);
    setTaskForm(emptyTaskForm);
    setIsTaskDialogOpen(true);
  };
  const openEditTask = (task: NonNullable<typeof data>['tasks'][number]) => {
    setEditingTaskId(task.id);
    setTaskForm({
      title: task.title ?? '',
      description: task.description ?? '',
      status: task.status ?? 'pending',
      priority: task.priority ?? 'medium',
      due_date: task.due_date ?? '',
      project_id: task.project_id ?? 'none',
    });
    setIsTaskDialogOpen(true);
  };

  const saveTaskMutation = useMutation({
    mutationFn: async () => {
      if (!taskForm.title.trim()) throw new Error('Task title is required');
      const payload = {
        user_id: clientId,
        project_id: taskForm.project_id === 'none' ? null : taskForm.project_id,
        title: taskForm.title.trim(),
        description: taskForm.description || null,
        status: taskForm.status,
        priority: taskForm.priority,
        due_date: taskForm.due_date || null,
      };
      const { error } = editingTaskId
        ? await supabase.from('client_tasks').update(payload).eq('id', editingTaskId)
        : await supabase.from('client_tasks').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(editingTaskId ? 'Task updated' : 'Task assigned to client');
      setIsTaskDialogOpen(false);
      invalidateDetail();
    },
    onError: (err: any) => toast.error(err.message || 'Failed to save task'),
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('client_tasks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Task removed');
      invalidateDetail();
    },
    onError: (err: any) => toast.error(err.message || 'Failed to delete task'),
  });

  // file_url is a path inside the private client-documents-vault-private
  // bucket, not a usable URL on its own - same signed-URL exchange
  // admin/documents/index.tsx's handleDownload already does, just opening
  // in a new tab (View) instead of forcing a download.
  const handleView = async (documentId: string) => {
    try {
      setDownloadingId(documentId);
      const { signedUrl } = await fetchSecureUrl({ data: { documentId } });
      window.open(signedUrl, '_blank', 'noreferrer');
    } catch (error: any) {
      toast.error(error.message || 'Failed to open document');
    } finally {
      setDownloadingId(null);
    }
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading client...</div>;
  if (error || !data) return <div className="p-8 text-center text-muted-foreground">Client not found.</div>;

  const { profile, status, last_sign_in_at, orders, invoices, documents, conversations, projects, tasks } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link to="/admin/clients">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold">{profile.full_name || 'No Name'}</h2>
          <p className="text-muted-foreground">Client Profile</p>
        </div>
        {status === 'suspended' ? (
          <Badge variant="destructive" className="ml-auto">Suspended</Badge>
        ) : status === 'active' ? (
          <Badge variant="secondary" className="ml-auto">Active</Badge>
        ) : (
          <Badge variant="outline" className="ml-auto">Invited</Badge>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Contact Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>{profile.email}</span>
            </div>
            {profile.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{profile.phone}</span>
              </div>
            )}
            {profile.location && (
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{profile.location}</span>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>Joined {profile.created_at ? format(new Date(profile.created_at), 'PP') : 'N/A'}</span>
            </div>
            <div className="pt-2 border-t text-xs text-muted-foreground">
              Last login: {last_sign_in_at ? format(new Date(last_sign_in_at), 'PPp') : 'Never'}
            </div>
          </CardContent>
        </Card>

        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ShoppingBag className="h-4 w-4" /> Orders</CardTitle>
              <CardDescription>{orders.length} order{orders.length === 1 ? '' : 's'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {orders.length === 0 ? (
                <p className="text-sm text-muted-foreground">No orders yet.</p>
              ) : (
                orders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg text-sm">
                    <div>
                      <p className="font-medium">${order.amount} {order.currency}</p>
                      <p className="text-xs text-muted-foreground">{order.created_at ? format(new Date(order.created_at), 'PP') : 'N/A'}</p>
                    </div>
                    <Badge variant={order.status === 'completed' ? 'default' : 'outline'}>{order.status}</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileText className="h-4 w-4" /> Invoices</CardTitle>
              <CardDescription>{invoices.length} invoice{invoices.length === 1 ? '' : 's'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {invoices.length === 0 ? (
                <p className="text-sm text-muted-foreground">No invoices yet.</p>
              ) : (
                invoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-3 border rounded-lg text-sm">
                    <div>
                      <p className="font-medium">{invoice.invoice_number}</p>
                      <p className="text-xs text-muted-foreground">${invoice.total_amount} {invoice.currency} &middot; {invoice.issue_date ? format(new Date(invoice.issue_date), 'PP') : 'N/A'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={invoice.status === 'paid' ? 'default' : 'outline'}>{invoice.status}</Badge>
                      <Button variant="ghost" size="icon" asChild>
                        <a href={`/invoices/${invoice.id}`} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FolderOpen className="h-4 w-4" /> Documents</CardTitle>
              <CardDescription>{documents.length} file{documents.length === 1 ? '' : 's'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {documents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No documents shared yet.</p>
              ) : (
                documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg text-sm">
                    <div>
                      <p className="font-medium">{doc.title}</p>
                      <p className="text-xs text-muted-foreground">{doc.created_at ? format(new Date(doc.created_at), 'PP') : 'N/A'}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={downloadingId === doc.id}
                      onClick={() => handleView(doc.id)}
                    >
                      {downloadingId === doc.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ExternalLink className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Conversations</CardTitle>
              <CardDescription>{conversations.length} conversation{conversations.length === 1 ? '' : 's'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {conversations.length === 0 ? (
                <p className="text-sm text-muted-foreground">No conversations yet.</p>
              ) : (
                conversations.map((conv) => (
                  <Link
                    key={conv.id}
                    to="/admin/chat"
                    className="flex items-center justify-between p-3 border rounded-lg text-sm hover:bg-muted/50 transition-colors"
                  >
                    <p className="font-medium">{conv.title || 'Direct Message'}</p>
                    <p className="text-xs text-muted-foreground">
                      {conv.last_message_at ? format(new Date(conv.last_message_at), 'PP') : 'N/A'}
                    </p>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2"><Briefcase className="h-4 w-4" /> Projects</CardTitle>
                <CardDescription>{projects.length} project{projects.length === 1 ? '' : 's'}</CardDescription>
              </div>
              {can('clients', 'create') && (
                <Button size="sm" variant="outline" className="gap-2" onClick={openCreateProject}>
                  <Plus className="h-4 w-4" /> Add Project
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {projects.length === 0 ? (
                <p className="text-sm text-muted-foreground">No projects assigned yet.</p>
              ) : (
                projects.map((project) => (
                  <div key={project.id} className="p-3 border rounded-lg text-sm space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{project.name}</p>
                        {project.description && <p className="text-xs text-muted-foreground">{project.description}</p>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Badge variant="outline">{formatLabel(project.status)}</Badge>
                        {can('clients', 'edit') && (
                          <Button variant="ghost" size="icon" onClick={() => openEditProject(project)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {can('clients', 'delete') && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              if (confirm('Remove this project from the client?')) deleteProjectMutation.mutate(project.id);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <Progress value={project.progress} />
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>{project.progress}% complete</span>
                      {project.manager_name && <span>Manager: {project.manager_name}</span>}
                      {project.due_date && <span>Due {project.due_date}</span>}
                      {project.budget != null && <span>{project.currency} {Number(project.budget).toLocaleString()}</span>}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2"><CheckSquare className="h-4 w-4" /> Tasks</CardTitle>
                <CardDescription>{tasks.length} task{tasks.length === 1 ? '' : 's'}</CardDescription>
              </div>
              {can('clients', 'create') && (
                <Button size="sm" variant="outline" className="gap-2" onClick={openCreateTask}>
                  <Plus className="h-4 w-4" /> Add Task
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-2">
              {tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tasks assigned yet.</p>
              ) : (
                tasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between gap-2 p-3 border rounded-lg text-sm">
                    <div>
                      <p className={task.status === 'completed' ? 'font-medium line-through text-muted-foreground' : 'font-medium'}>{task.title}</p>
                      {task.description && <p className="text-xs text-muted-foreground">{task.description}</p>}
                      {task.due_date && <p className="text-xs text-muted-foreground">Due {task.due_date}</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Badge variant="outline">{formatLabel(task.priority)}</Badge>
                      <Badge variant={task.status === 'completed' ? 'default' : 'outline'}>{formatLabel(task.status)}</Badge>
                      {can('clients', 'edit') && (
                        <Button variant="ghost" size="icon" onClick={() => openEditTask(task)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {can('clients', 'delete') && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm('Remove this task from the client?')) deleteTaskMutation.mutate(task.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isProjectDialogOpen} onOpenChange={setIsProjectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingProjectId ? 'Edit Project' : 'Assign New Project'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Project Name</Label>
              <Input value={projectForm.name} onChange={(e) => setProjectForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Website Redesign" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={projectForm.description} onChange={(e) => setProjectForm((p) => ({ ...p, description: e.target.value }))} placeholder="Project summary for the client" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={projectForm.status} onValueChange={(v) => setProjectForm((p) => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROJECT_STATUSES.map((s) => <SelectItem key={s} value={s}>{formatLabel(s)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Progress (%)</Label>
                <Input type="number" min={0} max={100} value={projectForm.progress} onChange={(e) => setProjectForm((p) => ({ ...p, progress: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Budget</Label>
                <Input type="number" value={projectForm.budget} onChange={(e) => setProjectForm((p) => ({ ...p, budget: e.target.value }))} placeholder="Optional" />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Input value={projectForm.currency} onChange={(e) => setProjectForm((p) => ({ ...p, currency: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Manager Name</Label>
              <Input value={projectForm.manager_name} onChange={(e) => setProjectForm((p) => ({ ...p, manager_name: e.target.value }))} placeholder="Optional" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" value={projectForm.start_date} onChange={(e) => setProjectForm((p) => ({ ...p, start_date: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input type="date" value={projectForm.due_date} onChange={(e) => setProjectForm((p) => ({ ...p, due_date: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full" onClick={() => saveProjectMutation.mutate()} disabled={saveProjectMutation.isPending}>
              {saveProjectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingProjectId ? 'Save Changes' : 'Assign Project'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTaskId ? 'Edit Task' : 'Assign New Task'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={taskForm.title} onChange={(e) => setTaskForm((t) => ({ ...t, title: e.target.value }))} placeholder="e.g. Provide brand assets" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={taskForm.description} onChange={(e) => setTaskForm((t) => ({ ...t, description: e.target.value }))} placeholder="What the client needs to do" />
            </div>
            <div className="space-y-2">
              <Label>Related Project</Label>
              <Select value={taskForm.project_id} onValueChange={(v) => setTaskForm((t) => ({ ...t, project_id: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">General (no project)</SelectItem>
                  {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={taskForm.priority} onValueChange={(v) => setTaskForm((t) => ({ ...t, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TASK_PRIORITIES.map((p) => <SelectItem key={p} value={p}>{formatLabel(p)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={taskForm.status} onValueChange={(v) => setTaskForm((t) => ({ ...t, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TASK_STATUSES.map((s) => <SelectItem key={s} value={s}>{formatLabel(s)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input type="date" value={taskForm.due_date} onChange={(e) => setTaskForm((t) => ({ ...t, due_date: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full" onClick={() => saveTaskMutation.mutate()} disabled={saveTaskMutation.isPending}>
              {saveTaskMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingTaskId ? 'Save Changes' : 'Assign Task'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
