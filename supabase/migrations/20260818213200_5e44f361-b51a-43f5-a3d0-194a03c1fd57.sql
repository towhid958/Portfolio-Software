ALTER TABLE public.client_documents 
ADD COLUMN IF NOT EXISTS metadata jsonb,
ADD COLUMN IF NOT EXISTS file_size bigint,
ADD COLUMN IF NOT EXISTS file_type text;

-- No need for new GRANTs as permissions already exist on this table,
-- but re-asserting them here is cheap insurance against a missed grant.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_documents TO authenticated;
GRANT ALL ON public.client_documents TO service_role;
