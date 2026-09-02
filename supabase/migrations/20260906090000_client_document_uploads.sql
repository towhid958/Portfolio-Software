-- Client-side document upload (two-way document vault). Previously only
-- admin/staff could INSERT into client_documents and the storage bucket -
-- there was no path for a client to add a file for admin to see. Clients
-- get upload only, never delete/update: the existing admin-only "FOR ALL"
-- policies already cover admin managing (including deleting) any document
-- regardless of who uploaded it, so no change is needed there.

CREATE POLICY "Clients can upload their own documents" ON public.client_documents
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Clients can upload to their own storage folder" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (
      bucket_id = 'client-documents-vault-private'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
