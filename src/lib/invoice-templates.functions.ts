import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getInvoiceTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("invoice_templates")
      .select("*")
      .order("type");

    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const updateInvoiceTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({
      id: z.string(),
      subject: z.string().min(1),
      html_template: z.string().min(1),
    }).parse(data)
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("invoice_templates")
      .update({
        subject: data.subject,
        html_template: data.html_template,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id);

    if (error) throw new Error(error.message);
    return { success: true };
  });
