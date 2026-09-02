import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, startOfDay, endOfDay } from 'date-fns';
import { useRBAC } from '@/hooks/useRBAC';
import { Lock, History, Link as LinkIcon, ExternalLink, Download, Calendar as CalendarIcon, Filter, X } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { useState, useMemo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePagination } from '@/hooks/usePagination';
import { ListPagination } from '@/components/admin/ListPagination';


export const Route = createFileRoute('/admin/activity-logs')({
  component: ActivityLogsPage,
});

function ActivityLogsPage() {
  const { can, isLoading: rbacLoading } = useRBAC();
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: logs, isLoading } = useQuery({
    queryKey: ['admin-activity-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select(`
          *,
          profiles:user_id (
            full_name, 
            email,
            user_roles (role)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(200);
      
      if (error) throw error;
      return data;
    },
  });

  const filteredLogs = useMemo(() => {
    if (!logs) return [];
    
    return logs.filter(log => {
      // Date Range Filter
      if (dateRange.from) {
        const logDate = new Date(log.created_at!);
        if (logDate < startOfDay(dateRange.from)) return false;
        if (dateRange.to && logDate > endOfDay(dateRange.to)) return false;
      }

      // Role Filter
      if (roleFilter !== 'all') {
        const userRoles = (log.profiles as any)?.user_roles?.map((r: any) => r.role) || [];
        if (!userRoles.includes(roleFilter)) return false;
      }

      // Module Filter
      if (moduleFilter !== 'all') {
        if (log.module !== moduleFilter) return false;
      }

      // Text search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesSearch =
          (log.profiles as any)?.full_name?.toLowerCase().includes(q) ||
          (log.profiles as any)?.email?.toLowerCase().includes(q) ||
          log.action.toLowerCase().includes(q) ||
          log.module.toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }

      return true;
    });
  }, [logs, dateRange, roleFilter, moduleFilter, searchQuery]);

  const { pageItems: pagedLogs, page, setPage, totalPages, total, pageSize } = usePagination(filteredLogs);

  // Derived from whatever modules actually appear in the fetched logs,
  // rather than a hand-maintained list - so it never drifts out of sync
  // with what's really being logged.
  const availableModules = useMemo(() => {
    return Array.from(new Set((logs ?? []).map((log) => log.module))).sort();
  }, [logs]);

  const exportToCSV = () => {
    if (!filteredLogs.length) return;

    const headers = ['Timestamp', 'User Name', 'User Email', 'Roles', 'Module', 'Action', 'Details'];
    const rows = filteredLogs.map(log => [
      format(new Date(log.created_at!), 'yyyy-MM-dd HH:mm:ss'),
      (log.profiles as any)?.full_name || 'System',
      (log.profiles as any)?.email || '',
      ((log.profiles as any)?.user_roles?.map((r: any) => r.role).join(', ')) || '',
      log.module,
      log.action,
      log.details ? JSON.stringify(log.details).replace(/"/g, '""') : ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `activity-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  // Content types with a real public single-item page, keyed by slug.
  const PUBLIC_LINK_BASE: Record<string, string> = {
    blog: '/blog',
    gigs: '/gigs',
    projects: '/projects',
    services: '/services',
  };

  const getTargetLink = (module: string, action: string, details: any) => {
    if (!details) return null;

    // A deleted record no longer exists anywhere to link to.
    if (action.includes('delete')) return null;

    // Uploads link straight to the file itself - there's no single-item
    // page for media, so this is the only "link" that makes sense. Older
    // logs written before URLs were captured simply show no link.
    if (module === 'media' && action === 'upload_assets') {
      const urls = details.urls;
      if (Array.isArray(urls) && urls.length === 1) return urls[0];
      return null;
    }

    const ids = details.ids || (details.id ? [details.id] : (details.invoice_id ? [details.invoice_id] : []));
    // Bulk actions log multiple ids - there's no single post to link to.
    if (!ids || ids.length !== 1) return null;

    const firstId = ids[0];

    if (module === 'invoices') return `/invoices/${firstId}`;
    // Partners have no individual public page, only the shared list.
    if (module === 'partners') return '/partners';
    // Custom builder pages are served at the root, not under /pages.
    if (module === 'pages' && details.slug) return `/${details.slug}`;

    // blog/gigs/projects/services need the slug, which only logs written
    // after this fix carry - older entries without one get no link rather
    // than a guessed, possibly-wrong URL.
    const publicBase = PUBLIC_LINK_BASE[module];
    if (publicBase && details.slug) return `${publicBase}/${details.slug}`;

    return null;
  };

  const getActionBadgeVariant = (action: string) => {
    if (action.includes('delete')) return 'destructive';
    if (action.includes('publish') || action.includes('create')) return 'default';
    if (action.includes('update') || action.includes('edit')) return 'secondary';
    return 'outline';
  };

  if (rbacLoading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading...</div>;
  }

  if (!can('admin', 'view')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
        <Lock className="h-12 w-12 text-muted-foreground opacity-20" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground">You don't have permission to view activity logs.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Activity Logs</h2>
          <p className="text-muted-foreground">Audit trail for administrative actions.</p>
        </div>
        <Button onClick={exportToCSV} variant="outline" className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Search className="h-4 w-4" />
              Search
            </label>
            <Input
              placeholder="User, action, module..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </Card>

        <Card className="p-4">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Date Range
            </label>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateRange.from && "text-muted-foreground"
                    )}
                  >
                    {dateRange.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd")} -{" "}
                          {format(dateRange.to, "LLL dd")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange.from || new Date()}
                    selected={{ from: dateRange.from || undefined, to: dateRange.to || undefined }}
                    onSelect={(range: any) => setDateRange({ from: range?.from || undefined, to: range?.to || undefined })}
                    numberOfMonths={2}
                  />

                </PopoverContent>
              </Popover>
              {(dateRange.from || dateRange.to) && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setDateRange({ from: undefined, to: undefined })}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Role
            </label>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        <Card className="p-4">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <History className="h-4 w-4" />
              Module
            </label>
            <Select value={moduleFilter} onValueChange={setModuleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Modules" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modules</SelectItem>
                {availableModules.map((module) => (
                  <SelectItem key={module} value={module} className="capitalize">
                    {module.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>
      </div>


      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            System Audit Trail
          </CardTitle>
          <CardDescription>
            Records of who performed bulk actions and content updates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading logs...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead className="text-right">Link</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedLogs.map((log: any) => (
                  <TableRow key={log.id}>

                    <TableCell className="whitespace-nowrap">
                      {log.created_at ? format(new Date(log.created_at), 'MMM d, yyyy HH:mm') : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{log.profiles?.full_name || 'System'}</span>
                        <span className="text-xs text-muted-foreground">{log.profiles?.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {log.module}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getActionBadgeVariant(log.action)}>
                        {log.action.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate">
                      <span className="text-sm">
                        {log.module === 'pages' && Array.isArray(log.details?.changed) && log.details.changed.length > 0
                          ? `${log.details?.title || 'Untitled'} — ${log.details.changed.join(', ')}`
                          : log.action === 'upload_assets' && Array.isArray(log.details?.names)
                            ? log.details.names.join(', ')
                            : log.details?.title || log.details?.name || '-'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {(() => {
                        const targetLink = getTargetLink(log.module, log.action, log.details);
                        if (!targetLink) return null;

                        // Media uploads link to a Supabase storage URL, not an app route.
                        if (targetLink.startsWith('http')) {
                          return (
                            <Button variant="ghost" size="sm" asChild>
                              <a href={targetLink} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          );
                        }

                        return (
                          <Button variant="ghost" size="sm" asChild>
                            <Link to={targetLink as any}>
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </Button>
                        );
                      })()}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredLogs?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      No activity logs found with current filters.
                    </TableCell>
                  </TableRow>
                )}

              </TableBody>
            </Table>
          )}
          <ListPagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} />
        </CardContent>
      </Card>
    </div>
  );
}
