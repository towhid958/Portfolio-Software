-- Future-dated publish: an admin can set pages.scheduled_publish_at instead
-- of hitting Publish immediately; a pg_cron job checks once a minute for
-- anything due and publishes it the same way a manual Publish would
-- (copy draft_sections -> sections, stamp published_at, snapshot a
-- page_versions row) - see run_scheduled_publishes() below.
ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS scheduled_publish_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS pages_scheduled_publish_at_idx
    ON public.pages (scheduled_publish_at)
    WHERE scheduled_publish_at IS NOT NULL;

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- SECURITY DEFINER (unlike publish_pages, which runs as the calling admin):
-- pg_cron invokes this with no auth.uid() session at all, so the normal
-- "Managers can manage pages" RLS policy could never let a plain UPDATE
-- through here. Safe specifically because this function takes no caller-
-- supplied input at all - it only ever acts on rows an authenticated admin
-- already scheduled themselves via the app - so there's nothing for a
-- caller to smuggle through it. Execute is revoked from every normal role
-- below; only the cron scheduler (running as the function owner) calls it.
CREATE OR REPLACE FUNCTION public.run_scheduled_publishes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id, draft_sections, sections, title
    FROM public.pages
    WHERE scheduled_publish_at IS NOT NULL
      AND scheduled_publish_at <= NOW()
      AND status != 'published'
  LOOP
    UPDATE public.pages
    SET sections = COALESCE(r.draft_sections, r.sections),
        status = 'published',
        published_at = NOW(),
        scheduled_publish_at = NULL
    WHERE id = r.id;

    INSERT INTO public.page_versions (page_id, sections, title, created_by)
    VALUES (r.id, COALESCE(r.draft_sections, r.sections), r.title, NULL);
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.run_scheduled_publishes() FROM PUBLIC, anon, authenticated;

-- Idempotent (guards against re-running this migration re-creating a
-- duplicate job, e.g. after a local `supabase db reset`).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'run-scheduled-page-publishes') THEN
    PERFORM cron.schedule('run-scheduled-page-publishes', '* * * * *', 'SELECT public.run_scheduled_publishes();');
  END IF;
END $$;
