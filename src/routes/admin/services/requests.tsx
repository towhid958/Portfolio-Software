import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { useMemo } from 'react';
import { getServiceInquiries, getServiceQuotes } from '@/lib/services.admin.functions';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ClipboardList,
  Clock,
  Eye,
  Inbox,
  Search,
  TrendingUp,
  X,
  Download,
} from 'lucide-react';
import { format } from 'date-fns';
import { exportToCSV } from '@/lib/csv-export';
import { usePagination } from '@/hooks/usePagination';
import { ListPagination } from '@/components/admin/ListPagination';

type SortDir = 'asc' | 'desc';

interface RequestsSearch {
  tab: string;
  q: string;
  status: string;
  sort: string;
  dir: SortDir;
}

export const Route = createFileRoute('/admin/services/requests')({
  validateSearch: (search: Record<string, unknown>): RequestsSearch => ({
    tab: search['tab'] === 'inquiries' ? 'inquiries' : 'quotes',
    q: typeof search['q'] === 'string' ? search['q'] : '',
    status: typeof search['status'] === 'string' ? search['status'] : 'all',
    sort: typeof search['sort'] === 'string' ? search['sort'] : 'created_at',
    dir: search['dir'] === 'asc' ? 'asc' : 'desc',
  }),
  component: ServiceRequestsPage,
  errorComponent: ({ error }) => (
    <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 p-6 text-sm">
      Could not load requests: {error.message}
    </div>
  ),
});

const QUOTE_STATUSES = ['pending', 'contacted', 'proposal_sent', 'won', 'lost', 'rejected'];
const INQUIRY_STATUSES = ['new', 'pending', 'contacted', 'qualified', 'closed'];

function statusBadge(status: string | null) {
  const map: Record<string, string> = {
    pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-200',
    new: 'bg-yellow-500/10 text-yellow-600 border-yellow-200',
    contacted: 'bg-blue-500/10 text-blue-600 border-blue-200',
    qualified: 'bg-blue-500/10 text-blue-600 border-blue-200',
    proposal_sent: 'bg-purple-500/10 text-purple-600 border-purple-200',
    won: 'bg-green-500/10 text-green-600 border-green-200',
    closed: 'bg-green-500/10 text-green-600 border-green-200',
    lost: 'bg-red-500/10 text-red-600 border-red-200',
    rejected: 'bg-slate-500/10 text-slate-600 border-slate-200',
  };
  const label = (status || 'unknown').replace(/_/g, ' ');
  return (
    <Badge variant="secondary" className={`capitalize ${map[status || ''] || 'bg-muted text-muted-foreground'}`}>
      {label}
    </Badge>
  );
}

function compare(a: unknown, b: unknown, dir: SortDir) {
  const av = a ?? '';
  const bv = b ?? '';
  let result: number;
  if (typeof av === 'number' && typeof bv === 'number') {
    result = av - bv;
  } else {
    result = String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' });
  }
  return dir === 'asc' ? result : -result;
}

