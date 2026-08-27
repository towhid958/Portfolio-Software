CREATE TABLE public.invoice_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL DEFAULT 'Hasan Kamrul',
  company_email text NOT NULL DEFAULT 'kamrulhasan.freelancer@gmail.com',
  company_address text NOT NULL DEFAULT 'Bangladesh',
  company_logo text,
  invoice_prefix text NOT NULL DEFAULT 'INV-',
  next_invoice_number integer NOT NULL DEFAULT 1000,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_settings TO authenticated;
GRANT ALL ON public.invoice_settings TO service_role;

ALTER TABLE public.invoice_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage invoice settings" 
ON public.invoice_settings 
FOR ALL 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Seed default settings
INSERT INTO public.invoice_settings (company_name, company_email, company_address, invoice_prefix, next_invoice_number)
VALUES ('Hasan Kamrul', 'kamrulhasan.freelancer@gmail.com', 'Bangladesh', 'INV-', 1000);
