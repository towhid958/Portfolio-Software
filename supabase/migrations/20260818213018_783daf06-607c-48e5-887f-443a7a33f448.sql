CREATE TABLE public.webhook_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id text NOT NULL,
    event_type text NOT NULL,
    payload jsonb NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    error_message text,
    processed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.webhook_logs TO authenticated;
GRANT ALL ON public.webhook_logs TO service_role;

ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all webhook logs"
ON public.webhook_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
