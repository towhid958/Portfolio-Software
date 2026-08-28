import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logActivity } from '@/utils/audit';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Eye, Lock, Search, Download } from 'lucide-react';
import { toast } from 'sonner';
import { useRBAC } from '@/hooks/useRBAC';
import { useState, useMemo } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BulkEditDialog } from '@/components/admin/BulkEditDialog';
import { SortableTableHead } from '@/components/admin/SortableTableHead';
import { exportToCSV } from '@/lib/csv-export';
import { usePagination } from '@/hooks/usePagination';
import { ListPagination } from '@/components/admin/ListPagination';
import { useTitleDateSort } from '@/hooks/useTitleDateSort';
import { format } from 'date-fns';

export const Route = createFileRoute('/admin/pages/')({
  component: AdminPagesPage,
});

function AdminPagesPage() {
  const { can, isLoading: rbacLoading } = useRBAC();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);

  const queryClient = useQueryClient();
  const { data: pages, isLoading } = useQuery({
    queryKey: ['admin-pages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pages')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('pages').delete().eq('id', id);
      if (error) throw error;
      await logActivity('pages', 'delete_page', { id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pages'] });
      toast.success('Page deleted successfully');
    },
    onError: (error) => {
      toast.error(`Error deleting page: ${error.message}`);
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error: logError } = await supabase.from('activity_logs').insert({
        module: 'pages',
        action: 'bulk_delete',
        details: { ids } as any,
        user_id: (await supabase.auth.getUser()).data.user?.id || null,
      } as any);
      if (logError) console.error('Error logging activity:', logError);

      const { error } = await supabase.from('pages').delete().in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pages'] });
      toast.success(`${selectedIds.length} pages deleted successfully`);
      setSelectedIds([]);
    },
    onError: (error) => {
      toast.error(`Error deleting pages: ${error.message}`);
    },
  });

  const bulkStatusMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      const { error: logError } = await supabase.from('activity_logs').insert({
        module: 'pages',
        action: `bulk_status_${status}`,
        details: { ids, status } as any,
        user_id: (await supabase.auth.getUser()).data.user?.id || null,
      } as any);
      if (logError) console.error('Error logging activity:', logError);

      const { error } = await supabase.from('pages').update({ status }).in('id', ids);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-pages'] });
      toast.success(`${selectedIds.length} pages marked as ${variables.status}`);
      setSelectedIds([]);
    },
    onError: (error) => {
      toast.error(`Error updating pages: ${error.message}`);
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ ids, values }: { ids: string[]; values: any }) => {
      const { error } = await supabase.from('pages').update(values as any).in('id', ids);
      if (error) throw error;
      await logActivity('pages', 'bulk_update', { ids, values });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pages'] });
      toast.success(`${selectedIds.length} pages updated successfully`);
      setSelectedIds([]);
      setIsBulkEditOpen(false);
    },
    onError: (error) => {
      toast.error(`Error updating pages: ${error.message}`);
    },
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredPages = useMemo(() => {
    return (pages ?? []).filter((page) => {
      const matchesSearch =
        page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        page.slug.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || page.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [pages, searchQuery, statusFilter]);

  const { sorted: sortedPages, sortKey, sortDir, toggleSort } = useTitleDateSort(filteredPages);
  const { pageItems: pagedPages, page, setPage, totalPages, total, pageSize } = usePagination(sortedPages);

  const handleExport = () => {
    exportToCSV(`pages-${format(new Date(), 'yyyy-MM-dd')}`, sortedPages.map((p) => ({
      title: p.title,
      slug: p.slug,
      status: p.status,
      sections: Array.isArray(p.sections) ? p.sections.length : 0,
      created_at: p.created_at,
    })));
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredPages.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredPages.map((p) => p.id));
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

  if (!can('pages', 'view')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
        <Lock className="h-12 w-12 text-muted-foreground opacity-20" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground">You don't have permission to view pages.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Pages</h2>
          <p className="text-muted-foreground">Build and manage custom pages from reusable sections.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={handleExport} disabled={filteredPages.length === 0}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          {can('pages', 'create') && (
            <Button className="gap-2" asChild>
              <Link to="/admin/pages/new">
                <Plus className="h-4 w-4" /> New Page
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search pages..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>All Pages</CardTitle>
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground mr-2">
                {selectedIds.length} selected
              </span>
              {can('pages', 'edit') && (
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
              {can('pages', 'delete') && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (confirm(`Are you sure you want to delete ${selectedIds.length} pages?`)) {
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
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading pages...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={filteredPages.length > 0 && selectedIds.length === filteredPages.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <SortableTableHead label="Title" sortKey="title" currentKey={sortKey} direction={sortDir} onSort={toggleSort} />
                  <TableHead>Link</TableHead>
                  <TableHead>Sections</TableHead>
                  <TableHead>Status</TableHead>
                  <SortableTableHead label="Created At" sortKey="created_at" currentKey={sortKey} direction={sortDir} onSort={toggleSort} />
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedPages.map((p) => (
                  <TableRow key={p.id} className={selectedIds.includes(p.id) ? 'bg-muted/50' : ''}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(p.id)}
                        onCheckedChange={() => toggleSelect(p.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium max-w-md truncate">{p.title}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">/{p.slug}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {Array.isArray(p.sections) ? p.sections.length : 0}
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.status === 'published' ? 'default' : 'secondary'}>
                        {p.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {p.created_at ? new Date(p.created_at).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" asChild title="View Publicly">
                          <Link to={`/${p.slug}` as any} target="_blank">
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        {can('pages', 'edit') && (
                          <Button variant="ghost" size="icon" asChild title="Edit Page">
                            <Link to="/admin/pages/edit/$pageSlug" params={{ pageSlug: p.slug }}>
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </Button>
                        )}
                        {can('pages', 'delete') && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this page?')) {
                                deleteMutation.mutate(p.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredPages.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      {pages?.length === 0 ? 'No pages found. Create your first one!' : 'No pages match your filters.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
          <ListPagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} />
        </CardContent>
      </Card>

      <BulkEditDialog
        isOpen={isBulkEditOpen}
        onClose={() => setIsBulkEditOpen(false)}
        onConfirm={(values) => bulkUpdateMutation.mutate({ ids: selectedIds, values })}
        selectedCount={selectedIds.length}
        title="Bulk Edit Pages"
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
        ]}
      />
    </div>
  );
}
