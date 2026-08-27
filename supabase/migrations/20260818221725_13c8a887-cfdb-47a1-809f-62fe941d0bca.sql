-- We use service_role to manage storage policies on storage.objects via the migration tool
-- but standard migrations might not have permission to 'ALTER TABLE storage.objects'.
-- However, we can try to create the policies directly if it's already enabled or if we have permissions for policies.

-- Drop existing policies for this bucket if any
DROP POLICY IF EXISTS "Secure Document Access" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can access their own documents" ON storage.objects;

-- Create policy for users to access their own documents
CREATE POLICY "Users can access their own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'client-documents-vault-private' AND (
    EXISTS (
      SELECT 1 FROM public.client_documents 
      WHERE user_id = auth.uid() 
      AND (file_url = name OR file_url LIKE '%' || name)
    )
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'editor')
  )
);

-- Policy for Admins to upload/manage
CREATE POLICY "Admins can manage documents"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'client-documents-vault-private' AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'editor')
  )
)
WITH CHECK (
  bucket_id = 'client-documents-vault-private' AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'editor')
  )
);
