import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type Role = Database['public']['Enums']['app_role'];

interface Permission {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

// Define module-specific permissions per role
// super_admin gets all by default (handled in check function)
const ROLE_PERMISSIONS: Record<Role, Record<string, Permission>> = {
  super_admin: {}, // Fallback to all true
  admin: {
    projects: { view: true, create: true, edit: true, delete: true },
    gigs: { view: true, create: true, edit: true, delete: true },
    blog: { view: true, create: true, edit: true, delete: true },
    pages: { view: true, create: true, edit: true, delete: true },
    partners: { view: true, create: true, edit: true, delete: true },
    orders: { view: true, create: true, edit: true, delete: true },
    messages: { view: true, create: true, edit: true, delete: true },
    testimonials: { view: true, create: true, edit: true, delete: true },
    about: { view: true, create: true, edit: true, delete: true },
    media: { view: true, create: true, edit: true, delete: true },
    admin: { view: true, create: true, edit: true, delete: true },
    documents: { view: true, create: true, edit: true, delete: true },
    clients: { view: true, create: true, edit: true, delete: true },
    services_custom: { view: true, create: true, edit: true, delete: true },
  },
  editor: {
    projects: { view: true, create: true, edit: true, delete: false },
    gigs: { view: true, create: true, edit: true, delete: false },
    blog: { view: true, create: true, edit: true, delete: false },
    pages: { view: true, create: true, edit: true, delete: false },
    partners: { view: true, create: true, edit: true, delete: false },
    orders: { view: true, create: false, edit: false, delete: false },
    messages: { view: true, create: false, edit: false, delete: false },
    testimonials: { view: true, create: false, edit: true, delete: false },
    about: { view: true, create: false, edit: true, delete: false },
    media: { view: true, create: true, edit: true, delete: true },
    documents: { view: true, create: true, edit: true, delete: false },
    clients: { view: true, create: true, edit: true, delete: false },
    services_custom: { view: true, create: true, edit: true, delete: false },
  },
  staff: {
    projects: { view: true, create: false, edit: false, delete: false },
    gigs: { view: true, create: false, edit: false, delete: false },
    blog: { view: true, create: false, edit: false, delete: false },
    partners: { view: true, create: false, edit: false, delete: false },
    orders: { view: true, create: false, edit: true, delete: false }, // Can manage orders
    messages: { view: true, create: false, edit: true, delete: false }, // Can read/mark messages
    testimonials: { view: true, create: false, edit: false, delete: false },
    about: { view: true, create: false, edit: false, delete: false },
    documents: { view: true, create: false, edit: false, delete: false },
    clients: { view: true, create: false, edit: false, delete: false },
  },
  user: {
    projects: { view: false, create: false, edit: false, delete: false },
    gigs: { view: false, create: false, edit: false, delete: false },
    blog: { view: false, create: false, edit: false, delete: false },
    partners: { view: false, create: false, edit: false, delete: false },
    orders: { view: false, create: false, edit: false, delete: false },
    messages: { view: false, create: false, edit: false, delete: false },
    testimonials: { view: false, create: false, edit: false, delete: false },
    about: { view: false, create: false, edit: false, delete: false },
    documents: { view: true, create: false, edit: false, delete: false },
    tasks: { view: true, create: false, edit: false, delete: false },
    support: { view: true, create: true, edit: false, delete: false },
    billing: { view: true, create: false, edit: false, delete: false },
  }
};

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
  const [dbPermissions, setDbPermissions] = useState<Record<string, Record<string, Permission>>>({});
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
        const mappedPerms: any = {};
        permsRes.data.forEach(p => {
          if (!mappedPerms[p.role]) mappedPerms[p.role] = {};
          mappedPerms[p.role][p.module] = {
            view: p.can_view,
            create: p.can_create,
            edit: p.can_edit,
            delete: p.can_delete
          };
        });
        setDbPermissions(mappedPerms);
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

  const can = (module: string, action: keyof Permission) => {
    if (roles.includes('super_admin')) return true;
    
    return roles.some(role => {
      // Check database-driven permissions first, then fallback to hardcoded
      const dbPerm = dbPermissions[role]?.[module];
      if (dbPerm) return dbPerm[action];

      const permissions = ROLE_PERMISSIONS[role]?.[module];
      return permissions ? permissions[action] : false;
    });
  };

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
