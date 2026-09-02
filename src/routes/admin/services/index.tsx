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
import { Plus, Edit, Trash2, Search, Lock, Download, FolderOpen } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useRBAC } from '@/hooks/useRBAC';
import { useState } from 'react';
import { toast } from 'sonner';
import { ManageCategoriesDialog } from '@/components/admin/ManageCategoriesDialog';
import { SortableTableHead } from '@/components/admin/SortableTableHead';
import { exportToCSV } from '@/lib/csv-export';
import { usePagination } from '@/hooks/usePagination';
import { useTitleDateSort } from '@/hooks/useTitleDateSort';
import { ListPagination } from '@/components/admin/ListPagination';
import { format } from 'date-fns';

export const Route = createFileRoute('/admin/services/')({
  component: ServicesList,
});

function ServicesList() {
  const { can, isLoading: rbacLoading } = useRBAC();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('services').delete().eq('id', id);
      if (error) throw error;
      await logActivity('services', 'delete_service', { id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-services'] });
      toast.success('Service deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete service');
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from('services').delete().in('id', ids);
      if (error) throw error;
      await logActivity('services', 'bulk_delete', { ids });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-services'] });
      toast.success(`${selectedIds.length} services deleted successfully`);
      setSelectedIds([]);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete services');
    },
  });

  const { data: services, isLoading } = useQuery({
    queryKey: ['admin-services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*, service_categories(name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const filteredServices = (services ?? []).filter((service) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = service.title.toLowerCase().includes(term) ||
      (service.service_categories?.name || '').toLowerCase().includes(term);
    const matchesStatus = statusFilter === 'all' || service.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const { sorted: sortedServices, sortKey, sortDir, toggleSort } = useTitleDateSort(filteredServices);
  const { pageItems: pagedServices, page, setPage, totalPages, total, pageSize } = usePagination(sortedServices);

  const handleExport = () => {
    exportToCSV(`services-${format(new Date(), 'yyyy-MM-dd')}`, sortedServices.map((s) => ({
      title: s.title,
      category: s.service_categories?.name || '',
      starting_price: s.starting_price,
      status: s.status,
    })));
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredServices.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredServices.map((s) => s.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  };

  if (rbacLoading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading...</div>;
  }

  if (!can('gigs', 'view')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
        <Lock className="h-12 w-12 text-muted-foreground opacity-20" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground">You don't have permission to view services.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Services</h2>
        <div className="flex gap-2">
          {can('gigs', 'edit') && (
            <Button variant="outline" onClick={() => setIsCategoriesOpen(true)}>
              <FolderOpen className="mr-2 h-4 w-4" /> Manage Categories
            </Button>
          )}
          <Button variant="outline" onClick={handleExport} disabled={filteredServices.length === 0}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          {can('gigs', 'create') && (
            <Button asChild>
              <Link to="/admin/services/new">
                <Plus className="mr-2 h-4 w-4" /> Add Service
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
              placeholder="Search services..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {selectedIds.length > 0 && can('gigs', 'delete') && (
          <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-md border">
            <span className="text-sm font-medium mr-2">{selectedIds.length} selected</span>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (confirm(`Are you sure you want to delete ${selectedIds.length} services?`)) {
                  bulkDeleteMutation.mutate(selectedIds);
                }
              }}
              disabled={bulkDeleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4 mr-1" /> Delete
            </Button>
          </div>
        )}
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={filteredServices.length > 0 && selectedIds.length === filteredServices.length}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <SortableTableHead label="Title" sortKey="title" currentKey={sortKey} direction={sortDir} onSort={toggleSort} />
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Status</TableHead>
              <SortableTableHead label="Created At" sortKey="created_at" currentKey={sortKey} direction={sortDir} onSort={toggleSort} />
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Loading services...
                </TableCell>
              </TableRow>
            ) : filteredServices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {services?.length === 0 ? 'No services found. Create your first service to get started.' : 'No services match your filters.'}
                </TableCell>
              </TableRow>
            ) : (
              pagedServices.map((service) => (
                <TableRow key={service.id} className={selectedIds.includes(service.id) ? 'bg-muted/50' : ''}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(service.id)}
                      onCheckedChange={() => toggleSelect(service.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{service.title}</TableCell>
                  <TableCell>{service.service_categories?.name || 'Uncategorized'}</TableCell>
                  <TableCell>${service.starting_price}</TableCell>
                  <TableCell>
                    <Badge variant={service.status === 'published' ? 'default' : 'secondary'}>
                      {service.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {service.created_at ? new Date(service.created_at).toLocaleDateString() : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {can('gigs', 'edit') && (
                        <Button variant="ghost" size="icon" asChild>
                          <Link
                            to="/admin/services/edit/$serviceSlug"
                            params={{ serviceSlug: service.slug }}
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                        </Button>
                      )}
                      {can('gigs', 'delete') && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-destructive"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this service?')) {
                              deleteMutation.mutate(service.id);
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

      <ManageCategoriesDialog
        open={isCategoriesOpen}
        onOpenChange={setIsCategoriesOpen}
        table="service_categories"
        module="services"
        queryKey={['admin-service-categories']}
        invalidateKeys={[['admin-services']]}
        description="Create, rename, or delete service categories."
      />
    </div>
  );
}
