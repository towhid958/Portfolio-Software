import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getUserRoles, isStaffRole } from "@/lib/authz.server";
import { Resend } from 'resend';
import { generateInvoicePDFBuffer } from "./invoice-pdf.server";


const EmailType = z.enum(['INITIAL_INVOICE', 'PAYMENT_CONFIRMATION', 'PAYMENT_FAILED', 'REFUND']);

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Used whenever no matching row exists in invoice_templates for this type -
// previously every type fell back to the same "please find your invoice"
// copy regardless of what actually happened, which read as wrong for a
// failed payment or a refund.
function getFallbackEmailContent(type: z.infer<typeof EmailType>, invoiceNumber: string, customerName: string, invoiceUrl: string) {
  const name = escapeHtml(customerName);
  switch (type) {
    case 'PAYMENT_CONFIRMATION':
      return {
        subject: `Payment Received - Invoice ${invoiceNumber}`,
        html: `<div><p>Hi ${name},</p><p>We've received your payment for invoice ${invoiceNumber}. Thank you!</p><p><a href="${invoiceUrl}">View your invoice</a></p></div>`,
      };
    case 'PAYMENT_FAILED':
      return {
        subject: `Payment Issue - Invoice ${invoiceNumber}`,
        html: `<div><p>Hi ${name},</p><p>We weren't able to process your payment for invoice ${invoiceNumber}. Please try again or reply to this email for help.</p><p><a href="${invoiceUrl}">View your invoice</a></p></div>`,
      };
    case 'REFUND':
      return {
        subject: `Refund Processed - Invoice ${invoiceNumber}`,
        html: `<div><p>Hi ${name},</p><p>A refund has been processed for invoice ${invoiceNumber}. It may take a few business days to appear on your statement.</p><p><a href="${invoiceUrl}">View your invoice</a></p></div>`,
      };
    case 'INITIAL_INVOICE':
    default:
      return {
        subject: `Invoice ${invoiceNumber} from Hasan Kamrul`,
        html: `<div><p>Hi ${name},</p><p>Please find your invoice ${invoiceNumber} at <a href="${invoiceUrl}">${invoiceUrl}</a></p></div>`,
      };
  }
}

export const previewInvoiceEmail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data) => z.object({
    invoiceId: z.string(),
    type: EmailType,
  }).parse(data))
  .handler(async ({ data, context }) => {
    // Reuse logic to fetch invoice
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from('invoices')
      .select('*, orders(*, gig_packages(name, gigs(title)))')
      .eq('id', data.invoiceId)
      .single();

    if (invoiceError || !invoice) {
      throw new Error('Invoice not found');
    }

    const roles = await getUserRoles(context.userId);
    if (!isStaffRole(roles) && invoice.user_id !== context.userId) {
      throw new Error('Unauthorized access to this invoice');
    }

    const customerEmail = (invoice.billing_to as any)?.email;
    const customerName = (invoice.billing_to as any)?.name || 'Valued Client';
    const invoiceUrl = `${process.env['FRONTEND_URL'] || 'http://localhost:8080'}/invoices/${invoice.id}`;
    
    // Fetch template from DB
    const { data: template } = await supabaseAdmin
      .from('invoice_templates')
      .select('subject, html_template')
      .eq('type', data.type)
      .single();

    let subject = '';
    let html = '';

    if (template) {
      const placeholders: Record<string, string> = {
        '{{invoice_number}}': invoice.invoice_number || '',
        '{{amount}}': String(invoice.total_amount || '0'),
        '{{currency}}': invoice.currency || 'USD',
        '{{customer_name}}': escapeHtml(customerName),
        '{{due_date}}': invoice.due_date || 'Upon Receipt',
        '{{invoice_url}}': invoiceUrl,
      };

      subject = template.subject;
      html = template.html_template;

      Object.entries(placeholders).forEach(([key, value]) => {
        const regex = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        subject = subject.replace(regex, value);
        html = html.replace(regex, value);
      });
    } else {
      // Fallback if template missing
      ({ subject, html } = getFallbackEmailContent(data.type, invoice.invoice_number || '', customerName, invoiceUrl));
    }

    // Log the preview activity
    await supabaseAdmin.from('activity_logs').insert({
      action: 'preview_email',
      module: 'invoices',
      details: { 
        type: data.type, 
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        recipient: customerEmail
      }
    });

    return { subject, html };
  });

type EmailTypeValue = z.infer<typeof EmailType>;

