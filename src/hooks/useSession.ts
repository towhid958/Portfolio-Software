import { useEffect } from 'react';
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export const SESSION_QUERY_KEY = ['auth-session'] as const;

/**
 * One auth subscription for the whole app.
 *
 * Before this, every component that needed to know "who is signed in" ran its
 * own `supabase.auth.getSession()` (26 call sites) and several kept their own
 * `onAuthStateChange` subscription plus a `useState<Session>`. Worse, the
 * dashboard did it *inside* each `queryFn`, so every tile serialized
 * getSession -> query instead of starting its real request immediately.
 *
 * The subscription is module-level and intentionally never torn down: it is a
 * single listener for the lifetime of the tab, and unsubscribing it when one
 * component unmounts would break every other consumer.
 */
let authSubscriptionStarted = false;
let lastUserId: string | null | undefined;

function ensureAuthSubscription(queryClient: QueryClient) {
  if (authSubscriptionStarted || typeof window === 'undefined') return;
  authSubscriptionStarted = true;

  supabase.auth.onAuthStateChange((_event, session) => {
    const nextUserId = session?.user.id ?? null;

    // Only wipe cached data when the *person* changes, never on a routine
    // TOKEN_REFRESHED (which fires about hourly and carries the same user) -
    // clearing there would throw away every query in the app for nothing.
    if (lastUserId !== undefined && lastUserId !== nextUserId) {
      queryClient.clear();
    }

    lastUserId = nextUserId;
    queryClient.setQueryData(SESSION_QUERY_KEY, session);
  });
}

/**
 * The signed-in session, shared across every caller.
 *
 * All callers hit one React Query cache entry, so N components cause exactly
 * one `getSession()` round-trip. `staleTime: Infinity` is safe because the
 * auth subscription above pushes updates in - the value is event-driven, not
 * poll-driven.
 *
 * Use `userId` in a query key whenever the query returns user-scoped rows.
 * Keys like `['client-orders']` are shared across users, so after a sign-out
 * and sign-in in the same tab the previous user's rows are served from cache
 * until the refetch lands.
 */
export function useSession() {
  const queryClient = useQueryClient();

  useEffect(() => {
    ensureAuthSubscription(queryClient);
  }, [queryClient]);

  const { data, isLoading } = useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: async (): Promise<Session | null> => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      return session;
    },
    staleTime: Infinity,
  });

  const session = data ?? null;
  return {
    session,
    userId: session?.user.id ?? null,
    userEmail: session?.user.email ?? null,
    isLoading,
  };
}
