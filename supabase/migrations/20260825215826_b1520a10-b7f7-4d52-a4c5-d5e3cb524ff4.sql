REVOKE EXECUTE ON FUNCTION public.is_conversation_participant(uuid, uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.bump_conversation_activity() FROM anon, authenticated, public;