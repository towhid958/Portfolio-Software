-- Payment Methods Enum
DO $$ BEGIN
    CREATE TYPE public.payment_method_type AS ENUM ('stripe', 'bkash', 'bank_transfer', 'manual');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Update orders table to support manual/offline payments
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS payment_method public.payment_method_type DEFAULT 'stripe',
ADD COLUMN IF NOT EXISTS payment_proof_url TEXT,
ADD COLUMN IF NOT EXISTS admin_notes TEXT,
ADD COLUMN IF NOT EXISTS billing_details JSONB;

-- Invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    invoice_number TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    issue_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    due_date TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'void')),
    total_amount NUMERIC NOT NULL,
    currency TEXT DEFAULT 'USD' NOT NULL,
    items JSONB NOT NULL, -- Array of { description, quantity, unit_price, total }
    billing_to JSONB,
    billing_from JSONB,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Bank Account Details Table (Site Config)
CREATE TABLE IF NOT EXISTS public.bank_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_name TEXT NOT NULL,
    bank_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    branch_name TEXT,
    routing_number TEXT,
    swift_code TEXT,
    bkash_number TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
GRANT SELECT ON public.bank_details TO authenticated;
GRANT SELECT ON public.bank_details TO anon;
GRANT ALL ON public.bank_details TO service_role;

-- RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_details ENABLE ROW LEVEL SECURITY;

-- Policies for invoices
CREATE POLICY "Users can view their own invoices"
ON public.invoices FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can manage all invoices"
ON public.invoices FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Policies for bank_details
CREATE POLICY "Everyone can view active bank details"
ON public.bank_details FOR SELECT
TO authenticated, anon
USING (is_active = true);

CREATE POLICY "Admins can manage bank details"
ON public.bank_details FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Seed initial bank details if empty
INSERT INTO public.bank_details (account_name, bank_name, account_number, bkash_number)
VALUES ('Hasan Kamrul', 'Demo Bank BD', '123456789', '01700000000')
ON CONFLICT DO NOTHING;
