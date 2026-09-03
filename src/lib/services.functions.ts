import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { quoteRequestSchema } from "@/lib/validations";

export const getServiceBySlug = createServerFn({ method: "GET" })
  .validator((slug: string) => slug)
  .handler(async ({ data: slug }) => {
    const { data, error } = await supabase
      .from('services')
      .select(`
        *,
        category:service_categories(*),
        packages:service_packages_link(
          gig:gigs(*)
        )
      `)
      .eq('slug', slug)
      .eq('status', 'published')
      .single();
    
    if (error) {
      console.error('Error fetching service by slug:', error);
      return null;
    }
    return data;
  });

export const getQuoteStatus = createServerFn({ method: "GET" })
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

export const submitServiceInquiry = createServerFn({ method: "POST" })
  .validator((data: any) => data)
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
        selectedServices: data.selectedServices
      }
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
