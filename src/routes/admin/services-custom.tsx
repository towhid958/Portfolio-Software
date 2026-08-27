import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Briefcase,
  MessageSquare,
  Settings,
  Plus,
  HelpCircle,
  ClipboardList,
  Search,
  CheckCircle2,
  Clock,
  MoreVertical,
  Trash2,
  Edit,
  ExternalLink,
  Globe,
  Users,
  Target,
  Layers,
  Lock,
  Download
} from "lucide-react";
import { getServiceInquiries, updateInquiryStatus, getServiceFaqs, deleteServiceFaq, upsertServiceFaq } from "@/lib/services.admin.functions";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { format } from "date-fns";
import { useRBAC } from "@/hooks/useRBAC";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { exportToCSV } from "@/lib/csv-export";
import { usePagination } from "@/hooks/usePagination";
import { ListPagination } from "@/components/admin/ListPagination";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/admin/services-custom")({
  component: ServicesCustomAdmin,
});

const emptyFaqForm = { question: '', answer: '', category: '', is_published: true };

function ServicesCustomAdmin() {
  const queryClient = useQueryClient();
  const { can, isLoading: rbacLoading } = useRBAC();
  const fetchInquiries = useServerFn(getServiceInquiries);
  const fetchFaqs = useServerFn(getServiceFaqs);
  const updateStatus = useServerFn(updateInquiryStatus);
  const removeFaq = useServerFn(deleteServiceFaq);
  const saveFaq = useServerFn(upsertServiceFaq);

  const [selectedInquiry, setSelectedInquiry] = useState<any>(null);
  const [isFaqDialogOpen, setIsFaqDialogOpen] = useState(false);
  const [editingFaqId, setEditingFaqId] = useState<string | null>(null);
  const [faqForm, setFaqForm] = useState(emptyFaqForm);
  const [inquirySearch, setInquirySearch] = useState('');
  const [inquiryStatusFilter, setInquiryStatusFilter] = useState('all');
  const [faqSearch, setFaqSearch] = useState('');

  const { data: inquiries, isLoading: loadingInquiries } = useQuery({
    queryKey: ['admin-service-inquiries'],
    queryFn: () => fetchInquiries(),
    enabled: can('services_custom', 'view'),
  });

  const { data: faqs, isLoading: loadingFaqs } = useQuery({
    queryKey: ['admin-service-faqs'],
    queryFn: () => fetchFaqs(),
    enabled: can('services_custom', 'view'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: (vars: { id: string, status: string }) => updateStatus({ data: vars }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-service-inquiries'] });
      toast.success("Status updated");
    }
  });

  const deleteFaqMutation = useMutation({
    mutationFn: (id: string) => removeFaq({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-service-faqs'] });
      toast.success("FAQ deleted");
    }
  });

  const saveFaqMutation = useMutation({
    mutationFn: (vars: { id: string | undefined; question: string; answer: string; category: string | undefined; display_order: number; is_published: boolean }) =>
      saveFaq({ data: vars }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-service-faqs'] });
      toast.success(editingFaqId ? "FAQ updated" : "FAQ added");
      setIsFaqDialogOpen(false);
    },
    onError: (error: any) => toast.error(error.message || "Failed to save FAQ"),
  });

  const openNewFaq = () => {
    setEditingFaqId(null);
    setFaqForm(emptyFaqForm);
    setIsFaqDialogOpen(true);
  };

  const openEditFaq = (faq: any) => {
    setEditingFaqId(faq.id);
    setFaqForm({
      question: faq.question || '',
      answer: faq.answer || '',
      category: faq.category || '',
      is_published: faq.is_published ?? true,
    });
    setIsFaqDialogOpen(true);
  };

  const handleSaveFaq = () => {
    if (faqForm.question.trim().length < 3 || faqForm.answer.trim().length < 3) {
      toast.error("Question and answer must be at least 3 characters");
      return;
    }
    const existing = faqs?.find((f: any) => f.id === editingFaqId);
    saveFaqMutation.mutate({
      id: editingFaqId ?? undefined,
      question: faqForm.question,
      answer: faqForm.answer,
      category: faqForm.category || undefined,
      display_order: existing?.display_order ?? (faqs?.length ?? 0),
      is_published: faqForm.is_published,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new': return <Badge className="bg-blue-500/10 text-blue-500 border-none">New</Badge>;
      case 'reviewing': return <Badge className="bg-purple-500/10 text-purple-500 border-none">Reviewing</Badge>;
      case 'contact_made': return <Badge className="bg-yellow-500/10 text-yellow-500 border-none">Contact Made</Badge>;
      case 'proposal_sent': return <Badge className="bg-indigo-500/10 text-indigo-500 border-none">Proposal Sent</Badge>;
      case 'closed': return <Badge className="bg-green-500/10 text-green-500 border-none">Closed</Badge>;
      case 'rejected': return <Badge className="bg-red-500/10 text-red-500 border-none">Rejected</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredInquiries = (inquiries ?? []).filter((inquiry: any) => {
    const matchesStatus = inquiryStatusFilter === 'all' || inquiry.status === inquiryStatusFilter;
    const q = inquirySearch.toLowerCase();
    const matchesSearch = !q ||
      inquiry.full_name?.toLowerCase().includes(q) ||
      inquiry.email?.toLowerCase().includes(q) ||
      (inquiry.project_title || '').toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const { pageItems: pagedInquiries, page: inquiriesPage, setPage: setInquiriesPage, totalPages: inquiriesTotalPages, total: inquiriesTotal, pageSize: inquiriesPageSize } = usePagination(filteredInquiries);

  const handleExportInquiries = () => {
    exportToCSV(`service-inquiries-${format(new Date(), 'yyyy-MM-dd')}`, filteredInquiries.map((i: any) => ({
      name: i.full_name,
      email: i.email,
      project_title: i.project_title || '',
      budget_range: i.budget_range || '',
      status: i.status,
      created_at: i.created_at,
    })));
  };

  const filteredFaqs = (faqs ?? []).filter((faq: any) => {
    const q = faqSearch.toLowerCase();
    return !q || faq.question.toLowerCase().includes(q) || (faq.category || '').toLowerCase().includes(q);
  });

  const { pageItems: pagedFaqs, page: faqsPage, setPage: setFaqsPage, totalPages: faqsTotalPages, total: faqsTotal, pageSize: faqsPageSize } = usePagination(filteredFaqs, 12);

  if (rbacLoading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading...</div>;
  }

  if (!can('services_custom', 'view')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
        <Lock className="h-12 w-12 text-muted-foreground opacity-20" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground">You don't have permission to view custom services.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Custom Services Hub</h1>
          <p className="text-muted-foreground">Manage inquiries, project categories, and premium FAQs.</p>
        </div>
      </div>

      <Tabs defaultValue="inquiries" className="space-y-6">
        <TabsList className="bg-card border h-12 p-1">
          <TabsTrigger value="inquiries" className="h-full px-8">Inquiries</TabsTrigger>
          <TabsTrigger value="faqs" className="h-full px-8">FAQs</TabsTrigger>
        </TabsList>

        <TabsContent value="inquiries" className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search inquiries..."
                  className="pl-8"
                  value={inquirySearch}
                  onChange={(e) => setInquirySearch(e.target.value)}
                />
              </div>
              <Select value={inquiryStatusFilter} onValueChange={setInquiryStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="reviewing">Reviewing</SelectItem>
                  <SelectItem value="contact_made">Contact Made</SelectItem>
                  <SelectItem value="proposal_sent">Proposal Sent</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" className="gap-2" onClick={handleExportInquiries} disabled={filteredInquiries.length === 0}>
              <Download className="h-4 w-4" /> Export CSV
            </Button>
          </div>

          <div className="grid gap-4">
            {loadingInquiries ? (
              <p>Loading inquiries...</p>
            ) : filteredInquiries.length === 0 ? (
              <Card className="p-12 text-center text-muted-foreground">
                {inquiries?.length === 0 ? 'No inquiries found.' : 'No inquiries match your filters.'}
              </Card>
            ) : pagedInquiries.map((inquiry: any) => (
              <Card key={inquiry.id} className="group overflow-hidden hover:border-primary/30 transition-all">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3">
                        {getStatusBadge(inquiry.status)}
                        <span className="text-sm text-muted-foreground">{format(new Date(inquiry.created_at), 'PPP')}</span>
                      </div>
                      <h3 className="text-xl font-bold">{inquiry.project_title}</h3>
                      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                        <span className="flex items-center gap-1.5 font-medium"><ClipboardList className="h-4 w-4 text-primary" /> {inquiry.full_name}</span>
                        <span className="flex items-center gap-1.5 text-muted-foreground"><MessageSquare className="h-4 w-4" /> {inquiry.email}</span>
                        {inquiry.budget_range && <span className="flex items-center gap-1.5 text-muted-foreground"><Briefcase className="h-4 w-4" /> {inquiry.budget_range}</span>}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {can('services_custom', 'edit') && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="gap-2">Update Status <MoreVertical className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: inquiry.id, status: 'reviewing' })}>Reviewing</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: inquiry.id, status: 'contact_made' })}>Contact Made</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: inquiry.id, status: 'proposal_sent' })}>Proposal Sent</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: inquiry.id, status: 'closed' })}>Closed</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: inquiry.id, status: 'rejected' })}>Rejected</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                      <Button variant="default" onClick={() => setSelectedInquiry(inquiry)}>View Details</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <ListPagination page={inquiriesPage} totalPages={inquiriesTotalPages} total={inquiriesTotal} pageSize={inquiriesPageSize} onPageChange={setInquiriesPage} />
        </TabsContent>

        <TabsContent value="faqs" className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search FAQs..."
                className="pl-8"
                value={faqSearch}
                onChange={(e) => setFaqSearch(e.target.value)}
              />
            </div>
            {can('services_custom', 'create') && (
              <Button className="gap-2" onClick={openNewFaq}>
                <Plus className="h-4 w-4" /> Add FAQ
              </Button>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {loadingFaqs ? (
              <p>Loading FAQs...</p>
            ) : filteredFaqs.length === 0 ? (
              <Card className="col-span-full p-12 text-center text-muted-foreground">
                {faqs?.length === 0 ? 'No FAQs found.' : 'No FAQs match your search.'}
              </Card>
            ) : pagedFaqs.map((faq: any) => (
              <Card key={faq.id} className="relative group">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge variant={faq.is_published ? "default" : "secondary"}>
                      {faq.is_published ? "Published" : "Draft"}
                    </Badge>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {can('services_custom', 'edit') && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => openEditFaq(faq)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {can('services_custom', 'delete') && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-red-500"
                          onClick={() => {
                            if (confirm("Delete this FAQ?")) deleteFaqMutation.mutate(faq.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <h3 className="font-bold leading-snug">{faq.question}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-3">{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <ListPagination page={faqsPage} totalPages={faqsTotalPages} total={faqsTotal} pageSize={faqsPageSize} onPageChange={setFaqsPage} />
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedInquiry} onOpenChange={(open) => !open && setSelectedInquiry(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedInquiry?.project_title || 'Inquiry Details'}</DialogTitle>
            <DialogDescription>
              Submitted {selectedInquiry && format(new Date(selectedInquiry.created_at), 'PPP')}
            </DialogDescription>
          </DialogHeader>
          {selectedInquiry && (
            <div className="space-y-5">
              <div className="flex items-center gap-2">{getStatusBadge(selectedInquiry.status)}</div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Contact</p>
                  <p className="font-medium">{selectedInquiry.full_name}</p>
                  <p className="text-muted-foreground">{selectedInquiry.email}</p>
                  {selectedInquiry.phone_whatsapp && <p className="text-muted-foreground">{selectedInquiry.phone_whatsapp}</p>}
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Company</p>
                  <p className="font-medium">{selectedInquiry.company_name || '—'}</p>
                  {selectedInquiry.website_url && (
                    <a href={selectedInquiry.website_url} target="_blank" rel="noopener noreferrer" className="text-primary flex items-center gap-1 text-xs">
                      <Globe className="h-3 w-3" /> {selectedInquiry.website_url}
                    </a>
                  )}
                  {selectedInquiry.country && <p className="text-muted-foreground">{selectedInquiry.country}</p>}
                </div>
                {selectedInquiry.budget_range && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Budget</p>
                    <p>{selectedInquiry.budget_range}</p>
                  </div>
                )}
                {selectedInquiry.timeline && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Timeline</p>
                    <p>{selectedInquiry.timeline}</p>
                  </div>
                )}
                {selectedInquiry.industry && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Industry</p>
                    <p>{selectedInquiry.industry}</p>
                  </div>
                )}
              </div>

              {selectedInquiry.selected_services?.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"><Layers className="h-3.5 w-3.5" /> Services Requested</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedInquiry.selected_services.map((s: string) => (
                      <Badge key={s} variant="outline">{s}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedInquiry.project_description && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Project Description</p>
                  <p className="text-sm whitespace-pre-wrap">{selectedInquiry.project_description}</p>
                </div>
              )}
              {selectedInquiry.required_features && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Required Features</p>
                  <p className="text-sm whitespace-pre-wrap">{selectedInquiry.required_features}</p>
                </div>
              )}
              {selectedInquiry.business_goals && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"><Target className="h-3.5 w-3.5" /> Business Goals</p>
                  <p className="text-sm whitespace-pre-wrap">{selectedInquiry.business_goals}</p>
                </div>
              )}
              {selectedInquiry.target_audience && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Target Audience</p>
                  <p className="text-sm whitespace-pre-wrap">{selectedInquiry.target_audience}</p>
                </div>
              )}
              {selectedInquiry.existing_platform && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Existing Platform</p>
                  <p className="text-sm whitespace-pre-wrap">{selectedInquiry.existing_platform}</p>
                </div>
              )}
              {selectedInquiry.competitor_references && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Competitor References</p>
                  <p className="text-sm whitespace-pre-wrap">{selectedInquiry.competitor_references}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedInquiry(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isFaqDialogOpen} onOpenChange={setIsFaqDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingFaqId ? 'Edit FAQ' : 'Add FAQ'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="faq-question">Question</Label>
              <Input
                id="faq-question"
                value={faqForm.question}
                onChange={(e) => setFaqForm((f) => ({ ...f, question: e.target.value }))}
                placeholder="e.g. How long does a typical project take?"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="faq-answer">Answer</Label>
              <Textarea
                id="faq-answer"
                value={faqForm.answer}
                onChange={(e) => setFaqForm((f) => ({ ...f, answer: e.target.value }))}
                className="min-h-[120px]"
                placeholder="Write the answer clients will see..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="faq-category">Category (optional)</Label>
              <Input
                id="faq-category"
                value={faqForm.category}
                onChange={(e) => setFaqForm((f) => ({ ...f, category: e.target.value }))}
                placeholder="e.g. Pricing, Process, Support"
              />
            </div>
            <div className="flex items-center justify-between py-2">
              <Label htmlFor="faq-published">Published</Label>
              <Switch
                id="faq-published"
                checked={faqForm.is_published}
                onCheckedChange={(checked) => setFaqForm((f) => ({ ...f, is_published: checked }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFaqDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveFaq} disabled={saveFaqMutation.isPending}>
              {saveFaqMutation.isPending ? 'Saving...' : editingFaqId ? 'Save Changes' : 'Add FAQ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
