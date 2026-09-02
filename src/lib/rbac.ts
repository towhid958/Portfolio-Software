import type { Database } from '@/integrations/supabase/types';

export type Role = Database['public']['Enums']['app_role'];

export interface Permission {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

export type DbPermissions = Record<string, Record<string, Permission>>;

// Fallback permissions per role, used only when there's no matching row in
// the module_permissions table (the admin-editable overrides - see
// admin/users/permissions.tsx). super_admin gets all by default, handled
// in resolveCan below rather than spelled out here.
export const ROLE_PERMISSIONS: Record<Role, Record<string, Permission>> = {
  super_admin: {},
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
    orders: { view: true, create: false, edit: true, delete: false },
    messages: { view: true, create: false, edit: true, delete: false },
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
  },
};

/**
 * The one place permission decisions actually get made - shared by
 * useRBAC's `can()` (client components) and admin/route.tsx's beforeLoad
 * (route guards, which run outside React so the hook itself isn't
 * reachable there). Keeping this pure and dependency-free is what lets
 * both call sites agree: a route guard that redirects away from a page a
 * component would otherwise let you act on (or vice versa) is exactly the
 * kind of gap a second, drifted copy of this logic would eventually cause.
 */
export function resolveCan(roles: Role[], dbPermissions: DbPermissions, module: string, action: keyof Permission): boolean {
  if (roles.includes('super_admin')) return true;

  return roles.some((role) => {
    const dbPerm = dbPermissions[role]?.[module];
    if (dbPerm) return dbPerm[action];

    const permissions = ROLE_PERMISSIONS[role]?.[module];
    return permissions ? permissions[action] : false;
  });
}

/** Shapes the raw module_permissions rows (role, module, can_view, can_create, can_edit, can_delete) into resolveCan's lookup structure - shared so the SSR fetch (ssr-session.server.ts) and the client fetch (useRBAC) can't drift in how they interpret the same table. Booleans come through nullable from Supabase's generated Row type even though the column itself is non-null in practice, hence the `?? false`. */
export function mapDbPermissionRows(
  rows: Array<{
    role: string;
    module: string;
    can_view: boolean | null;
    can_create: boolean | null;
    can_edit: boolean | null;
    can_delete: boolean | null;
  }>
): DbPermissions {
  const mapped: DbPermissions = {};
  for (const p of rows) {
    if (!mapped[p.role]) mapped[p.role] = {};
    mapped[p.role]![p.module] = {
      view: p.can_view ?? false,
      create: p.can_create ?? false,
      edit: p.can_edit ?? false,
      delete: p.can_delete ?? false,
    };
  }
  return mapped;
}
