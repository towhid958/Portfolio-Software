import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const logInvoiceDownload = createServerFn({ method: "POST" })
  .validator((data) => z.object({
    invoiceId: z.string(),
    invoiceNumber: z.string(),
  }).parse(data))
  .handler(async ({ data }) => {
    // We try to get the current user if available, but for public invoice views, 
    // it might just be the customer downloading it.
    
    // First, fetch the invoice to get the owner (user_id) for the log
    const { data: invoice, error: fetchError } = await supabaseAdmin
      .from('invoices')
      .select('user_id')
      .eq('id', data.invoiceId)
      .single();

    if (fetchError || !invoice) {
      console.error('Error fetching invoice for logging:', fetchError);
      return { success: false, error: 'Invoice not found' };
    }

    try {
      const { error: logError } = await supabaseAdmin.from('activity_logs').insert({
        action: 'download_invoice',
        module: 'invoices',
        user_id: invoice.user_id, // Associated with the invoice owner
        details: { 
          invoice_id: data.invoiceId,
          invoice_number: data.invoiceNumber,
          timestamp: new Date().toISOString(),
          source: 'public_view'
        }
      });

      if (logError) throw logError;

      return { success: true };
    } catch (err: any) {
      console.error('Activity logging error:', err);
      return { success: false, error: err.message };
    }
  });
