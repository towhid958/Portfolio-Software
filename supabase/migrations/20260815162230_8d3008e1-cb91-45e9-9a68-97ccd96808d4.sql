-- Create admin_notifications table
CREATE TABLE public.admin_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Target user (null for all admins)
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL, -- e.g., 'review_new', 'review_approved', 'review_rejected'
    link TEXT, -- e.g., '/admin/testimonials'
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Grant access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_notifications TO authenticated;
GRANT ALL ON public.admin_notifications TO service_role;

-- Enable RLS
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Policies
-- Admins can see all notifications (both targeted to them or broadcast)
CREATE POLICY "Admins can view notifications"
ON public.admin_notifications
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR user_id = auth.uid());

-- Admins can mark notifications as read
CREATE POLICY "Admins can update their notifications"
ON public.admin_notifications
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR user_id = auth.uid());

-- Anyone authenticated can insert (to trigger from frontend)
CREATE POLICY "Anyone can insert notifications"
ON public.admin_notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow anon to insert for guest reviews
GRANT INSERT ON public.admin_notifications TO anon;
CREATE POLICY "Anon can insert notifications"
ON public.admin_notifications
FOR INSERT
TO anon
WITH CHECK (true);
