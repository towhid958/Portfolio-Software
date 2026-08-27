import { z } from 'zod';

export const serviceSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100),
  slug: z.string().min(1, 'Link is required').max(100),
  short_description: z.string().max(255).nullish().transform(val => val || null),
  full_description: z.string().nullish().transform(val => val || null),
  starting_price: z.number().min(0, 'Price cannot be negative'),
  status: z.enum(['draft', 'published', 'archived']),
  category_id: z.string().uuid('Please select a category'),
  hero_image: z.string().nullish().transform(val => val || null),
  icon_image: z.string().nullish().transform(val => val || null),
  features: z.array(z.object({
    title: z.string(),
    description: z.string()
  })).default([]),
  benefits: z.array(z.string()).default([]),
  technologies: z.array(z.string()).default([]),
  process: z.array(z.object({
    step: z.string(),
    title: z.string(),
    description: z.string()
  })).default([]),
  show_packages: z.boolean().default(false),
  show_portfolio: z.boolean().default(true),
  show_case_studies: z.boolean().default(true),
  show_testimonials: z.boolean().default(true),
  show_faq: z.boolean().default(true),
  enable_quote_request: z.boolean().default(true),
  budget_options: z.array(z.string()).default([]),
  timeline_options: z.array(z.string()).default([]),
  meta_title: z.string().max(70).nullish().transform(val => val || null),
  meta_description: z.string().max(160).nullish().transform(val => val || null),
  og_image: z.string().nullish().transform(val => val || null),
  keywords: z.array(z.string()).default([]),
  package_ids: z.array(z.string().uuid()).default([]),
});

export type ServiceValues = z.infer<typeof serviceSchema>;

export const quoteRequestSchema = z.object({
  client_name: z.string().min(2, 'Name is required'),
  client_email: z.string().email('Invalid email address'),
  client_phone: z.string().optional(),
  company_name: z.string().optional(),
  country: z.string().optional(),
  website_url: z.string().url('Invalid URL').or(z.literal('')).optional(),
  project_description: z.string().min(20, 'Please provide more details about your project'),
  requirements: z.string().optional(),
  budget: z.string().optional(),
  timeline: z.string().optional(),
  custom_answers: z.record(z.string(), z.any()).default({}),
});

export type QuoteRequestValues = z.infer<typeof quoteRequestSchema>;

export const blogPostSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  slug: z.string().min(1, 'Link is required'),
  excerpt: z.string().max(500).nullish(),
  content: z.string().min(10, 'Content is too short'),
  category_id: z.string().nullish(),
  status: z.enum(['draft', 'published']),
  featured_image: z.string().url('Invalid image URL').or(z.literal('')).nullish(),
  tags: z.array(z.string()).nullish(),
  seo_title: z.string().max(70).nullish(),
  seo_description: z.string().max(160).nullish(),
});

export type BlogPostValues = z.infer<typeof blogPostSchema>;

export const partnerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().nullish(),
  website_url: z.string().url('Invalid URL').or(z.literal('')).nullish(),
  partnership_type: z.string().nullish(),
  logo: z.string().url('Invalid logo URL').or(z.literal('')).nullish(),
});

export type PartnerValues = z.infer<typeof partnerSchema>;

export const offerSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  description: z.string().nullish(),
  benefit: z.string().nullish(),
  cta_text: z.string().nullish(),
  destination_url: z.string().url('Invalid URL'),
  expiry_date: z.string().nullish(),
  is_active: z.boolean().nullish(),
});

export type OfferValues = z.infer<typeof offerSchema>;

export const projectSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  slug: z.string().min(1, 'Link is required'),
  description: z.string().nullish(),
  category_id: z.string().uuid('Please select a category'),
  client: z.string().nullish(),
  industry: z.string().nullish(),
  project_url: z.string().url('Invalid URL').or(z.literal('')).nullish(),
  completion_date: z.string().nullish(),
  status: z.enum(['draft', 'published']),
  featured_image: z.string().url('Invalid image URL').or(z.literal('')).nullish(),
  gallery: z.array(z.string()).nullish(),
  challenge: z.string().nullish(),
  strategy: z.string().nullish(),
  solution: z.string().nullish(),
  implementation: z.string().nullish(),
  results: z.string().nullish(),
  metrics: z.array(z.object({
    label: z.string(),
    value: z.string()
  })).nullish(),
  timeline: z.string().nullish(),
  technologies: z.array(z.string()).nullish(),
  services_provided: z.array(z.string()).nullish(),
});

export type ProjectValues = z.infer<typeof projectSchema>;

export const serviceFaqSchema = z.object({
  question: z.string().min(5, 'Question is too short'),
  answer: z.string().min(10, 'Answer is too short'),
  display_order: z.number().default(0),
  is_published: z.boolean().default(true),
});

export type ServiceFaqValues = z.infer<typeof serviceFaqSchema>;


export const testimonialSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  role: z.string().nullish(),
  company: z.string().nullish(),
  content: z.string().min(10, 'Testimonial is too short'),
  rating: z.number().min(1).max(5),
  is_approved: z.boolean().default(true).nullish(),
});

export type TestimonialValues = z.infer<typeof testimonialSchema>;

