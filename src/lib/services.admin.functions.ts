import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import type { Database } from '@/integrations/supabase/types';

// The admin UI's status <Select> and this validator must not drift,
// so both read the list from here.
export const QUOTE_STATUSES = [
  'pending',
  'contacted',
  'proposal_sent',
  'won',
  'lost',
  'rejected',
] as const;

export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

export const getServiceInquiries = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from('service_inquiries')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getServiceQuotes = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from('service_quotes')
      .select('*, services(title)')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const updateQuoteStatus = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .validator((data) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(QUOTE_STATUSES),
        internal_notes: z.string().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from('service_quotes')
      .update({
        status: data.status,
        // the column is nullable, and `internal_notes: undefined` is not
        // assignable under exactOptionalPropertyTypes - which is the only
        // reason this object was ever cast to `any`
        internal_notes: data.internal_notes ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.id);

    if (error) throw new Error(error.message);
    return { success: true };
  });

export const updateInquiryStatus = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .validator((data) => z.object({ id: z.string().uuid(), status: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from('service_inquiries')
      .update({ status: data.status })
      .eq('id', data.id);

    if (error) throw new Error(error.message);
    return { success: true };
  });

export const getServiceFaqs = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from('service_faqs')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertServiceFaq = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .validator((data) =>
    z
      .object({
        id: z.string().uuid().optional(),
        question: z.string().min(3),
        answer: z.string().min(3),
        category: z.string().optional(),
        display_order: z.number(),
        is_published: z.boolean(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const faqData: Database['public']['Tables']['service_faqs']['Insert'] = {
      question: data.question,
      answer: data.answer,
      category: data.category ?? null,
      display_order: data.display_order,
      is_published: data.is_published,
    };

    if (data.id) {
      const { error } = await context.supabase
        .from('service_faqs')
        .update(faqData)
        .eq('id', data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from('service_faqs').insert([faqData]);
      if (error) throw new Error(error.message);
    }

    return { success: true };
  });

export const deleteServiceFaq = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .validator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from('service_faqs').delete().eq('id', data.id);

    if (error) throw new Error(error.message);
    return { success: true };
  });
