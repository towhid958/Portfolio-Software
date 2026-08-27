-- Seed Partners
INSERT INTO public.partners (name, description, logo, partnership_type, website_url)
VALUES 
('Shopify', 'The all-in-one commerce platform to start, run, and grow a business.', 'https://upload.wikimedia.org/wikipedia/commons/e/e1/Shopify_Logo.png', 'Technology Partner', 'https://shopify.com'),
('Klaviyo', 'Intelligent marketing automation for e-commerce brands.', 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Klaviyo_Logo.svg/2560px-Klaviyo_Logo.svg.png', 'Strategic Partner', 'https://klaviyo.com'),
('TripleWhale', 'The operating system for e-commerce. Centralize your data.', 'https://assets-global.website-files.com/6182a3b983570259b3695b11/6182a3b983570213b3695b3b_Triple%20Whale%20Logo.svg', 'Data Partner', 'https://triplewhale.com');

-- Seed Offers for Shopify
INSERT INTO public.offers (partner_id, title, benefit, description, destination_url, cta_text, is_active)
SELECT id, 'Free 3-Day Trial', 'Start for $1/month', 'Get Shopify for just $1 per month for the first 3 months after your free trial.', 'https://shopify.com/free-trial?ref=hasankamrul', 'Start Trial', true
FROM public.partners WHERE name = 'Shopify';

-- Seed Offers for Klaviyo
INSERT INTO public.offers (partner_id, title, benefit, description, destination_url, cta_text, is_active)
SELECT id, 'Free Integration Audit', 'Complimentary Audit', 'Get a free email automation audit when you sign up through my partner link.', 'https://klaviyo.com/partner/hasankamrul', 'Claim Audit', true
FROM public.partners WHERE name = 'Klaviyo';

-- Seed Offers for TripleWhale
INSERT INTO public.offers (partner_id, title, benefit, description, destination_url, cta_text, is_active)
SELECT id, '15% Lifetime Discount', 'Save 15% Forever', 'Use code HASAN15 at checkout to get a permanent 15% discount on any plan.', 'https://triplewhale.com/?ref=hasankamrul', 'Get Discount', true
FROM public.partners WHERE name = 'TripleWhale';

-- Verify access policies exist for partners and offers
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'partners' AND policyname = 'Public read access for partners') THEN
        CREATE POLICY "Public read access for partners" ON public.partners FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'offers' AND policyname = 'Public read access for offers') THEN
        CREATE POLICY "Public read access for offers" ON public.offers FOR SELECT USING (true);
    END IF;
END
$$;
