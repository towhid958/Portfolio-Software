import { useState, useEffect } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { previewInvoiceEmail } from '@/lib/email.functions';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mail, Send, AlertCircle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';


interface EmailPreviewProps {
  invoiceId: string;
  onSend: (type: 'INITIAL_INVOICE' | 'PAYMENT_CONFIRMATION' | 'PAYMENT_FAILED') => Promise<void>;
  isSending: boolean;
}

export function EmailPreview({ invoiceId, onSend, isSending }: EmailPreviewProps) {
  const [activeTab, setActiveTab] = useState<'INITIAL_INVOICE' | 'PAYMENT_CONFIRMATION' | 'PAYMENT_FAILED'>('INITIAL_INVOICE');
  const [preview, setPreview] = useState<{ subject: string; html: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastEmail, setLastEmail] = useState<any>(null);
  
  const getPreview = useServerFn(previewInvoiceEmail);

  useEffect(() => {
    const fetchLastEmail = async () => {
      const { data } = await supabase
        .from('invoices')
        .select('last_email_sent_at, last_email_status')
        .eq('id', invoiceId)
        .single();
      if (data) setLastEmail(data);
    };
    fetchLastEmail();
  }, [invoiceId]);


  useEffect(() => {
    const fetchPreview = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await getPreview({ data: { invoiceId, type: activeTab } });
        setPreview(result);
      } catch (err: any) {
        setError(err.message || 'Failed to load preview');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPreview();
  }, [invoiceId, activeTab]);

  return (
    <div className="space-y-4 py-4">
      <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="INITIAL_INVOICE">New Invoice</TabsTrigger>
          <TabsTrigger value="PAYMENT_CONFIRMATION">Confirmation</TabsTrigger>
          <TabsTrigger value="PAYMENT_FAILED">Failed</TabsTrigger>
        </TabsList>

        <div className="mt-6 border rounded-lg overflow-hidden bg-background">
          <div className="p-4 border-b bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Subject</div>
                <div className="text-sm font-semibold">
                  {isLoading ? <Skeleton className="h-4 w-64" /> : preview?.subject}
                </div>
              </div>
              <Button 
                size="sm" 
                className="gap-2" 
                onClick={() => onSend(activeTab)}
                disabled={isSending || isLoading || !!error}
              >
                <Send className="h-3.5 w-3.5" />
                {isSending ? 'Sending...' : 'Send This Email'}
              </Button>
            </div>
          </div>

          <ScrollArea className="h-[400px] bg-white">
            {isLoading ? (
              <div className="p-8 space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-[90%]" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-4 w-[80%]" />
              </div>
            ) : error ? (
              <div className="p-8 text-center space-y-3">
                <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
                <div className="text-destructive font-medium">{error}</div>
                <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Retry</Button>
              </div>
            ) : (
              <div 
                className="p-4 prose prose-sm max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: preview?.html || '' }} 
              />
            )}
          </ScrollArea>
        </div>
      </Tabs>
      
      {lastEmail?.last_email_sent_at && (
        <div className="border rounded-md p-3 bg-muted/20">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Last Delivery Status
            </h4>
            <Badge variant={(lastEmail.last_email_status as any)?.success ? "default" : "destructive"}>
              {(lastEmail.last_email_status as any)?.success ? "Success" : "Failed"}
            </Badge>
          </div>
          <div className="text-xs space-y-1 text-muted-foreground">
            <div className="flex justify-between">
              <span>Sent:</span>
              <span>{format(new Date(lastEmail.last_email_sent_at), 'PPP p')}</span>
            </div>
            <div className="flex justify-between">
              <span>Type:</span>
              <span>{(lastEmail.last_email_status as any)?.type}</span>
            </div>
            {(lastEmail.last_email_status as any)?.error && (
              <div className="text-destructive mt-1 italic">
                Error: {(lastEmail.last_email_status as any).error}
              </div>
            )}
          </div>
        </div>
      )}


      <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md flex items-start gap-3">

        <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
        <p className="text-xs text-blue-700 dark:text-blue-300">
          This is a live preview of what the customer will receive. Placeholders like customer name and amounts are populated from the current invoice data.
        </p>
      </div>
    </div>
  );
}
