import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getServiceInquiries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from('service_inquiries')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getServiceQuotes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from('service_quotes')
      .select('*, services(title)')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const updateQuoteStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({
    id: z.string().uuid(),
    status: z.enum(['pending', 'contacted', 'proposal_sent', 'won', 'lost', 'rejected']),
    internal_notes: z.string().optional()
  }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from('service_quotes')
      .update({
        status: data.status,
        internal_notes: data.internal_notes,
        updated_at: new Date().toISOString()
      } as any)
      .eq('id', data.id);

    if (error) throw new Error(error.message);
    return { success: true };
  });

export const updateInquiryStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid(), status: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from('service_inquiries')
      .update({ status: data.status } as any)
      .eq('id', data.id);

    if (error) throw new Error(error.message);
    return { success: true };
  });

export const getServiceFaqs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from('service_faqs')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertServiceFaq = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({
    id: z.string().uuid().optional(),
    question: z.string().min(3),
    answer: z.string().min(3),
    category: z.string().optional(),
    display_order: z.number(),
    is_published: z.boolean()
  }).parse(data))
  .handler(async ({ data, context }) => {
    const faqData: any = {
      question: data.question,
      answer: data.answer,
      category: data.category ?? null,
      display_order: data.display_order,
      is_published: data.is_published
    };

    if (data.id) {
      const { error } = await context.supabase
        .from('service_faqs')
        .update(faqData)
        .eq('id', data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase
        .from('service_faqs')
        .insert([faqData]);
      if (error) throw new Error(error.message);
    }

    return { success: true };
  });

export const deleteServiceFaq = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from('service_faqs')
      .delete()
      .eq('id', data.id);

    if (error) throw new Error(error.message);
    return { success: true };
  });
