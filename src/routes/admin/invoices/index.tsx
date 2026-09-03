import { createFileRoute, Link, redirect } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRBAC } from '@/hooks/useRBAC';
import { resolveCan, type Role } from '@/lib/rbac';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { FileText, Eye, Download, Printer, Search, Mail, RotateCcw, Edit, Settings as SettingsIcon, Package, CheckSquare, Square, CheckCircle2, XCircle, Clock, Loader2, BadgeCheck, Ban } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState, useMemo } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { sendInvoiceEmail } from '@/lib/email.functions';
import { processRefund } from '@/lib/refund.functions';
import { generateInvoicePDF } from '@/lib/invoice.functions';
import { toast } from 'sonner';
import JSZip from 'jszip';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { InvoiceBrandingSettings, InvoiceItemEditor } from '@/components/admin/invoices/InvoiceEditors';
import { EmailPreview } from '@/components/admin/invoices/EmailPreview';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { exportToCSV } from '@/lib/csv-export';
import { usePagination } from '@/hooks/usePagination';
import { ListPagination } from '@/components/admin/ListPagination';



export const Route = createFileRoute('/admin/invoices/')({
  beforeLoad: async ({ context }) => {
    // No dedicated 'invoices' module in the Permissions matrix - invoices
    // are order-derived financial records, so they're gated on the same
    // 'orders' module as admin/orders/index.tsx.
    const allowed = resolveCan(context.roles as Role[], context.dbPermissions, 'orders', 'view');
    if (!allowed) {
      throw redirect({ to: '/admin' });
    }
  },
  component: AdminInvoices,
});

