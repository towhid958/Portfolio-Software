import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { supabase } from '@/integrations/supabase/client';
import { getRequireEmailVerification } from '@/lib/public-site-config.functions';
import type { Session } from '@supabase/supabase-js';

// This route only ever makes sense as the target of an email-confirmation
// or OAuth redirect - a fresh top-level browser navigation. TanStack Start
// SSRs that navigation first, and the token Supabase needs (URL hash
// fragment, or a PKCE code the client exchanges) is only ever available in
// the browser - so this used to live in a `loader`, which ran on the server
// with no session and no token to read, and immediately bounced back to
// /auth regardless of whether the link was valid. All of it now runs
// client-side only, after Supabase's own detectSessionInUrl has had a
// chance to process the URL.
export const Route = createFileRoute('/auth/callback')({
  component: AuthCallback,
});

const STAFF_ROLES = ['super_admin', 'admin', 'editor', 'staff'];

function AuthCallback() {
  const navigate = useNavigate();
  const fetchRequireVerification = useServerFn(getRequireEmailVerification);

  useEffect(() => {
    let cancelled = false;

    const finish = async (session: Session) => {
      if (cancelled) return;
      cancelled = true;

      if (!session.user.email_confirmed_at && (await fetchRequireVerification())) {
        await supabase.auth.signOut();
        navigate({ to: '/auth', search: { error: 'Please verify your email address before signing in.' } });
        return;
      }

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id);

      if (rolesError) {
        await supabase.auth.signOut();
        navigate({ to: '/auth' });
        return;
      }

      const hasAdminAccess = roles?.some((r) => STAFF_ROLES.includes(r.role));
      navigate({ to: hasAdminAccess ? '/admin' : '/dashboard' });
    };

    // detectSessionInUrl (on by default) processes this URL's fragment/code
    // as the client initializes - by the time this effect runs a session is
    // usually already there, but the auth-state listener catches it too in
    // case that processing is still in flight.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) finish(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) finish(session);
    });

    // Neither path above fired (invalid/expired link, or the token was
    // never there at all) - don't leave the user staring at "Verifying..."
    // forever.
    const timeout = setTimeout(() => {
      if (!cancelled) {
        cancelled = true;
        navigate({ to: '/auth' });
      }
    }, 8000);

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [navigate, fetchRequireVerification]);

  return <div className="flex items-center justify-center min-h-screen">Verifying authentication...</div>;
}
