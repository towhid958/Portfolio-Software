-- Revoke execute from public and authenticated for security definer function
REVOKE EXECUTE ON FUNCTION public.handle_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_updated_at() FROM authenticated;

-- Set search_path for security definer function
ALTER FUNCTION public.handle_updated_at() SET search_path = public;
