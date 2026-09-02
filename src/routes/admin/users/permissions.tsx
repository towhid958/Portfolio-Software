import { createFileRoute } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import {
  getModulePermissions,
  updateModulePermission,
  getUserRolesList,
  addUserRole,
  removeUserRole
} from '@/lib/permissions.functions';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { toast } from 'sonner';
import { Shield, ShieldAlert, Users as UsersIcon, Save, Plus, Trash2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useRBAC } from '@/hooks/useRBAC';
import { Lock } from 'lucide-react';

export const Route = createFileRoute('/admin/users/permissions')({
  component: PermissionsPage,
});

// 'users' and 'settings' are deliberately excluded: both pages ignore this
// matrix entirely and gate on a hardcoded `roles.includes('super_admin')`
// check instead (see admin/users/index.tsx, admin/settings/index.tsx, and
// the sidebar's isSuperAdminOnly list in AdminLayout.tsx), so toggling them
// here would show a control with no effect. 'admin' is excluded for the
// same reason but from the other direction - it's a pseudo-module (see
// admin/index.tsx's own can('admin', ...) calls) that only ever resolves
// via ROLE_PERMISSIONS' hardcoded fallback in src/lib/rbac.ts, never a
// module_permissions row, so there's nothing here it would actually control either.
const MODULES = [
  'projects',
  'gigs',
  'blog',
  'pages',
  'partners',
  'orders',
  'messages',
  'testimonials',
  'about',
  'media',
  'documents',
  'clients',
  'services_custom',
];

const ROLES = ['admin', 'editor', 'staff', 'user'] as const;

