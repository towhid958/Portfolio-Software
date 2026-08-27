INSERT INTO public.blog_posts (title, slug, featured_image, excerpt, content, category, tags, status, published_at)
VALUES 
(
  'Scaling Your Meta Ads: The Ultimate Framework',
  'scaling-meta-ads-framework',
  'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=1200&auto=format&fit=crop&q=80',
  'Discover the exact framework we use to scale Meta Ad campaigns from $500 to $10,000+ per day while maintaining profitability.',
  'Scaling ads is not just about increasing budget. It requires a systematic approach to creative testing, audience segmentation, and attribution analysis. In this guide, we break down the three pillars of scaling: 1. Creative Saturation Analysis, 2. Horizontal vs. Vertical Scaling, and 3. The Power of Broad Targeting.',
  'Digital Marketing',
  '["Meta Ads", "Scaling", "E-commerce"]'::jsonb,
  'published',
  NOW()
),
(
  'Why Shopify is the Best Platform for E-commerce in 2026',
  'why-shopify-2026',
  'https://images.unsplash.com/photo-1556742044-3c52d6e88c62?w=1200&auto=format&fit=crop&q=80',
  'A deep dive into why Shopify continues to dominate the e-commerce landscape and how its new Hydrogen framework is changing the game.',
  'Shopify has evolved far beyond a simple store builder. With the latest updates to its infrastructure and the maturity of its ecosystem, it offers unparalleled scalability for brands of all sizes. We explore the benefits of headless commerce, advanced app integrations, and the improved checkout experience.',
  'Web Development',
  '["Shopify", "E-commerce", "Tech Trends"]'::jsonb,
  'published',
  NOW() - INTERVAL '2 days'
),
(
  'Mastering SEO: Beyond Keywords',
  'mastering-seo-2026',
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&auto=format&fit=crop&q=80',
  'Learn how to move beyond basic keyword research and focus on user intent and semantic search to rank higher in 2026.',
  'Modern SEO is about relevance and authority. Search engines now prioritize user experience and topic depth over simple keyword density. This article covers technical SEO foundations, content clusters, and the importance of E-E-A-T (Experience, Expertise, Authoritativeness, and Trustworthiness).',
  'SEO',
  '["SEO", "Content Strategy", "Google"]'::jsonb,
  'published',
  NOW() - INTERVAL '5 days'
);
