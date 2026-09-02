import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { updateQuoteStatus } from '@/lib/services.admin.functions';
import { useServerFn } from '@tanstack/react-start';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  ChevronLeft, 
  User, 
  Mail, 
  Phone, 
  Globe, 
  Calendar, 
  DollarSign, 
  Clock, 
  FileText,
  Save,
  ExternalLink,
  ShoppingCart
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useState } from 'react';

export const Route = createFileRoute('/admin/services/quotes/$quoteId')({
  component: QuoteDetail,
});

function QuoteDetail() {
  const { quoteId } = Route.useParams();
  const queryClient = useQueryClient();
  const updateStatus = useServerFn(updateQuoteStatus);
  const [internalNotes, setInternalNotes] = useState('');
  const [status, setStatus] = useState<any>('');

  const { data: quote, isLoading } = useQuery({
    queryKey: ['admin-quote', quoteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_quotes')
        .select('*, services(title)')
        .eq('id', quoteId)
        .single();
      
      if (error) throw error;

      setInternalNotes(data.internal_notes || '');
      setStatus(data.status);
      return data;
    },
    // This query seeds local editable state (internalNotes/status) as a
    // side effect of queryFn - a background refetch (e.g. window refocus)
    // would silently overwrite in-progress, unsaved edits.
    refetchOnWindowFocus: false,
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      await updateStatus({
        data: {
          id: quoteId,
          status: status,
          internal_notes: internalNotes
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-quote', quoteId] });
      queryClient.invalidateQueries({ queryKey: ['admin-service-quotes'] });
      toast.success('Quote updated successfully');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update quote');
    }
  });

  if (isLoading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading quote details...</div>;
  if (!quote) return <div className="p-8 text-center text-muted-foreground">Quote not found.</div>;

  const getStatusBadge = (s: string | null) => {
    switch (s) {
      case 'pending': return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-200">New Request</Badge>;
      case 'contacted': return <Badge className="bg-blue-500/10 text-blue-600 border-blue-200">Contacted</Badge>;
      case 'proposal_sent': return <Badge className="bg-purple-500/10 text-purple-600 border-purple-200">Proposal Sent</Badge>;
      case 'won': return <Badge className="bg-green-500/10 text-green-600 border-green-200">Won</Badge>;
      case 'lost': return <Badge className="bg-red-500/10 text-red-600 border-red-200">Lost</Badge>;
      case 'rejected': return <Badge className="bg-slate-500/10 text-slate-600 border-slate-200">Rejected</Badge>;
      default: return <Badge variant="outline">{s || 'Unknown'}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          {/* /admin/services/quotes is now just a redirect to Requests & Quotes (the list page that superseded it) - link straight there instead of round-tripping through the redirect. */}
          <Link to="/admin/services/requests" search={{ tab: 'quotes', q: '', status: 'all', sort: 'created_at', dir: 'desc' }}>
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Quote Request Detail</h2>
          <p className="text-muted-foreground">Reference: {quote.id.slice(0, 8)}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Client Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Full Name</p>
                  <p className="font-medium">{quote.client_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email Address</p>
                  <p className="font-medium">{quote.client_email}</p>
                </div>
              </div>
              {quote.client_phone && (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Phone / WhatsApp</p>
                    <p className="font-medium">{quote.client_phone}</p>
                  </div>
                </div>
              )}
              {quote.company_name && (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <Globe className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Company</p>
                    <p className="font-medium">{quote.company_name}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Project Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5"><FileText className="h-3 w-3" /> Service</p>
                  <p className="font-medium">{(quote.services as any)?.title || 'Custom Service'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5"><DollarSign className="h-3 w-3" /> Budget</p>
                  <p className="font-medium">{quote.budget || 'Not specified'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Clock className="h-3 w-3" /> Timeline</p>
                  <p className="font-medium">{quote.timeline || 'Not specified'}</p>
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t">
                <Label className="text-sm font-semibold">Project Description</Label>
                <div className="p-4 bg-muted/30 rounded-lg text-sm whitespace-pre-wrap leading-relaxed">
                  {quote.project_description}
                </div>
              </div>

              {quote.requirements && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Key Requirements</Label>
                  <div className="p-4 bg-muted/30 rounded-lg text-sm whitespace-pre-wrap leading-relaxed">
                    {quote.requirements}
                  </div>
                </div>
              )}

              {quote.custom_answers && Object.keys(quote.custom_answers).length > 0 && (
                <div className="space-y-4 pt-4 border-t">
                  <Label className="text-sm font-semibold">Wizard Questions</Label>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {Object.entries(quote.custom_answers as Record<string, any>).map(([key, value]) => (
                      <div key={key} className="space-y-1">
                        <p className="text-xs text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1')}</p>
                        <p className="text-sm">{Array.isArray(value) ? value.join(', ') : String(value)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Current Status</Label>
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
                  {getStatusBadge(quote.status)}
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> {quote.created_at ? format(new Date(quote.created_at), 'MMM dd') : 'N/A'}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Update Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending Review</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="proposal_sent">Proposal Sent</SelectItem>
                    <SelectItem value="won">Won Project</SelectItem>
                    <SelectItem value="lost">Lost / No Response</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Internal Notes</Label>
                <Textarea 
                  id="notes"
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="Private notes about this lead..."
                  className="min-h-[150px]"
                />
              </div>

              <Button
                className="w-full gap-2"
                onClick={() => updateMutation.mutate()}
                disabled={updateMutation.isPending}
              >
                <Save className="h-4 w-4" /> Save Changes
              </Button>

              {quote.status === 'won' && (
                <Button variant="secondary" className="w-full gap-2" asChild>
                  <Link
                    to="/admin/orders"
                    search={{
                      prefillNotes: `Won quote #${quote.id.slice(0, 8)} - ${(quote.services as any)?.title || 'Custom project'} for ${quote.client_name}`,
                      prefillEmail: quote.client_email,
                    }}
                  >
                    <ShoppingCart className="h-4 w-4" /> Create Order From This Quote
                  </Link>
                </Button>
              )}
            </CardContent>
            <CardFooter className="pt-0">
              <Button variant="outline" className="w-full gap-2" asChild>
                <Link to={'/quotes/$quoteId' as any} params={{ quoteId: quote.id } as any} target="_blank">
                  <ExternalLink className="h-4 w-4" /> Public Reference Page
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}