function PermissionsPage() {
  const queryClient = useQueryClient();
  const { roles, isLoading: rbacLoading } = useRBAC();
  const isSuperAdmin = roles.includes('super_admin');
  const fetchModulePermissions = useServerFn(getModulePermissions);
  const fetchUserRolesList = useServerFn(getUserRolesList);
  const updateModulePermissionFn = useServerFn(updateModulePermission);
  const addUserRoleFn = useServerFn(addUserRole);
  const removeUserRoleFn = useServerFn(removeUserRole);

  const { data: modulePermissions, isLoading: modulePermissionsLoading } = useQuery({
    queryKey: ['module-permissions'],
    queryFn: () => fetchModulePermissions(),
  });

  const { data: userRoles, isLoading: userRolesLoading } = useQuery({
    queryKey: ['user-roles-list'],
    queryFn: () => fetchUserRolesList(),
  });

  const updatePermissionMutation = useMutation({
    mutationFn: (variables: any) => updateModulePermissionFn({ data: variables }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['module-permissions'] });
      toast.success('Permission updated');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const addRoleMutation = useMutation({
    mutationFn: (variables: any) => addUserRoleFn({ data: variables }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-roles-list'] });
      toast.success('Role assigned');
      setIsAddRoleOpen(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const removeRoleMutation = useMutation({
    mutationFn: (variables: any) => removeUserRoleFn({ data: variables }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-roles-list'] });
      toast.success('Role removed');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const [searchEmail, setSearchEmail] = useState('');
  const [isAddRoleOpen, setIsAddRoleOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('editor');

  const { data: searchResults } = useQuery({
    queryKey: ['user-search', searchEmail],
    queryFn: async () => {
      if (searchEmail.length < 3) return [];
      const { data } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .ilike('email', `%${searchEmail}%`)
        .limit(5);
      return data || [];
    },
    enabled: searchEmail.length >= 3,
  });

  const handleToggle = (role: string, module: string, action: string, currentVal: boolean) => {
    const existing = (modulePermissions ?? []).find(p => p.role === role && p.module === module);
    
    updatePermissionMutation.mutate({
      id: existing?.id,
      role,
      module,
      can_view: action === 'view' ? !currentVal : (existing?.can_view ?? false),
      can_create: action === 'create' ? !currentVal : (existing?.can_create ?? false),
      can_edit: action === 'edit' ? !currentVal : (existing?.can_edit ?? false),
      can_delete: action === 'delete' ? !currentVal : (existing?.can_delete ?? false),
    });
  };

  if (rbacLoading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading...</div>;
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
        <Lock className="h-12 w-12 text-muted-foreground opacity-20" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground">Only Super Admins can manage roles and permissions.</p>
      </div>
    );
  }

  if (modulePermissionsLoading || userRolesLoading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading permissions...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Permissions & RBAC</h2>
        <p className="text-muted-foreground">Manage role-based access control and module permissions.</p>
      </div>

      <Tabs defaultValue="roles" className="w-full">
        <TabsList>
          <TabsTrigger value="roles">
            <UsersIcon className="mr-2 h-4 w-4" />
            User Roles
          </TabsTrigger>
          <TabsTrigger value="modules">
            <Shield className="mr-2 h-4 w-4" />
            Module Permissions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="space-y-4 pt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>User Role Assignments</CardTitle>
                <CardDescription>Assign specific roles to users to control their access levels.</CardDescription>
              </div>
              <Dialog open={isAddRoleOpen} onOpenChange={setIsAddRoleOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Assign Role
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Assign Role to User</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Search User (Email)</label>
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                          placeholder="Search by email..." 
                          className="pl-8"
                          value={searchEmail}
                          onChange={(e) => setSearchEmail(e.target.value)}
                        />
                      </div>
                      {searchResults && searchResults.length > 0 && (
                        <div className="mt-2 border rounded-md divide-y bg-muted/50">
                          {searchResults.map(user => (
                            <button
                              key={user.id}
                              className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors ${selectedUserId === user.id ? 'bg-primary/10' : ''}`}
                              onClick={() => setSelectedUserId(user.id)}
                            >
                              <div className="font-medium">{user.full_name || 'No Name'}</div>
                              <div className="text-xs text-muted-foreground">{user.email}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Select Role</label>
                      <Select value={selectedRole} onValueChange={setSelectedRole}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map(role => (
                            <SelectItem key={role} value={role}>
                              {role.charAt(0).toUpperCase() + role.slice(1)}
                            </SelectItem>
                          ))}
                          <SelectItem value="super_admin">Super Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button 
                      onClick={() => addRoleMutation.mutate({ user_id: selectedUserId, role: selectedRole })}
                      disabled={!selectedUserId || addRoleMutation.isPending}
                    >
                      Assign Role
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(userRoles ?? []).map((ur: any) => (
                    <TableRow key={ur.id}>
                      <TableCell className="font-medium">
                        {(ur.profiles as any)?.full_name || 'N/A'}
                      </TableCell>
                      <TableCell>{(ur.profiles as any)?.email}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          ur.role === 'super_admin' ? 'bg-red-100 text-red-700' : 
                          ur.role === 'admin' ? 'bg-blue-100 text-blue-700' : 
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {ur.role}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => removeRoleMutation.mutate({ id: ur.id })}
                          disabled={removeRoleMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="modules" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Global Module Permissions</CardTitle>
              <CardDescription>
                Define what each role can do across the platform. Super Admins bypass these checks.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Module / Role</TableHead>
                      {ROLES.map(role => (
                        <TableHead key={role} className="text-center w-32 capitalize">
                          {role}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {MODULES.map(module => (
                      <TableRow key={module}>
                        <TableCell className="font-medium capitalize">{module}</TableCell>
                        {ROLES.map(role => {
                          const perm = (modulePermissions ?? []).find(p => p.role === role && p.module === module);
                          return (
                            <TableCell key={role} className="text-center">
                              <div className="flex flex-col gap-2 items-center">
                                <div className="flex items-center gap-2">
                                  <label className="text-[10px] uppercase text-muted-foreground w-8">View</label>
                                  <Checkbox 
                                    checked={perm?.can_view ?? false} 
                                    onCheckedChange={() => handleToggle(role, module, 'view', perm?.can_view ?? false)}
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <label className="text-[10px] uppercase text-muted-foreground w-8">Create</label>
                                  <Checkbox 
                                    checked={perm?.can_create ?? false} 
                                    onCheckedChange={() => handleToggle(role, module, 'create', perm?.can_create ?? false)}
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <label className="text-[10px] uppercase text-muted-foreground w-8">Edit</label>
                                  <Checkbox 
                                    checked={perm?.can_edit ?? false} 
                                    onCheckedChange={() => handleToggle(role, module, 'edit', perm?.can_edit ?? false)}
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <label className="text-[10px] uppercase text-muted-foreground w-8">Del</label>
                                  <Checkbox 
                                    checked={perm?.can_delete ?? false} 
                                    onCheckedChange={() => handleToggle(role, module, 'delete', perm?.can_delete ?? false)}
                                  />
                                </div>
                              </div>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex items-start gap-3">
        <ShieldAlert className="h-5 w-5 text-amber-600 mt-0.5" />
        <div className="text-sm text-amber-800">
          <p className="font-semibold">Security Note</p>
          <p>Super Admins always have full permissions across all modules regardless of the settings above. Changes to permissions take effect immediately for all users with that role.</p>
        </div>
      </div>
    </div>
  );
}
