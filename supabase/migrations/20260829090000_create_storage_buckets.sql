-- Neither storage bucket the app relies on ('media' for public content
-- images, 'client-documents-vault-private' for private client files) was
-- ever created by a tracked migration - like the missing profile trigger,
-- they must have been created manually in the old Lovable-managed project's
-- dashboard. A fresh project has no buckets at all, so every image upload
-- fails with "Bucket not found". Create both here, plus the storage.objects
-- policies 'media' was always missing (client-documents-vault-private
-- already had its own policies from an earlier migration).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('media', 'media', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'])
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('client-documents-vault-private', 'client-documents-vault-private', false, 20971520)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public can view media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload media" ON storage.objects;
DROP POLICY IF EXISTS "Managers can update media" ON storage.objects;
DROP POLICY IF EXISTS "Managers can delete media" ON storage.objects;

-- Public read: media URLs are embedded directly in public pages (blog,
-- gigs, projects, services).
CREATE POLICY "Public can view media" ON storage.objects FOR SELECT
    USING (bucket_id = 'media');

-- Any signed-in user can upload - covers both admins managing content
-- images and customers attaching photos to a gig review.
CREATE POLICY "Authenticated users can upload media" ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'media');

-- Only content managers can modify or remove existing media.
CREATE POLICY "Managers can update media" ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'media' AND (public.has_role(auth.uid(), 'editor') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')));

CREATE POLICY "Managers can delete media" ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'media' AND (public.has_role(auth.uid(), 'editor') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')));