function AdminInvoices() {
  const { can } = useRBAC();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const sendEmail = useServerFn(sendInvoiceEmail);
  const [isSendingEmail, setIsSendingEmail] = useState<string | null>(null);
  const refundFn = useServerFn(processRefund);
  const [refundingId, setRefundingId] = useState<string | null>(null);
  const [confirmRefundId, setConfirmRefundId] = useState<string | null>(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const queryClient = useQueryClient();
  const [editingInvoice, setEditingInvoice] = useState<any | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const getPDF = useServerFn(generateInvoicePDF);
  const [isBatchDownloading, setIsBatchDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [currentlyProcessing, setCurrentlyProcessing] = useState<string | null>(null);
  const [previewingEmailInvoice, setPreviewingEmailInvoice] = useState<any | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);



  const handleResendEmail = async (invoiceId: string) => {
    setIsSendingEmail(invoiceId);
    try {
      await sendEmail({ data: { invoiceId, type: 'INITIAL_INVOICE' } });
      toast.success('Invoice email resent successfully');
    } catch (err: any) {
      toast.error('Failed to resend email: ' + err.message);
    } finally {
      setIsSendingEmail(null);
    }
  };

  const handleRefund = async (invoiceId: string) => {
    setRefundingId(invoiceId);
    try {
      const parsedAmount = refundAmount ? Number(refundAmount) : undefined;
      const result = await refundFn({
        data: {
          invoiceId,
          ...(parsedAmount ? { amount: parsedAmount } : {}),
          ...(refundReason ? { reason: refundReason } : {}),
        },
      });
      if (result.success) {
        toast.success(result.manual ? 'Manual refund adjustment recorded' : 'Stripe refund processed successfully');
        queryClient.invalidateQueries({ queryKey: ['admin-invoices'] });
      } else {
        toast.error('Refund failed: ' + result.error);
      }
    } catch (err: any) {
      toast.error('Refund error: ' + err.message);
    } finally {
      setRefundingId(null);
      setConfirmRefundId(null);
      setRefundAmount('');
      setRefundReason('');
    }
  };

  const updateInvoiceStatusMutation = useMutation({
    mutationFn: async ({ id, status, orderId }: { id: string; status: 'paid' | 'void'; orderId?: string | null }) => {
      const { error } = await supabase.from('invoices').update({ status }).eq('id', id);
      if (error) throw error;

      // Manual-payment orders only ever reach 'completed' through this
      // action - previously "Mark as Paid" only flipped the invoice, so the
      // order stayed 'pending' forever (and could never get a Verified
      // Purchase badge on reviews, which checks order.status).
      if (status === 'paid' && orderId) {
        await supabase.from('orders').update({ status: 'completed' }).eq('id', orderId);
        try {
          await sendEmail({ data: { invoiceId: id, type: 'PAYMENT_CONFIRMATION' } });
        } catch (err) {
          console.error('Failed to send payment confirmation email:', err);
        }
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      toast.success(variables.status === 'paid' ? 'Invoice marked as paid' : 'Invoice voided');
    },
    onError: (error: any) => toast.error(error.message),
  });
  
  const handleDownload = async (invoice: any) => {
    setDownloadingId(invoice.id);
    try {
      const result = await getPDF({ data: { id: invoice.id } });
      if (!result.pdf) throw new Error('PDF generation failed');
      const link = document.createElement('a');
      link.href = result.pdf;
      link.download = `Invoice-${invoice.invoice_number}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      toast.error('Download failed: ' + err.message);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleBatchDownload = async () => {
    if (selectedIds.length === 0) return;
    setIsBatchDownloading(true);
    setDownloadProgress(0);
    
    try {
      const zip = new JSZip();
      let completed = 0;
      
      for (const id of selectedIds) {
        const invoice = invoices?.find(inv => inv.id === id);
        if (!invoice) continue;
        
        setCurrentlyProcessing(invoice.invoice_number);
        
        const result = await getPDF({ data: { id } });
        if (result.pdf) {
          const base64Data = result.pdf.split(',')[1];
          if (base64Data) {
            zip.file(`Invoice-${invoice.invoice_number}.pdf`, base64Data, { base64: true });
          }
        }
        
        completed++;
        setDownloadProgress(Math.round((completed / selectedIds.length) * 100));
      }
      
      setCurrentlyProcessing('Generating ZIP archive...');
      const content = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `Invoices-Batch-${format(new Date(), 'yyyy-MM-dd')}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Batch download complete');
      setSelectedIds([]);
    } catch (err: any) {
      toast.error('Batch download failed: ' + err.message);
    } finally {
      setIsBatchDownloading(false);
      setCurrentlyProcessing(null);
      setDownloadProgress(0);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredInvoices?.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredInvoices?.map(inv => inv.id) || []);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };
  
  const { data: invoices, isLoading } = useQuery({
    queryKey: ['admin-invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*, orders(package_id, gig_packages(name, gigs(title)))')
        .order('created_at', { ascending: false });

      
      if (error) throw error;
      return data;
    },
  });

  const filteredInvoices = invoices?.filter(inv =>
    (statusFilter === 'all' || inv.status === statusFilter) &&
    (inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (inv.billing_to as any)?.name?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const { pageItems: pagedInvoices, page, setPage, totalPages, total, pageSize } = usePagination(filteredInvoices);

  const handleExport = () => {
    exportToCSV(`invoices-${format(new Date(), 'yyyy-MM-dd')}`, (filteredInvoices ?? []).map((inv) => ({
      invoice_number: inv.invoice_number,
      customer: (inv.billing_to as any)?.name || '',
      email: (inv.billing_to as any)?.email || '',
      issue_date: inv.issue_date,
      amount: inv.total_amount,
      currency: inv.currency,
      status: inv.status,
    })));
  };

  const refundTargetInvoice = invoices?.find((inv) => inv.id === confirmRefundId);

  return (
    <>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Invoices</h2>
            <p className="text-muted-foreground">Manage and track all customer invoices.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={handleExport} disabled={!filteredInvoices?.length}>
              <Download className="h-4 w-4" /> Export CSV
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => setIsSettingsOpen(true)}>
              <SettingsIcon className="h-4 w-4" /> Branding & Rules
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search invoice # or customer..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="void">Void</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4">
              <span className="text-sm font-medium text-muted-foreground">
                {selectedIds.length} items selected
              </span>
              <Button 
                variant="default" 
                size="sm" 
                className="gap-2"
                onClick={handleBatchDownload}
                disabled={isBatchDownloading}
              >
                {isBatchDownloading ? (
                  <RotateCcw className="h-4 w-4 animate-spin" />
                ) : (
                  <Package className="h-4 w-4" />
                )}
                Download ZIP
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setSelectedIds([])}
              >
                Clear
              </Button>
            </div>
          )}
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="relative overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase bg-muted/50 border-b">
                  <tr>
                    <th className="px-6 py-4 w-10">
                      <button 
                        onClick={toggleSelectAll}
                        className="text-muted-foreground hover:text-primary transition-colors"
                      >
                        {selectedIds.length === filteredInvoices?.length && filteredInvoices?.length > 0 ? (
                          <CheckSquare className="h-4 w-4" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>
                    </th>
                    <th className="px-6 py-4 font-bold">Invoice #</th>
                    <th className="px-6 py-4 font-bold">Customer</th>
                    <th className="px-6 py-4 font-bold">Date</th>
                    <th className="px-6 py-4 font-bold">Amount</th>
                    <th className="px-6 py-4 font-bold">Status</th>
                    <th className="px-6 py-4 font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {isLoading ? (
                    [1, 2, 3].map(i => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan={7} className="px-6 py-4 bg-muted/20 h-16"></td>
                      </tr>
                    ))
                  ) : filteredInvoices?.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                        No invoices found.
                      </td>
                    </tr>
                  ) : pagedInvoices.map((invoice) => (
                    <tr key={invoice.id} className={`hover:bg-muted/30 transition-colors ${selectedIds.includes(invoice.id) ? 'bg-primary/5' : ''}`}>
                      <td className="px-6 py-4">
                        <button 
                          onClick={() => toggleSelect(invoice.id)}
                          className="text-muted-foreground hover:text-primary transition-colors"
                        >
                          {selectedIds.includes(invoice.id) ? (
                            <CheckSquare className="h-4 w-4 text-primary" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 font-bold text-foreground">{invoice.invoice_number}</td>
                      <td className="px-6 py-4">
                        <div className="font-medium">{(invoice.billing_to as any)?.name}</div>
                        <div className="text-xs text-muted-foreground">{(invoice.billing_to as any)?.email}</div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {format(new Date(invoice.issue_date), 'MMM dd, yyyy')}
                      </td>
                      <td className="px-6 py-4 font-bold">
                        ${invoice.total_amount} {invoice.currency}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={
                          invoice.status === 'paid' ? 'default' : 
                          invoice.status === 'refunded' ? 'destructive' :
                          invoice.status === 'sent' ? 'secondary' : 'outline'
                        } className={invoice.status === 'paid' ? 'bg-green-500 hover:bg-green-600' : ''}>
                          {invoice.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setEditingInvoice(invoice)}
                            title="Edit Line Items"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" asChild>
                            <a href={`/invoices/${invoice.id}`} target="_blank" rel="noreferrer">
                              <Eye className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownload(invoice)}
                            disabled={downloadingId === invoice.id}
                            title="Download PDF"
                          >
                            {downloadingId === invoice.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                          </Button>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => setPreviewingEmailInvoice(invoice)}
                                  disabled={isSendingEmail === invoice.id}
                                  className="relative"
                                >
                                  <Mail className={`h-4 w-4 ${isSendingEmail === invoice.id ? 'animate-pulse' : ''}`} />
                                  {invoice.last_email_sent_at && (
                                    <div className="absolute -top-1 -right-1">
                                      {(invoice.last_email_status as any)?.success ? (
                                        <CheckCircle2 className="h-2.5 w-2.5 text-green-500 bg-background rounded-full" />
                                      ) : (
                                        <XCircle className="h-2.5 w-2.5 text-destructive bg-background rounded-full" />
                                      )}
                                    </div>
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="text-xs space-y-1">
                                  <p className="font-semibold">Email Delivery Status</p>
                                  {invoice.last_email_sent_at ? (
                                    <>
                                      <p>Last sent: {format(new Date(invoice.last_email_sent_at), 'MMM d, p')}</p>
                                      <p>Status: {(invoice.last_email_status as any)?.success ? 'Delivered' : 'Failed'}</p>
                                      {(invoice.last_email_status as any)?.error && <p className="text-destructive">Error: {(invoice.last_email_status as any).error}</p>}
                                    </>
                                  ) : (
                                    <p>No email sent yet</p>
                                  )}
                                  <p className="text-muted-foreground pt-1 border-t">Click to preview and resend</p>
                                </div>
                              </TooltipContent>

                            </Tooltip>
                          </TooltipProvider>

                          {can('orders', 'edit') && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-green-600 hover:text-green-600 hover:bg-green-500/10"
                                onClick={() => updateInvoiceStatusMutation.mutate({ id: invoice.id, status: 'paid', orderId: invoice.order_id })}
                                disabled={updateInvoiceStatusMutation.isPending || !!invoice.status && ['paid', 'void', 'refunded'].includes(invoice.status)}
                                title="Mark as Paid"
                              >
                                <BadgeCheck className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-muted-foreground hover:text-foreground"
                                onClick={() => {
                                  if (confirm(`Void invoice ${invoice.invoice_number}? This cannot be undone.`)) {
                                    updateInvoiceStatusMutation.mutate({ id: invoice.id, status: 'void' });
                                  }
                                }}
                                disabled={updateInvoiceStatusMutation.isPending || !!invoice.status && ['void', 'refunded'].includes(invoice.status)}
                                title="Void Invoice"
                              >
                                <Ban className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => {
                                  setConfirmRefundId(invoice.id);
                                  setRefundAmount(String(invoice.total_amount));
                                  setRefundReason('');
                                }}
                                disabled={refundingId === invoice.id || !!invoice.status && ['refunded', 'void'].includes(invoice.status)}
                                title="Process Refund"
                              >
                                <RotateCcw className={`h-4 w-4 ${refundingId === invoice.id ? 'animate-spin' : ''}`} />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ListPagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} />
          </CardContent>
        </Card>

        <AlertDialog open={!!confirmRefundId} onOpenChange={(open) => !open && setConfirmRefundId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Process refund</AlertDialogTitle>
              <AlertDialogDescription>
                For Stripe payments, this attempts a real refund through Stripe for the amount below. For manual payments (bank/bKash), it records the adjustment in the system. Reduce the amount for a partial refund.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="refund-amount">Refund Amount ({refundTargetInvoice?.currency || 'USD'})</Label>
                <Input
                  id="refund-amount"
                  type="number"
                  min={0}
                  max={refundTargetInvoice?.total_amount}
                  step="0.01"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                />
                {refundTargetInvoice && (
                  <p className="text-xs text-muted-foreground">Invoice total: ${refundTargetInvoice.total_amount} {refundTargetInvoice.currency}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="refund-reason">Reason (optional)</Label>
                <Input
                  id="refund-reason"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="e.g. Client requested partial refund"
                />
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => confirmRefundId && handleRefund(confirmRefundId)}
                disabled={!refundAmount || Number(refundAmount) <= 0}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              >
                Process Refund
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      
      <Dialog open={!!editingInvoice} onOpenChange={(open) => !open && setEditingInvoice(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Line Items - {editingInvoice?.invoice_number}</DialogTitle>
          </DialogHeader>
          {editingInvoice && (
            <InvoiceItemEditor 
              invoice={editingInvoice} 
              onSave={() => {
                queryClient.invalidateQueries({ queryKey: ['admin-invoices'] });
                setEditingInvoice(null);
              }} 
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Invoice Global Settings</DialogTitle>
          </DialogHeader>
          <InvoiceBrandingSettings />
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewingEmailInvoice} onOpenChange={(open) => !open && setPreviewingEmailInvoice(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Email Preview - {previewingEmailInvoice?.invoice_number}</DialogTitle>
          </DialogHeader>
          {previewingEmailInvoice && (
            <EmailPreview 
              invoiceId={previewingEmailInvoice.id} 
              isSending={isSendingEmail === previewingEmailInvoice.id}
              onSend={async (type) => {
                setIsSendingEmail(previewingEmailInvoice.id);
                try {
                  await sendEmail({ data: { invoiceId: previewingEmailInvoice.id, type } });
                  toast.success('Email sent successfully');
                  setPreviewingEmailInvoice(null);
                } catch (err: any) {
                  toast.error('Failed to send email: ' + err.message);
                } finally {
                  setIsSendingEmail(null);
                }
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isBatchDownloading} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md pointer-events-none">
          <DialogHeader>
            <DialogTitle>Generating Batch Download</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-medium">
                <span>Overall Progress</span>
                <span>{downloadProgress}%</span>
              </div>
              <Progress value={downloadProgress} className="h-2" />
            </div>
            
            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg animate-pulse">
              <Package className="h-5 w-5 text-primary" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {currentlyProcessing}
                </p>
                <p className="text-xs text-muted-foreground italic">
                  Please keep this tab open...
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}



