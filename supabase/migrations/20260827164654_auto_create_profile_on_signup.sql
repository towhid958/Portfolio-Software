-- Every part of the app that reads a user's name/avatar/bio (About page,
-- homepage hero, admin client lists, etc.) reads from public.profiles, keyed
-- by auth.users.id. Nothing in the tracked migrations ever created the
-- trigger that's supposed to auto-provision that row on signup - it must
-- have existed only as an untracked, manually-added object on the original
-- project. Signing up on a freshly-migrated database left new users with no
-- profiles row at all (email is NOT NULL there, so nothing silently
-- defaults it in).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
