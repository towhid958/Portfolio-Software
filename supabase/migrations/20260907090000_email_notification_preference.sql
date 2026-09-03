-- Lets a client opt out of automatic payment-status emails (Stripe webhook
-- triggered PAYMENT_CONFIRMATION/PAYMENT_FAILED sends). Deliberately does
-- NOT gate manually-triggered sends (an admin or the client themselves
-- clicking "Email Invoice") - those are an explicit request in the moment,
-- not an automated notification, so honoring an opt-out there would be
-- surprising rather than helpful.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_notifications boolean NOT NULL DEFAULT true;
