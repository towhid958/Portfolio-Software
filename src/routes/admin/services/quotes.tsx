import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { getServiceQuotes } from '@/lib/services.admin.functions';
import { useServerFn } from '@tanstack/react-start';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, Clock, MessageSquare, ClipboardList, TrendingUp, Search, Download } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useState } from 'react';
import { exportToCSV } from '@/lib/csv-export';
import { usePagination } from '@/hooks/usePagination';
import { ListPagination } from '@/components/admin/ListPagination';

export const Route = createFileRoute('/admin/services/quotes')({
  component: AdminQuotesList,
});

function AdminQuotesList() {
  const fetchQuotes = useServerFn(getServiceQuotes);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: quotes, isLoading } = useQuery({
    queryKey: ['admin-service-quotes'],
    queryFn: () => fetchQuotes()
  });

  const filteredQuotes = (quotes ?? []).filter((quote) => {
    const matchesStatus = statusFilter === 'all' || quote.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q ||
      quote.client_name.toLowerCase().includes(q) ||
      quote.client_email.toLowerCase().includes(q) ||
      ((quote.services as any)?.title || '').toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const { pageItems: pagedQuotes, page, setPage, totalPages, total, pageSize } = usePagination(filteredQuotes);

  const handleExport = () => {
    exportToCSV(`quote-requests-${format(new Date(), 'yyyy-MM-dd')}`, filteredQuotes.map((quote) => ({
      client_name: quote.client_name,
      client_email: quote.client_email,
      service: (quote.services as any)?.title || 'Custom Service',
      budget: quote.budget || '',
      status: quote.status,
      created_at: quote.created_at,
    })));
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'pending': return <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 border-yellow-200">New Request</Badge>;
      case 'contacted': return <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-blue-200">Contacted</Badge>;
      case 'proposal_sent': return <Badge variant="secondary" className="bg-purple-500/10 text-purple-600 border-purple-200">Proposal Sent</Badge>;
      case 'won': return <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-200">Won</Badge>;
      case 'lost': return <Badge variant="secondary" className="bg-red-500/10 text-red-600 border-red-200">Lost</Badge>;
      case 'rejected': return <Badge variant="secondary" className="bg-slate-500/10 text-slate-600 border-slate-200">Rejected</Badge>;
      default: return <Badge variant="outline">{status || 'Unknown'}</Badge>;
    }
  };

  const stats = {
    total: quotes?.length || 0,
    pending: quotes?.filter(q => q.status === 'pending').length || 0,
    won: quotes?.filter(q => q.status === 'won').length || 0,
    conversion: quotes?.length ? Math.round((quotes.filter(q => q.status === 'won').length / quotes.length) * 100) : 0
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Quote Requests</h2>
          <p className="text-muted-foreground">Manage service inquiries and proposal status</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={handleExport} disabled={filteredQuotes.length === 0}>
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Won Projects</CardTitle>
            <MessageSquare className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.won}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.conversion}%</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search requests..."
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
            <SelectItem value="pending">New Request</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="proposal_sent">Proposal Sent</SelectItem>
            <SelectItem value="won">Won</SelectItem>
            <SelectItem value="lost">Lost</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Budget</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Loading requests...
                </TableCell>
              </TableRow>
            ) : filteredQuotes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {quotes?.length === 0 ? 'No quote requests found.' : 'No requests match your filters.'}
                </TableCell>
              </TableRow>
            ) : (
              pagedQuotes.map((quote) => (
                <TableRow key={quote.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell>
                    <div className="font-medium">{quote.client_name}</div>
                    <div className="text-xs text-muted-foreground">{quote.client_email}</div>
                  </TableCell>
                  <TableCell>{(quote.services as any)?.title || 'Custom Service'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {quote.created_at ? format(new Date(quote.created_at), 'MMM dd, yyyy') : 'N/A'}
                  </TableCell>
                  <TableCell>{quote.budget || 'N/A'}</TableCell>
                  <TableCell>{getStatusBadge(quote.status)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" asChild>
                      <Link 
                        to={'/admin/services/quotes/$quoteId' as any} 
                        params={{ quoteId: quote.id } as any}
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
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
    </div>
  );
}