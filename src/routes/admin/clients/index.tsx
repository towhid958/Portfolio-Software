import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRBAC } from '@/hooks/useRBAC';
import { UserPlus, Mail, Search, Users, Eye, Download } from 'lucide-react';
import { useState } from 'react';
import { UserCreationDialog } from '@/components/admin/users/UserCreationDialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getClients } from '@/lib/users.functions';
import { exportToCSV } from '@/lib/csv-export';
import { usePagination } from '@/hooks/usePagination';
import { ListPagination } from '@/components/admin/ListPagination';
import { format } from 'date-fns';

export const Route = createFileRoute('/admin/clients/')({
  component: ClientsPage,
});

function ClientsPage() {
  const { roles, userEmail } = useRBAC();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const fetchClients = useServerFn(getClients);

  const { data: clients, isLoading } = useQuery({
    queryKey: ['admin-clients'],
    queryFn: () => fetchClients(),
  });

  const filteredClients = clients?.filter(client => {
    const fullName = client.full_name?.toLowerCase() || '';
    const email = client.email?.toLowerCase() || '';
    const search = searchQuery.toLowerCase();
    const matchesSearch = fullName.includes(search) || email.includes(search);
    const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const { pageItems: pagedClients, page, setPage, totalPages, total, pageSize } = usePagination(filteredClients);

  const handleExport = () => {
    exportToCSV(`clients-${format(new Date(), 'yyyy-MM-dd')}`, (filteredClients ?? []).map((c) => ({
      name: c.full_name || '',
      email: c.email || '',
      joined: c.created_at || '',
      status: c.status,
    })));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Client Management</h2>
          <p className="text-muted-foreground">View and manage your platform clients.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={handleExport} disabled={!filteredClients?.length}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
            <UserPlus className="h-4 w-4" />
            Add Client
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
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
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="invited">Invited</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Clients List
          </CardTitle>
          <CardDescription>
            A list of all users registered with the client role.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center">Loading clients...</div>
          ) : filteredClients?.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              {searchQuery ? 'No clients found matching your search.' : 'No clients registered yet.'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Joined Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedClients.map((client: any) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">
                      {client.full_name || 'No Name'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        {client.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      {client.created_at ? new Date(client.created_at).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {client.status === 'suspended' ? (
                        <Badge variant="destructive">Suspended</Badge>
                      ) : client.status === 'active' ? (
                        <Badge variant="secondary">Active</Badge>
                      ) : (
                        <Badge variant="outline">Invited</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" asChild>
                        <Link to="/admin/clients/$clientId" params={{ clientId: client.id }}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <ListPagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} />
        </CardContent>
      </Card>

      <UserCreationDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </div>
  );
}
