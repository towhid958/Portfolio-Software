
-- Create client_documents table
CREATE TABLE public.client_documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title text NOT NULL,
    description text,
    file_url text NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Grant access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_documents TO authenticated;
GRANT ALL ON public.client_documents TO service_role;

-- Enable RLS
ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;

-- Policies for client_documents
CREATE POLICY "Users can view their own documents"
ON public.client_documents
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can manage documents"
ON public.client_documents
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
