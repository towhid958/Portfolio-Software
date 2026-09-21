-- Messaging is completely unreadable for every signed-in user, including
-- super_admin. Any select against conversations, conversation_participants
-- or messages fails with:
--
--   42501: permission denied for function is_conversation_participant
--
-- Cause: 20260825215826 revoked EXECUTE on is_conversation_participant(),
-- is_staff() and bump_conversation_activity() from anon/authenticated/public.
-- The intent - stop clients calling the helpers directly - is reasonable, but
-- the first two are called from inside the RLS policies on those three
-- tables, and a policy expression is evaluated as the *querying* role. With
-- EXECUTE revoked, the policy itself cannot run, so the query is rejected
-- before any row is considered.
--
-- Restoring EXECUTE to `authenticated` leaks very little: both functions are
-- SECURITY DEFINER, STABLE, take explicit arguments and return only a
-- boolean. They are what the policies already rely on.
--
-- Deliberately NOT restored:
--   * anon - messaging is authenticated-only, so anon never needs these.
--   * bump_conversation_activity() - it is a trigger function. PostgreSQL
--     checks EXECUTE when the trigger is created, not when it fires, so the
--     revoke there is real hardening and does not break writes.

GRANT EXECUTE ON FUNCTION public.is_conversation_participant(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;
