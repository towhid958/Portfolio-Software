-- Create invoice_templates table
CREATE TABLE public.invoice_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    type text UNIQUE NOT NULL, -- e.g., 'INITIAL_INVOICE', 'PAYMENT_CONFIRMATION', 'PAYMENT_FAILED'
    subject text NOT NULL,
    html_template text NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Grant access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_templates TO authenticated;
GRANT ALL ON public.invoice_templates TO service_role;

-- Enable RLS
ALTER TABLE public.invoice_templates ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage templates" ON public.invoice_templates
    USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Seed default templates
INSERT INTO public.invoice_templates (type, subject, html_template) VALUES 
('INITIAL_INVOICE', 'Invoice {{invoice_number}} from Hasan Kamrul', '
<div style="font-family: Inter, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #3B82F6;">New Invoice Issued</h2>
  <p>Hi {{customer_name}},</p>
  <p>A new invoice has been generated for your order.</p>
  <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <p style="margin: 0;"><strong>Invoice:</strong> {{invoice_number}}</p>
    <p style="margin: 0;"><strong>Amount:</strong> {{amount}} {{currency}}</p>
    <p style="margin: 0;"><strong>Due Date:</strong> {{due_date}}</p>
  </div>
  <a href="{{invoice_url}}" style="display: inline-block; padding: 12px 24px; background-color: #3B82F6; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px;">View & Pay Invoice</a>
  <p style="font-size: 14px; color: #64748b; margin-top: 30px;">If you have any questions, please reply to this email.</p>
</div>
'),
('PAYMENT_CONFIRMATION', 'Payment Confirmed: Invoice {{invoice_number}}', '
<div style="font-family: Inter, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #10b981;">Payment Received</h2>
  <p>Hi {{customer_name}},</p>
  <p>Thank you! Your payment for invoice <strong>{{invoice_number}}</strong> has been successfully processed.</p>
  <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <p style="margin: 0;"><strong>Amount Paid:</strong> {{amount}} {{currency}}</p>
    <p style="margin: 0;"><strong>Status:</strong> PAID</p>
  </div>
  <a href="{{invoice_url}}" style="display: inline-block; padding: 12px 24px; background-color: #3B82F6; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px;">View Printable Receipt</a>
  <p style="font-size: 14px; color: #64748b; margin-top: 30px;">We have started working on your order.</p>
</div>
'),
('PAYMENT_FAILED', 'Payment Failed: Invoice {{invoice_number}}', '
<div style="font-family: Inter, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #ef4444;">Action Required: Payment Failed</h2>
  <p>Hi {{customer_name}},</p>
  <p>We were unable to process your payment for invoice <strong>{{invoice_number}}</strong>.</p>
  <p>Please try again or use a different payment method.</p>
  <a href="{{invoice_url}}" style="display: inline-block; padding: 12px 24px; background-color: #3B82F6; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px;">Retry Payment</a>
  <p style="font-size: 14px; color: #64748b; margin-top: 30px;">If you continue to have trouble, please contact us for assistance.</p>
</div>
');