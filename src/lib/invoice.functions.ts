import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getUserRoles, isStaffRole } from "@/lib/authz.server";

export const generateInvoicePDF = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string() }).parse(data))
  .handler(async ({ data: { id }, context }) => {
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from("invoices")
      .select("*")
      .eq("id", id)
      .single();

    if (invoiceError || !invoice) {
      throw new Error("Invoice not found");
    }

    const roles = await getUserRoles(context.userId);
    if (!isStaffRole(roles) && invoice.user_id !== context.userId) {
      throw new Error("Unauthorized access to this invoice");
    }

    const { data: settings } = await supabaseAdmin
      .from("invoice_settings")
      .select("*")
      .single();

    // Dynamically import jspdf to avoid issues with SSR if any
    const { jsPDF } = await import("jspdf");
    
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    // Handle logo if present
    if (settings?.company_logo) {
      try {
        const response = await fetch(settings.company_logo);
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64 = buffer.toString('base64');
        const format = settings.company_logo.split('.').pop()?.toUpperCase() || 'PNG';
        
        doc.addImage(base64, format === 'JPG' ? 'JPEG' : format, 160, 10, 30, 30, undefined, 'FAST');
      } catch (err) {
        console.error('Failed to load logo for PDF:', err);
      }
    }

    const primaryColor = [59, 130, 246] as const;
    const margin = 20;
    let y = 30;

    // Header
    doc.setFontSize(28);
    doc.setFont("helvetica", "bold");
    doc.text("INVOICE", margin, y);
    
    // Status Badge
    const status = (invoice.status || "draft").toUpperCase();
    doc.setFontSize(10);
    const statusWidth = doc.getTextWidth(status);
    doc.setFillColor(240, 240, 240);
    doc.roundedRect(margin + 50, y - 7, statusWidth + 10, 8, 2, 2, "F");
    doc.setTextColor(100, 100, 100);
    doc.text(status, margin + 55, y - 1);
    
    y += 10;
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150, 150, 150);
    doc.text(`#${invoice.invoice_number}`, margin, y);

    // Company Info (Right Aligned)
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    const companyName = settings?.company_name || "Hasan Kamrul";
    doc.text(companyName, pageWidth - margin, y - 10, { align: "right" });
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    const companyEmail = settings?.company_email || "kamrulhasan.freelancer@gmail.com";
    doc.text(companyEmail, pageWidth - margin, y - 4, { align: "right" });
    
    const companyAddress = settings?.company_address || "Bangladesh";
    const addressLines = doc.splitTextToSize(companyAddress, 60);
    doc.text(addressLines, pageWidth - margin, y + 2, { align: "right" });

    y += 30;

    // Billing Info
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(150, 150, 150);
    doc.text("BILLING TO:", margin, y);
    
    y += 7;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    const billingName = (invoice.billing_to as any)?.name || "Valued Client";
    doc.text(billingName, margin, y);
    
    y += 5;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text((invoice.billing_to as any)?.email || "", margin, y);

    // Dates (Right Aligned)
    let dateY = y - 12;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("ISSUE DATE:", pageWidth - margin, dateY, { align: "right" });
    dateY += 5;
    doc.setFont("helvetica", "normal");
    const issueDate = new Date(invoice.issue_date).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    doc.text(issueDate, pageWidth - margin, dateY, { align: "right" });

    if (invoice.due_date) {
      dateY += 8;
      doc.setFont("helvetica", "bold");
      doc.text("DUE DATE:", pageWidth - margin, dateY, { align: "right" });
      dateY += 5;
      doc.setFont("helvetica", "normal");
      const dueDate = new Date(invoice.due_date).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
      doc.text(dueDate, pageWidth - margin, dateY, { align: "right" });
    }

    y = Math.max(y + 20, dateY + 20);

    // Table Header
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, y, pageWidth - (margin * 2), 10, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text("Description", margin + 5, y + 6);
    doc.text("Qty", pageWidth - margin - 60, y + 6, { align: "center" });
    doc.text("Price", pageWidth - margin - 35, y + 6, { align: "right" });
    doc.text("Total", pageWidth - margin - 5, y + 6, { align: "right" });

    y += 10;

    // Table Items
    const items = (invoice.items as any[]) || [];
    items.forEach((item) => {
      doc.setFont("helvetica", "normal");
      const itemDescription = doc.splitTextToSize(item.description, pageWidth - margin - 100);
      doc.text(itemDescription, margin + 5, y + 8);
      
      const descHeight = (itemDescription.length * 5);
      doc.text(String(item.quantity), pageWidth - margin - 60, y + 8, { align: "center" });
      doc.text(`$${item.unit_price}`, pageWidth - margin - 35, y + 8, { align: "right" });
      doc.text(`$${item.total}`, pageWidth - margin - 5, y + 8, { align: "right" });
      
      y += Math.max(12, descHeight + 5);
      doc.setDrawColor(240, 240, 240);
      doc.line(margin, y, pageWidth - margin, y);
    });

    y += 10;

    // Totals
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150, 150, 150);
    doc.text("Subtotal", pageWidth - margin - 40, y);
    doc.setTextColor(0, 0, 0);
    doc.text(`$${invoice.total_amount}`, pageWidth - margin - 5, y, { align: "right" });

    y += 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Total Due", pageWidth - margin - 40, y);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(`$${invoice.total_amount} ${invoice.currency}`, pageWidth - margin - 5, y, { align: "right" });

    // Notes
    y += 30;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Notes & Instructions", margin, y);
    
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    const notes = invoice.notes || "Please complete payment via Stripe or Bank Transfer. If paying via bKash, use the number provided in payment instructions.";
    const splitNotes = doc.splitTextToSize(notes, pageWidth - (margin * 2));
    doc.text(splitNotes, margin, y);

    // Return as base64
    const pdfBase64 = doc.output("datauristring");
    return { pdf: pdfBase64 };
  });
