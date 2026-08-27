import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Printer, Download, Mail, Loader2, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { sendInvoiceEmail } from '@/lib/email.functions';
import { logInvoiceDownload } from '@/lib/activity.functions';
import { generateInvoicePDF } from '@/lib/invoice.functions';
import { toast } from 'sonner';



export const Route = createFileRoute('/invoices/$id')({
  component: InvoiceDetail,
});

function InvoiceDetail() {
  const { id } = Route.useParams();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const sendEmail = useServerFn(sendInvoiceEmail);
  const logDownload = useServerFn(logInvoiceDownload);
  const getPDF = useServerFn(generateInvoicePDF);


  
  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('invoices').select('*').eq('id', id).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: settings } = useQuery({
    queryKey: ['invoice-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('invoice_settings').select('*').single();
      if (error) return null;
      return data;
    }
  });


  const downloadPDF = async () => {
    if (!invoice) return;
    setIsGenerating(true);
    try {
      const result = await getPDF({ data: { id: invoice.id } });
      
      if (!result.pdf) throw new Error('PDF generation failed');

      // Create a link and trigger download
      const link = document.createElement('a');
      link.href = result.pdf;
      link.download = `Invoice-${invoice.invoice_number}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Log the download activity
      logDownload({ 
        data: { 
          invoiceId: invoice.id, 
          invoiceNumber: invoice.invoice_number 
        } 
      }).catch(err => console.error('Failed to log download:', err));
      
      toast.success('Invoice downloaded successfully');
    } catch (error) {
      console.error('PDF generation failed:', error);
      toast.error('Failed to generate PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendEmail = async () => {
    if (!invoice) return;
    setIsSendingEmail(true);
    try {
      const result = await sendEmail({ 
        data: { 
          invoiceId: invoice.id, 
          type: 'INITIAL_INVOICE' 
        } 
      });
      if (result.success) {
        toast.success('Invoice email sent successfully to ' + (invoice.billing_to as any)?.email);
      } else {
        toast.error('Failed to send email: ' + result.error);
      }
    } catch (err: any) {
      toast.error('Error sending email: ' + err.message);
    } finally {
      setIsSendingEmail(false);
    }
  };


  if (isLoading) return <div className="p-24 text-center">Loading invoice...</div>;
  if (!invoice) return <div className="p-24 text-center">Invoice not found</div>;

  return (
    <div className="container max-w-4xl mx-auto py-24 px-4 sm:px-6">
      <div className="flex justify-end gap-2 mb-8 no-print">
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="h-4 w-4 mr-2" /> Print
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={downloadPDF}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Download PDF
        </Button>
        <Button 
          size="sm" 
          onClick={handleSendEmail}
          disabled={isSendingEmail}
        >
          {isSendingEmail ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Mail className="h-4 w-4 mr-2" />
          )}
          Email Invoice
        </Button>
      </div>


      <Card id="invoice-content" className="shadow-none border-none bg-card p-8 md:p-12 overflow-hidden print:p-0">
        <div className="flex flex-col md:flex-row justify-between items-start gap-8 border-b pb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl font-bold">INVOICE</h1>
              <Badge variant={(invoice.status || 'draft') === 'paid' ? 'default' : (invoice.status || 'draft') === 'void' ? 'destructive' : 'secondary'} className="h-6">
                {(invoice.status || 'draft').toUpperCase()}
              </Badge>
            </div>
            <p className="text-muted-foreground font-mono">#{invoice.invoice_number}</p>
          </div>
          <div className="text-right">
            <div className="flex items-center justify-end gap-2 mb-2">
              {settings?.company_logo ? (
                <img src={settings.company_logo} alt="Logo" className="h-10 w-auto object-contain" />
              ) : (
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold">
                  {(settings?.company_name || 'HK').substring(0, 2).toUpperCase()}
                </div>
              )}
              <h2 className="text-xl font-bold">{settings?.company_name || 'Hasan Kamrul'}</h2>
            </div>
            <p className="text-muted-foreground text-sm">{settings?.company_email || 'kamrulhasan.freelancer@gmail.com'}</p>
            <p className="text-muted-foreground text-sm whitespace-pre-line">{settings?.company_address || 'Bangladesh'}</p>
          </div>

        </div>

        <div className="grid md:grid-cols-2 gap-8 my-12">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Billing To:</h3>
            <p className="font-bold">{(invoice.billing_to as any)?.name || 'Valued Client'}</p>
            <p className="text-sm text-muted-foreground">{(invoice.billing_to as any)?.email}</p>
          </div>
          <div className="md:text-right">
            <div className="mb-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Issue Date:</h3>
              <p className="text-sm">{format(new Date(invoice.issue_date), 'MMMM dd, yyyy')}</p>
            </div>
            {invoice.due_date && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Due Date:</h3>
                <p className="text-sm">{format(new Date(invoice.due_date), 'MMMM dd, yyyy')}</p>
              </div>
            )}
          </div>
        </div>

        <div className="relative overflow-x-auto my-12">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="py-4 px-4 font-bold">Description</th>
                <th className="py-4 px-4 font-bold text-center">Qty</th>
                <th className="py-4 px-4 font-bold text-right">Unit Price</th>
                <th className="py-4 px-4 font-bold text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {(invoice.items as any[]).map((item, idx) => (
                <tr key={idx} className="border-b">
                  <td className="py-6 px-4">
                    <p className="font-bold">{item.description}</p>
                  </td>
                  <td className="py-6 px-4 text-center">{item.quantity}</td>
                  <td className="py-6 px-4 text-right">${item.unit_price}</td>
                  <td className="py-6 px-4 text-right font-bold">${item.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col items-end space-y-3 mt-8">
          <div className="flex justify-between w-64 border-b pb-2">
            <span className="text-muted-foreground font-medium">Subtotal</span>
            <span>${invoice.total_amount}</span>
          </div>
          <div className="flex justify-between w-64 pt-2">
            <span className="text-lg font-bold">Total Due</span>
            <span className="text-lg font-bold text-primary">${invoice.total_amount} {invoice.currency}</span>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t text-sm text-muted-foreground">
          <h4 className="font-bold text-foreground mb-2">Notes & Instructions</h4>
          <p>{invoice.notes || "Please complete payment via Stripe or Bank Transfer. If paying via bKash, use the number provided in payment instructions."}</p>
        </div>
      </Card>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
}
