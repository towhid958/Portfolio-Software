import { createServerFn } from '@tanstack/react-start';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import { quoteRequestSchema } from '@/lib/validations';

export const getServiceBySlug = createServerFn({ method: 'GET' })
  .validator((slug: string) => slug)
  .handler(async ({ data: slug }) => {
    const { data, error } = await supabase
      .from('services')
      .select(
        `
        *,
        category:service_categories(*),
        packages:service_packages_link(
          gig:gigs(*)
        )
      `,
      )
      .eq('slug', slug)
      .eq('status', 'published')
      .single();

    if (error) {
      console.error('Error fetching service by slug:', error);
      return null;
    }
    return data;
  });

export const getQuoteStatus = createServerFn({ method: 'GET' })
  .validator((id: string) => z.string().uuid().parse(id))
  .handler(async ({ data: id }) => {
    const { data, error } = await supabase
      .from('service_quotes')
      .select('id, status, created_at, client_name, services(title), budget, timeline')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching quote status:', error);
      return null;
    }
    return data;
  });

/**
 * The wire shape of a quote submission.
 *
 * Every field is optional and unknown keys pass through, because this
 * endpoint deliberately accepts two spellings - the QuoteRequestForm's
 * snake_case DB names and an older wizard's camelCase ones - and picks
 * whichever is present. Real validation is still
 * `quoteRequestSchema.parse(normalized)` in the handler; this schema only
 * replaces `(data: any)`, so the normalizer below is reading from a typed
 * object instead of from anything at all.
 */
const inquirySubmission = z
  .object({
    // read straight into the insert, so this one must be a string
    serviceId: z.string().nullish(),
    service_id: z.string().nullish(),
    // Everything below is re-validated by quoteRequestSchema. Note the
    // .optional(): a bare z.unknown() is a *required* key in zod 4, so
    // without it this schema rejects every real submission.
    client_name: z.unknown().optional(),
    fullName: z.unknown().optional(),
    client_email: z.unknown().optional(),
    email: z.unknown().optional(),
    client_phone: z.unknown().optional(),
    phoneWhatsapp: z.unknown().optional(),
    company_name: z.unknown().optional(),
    companyName: z.unknown().optional(),
    country: z.unknown().optional(),
    website_url: z.unknown().optional(),
    websiteUrl: z.unknown().optional(),
    project_description: z.unknown().optional(),
    projectDescription: z.unknown().optional(),
    requirements: z.unknown().optional(),
    requiredFeatures: z.unknown().optional(),
    budget: z.unknown().optional(),
    budgetRange: z.unknown().optional(),
    timeline: z.unknown().optional(),
    custom_answers: z.unknown().optional(),
    industry: z.unknown().optional(),
    businessGoals: z.unknown().optional(),
    targetAudience: z.unknown().optional(),
    existingPlatform: z.unknown().optional(),
    competitorReferences: z.unknown().optional(),
    selectedServices: z.unknown().optional(),
  })
  .loose();

export const submitServiceInquiry = createServerFn({ method: 'POST' })
  .validator((data) => inquirySubmission.parse(data))
  .handler(async ({ data }) => {
    // Callers submit either the QuoteRequestForm's camelCase field names or
    // already-mapped DB column names - normalize before validating so both
    // shapes are checked against the same required fields.
    const normalized = {
      // A generic (not-tied-to-a-service) quote request has no serviceId at
      // all - service_id is a nullable uuid column, and an empty string
      // isn't valid uuid syntax, so Postgres rejected every one of these
      // submissions outright instead of the row inserting with a null.
      service_id: (data.serviceId ?? data.service_id) || null,
      client_name: data.fullName || data.client_name,
      client_email: data.email || data.client_email,
      client_phone: data.phoneWhatsapp || data.client_phone,
      company_name: data.companyName || data.company_name,
      country: data.country,
      website_url: data.websiteUrl || data.website_url,
      project_description: data.projectDescription || data.project_description,
      requirements: data.requiredFeatures || data.requirements,
      budget: data.budgetRange || data.budget,
      timeline: data.timeline,
      custom_answers: data.custom_answers || {
        industry: data.industry,
        businessGoals: data.businessGoals,
        targetAudience: data.targetAudience,
        existingPlatform: data.existingPlatform,
        competitorReferences: data.competitorReferences,
        selectedServices: data.selectedServices,
      },
    };

    const validated = quoteRequestSchema.parse(normalized);

    const { data: insertedData, error } = await supabase
      .from('service_quotes')
      .insert({
        service_id: normalized.service_id,
        client_name: validated.client_name,
        client_email: validated.client_email,
        client_phone: validated.client_phone ?? null,
        company_name: validated.company_name ?? null,
        country: validated.country ?? null,
        website_url: validated.website_url ?? null,
        project_description: validated.project_description,
        requirements: validated.requirements ?? null,
        budget: validated.budget ?? null,
        timeline: validated.timeline ?? null,
        custom_answers: validated.custom_answers,
        status: 'pending',
      })
      .select('id')
      .single();

    if (error) throw error;
    return { success: true, id: insertedData.id };
  });
