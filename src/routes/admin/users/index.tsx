import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRBAC } from '@/hooks/useRBAC';
import { Lock, UserPlus, Shield, Trash2, Mail, KeyRound, Ban, RotateCcw, Search, Download } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { logActivity } from '@/utils/audit';
import { formatDistanceToNow, format } from 'date-fns';
import { useState } from 'react';
import { UserCreationDialog } from '@/components/admin/users/UserCreationDialog';
import { getStaffMembers, setStaffSuspended } from '@/lib/users.functions';
import { exportToCSV } from '@/lib/csv-export';
import { usePagination } from '@/hooks/usePagination';
import { ListPagination } from '@/components/admin/ListPagination';

export const Route = createFileRoute('/admin/users/')({
  component: UsersPage,
});

function UsersPage() {
  const { can, roles, userEmail, isLoading: rbacLoading } = useRBAC();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const isSuperAdmin = roles.includes('super_admin');

  const fetchStaffMembers = useServerFn(getStaffMembers);
  const suspendFn = useServerFn(setStaffSuspended);
  const [resettingEmail, setResettingEmail] = useState<string | null>(null);

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => fetchStaffMembers(),
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: any }) => {
      const { error } = await supabase
        .from('user_roles')
        .update({ role })
        .eq('user_id', userId);

      if (error) throw error;
      await logActivity('users', 'update_role', { user_id: userId, new_role: role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('User role updated');
    },
    onError: (error) => toast.error(error.message),
  });

  const suspendMutation = useMutation({
    mutationFn: (variables: { userId: string; suspended: boolean }) => suspendFn({ data: variables }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success(variables.suspended ? 'User suspended' : 'User unsuspended');
    },
    onError: (error: any) => toast.error(error.message),
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const filteredUsers = (users ?? []).filter((user) => {
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || (user.full_name || '').toLowerCase().includes(q) || (user.email || '').toLowerCase().includes(q);
    return matchesRole && matchesSearch;
  });

  const { pageItems: pagedUsers, page, setPage, totalPages, total, pageSize } = usePagination(filteredUsers);

  const handleExport = () => {
    exportToCSV(`staff-users-${format(new Date(), 'yyyy-MM-dd')}`, filteredUsers.map((u) => ({
      name: u.full_name || '',
      email: u.email || '',
      role: u.role,
      last_sign_in_at: u.last_sign_in_at || '',
      suspended: u.is_suspended,
    })));
  };

  const handlePasswordReset = async (email: string) => {
    setResettingEmail(email);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (error) throw error;
      toast.success(`Password reset email sent to ${email}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to send reset email');
    } finally {
      setResettingEmail(null);
    }
  };

  if (rbacLoading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading...</div>;
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
        <Lock className="h-12 w-12 text-muted-foreground opacity-20" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground">Only Super Admins can manage users and roles.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">User Management</h2>
          <p className="text-muted-foreground">Manage administrative roles and permissions.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={handleExport} disabled={filteredUsers.length === 0}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
            <UserPlus className="h-4 w-4" />
            Add User
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Role" />
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

      <Card>
        <CardHeader>
          <CardTitle>System Users</CardTitle>
          <CardDescription>
            Users with administrative access to the platform.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center">Loading users...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      {users?.length === 0 ? 'No staff users found.' : 'No users match your filters.'}
                    </TableCell>
                  </TableRow>
                )}
                {pagedUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.full_name || 'No Name'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        {user.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'super_admin' ? 'default' : 'secondary'}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.last_sign_in_at ? formatDistanceToNow(new Date(user.last_sign_in_at), { addSuffix: true }) : 'Never'}
                    </TableCell>
                    <TableCell>
                      {user.is_suspended ? (
                        <Badge variant="destructive">Suspended</Badge>
                      ) : (
                        <Badge variant="secondary">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-2 whitespace-nowrap">
                      {/* Only ever toggles WITHIN the admin/editor pair the
                          label promises - previously showed (and worked)
                          for every role, so clicking it on a staff/user row
                          silently promoted them straight to admin (nextRole
                          fell through to 'admin' for anything that wasn't
                          already exactly 'admin'), and on a super_admin row
                          silently demoted them. Changing a staff member's
                          role to admin/editor for the first time, or any
                          super_admin change, should go through a deliberate
                          role picker instead of a single ambiguous button. */}
                      {(user.role === 'admin' || user.role === 'editor') && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={user.email === userEmail}
                          onClick={() => {
                            const nextRole = user.role === 'admin' ? 'editor' : 'admin';
                            updateRoleMutation.mutate({ userId: user.user_id, role: nextRole });
                          }}
                        >
                          Toggle Admin/Editor
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Send Password Reset Email"
                        disabled={!user.email || resettingEmail === user.email}
                        onClick={() => user.email && handlePasswordReset(user.email)}
                      >
                        <KeyRound className="h-4 w-4" />
                      </Button>
                      {user.role !== 'super_admin' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title={user.is_suspended ? 'Unsuspend User' : 'Suspend User'}
                          disabled={user.email === userEmail || suspendMutation.isPending}
                          className={user.is_suspended ? '' : 'text-destructive hover:text-destructive hover:bg-destructive/10'}
                          onClick={() => {
                            const suspending = !user.is_suspended;
                            if (suspending && !confirm(`Suspend ${user.email}? They will be immediately signed out and unable to log back in.`)) return;
                            suspendMutation.mutate({ userId: user.user_id, suspended: suspending });
                          }}
                        >
                          {user.is_suspended ? <RotateCcw className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                        </Button>
                      )}
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
