-- Function to check if email is verified
CREATE OR REPLACE FUNCTION public.is_email_verified(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT email_confirmed_at IS NOT NULL 
     FROM auth.users 
     WHERE id = _user_id),
    false
  );
$$;

-- Grant access to the function
GRANT EXECUTE ON FUNCTION public.is_email_verified(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_email_verified(uuid) TO service_role;