function ServiceRequestsPage() {
  const { tab, q, status, sort, dir } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const fetchQuotes = useServerFn(getServiceQuotes);
  const fetchInquiries = useServerFn(getServiceInquiries);

  const { data: quotes, isLoading: loadingQuotes } = useQuery({
    queryKey: ['admin-service-quotes'],
    queryFn: () => fetchQuotes(),
  });

  const { data: inquiries, isLoading: loadingInquiries } = useQuery({
    queryKey: ['admin-service-inquiries'],
    queryFn: () => fetchInquiries(),
  });

  const isQuotes = tab === 'quotes';
  const isLoading = isQuotes ? loadingQuotes : loadingInquiries;

  const setSearch = (patch: Partial<RequestsSearch>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch }) });

  const toggleSort = (column: string) => {
    if (sort === column) {
      setSearch({ dir: dir === 'asc' ? 'desc' : 'asc' });
    } else {
      setSearch({ sort: column, dir: 'asc' });
    }
  };

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();

    if (isQuotes) {
      const source = (quotes ?? []).map((quote) => ({
        id: quote.id,
        name: quote.client_name,
        email: quote.client_email,
        subject: (quote.services as { title?: string } | null)?.title || 'Custom Service',
        company: quote.company_name || '',
        budget: quote.budget || '',
        status: quote.status,
        created_at: quote.created_at,
      }));
      return source
        .filter((row) => (status === 'all' ? true : row.status === status))
        .filter((row) =>
          !term
            ? true
            : [row.name, row.email, row.subject, row.company, row.budget]
                .join(' ')
                .toLowerCase()
                .includes(term),
        )
        .sort((a, b) => compare(a[sort as keyof typeof a], b[sort as keyof typeof b], dir));
    }

    const source = (inquiries ?? []).map((inquiry) => ({
      id: inquiry.id,
      name: inquiry.full_name,
      email: inquiry.email,
      subject: inquiry.project_title || 'Untitled project',
      company: inquiry.company_name || '',
      budget: inquiry.budget_range || '',
      status: inquiry.status,
      created_at: inquiry.created_at,
    }));
    return source
      .filter((row) => (status === 'all' ? true : row.status === status))
      .filter((row) =>
        !term
          ? true
          : [row.name, row.email, row.subject, row.company, row.budget]
              .join(' ')
              .toLowerCase()
              .includes(term),
      )
      .sort((a, b) => compare(a[sort as keyof typeof a], b[sort as keyof typeof b], dir));
  }, [isQuotes, quotes, inquiries, q, status, sort, dir]);

  const wonCount = rows.filter((r) => ['won', 'closed'].includes(r.status || '')).length;
  const stats = {
    total: rows.length,
    open: rows.filter((r) => ['pending', 'new', 'contacted', 'proposal_sent', 'qualified'].includes(r.status || '')).length,
    won: wonCount,
    // Matches the old dedicated Quote Requests page's "Conversion Rate"
    // card - kept here (not tab-specific) since a win rate reads just as
    // naturally for inquiries closed-won as it does for quotes won.
    conversionRate: rows.length ? Math.round((wonCount / rows.length) * 100) : 0,
  };

  const statusOptions = isQuotes ? QUOTE_STATUSES : INQUIRY_STATUSES;

  const { pageItems: pagedRows, page, setPage, totalPages, total, pageSize } = usePagination(rows);

  const handleExport = () => {
    exportToCSV(`${isQuotes ? 'quotes' : 'inquiries'}-${format(new Date(), 'yyyy-MM-dd')}`, rows.map((row) => ({
      name: row.name,
      email: row.email,
      subject: row.subject,
      company: row.company,
      budget: row.budget,
      status: row.status,
      created_at: row.created_at,
    })));
  };

  const SortHeader = ({ column, label, className }: { column: string; label: string; className?: string }) => (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => toggleSort(column)}
        className="inline-flex items-center gap-1.5 font-medium hover:text-foreground transition-colors"
      >
        {label}
        {sort !== column ? (
          <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
        ) : dir === 'asc' ? (
          <ArrowUp className="h-3.5 w-3.5 text-primary" />
        ) : (
          <ArrowDown className="h-3.5 w-3.5 text-primary" />
        )}
      </button>
    </TableHead>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Requests & Quotes</h2>
          <p className="text-muted-foreground">
            Search and sort every service inquiry and quote request in one place.
          </p>
        </div>
        <Button variant="outline" className="gap-2" onClick={handleExport} disabled={rows.length === 0}>
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Matching Records</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open / In Progress</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.open}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Won / Closed</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
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
            <div className="text-2xl font-bold">{stats.conversionRate}%</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <Tabs value={tab} onValueChange={(value) => setSearch({ tab: value, status: 'all' })}>
          <TabsList>
            <TabsTrigger value="quotes" className="gap-2">
              <ClipboardList className="h-4 w-4" />
              Quotes ({quotes?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="inquiries" className="gap-2">
              <Inbox className="h-4 w-4" />
              Inquiries ({inquiries?.length || 0})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setSearch({ q: e.target.value })}
              placeholder="Search name, email, company, service..."
              className="pl-9 sm:w-[320px]"
            />
            {q && (
              <button
                type="button"
                onClick={() => setSearch({ q: '' })}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <Select value={status} onValueChange={(value) => setSearch({ status: value })}>
            <SelectTrigger className="sm:w-[180px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {statusOptions.map((option) => (
                <SelectItem key={option} value={option} className="capitalize">
                  {option.replace(/_/g, ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-hidden rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <SortHeader column="name" label="Client" />
              <SortHeader column="subject" label={isQuotes ? 'Service' : 'Project'} />
              <SortHeader column="company" label="Company" className="hidden md:table-cell" />
              <SortHeader column="budget" label="Budget" className="hidden lg:table-cell" />
              <SortHeader column="status" label="Status" />
              <SortHeader column="created_at" label="Received" />
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  Loading records...
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  {q || status !== 'all'
                    ? 'No records match your search or filter.'
                    : 'No records yet.'}
                </TableCell>
              </TableRow>
            ) : (
              pagedRows.map((row) => (
                <TableRow key={row.id} className="transition-colors hover:bg-muted/50">
                  <TableCell>
                    <div className="font-medium">{row.name}</div>
                    <div className="text-xs text-muted-foreground">{row.email}</div>
                  </TableCell>
                  <TableCell className="max-w-[220px] truncate">{row.subject}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {row.company || '—'}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm">{row.budget || '—'}</TableCell>
                  <TableCell>{statusBadge(row.status)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {row.created_at ? format(new Date(row.created_at), 'MMM dd, yyyy') : 'N/A'}
                  </TableCell>
                  <TableCell className="text-right">
                    {isQuotes ? (
                      <Button variant="ghost" size="icon" asChild>
                        <Link to="/admin/services/quotes/$quoteId" params={{ quoteId: row.id }}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    ) : (
                      <Button variant="ghost" size="icon" asChild>
                        <Link to="/admin/services-custom" search={{ inquiryId: row.id }}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    )}
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
