-- Move function to a private schema or just ensure it's not public if we don't want linter warnings
-- However, for simplicity in this task, I will keep it and just ensure it's secure.
-- The linter is warning because it's SECURITY DEFINER.

-- Let's try changing it to SECURITY INVOKER but it needs access to auth.users which it might not have.
-- Actually, the best way to handle this without warnings is to move it to a schema that isn't exposed by PostgREST if we don't need it in RPC.
-- But we want to call it.

-- Let's try to fix the EXECUTE permissions more explicitly.
ALTER FUNCTION public.is_email_verified(uuid) SECURITY INVOKER;
-- Wait, SECURITY INVOKER won't work for auth.users access for normal users.

-- Back to SECURITY DEFINER but with REVOKE.
ALTER FUNCTION public.is_email_verified(uuid) SECURITY DEFINER;
REVOKE EXECUTE ON FUNCTION public.is_email_verified(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_email_verified(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.is_email_verified(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_email_verified(uuid) TO service_role;

-- We will check email verification in the auth callback via a server-side check if possible,
-- or just rely on Supabase's built-in session information which includes `email_confirmed_at`.
