import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logActivity } from '@/utils/audit';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Plus, Edit, Trash2, Search, ExternalLink, Lock, Download, FolderOpen } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRBAC } from '@/hooks/useRBAC';
import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { BulkEditDialog } from '@/components/admin/BulkEditDialog';
import { ManageCategoriesDialog } from '@/components/admin/ManageCategoriesDialog';
import { exportToCSV } from '@/lib/csv-export';
import { usePagination } from '@/hooks/usePagination';
import { ListPagination } from '@/components/admin/ListPagination';
import { format } from 'date-fns';

export const Route = createFileRoute('/admin/projects/')({
  component: ProjectsList,
});

function ProjectsList() {
  const { can, isLoading: rbacLoading } = useRBAC();
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: projects, isLoading } = useQuery({
    queryKey: ['admin-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*, project_categories(name)')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ['admin-project-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_categories')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (error) throw error;
      await logActivity('projects', 'delete_project', { id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-projects'] });
      toast.success('Project deleted successfully');
    },
    onError: (error) => {
      toast.error(`Error deleting project: ${error.message}`);
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error: logError } = await supabase.from('activity_logs').insert({
        module: 'projects',
        action: 'bulk_delete',
        details: { ids } as any,
        user_id: (await supabase.auth.getUser()).data.user?.id || null
      } as any);
      if (logError) console.error('Error logging activity:', logError);

      const { error } = await supabase.from('projects').delete().in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-projects'] });
      toast.success(`${selectedIds.length} projects deleted successfully`);
      setSelectedIds([]);
    },
    onError: (error) => {
      toast.error(`Error deleting projects: ${error.message}`);
    },
  });

  const bulkStatusMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      const { error: logError } = await supabase.from('activity_logs').insert({
        module: 'projects',
        action: `bulk_status_${status}`,
        details: { ids, status } as any,
        user_id: (await supabase.auth.getUser()).data.user?.id || null
      } as any);
      if (logError) console.error('Error logging activity:', logError);

      const { error } = await supabase.from('projects').update({ status }).in('id', ids);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-projects'] });
      toast.success(`${selectedIds.length} projects marked as ${variables.status}`);
      setSelectedIds([]);
    },
    onError: (error) => {
      toast.error(`Error updating projects: ${error.message}`);
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ ids, values }: { ids: string[]; values: any }) => {
      const { error } = await supabase.from('projects').update(values as any).in('id', ids);
      if (error) throw error;
      await logActivity('projects', 'bulk_update', { ids, values });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-projects'] });
      toast.success(`${selectedIds.length} projects updated successfully`);
      setSelectedIds([]);
      setIsBulkEditOpen(false);
    },
    onError: (error) => {
      toast.error(`Error updating projects: ${error.message}`);
    },
  });

  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);

  const filteredProjects = (projects ?? []).filter((project) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = project.title.toLowerCase().includes(term) ||
      (project.client || '').toLowerCase().includes(term);
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || project.category_id === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const { pageItems: pagedProjects, page, setPage, totalPages, total, pageSize } = usePagination(filteredProjects);

  const handleExport = () => {
    exportToCSV(`projects-${format(new Date(), 'yyyy-MM-dd')}`, filteredProjects.map((p) => ({
      title: p.title,
      category: (p.project_categories as any)?.name || '',
      client: p.client || '',
      status: p.status,
      created_at: p.created_at,
    })));
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredProjects.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProjects.map((p) => p.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  if (rbacLoading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading...</div>;
  }

  if (!can('projects', 'view')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
        <Lock className="h-12 w-12 text-muted-foreground opacity-20" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground">You don't have permission to view projects.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Projects</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsCategoriesOpen(true)}>
            <FolderOpen className="mr-2 h-4 w-4" /> Manage Categories
          </Button>
          <Button variant="outline" onClick={handleExport} disabled={filteredProjects.length === 0}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          {can('projects', 'create') && (
            <Button asChild>
              <Link to="/admin/projects/new">
                <Plus className="mr-2 h-4 w-4" /> Add Project
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories?.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-md border animate-in fade-in slide-in-from-top-2 duration-200">
            <span className="text-sm font-medium mr-2">
              {selectedIds.length} selected
            </span>
            {can('projects', 'edit') && (
              <>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => bulkStatusMutation.mutate({ ids: selectedIds, status: 'published' })}
                  disabled={bulkStatusMutation.isPending}
                >
                  Publish
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => bulkStatusMutation.mutate({ ids: selectedIds, status: 'draft' })}
                  disabled={bulkStatusMutation.isPending}
                >
                  Unpublish
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsBulkEditOpen(true)}
                  disabled={bulkStatusMutation.isPending || bulkUpdateMutation.isPending}
                >
                  Bulk Edit
                </Button>
              </>
            )}
            {can('projects', 'delete') && (
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => {
                  if (confirm(`Are you sure you want to delete ${selectedIds.length} projects?`)) {
                    bulkDeleteMutation.mutate(selectedIds);
                  }
                }}
                disabled={bulkDeleteMutation.isPending}
              >
                <Trash2 className="h-4 w-4 mr-1" /> Delete
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={filteredProjects.length > 0 && selectedIds.length === filteredProjects.length}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Loading projects...
                </TableCell>
              </TableRow>
            ) : filteredProjects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {projects?.length === 0 ? 'No projects found. Create your first project to get started.' : 'No projects match your filters.'}
                </TableCell>
              </TableRow>
            ) : (
              pagedProjects.map((project) => (
                <TableRow key={project.id} className={selectedIds.includes(project.id) ? 'bg-muted/50' : ''}>
                  <TableCell>
                    <Checkbox 
                      checked={selectedIds.includes(project.id)}
                      onCheckedChange={() => toggleSelect(project.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{project.title}</span>
                      {project.slug && (
                        <span className="text-xs text-muted-foreground">/{project.slug}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{(project.project_categories as any)?.name || 'Uncategorized'}</TableCell>
                  <TableCell>{project.client || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={project.status === 'published' ? 'default' : 'secondary'}>
                      {project.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" asChild>
                        <a 
                          href={`/projects/${project.slug}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                      {can('projects', 'edit') && (
                        <Button variant="ghost" size="icon" asChild>
                          <Link
                            to="/admin/projects/edit/$projectSlug"
                            params={{ projectSlug: project.slug }}
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                        </Button>
                      )}
                      {can('projects', 'delete') && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-destructive"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this project?')) {
                              deleteMutation.mutate(project.id);
                            }
                          }}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <div className="px-4">
          <ListPagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} />
        </div>
      </div>

      <BulkEditDialog
        isOpen={isBulkEditOpen}
        onClose={() => setIsBulkEditOpen(false)}
        onConfirm={(values) => bulkUpdateMutation.mutate({ ids: selectedIds, values })}
        selectedCount={selectedIds.length}
        title="Bulk Edit Projects"
        isPending={bulkUpdateMutation.isPending}
        fields={[
          {
            label: 'Status',
            name: 'status',
            type: 'select',
            options: [
              { label: 'Published', value: 'published' },
              { label: 'Draft', value: 'draft' },
            ],
          },
          {
            label: 'Category',
            name: 'category_id',
            type: 'select',
            options: (categories ?? []).map((cat) => ({ label: cat.name, value: cat.id })),
          },
        ]}
      />

      <ManageCategoriesDialog
        open={isCategoriesOpen}
        onOpenChange={setIsCategoriesOpen}
        table="project_categories"
        module="projects"
        queryKey={['admin-project-categories']}
        invalidateKeys={[['admin-projects']]}
        description="Create, rename, or delete project categories."
      />
    </div>
  );
}