// Core sending logic, shared by the authenticated client-facing server
// function below and by the Stripe webhook (which runs as a trusted
// server-to-server call with no user session to authenticate).
//
// respectPreference: only set true for automatic, webhook-triggered sends
// (payment confirmed/failed). A manual send - the client or an admin
// explicitly clicking "Email Invoice" right now - is a direct request in
// the moment, not an automated notification, so it always goes through
// regardless of the client's notification preference.
export async function sendInvoiceEmailCore(invoiceId: string, type: EmailTypeValue, respectPreference = false) {
    const resendApiKey = process.env['RESEND_API_KEY'];
    if (!resendApiKey) {
      console.error('RESEND_API_KEY is not configured');
      return { success: false, error: 'Email service not configured' };
    }

    const resend = new Resend(resendApiKey);
    const senderEmail = process.env['SENDER_EMAIL'] || 'onboarding@resend.dev';

    // Fetch invoice and related order/customer details
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from('invoices')
      .select('*, orders(*, gig_packages(name, gigs(title)))')
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      console.error('Error fetching invoice for email:', invoiceError);
      return { success: false, error: 'Invoice not found' };
    }

    if (respectPreference && invoice.user_id) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('email_notifications')
        .eq('id', invoice.user_id)
        .maybeSingle();
      if (profile?.email_notifications === false) {
        return { success: false, error: 'Client has opted out of automatic email notifications' };
      }
    }

    const customerEmail = (invoice.billing_to as any)?.email;
    const customerName = (invoice.billing_to as any)?.name || 'Valued Client';

    if (!customerEmail) {
      return { success: false, error: 'Customer email not found in invoice' };
    }

    const invoiceUrl = `${process.env['FRONTEND_URL'] || 'http://localhost:8080'}/invoices/${invoice.id}`;

    // Fetch template from DB
    const { data: template } = await supabaseAdmin
      .from('invoice_templates')
      .select('subject, html_template')
      .eq('type', type)
      .single();

    let subject = '';
    let html = '';

    if (template) {
      const placeholders: Record<string, string> = {
        '{{invoice_number}}': invoice.invoice_number || '',
        '{{amount}}': String(invoice.total_amount || '0'),
        '{{currency}}': invoice.currency || 'USD',
        '{{customer_name}}': escapeHtml(customerName),
        '{{due_date}}': invoice.due_date || 'Upon Receipt',
        '{{invoice_url}}': invoiceUrl,
      };

      subject = template.subject;
      html = template.html_template;

      Object.entries(placeholders).forEach(([key, value]) => {
        const regex = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        subject = subject.replace(regex, value);
        html = html.replace(regex, value);
      });
    } else {
      ({ subject, html } = getFallbackEmailContent(type, invoice.invoice_number || '', customerName, invoiceUrl));
    }

    try {
      let attachments: { filename: string; content: Buffer }[] | undefined = undefined;

      if (['INITIAL_INVOICE', 'PAYMENT_CONFIRMATION', 'PAYMENT_FAILED', 'REFUND'].includes(type)) {
        const pdfBuffer = await generateInvoicePDFBuffer(invoice.id);
        attachments = [{
          filename: `Invoice_${invoice.invoice_number}.pdf`,
          content: pdfBuffer,
        }];
      }

      const emailOptions: any = {
        from: `Hasan Kamrul <${senderEmail}>`,
        to: [customerEmail],
        subject: subject,
        html: html,
      };

      if (attachments) {
        emailOptions.attachments = attachments;
      }

      const { data: emailData, error: emailError } = await resend.emails.send(emailOptions);



      const statusUpdate = {
        type,
        success: !emailError,
        error: emailError?.message,
        messageId: emailData?.id,
        timestamp: new Date().toISOString()
      };

      // Update the invoice with status
      await supabaseAdmin
        .from('invoices')
        .update({
          last_email_sent_at: new Date().toISOString(),
          last_email_status: statusUpdate
        })
        .eq('id', invoiceId);

      if (emailError) throw emailError;


      // Log the activity
      await supabaseAdmin.from('activity_logs').insert({
        action: 'send_email',
        module: 'invoices',
        user_id: invoice.user_id,
        details: {
          type,
          email: customerEmail,
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number
        }
      });

      // In-app notification, mirroring the email - only for registered
      // clients (invoice.user_id is null for guest/manual invoices).
      if (invoice.user_id) {
        const notificationMessage = {
          INITIAL_INVOICE: `A new invoice (#${invoice.invoice_number}) is ready for you.`,
          PAYMENT_CONFIRMATION: `Payment received for invoice #${invoice.invoice_number}. Thank you!`,
          PAYMENT_FAILED: `Payment failed for invoice #${invoice.invoice_number}. Please try again.`,
          REFUND: `A refund has been processed for invoice #${invoice.invoice_number}.`,
        }[type];

        await supabaseAdmin.from('admin_notifications').insert({
          user_id: invoice.user_id,
          title: type === 'PAYMENT_FAILED' ? 'Payment failed' : type === 'REFUND' ? 'Refund processed' : 'Invoice update',
          message: notificationMessage,
          type: 'invoice_sent',
          link: `/invoices/${invoice.id}`,
        });
      }

      return { success: true, messageId: emailData?.id };
    } catch (err: any) {
      console.error('Resend error:', err);
      // Log failure to the record
      const statusUpdate = {
        type,
        success: false,
        error: err.message || 'Unknown error',
        timestamp: new Date().toISOString()
      };

      await supabaseAdmin
        .from('invoices')
        .update({
          last_email_sent_at: new Date().toISOString(),
          last_email_status: statusUpdate
        })
        .eq('id', invoiceId);

      return { success: false, error: err.message };
    }
}

export const sendInvoiceEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) => z.object({
    invoiceId: z.string(),
    type: EmailType,
  }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from('invoices')
      .select('user_id')
      .eq('id', data.invoiceId)
      .single();

    if (invoiceError || !invoice) {
      return { success: false, error: 'Invoice not found' };
    }

    const roles = await getUserRoles(context.userId);
    if (!isStaffRole(roles) && invoice.user_id !== context.userId) {
      return { success: false, error: 'Unauthorized access to this invoice' };
    }

    return sendInvoiceEmailCore(data.invoiceId, data.type);
  });
