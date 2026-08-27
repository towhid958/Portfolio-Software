import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logActivity } from '@/utils/audit';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Globe, ExternalLink, BarChart2, Lock, Search, Download } from 'lucide-react';
import { toast } from 'sonner';
import { useRBAC } from '@/hooks/useRBAC';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, useMemo } from 'react';
import { BulkEditDialog } from '@/components/admin/BulkEditDialog';
import { exportToCSV } from '@/lib/csv-export';
import { usePagination } from '@/hooks/usePagination';
import { ListPagination } from '@/components/admin/ListPagination';
import { format } from 'date-fns';

export const Route = createFileRoute('/admin/partners/')({
  component: AdminPartnersPage,
});

function AdminPartnersPage() {
  const queryClient = useQueryClient();
  const { can, isLoading: rbacLoading } = useRBAC();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const { data: partners, isLoading } = useQuery({
    queryKey: ['admin-partners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partners')
        .select('*, offers(*)')
        .order('name', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const partnerTypes = useMemo(() => {
    return Array.from(new Set((partners ?? []).map((p) => p.partnership_type || 'Technology')));
  }, [partners]);

  const filteredPartners = useMemo(() => {
    return (partners ?? []).filter((partner) => {
      const matchesSearch = partner.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'all' || (partner.partnership_type || 'Technology') === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [partners, searchQuery, typeFilter]);

  const { pageItems: pagedPartners, page, setPage, totalPages, total, pageSize } = usePagination(filteredPartners);

  const handleExport = () => {
    exportToCSV(`partners-${format(new Date(), 'yyyy-MM-dd')}`, filteredPartners.map((p) => ({
      name: p.name,
      type: p.partnership_type || 'Technology',
      website_url: p.website_url || '',
      offers: p.offers?.length || 0,
    })));
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('partners').delete().eq('id', id);
      if (error) throw error;
      await logActivity('partners', 'delete_partner', { id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-partners'] });
      toast.success('Partner deleted successfully');
    },
    onError: (error) => {
      toast.error(`Error deleting partner: ${error.message}`);
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error: logError } = await supabase.from('activity_logs').insert({
        module: 'partners',
        action: 'bulk_delete',
        details: { ids } as any,
        user_id: (await supabase.auth.getUser()).data.user?.id || null
      } as any);
      if (logError) console.error('Error logging activity:', logError);

      const { error } = await supabase.from('partners').delete().in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-partners'] });
      toast.success(`${selectedIds.length} partners deleted successfully`);
      setSelectedIds([]);
    },
    onError: (error) => {
      toast.error(`Error deleting partners: ${error.message}`);
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ ids, values }: { ids: string[]; values: any }) => {
      const { error: logError } = await supabase.from('activity_logs').insert({
        module: 'partners',
        action: 'bulk_update',
        details: { ids, values } as any,
        user_id: (await supabase.auth.getUser()).data.user?.id || null
      } as any);
      if (logError) console.error('Error logging activity:', logError);

      const { error } = await supabase.from('partners').update(values as any).in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-partners'] });
      toast.success(`${selectedIds.length} partners updated successfully`);
      setSelectedIds([]);
      setIsBulkEditOpen(false);
    },
    onError: (error) => {
      toast.error(`Error updating partners: ${error.message}`);
    },
  });

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredPartners.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredPartners.map((p) => p.id));
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

  if (!can('partners', 'view')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
        <Lock className="h-12 w-12 text-muted-foreground opacity-20" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground">You don't have permission to view partners.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Partners & Offers</h2>
          <p className="text-muted-foreground">Manage your affiliate partners and exclusive offers.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={handleExport} disabled={filteredPartners.length === 0}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          {can('partners', 'view') && (
            <Button variant="outline" className="gap-2" asChild>
              <Link to="/admin/partners/analytics">
                <BarChart2 className="h-4 w-4" /> Analytics
              </Link>
            </Button>
          )}
          {can('partners', 'create') && (
            <Button className="gap-2" asChild>
              <Link to="/admin/partners/new">
                <Plus className="h-4 w-4" /> New Partner
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search partners..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {partnerTypes.map((type) => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Active Partners</CardTitle>
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground mr-2">
                {selectedIds.length} selected
              </span>
              {can('partners', 'edit') && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsBulkEditOpen(true)}
                  disabled={bulkUpdateMutation.isPending}
                >
                  Bulk Edit
                </Button>
              )}
              {can('partners', 'delete') && (
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => {
                    if (confirm(`Are you sure you want to delete ${selectedIds.length} partners and all their offers?`)) {
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
            <div className="py-8 text-center text-muted-foreground">Loading partners...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={filteredPartners.length > 0 && selectedIds.length === filteredPartners.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Partner Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Offers</TableHead>
                  <TableHead>Website</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedPartners.map((partner) => (
                  <TableRow key={partner.id} className={selectedIds.includes(partner.id) ? 'bg-muted/50' : ''}>
                    <TableCell>
                      <Checkbox 
                        checked={selectedIds.includes(partner.id)}
                        onCheckedChange={() => toggleSelect(partner.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded bg-muted flex items-center justify-center overflow-hidden border">
                          {partner.logo ? (
                            <img src={partner.logo} alt="" className="h-full w-full object-contain" />
                          ) : (
                            <Globe className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        {partner.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{partner.partnership_type || 'Technology'}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{partner.offers?.length || 0} Offers</Badge>
                    </TableCell>
                    <TableCell>
                      {partner.website_url ? (
                        <a 
                          href={partner.website_url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-primary hover:underline flex items-center gap-1 text-sm"
                        >
                          Visit <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {can('partners', 'edit') && (
                          <Button variant="ghost" size="icon" asChild>
                            <Link to="/admin/partners/edit/$partnerId" params={{ partnerId: partner.id }}>
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </Button>
                        )}
                        {can('partners', 'delete') && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this partner and all their offers?')) {
                                deleteMutation.mutate(partner.id);
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
                {filteredPartners.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      {partners?.length === 0 ? 'No partners found.' : 'No partners match your filters.'}
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
        title="Bulk Edit Partners"
        isPending={bulkUpdateMutation.isPending}
        fields={[
          {
            label: 'Partnership Type',
            name: 'partnership_type',
            type: 'select',
            options: [
              { label: 'Technology', value: 'Technology' },
              { label: 'Marketing', value: 'Marketing' },
              { label: 'Affiliate', value: 'Affiliate' },
              { label: 'Other', value: 'Other' },
            ],
          },
        ]}
      />
    </div>
  );
}
