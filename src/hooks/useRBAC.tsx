import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { resolveCan, mapDbPermissionRows, type Role, type Permission, type DbPermissions } from '@/lib/rbac';

interface RBACContextType {
  roles: Role[];
  isLoading: boolean;
  userEmail: string | null;
  can: (module: string, action: keyof Permission) => boolean;
  hasRole: (role: Role | Role[]) => boolean;
}

const RBACContext = createContext<RBACContextType | undefined>(undefined);

export function RBACProvider({ children }: { children: React.ReactNode }) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [dbPermissions, setDbPermissions] = useState<DbPermissions>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadRoles() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setRoles([]);
        setUserEmail(null);
        setIsLoading(false);
        return;
      }

      setUserEmail(session.user.email || null);

      const [rolesRes, permsRes] = await Promise.all([
        supabase.from('user_roles').select('role').eq('user_id', session.user.id),
        supabase.from('module_permissions').select('*')
      ]);

      if (rolesRes.data) {
        setRoles(rolesRes.data.map(r => r.role as Role));
      }

      if (permsRes.data) {
        setDbPermissions(mapDbPermissionRows(permsRes.data));
      }
      setIsLoading(false);
    }

    loadRoles();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadRoles();
    });

    return () => subscription.unsubscribe();
  }, []);

  const hasRole = (role: Role | Role[]) => {
    if (Array.isArray(role)) {
      return role.some(r => roles.includes(r));
    }
    return roles.includes(role);
  };

  const can = (module: string, action: keyof Permission) => resolveCan(roles, dbPermissions, module, action);

  return (
    <RBACContext.Provider value={{ roles, isLoading, userEmail, can, hasRole }}>
      {children}
    </RBACContext.Provider>
  );
}

export function useRBAC() {
  const context = useContext(RBACContext);
  if (context === undefined) {
    throw new Error('useRBAC must be used within a RBACProvider');
  }
  return context;
}
