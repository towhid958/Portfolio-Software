-- Seed Gigs
INSERT INTO public.gigs (title, slug, category_id, thumbnail, short_description, full_description, problem_statement, solution, status, is_featured)
VALUES 
(
  'Meta Ads Performance Scaling', 
  'meta-ads-scaling', 
  (SELECT id FROM public.service_categories WHERE slug = 'digital-marketing' LIMIT 1),
  'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&auto=format&fit=crop&q=60',
  'Scale your brand revenue with data-driven Meta Ads management.',
  'Comprehensive Meta Ads management designed for e-commerce brands looking to scale from $10k to $100k+ per month. We focus on creative strategy, audience testing, and conversion rate optimization.',
  'High acquisition costs and stagnant growth due to inefficient ad spend and lack of creative testing.',
  'A rigorous testing framework for creatives and audiences, combined with advanced tracking and scaling protocols.',
  'published',
  true
),
(
  'Shopify E-commerce Setup', 
  'shopify-setup', 
  (SELECT id FROM public.service_categories WHERE slug = 'web-development' LIMIT 1),
  'https://images.unsplash.com/photo-1556742044-3c52d6e88c62?w=800&auto=format&fit=crop&q=60',
  'Professional Shopify store design and development for high conversion.',
  'Build a modern, fast, and high-converting Shopify store from scratch. We handle everything from theme customization to app integration and SEO setup.',
  'Brands losing sales due to slow, poorly designed, or unoptimized online stores.',
  'Bespoke Shopify development focusing on mobile UX, speed, and persuasive design elements.',
  'published',
  true
);

-- Seed Packages for Meta Ads
INSERT INTO public.gig_packages (gig_id, name, price, delivery_time, revisions, features, cta_text)
VALUES 
(
  (SELECT id FROM public.gigs WHERE slug = 'meta-ads-scaling' LIMIT 1),
  'Basic Setup',
  499.00,
  '7 Days',
  1,
  '["Ad Account Audit", "Pixel Setup", "2 Ad Campaigns", "Basic Copywriting"]',
  'Get Started'
),
(
  (SELECT id FROM public.gigs WHERE slug = 'meta-ads-scaling' LIMIT 1),
  'Standard Management',
  1200.00,
  '30 Days',
  3,
  '["Full Management", "5 Ad Campaigns", "Weekly Reporting", "A/B Testing", "Creative Guidance"]',
  'Scale Now'
),
(
  (SELECT id FROM public.gigs WHERE slug = 'meta-ads-scaling' LIMIT 1),
  'Premium Growth',
  2500.00,
  '30 Days',
  0,
  '["Omnichannel Strategy", "Unlimited Campaigns", "Daily Optimization", "Custom Dashboards", "Creative Production"]',
  'Hire Expert'
);

-- Seed Packages for Shopify Setup
INSERT INTO public.gig_packages (gig_id, name, price, delivery_time, revisions, features, cta_text)
VALUES 
(
  (SELECT id FROM public.gigs WHERE slug = 'shopify-setup' LIMIT 1),
  'Basic Store',
  999.00,
  '10 Days',
  2,
  '["Theme Setup", "Up to 10 Products", "Basic Apps", "Mobile Responsive"]',
  'Order Now'
),
(
  (SELECT id FROM public.gigs WHERE slug = 'shopify-setup' LIMIT 1),
  'Professional Store',
  2499.00,
  '21 Days',
  5,
  '["Custom Design", "Up to 50 Products", "SEO Optimization", "Advanced Apps", "Email Marketing Setup"]',
  'Go Professional'
),
(
  (SELECT id FROM public.gigs WHERE slug = 'shopify-setup' LIMIT 1),
  'Enterprise Solution',
  4999.00,
  '45 Days',
  10,
  '["Bespoke Development", "Unlimited Products", "Wholesale Setup", "Speed Optimization", "3-Month Support"]',
  'Start Enterprise'
);
