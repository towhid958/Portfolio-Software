import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logActivity } from '@/utils/audit';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Eye, Lock, Check, Search, Download, FolderOpen } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useRBAC } from '@/hooks/useRBAC';
import { Checkbox } from '@/components/ui/checkbox';
import { useState, useMemo } from 'react';
import { BulkEditDialog } from '@/components/admin/BulkEditDialog';
import { ManageCategoriesDialog } from '@/components/admin/ManageCategoriesDialog';
import { exportToCSV } from '@/lib/csv-export';
import { usePagination } from '@/hooks/usePagination';
import { ListPagination } from '@/components/admin/ListPagination';
import { format } from 'date-fns';

export const Route = createFileRoute('/admin/gigs/')({
  component: AdminGigsPage,
});

function AdminGigsPage() {
  const { can, isLoading: rbacLoading } = useRBAC();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);

  const queryClient = useQueryClient();
  const { data: gigs, isLoading } = useQuery({
    queryKey: ['admin-gigs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gigs')
        .select('*, gig_categories(id, name, slug)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('gigs').delete().eq('id', id);
      if (error) throw error;
      await logActivity('gigs', 'delete_gig', { id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-gigs'] });
      toast.success('Gig deleted successfully');
    },
    onError: (error) => {
      toast.error(`Error deleting gig: ${error.message}`);
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error: logError } = await supabase.from('activity_logs').insert({
        module: 'gigs',
        action: 'bulk_delete',
        details: { ids } as any,
        user_id: (await supabase.auth.getUser()).data.user?.id || null
      } as any);
      if (logError) console.error('Error logging activity:', logError);

      const { error } = await supabase.from('gigs').delete().in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-gigs'] });
      toast.success(`${selectedIds.length} gigs deleted successfully`);
      setSelectedIds([]);
    },
    onError: (error) => {
      toast.error(`Error deleting gigs: ${error.message}`);
    },
  });

  const bulkStatusMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      const { error: logError } = await supabase.from('activity_logs').insert({
        module: 'gigs',
        action: `bulk_status_${status}`,
        details: { ids, status } as any,
        user_id: (await supabase.auth.getUser()).data.user?.id || null
      } as any);
      if (logError) console.error('Error logging activity:', logError);

      const { error } = await supabase.from('gigs').update({ status }).in('id', ids);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-gigs'] });
      toast.success(`${selectedIds.length} gigs marked as ${variables.status}`);
      setSelectedIds([]);
    },
    onError: (error) => {
      toast.error(`Error updating gigs: ${error.message}`);
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ ids, values }: { ids: string[]; values: any }) => {
      const { error } = await supabase.from('gigs').update(values as any).in('id', ids);
      if (error) throw error;
      await logActivity('gigs', 'bulk_update', { ids, values });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-gigs'] });
      toast.success(`${selectedIds.length} gigs updated successfully`);
      setSelectedIds([]);
      setIsBulkEditOpen(false);
    },
    onError: (error) => {
      toast.error(`Error updating gigs: ${error.message}`);
    },
  });

  const { data: categories } = useQuery({
    queryKey: ['admin-gig-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gig_categories')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const filteredGigs = useMemo(() => {
    return (gigs ?? []).filter((gig) => {
      const matchesSearch = gig.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || gig.status === statusFilter;
      const matchesCategory = categoryFilter === 'all' || gig.category_id === categoryFilter;
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [gigs, searchQuery, statusFilter, categoryFilter]);

  const { pageItems: pagedGigs, page, setPage, totalPages, total, pageSize } = usePagination(filteredGigs);

  const handleExport = () => {
    exportToCSV(`gigs-${format(new Date(), 'yyyy-MM-dd')}`, filteredGigs.map((g) => ({
      title: g.title,
      status: g.status,
      category: g.gig_categories?.name || '',
      created_at: g.created_at,
    })));
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredGigs.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredGigs.map((g) => g.id));
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

  if (!can('gigs', 'view')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
        <Lock className="h-12 w-12 text-muted-foreground opacity-20" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground">You don't have permission to view gigs.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gigs Management</h2>
          <p className="text-muted-foreground">Manage your packaged services and pricing tiers.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setIsCategoriesOpen(true)}>
            <FolderOpen className="h-4 w-4" /> Manage Categories
          </Button>
          <Button variant="outline" className="gap-2" onClick={handleExport} disabled={filteredGigs.length === 0}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          {can('gigs', 'create') && (
            <Button className="gap-2" asChild>
              <Link to="/admin/gigs/new">
                <Plus className="h-4 w-4" /> New Gig
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search gigs..."
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
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
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

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>All Gigs</CardTitle>
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground mr-2">
                {selectedIds.length} selected
              </span>
              {can('gigs', 'edit') && (
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
              {can('gigs', 'delete') && (
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => {
                    if (confirm(`Are you sure you want to delete ${selectedIds.length} gigs?`)) {
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
            <div className="py-8 text-center text-muted-foreground">Loading gigs...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={filteredGigs.length > 0 && selectedIds.length === filteredGigs.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Gig Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedGigs.map((gig) => (
                  <TableRow key={gig.id} className={selectedIds.includes(gig.id) ? 'bg-muted/50' : ''}>
                    <TableCell>
                      <Checkbox 
                        checked={selectedIds.includes(gig.id)}
                        onCheckedChange={() => toggleSelect(gig.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{gig.title}</TableCell>
                    <TableCell>
                      <Badge variant={gig.status === 'published' ? 'default' : 'secondary'}>
                        {gig.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {gig.gig_categories?.name || 'Uncategorized'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(gig.created_at!).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" asChild>
                          <Link to="/gigs/$slug" params={{ slug: gig.slug }} target="_blank">
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        {can('gigs', 'edit') && (
                          <Button variant="ghost" size="icon" asChild>
                            <Link to="/admin/gigs/edit/$gigSlug" params={{ gigSlug: gig.slug }}>
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </Button>
                        )}
                        {can('gigs', 'delete') && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this gig?')) {
                                deleteMutation.mutate(gig.id);
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
                {filteredGigs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      {gigs?.length === 0 ? 'No gigs found. Create your first one!' : 'No gigs match your search.'}
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
        title="Bulk Edit Gigs"
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
        table="gig_categories"
        module="gigs"
        queryKey={['admin-gig-categories']}
        invalidateKeys={[['admin-gigs']]}
        description="Create, rename, or delete gig categories."
      />
    </div>
  );
}
