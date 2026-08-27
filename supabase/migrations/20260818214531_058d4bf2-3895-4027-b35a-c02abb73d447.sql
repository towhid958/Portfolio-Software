ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS last_email_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_email_status JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS last_email_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_email_status JSONB DEFAULT '{}'::jsonb;
