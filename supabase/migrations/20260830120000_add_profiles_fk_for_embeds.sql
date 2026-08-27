-- PostgREST can only embed a related table (e.g. `profiles:user_id(...)`)
-- when there's a direct foreign key between the two tables being joined.
-- activity_logs.user_id, client_documents.user_id, and user_roles.user_id
-- were only ever declared as `REFERENCES auth.users(id)`, never
-- `public.profiles`, so every query trying to embed the acting user's
-- profile (Activity Logs, the admin dashboard's recent-activity widget,
-- client document ownership, and role management) fails outright with
-- PGRST200 ("Could not find a relationship..."). Since useQuery only
-- checks isLoading and never surfaces the error, those lists just render
-- as silently empty instead of showing anything went wrong.
--
-- profiles.id is always equal to its owning auth.users.id (see
-- handle_new_user()), so adding a second FK straight to public.profiles
-- is safe and lets PostgREST resolve the embed. ON DELETE actions match
-- each table's existing FK to auth.users so deletion behavior is
-- unchanged.
ALTER TABLE public.activity_logs
    ADD CONSTRAINT activity_logs_user_id_profiles_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.client_documents
    ADD CONSTRAINT client_documents_user_id_profiles_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.user_roles
    ADD CONSTRAINT user_roles_user_id_profiles_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
