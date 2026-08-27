-- Revoke default public execution rights
REVOKE ALL ON FUNCTION public.is_email_verified(uuid) FROM PUBLIC;

-- Re-grant only to specific roles if needed, though we only call it via RPC or backend
-- Actually, we want to call it from client via RPC for check, so we grant to authenticated.
GRANT EXECUTE ON FUNCTION public.is_email_verified(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_email_verified(uuid) TO service_role;
