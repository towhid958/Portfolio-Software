import { createFileRoute, redirect } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { getRequireEmailVerification } from '@/lib/public-site-config.functions';

export const Route = createFileRoute('/auth/callback')({
  loader: async () => {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      console.error('Session error or missing:', sessionError);
      throw redirect({ to: '/auth' });
    }

    // Check if email is verified - gated on Settings > Account > "Require
    // email verification" (site_configuration.require_email_verification),
    // defaulting to on.
    if ((await getRequireEmailVerification()) && !session.user.email_confirmed_at) {
      // If email is not verified, sign them out and redirect to auth with error
      await supabase.auth.signOut();
      throw redirect({ 
        to: '/auth',
        search: { 
          error: 'Please verify your email address before signing in.' 
        } 
      });
    }

    // Check if the user has a valid admin role
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id);

    if (rolesError) {
      console.error('Roles error:', rolesError);
      await supabase.auth.signOut();
      throw redirect({ to: '/auth' });
    }

    const hasAdminAccess = roles?.some(r => ['super_admin', 'admin', 'editor', 'staff'].includes(r.role));

    if (hasAdminAccess) {
      throw redirect({ to: '/admin' });
    }

    // If they don't have admin access, redirect to client dashboard
    throw redirect({ to: '/dashboard' });
  },
  component: () => <div className="flex items-center justify-center min-h-screen">Verifying authentication...</div>,
});
