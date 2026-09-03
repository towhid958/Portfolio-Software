import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logActivity } from '@/utils/audit';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Star, 
  MoreHorizontal, 
  CheckCircle, 
  XCircle, 
  MessageSquare,
  User,
  ExternalLink,
  Shield,
  Loader2,
  Lock,
  Trash2,
  Plus,
  Edit,
  Clock,
  Filter,
  Search,
  Download
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useRBAC } from '@/hooks/useRBAC';
import { useState, useMemo } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { exportToCSV } from '@/lib/csv-export';
import { usePagination } from '@/hooks/usePagination';
import { ListPagination } from '@/components/admin/ListPagination';

export const Route = createFileRoute('/admin/testimonials/')({
  component: ReviewsManagement,
});

function ReviewsManagement() {
  const queryClient = useQueryClient();
  const { can, isLoading: rbacLoading } = useRBAC();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [moderatorNote, setModeratorNote] = useState<string>('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  
  const { data: reviews, isLoading: reviewsLoading } = useQuery({
    queryKey: ['admin-reviews'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gig_reviews')
        .select('*, gigs(title, slug)')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const { data: testimonials, isLoading: testimonialsLoading } = useQuery({
    queryKey: ['admin-testimonials'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('testimonials')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const isLoading = reviewsLoading || testimonialsLoading;

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, note, review }: { id: string, status: string, note?: string, review?: any }) => {
      const updateData: any = { status };
      if (note !== undefined) {
        updateData.moderator_notes = note;
      }
      
      const { error } = await supabase
        .from('gig_reviews')
        .update(updateData)
        .eq('id', id);
      if (error) throw error;

      // Notify the reviewer if they are a registered user
      if (review?.user_id && (status === 'approved' || status === 'rejected')) {
        await (supabase as any).from('admin_notifications').insert({
          user_id: review.user_id,
          title: `Review ${status.charAt(0).toUpperCase() + status.slice(1)}`,
          message: `Your review for "${review.gigs?.title || 'the gig'}" has been ${status}.`,
          type: `review_${status}`,
          link: `/gigs/${review.gigs?.slug || ''}`,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      toast.success('Review updated successfully');
      setEditingNoteId(null);
      setModeratorNote('');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update review');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('gig_reviews')
        .delete()
        .eq('id', id);
      if (error) throw error;
      await logActivity('testimonials', 'delete_review', { id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      toast.success('Review deleted');
    },
  });

  const deleteTestimonialMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('testimonials')
        .delete()
        .eq('id', id);
      if (error) throw error;
      await logActivity('testimonials', 'delete_testimonial', { id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-testimonials'] });
      toast.success('Testimonial deleted');
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from('gig_reviews').delete().in('id', ids);
      if (error) throw error;
      await logActivity('testimonials', 'bulk_delete_reviews', { ids });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      toast.success(`${selectedIds.length} reviews deleted`);
      setSelectedIds([]);
    },
    onError: (error) => {
      toast.error(`Error deleting reviews: ${error.message}`);
    },
  });

  const updateTestimonialStatusMutation = useMutation({
    mutationFn: async ({ id, status, testimonial }: { id: string, status: string, testimonial?: any }) => {
      const { error } = await (supabase as any).from('testimonials').update({ status }).eq('id', id);
      if (error) throw error;
      await logActivity('testimonials', 'update_testimonial_status', { id, status });

      // Only client-submitted testimonials (user_id set) have someone to notify.
      if (testimonial?.user_id && (status === 'approved' || status === 'rejected')) {
        await (supabase as any).from('admin_notifications').insert({
          user_id: testimonial.user_id,
          title: `Testimonial ${status.charAt(0).toUpperCase() + status.slice(1)}`,
          message: status === 'approved'
            ? 'Thank you! Your testimonial has been approved and published.'
            : 'Your submitted testimonial was not approved for publishing.',
          type: `testimonial_${status}`,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-testimonials'] });
      toast.success('Testimonial updated');
    },
    onError: (error: any) => toast.error(error.message || 'Failed to update testimonial'),
  });

  const bulkStatusMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      const { error } = await supabase.from('gig_reviews').update({ status }).in('id', ids);
      if (error) throw error;
      await logActivity('testimonials', 'bulk_status_update', { ids, status });

      // Find selected reviews to notify users
      const selectedReviews = reviews?.filter(r => ids.includes(r.id)) || [];
      
      // Batch notification inserts
      const notifications = selectedReviews
        .filter(review => review.user_id && (status === 'approved' || status === 'rejected'))
        .map(review => ({
          user_id: review.user_id,
          title: `Review ${status.charAt(0).toUpperCase() + status.slice(1)}`,
          message: `Your review for "${review.gigs?.title || 'the gig'}" has been ${status}.`,
          type: `review_${status}`,
          link: `/gigs/${review.gigs?.slug || ''}`,
        }));

      if (notifications.length > 0) {
        await (supabase as any).from('admin_notifications').insert(notifications);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      toast.success(`${selectedIds.length} reviews marked as ${variables.status}`);
      setSelectedIds([]);
    },
    onError: (error) => {
      toast.error(`Error updating reviews: ${error.message}`);
    },
  });

  const toggleSelectAll = () => {
    if (selectedIds.length === reviews?.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(reviews?.map((r) => r.id) || []);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [testimonialSearch, setTestimonialSearch] = useState('');
  const [activeTestimonialTab, setActiveTestimonialTab] = useState('all');

  const filteredReviews = useMemo(() => {
    if (!reviews) return [];
    const byStatus = activeTab === 'all' ? reviews : reviews.filter(r => r.status === activeTab);
    const q = searchQuery.toLowerCase();
    if (!q) return byStatus;
    return byStatus.filter((r) =>
      r.reviewer_name?.toLowerCase().includes(q) ||
      (r.gigs as any)?.title?.toLowerCase().includes(q) ||
      r.comment?.toLowerCase().includes(q)
    );
  }, [reviews, activeTab, searchQuery]);

  const { pageItems: pagedReviews, page: reviewsPage, setPage: setReviewsPage, totalPages: reviewsTotalPages, total: reviewsTotal, pageSize: reviewsPageSize } = usePagination(filteredReviews);

  const handleExportReviews = () => {
    exportToCSV(`reviews-${format(new Date(), 'yyyy-MM-dd')}`, filteredReviews.map((r) => ({
      reviewer: r.reviewer_name,
      gig: (r.gigs as any)?.title || '',
      rating: r.rating,
      comment: r.comment || '',
      status: r.status,
      created_at: r.created_at,
    })));
  };

  const filteredTestimonials = useMemo(() => {
    const byStatus = activeTestimonialTab === 'all'
      ? (testimonials ?? [])
      : (testimonials ?? []).filter((t: any) => t.status === activeTestimonialTab);
    const q = testimonialSearch.toLowerCase();
    if (!q) return byStatus;
    return byStatus.filter((t: any) =>
      t.name?.toLowerCase().includes(q) || t.company?.toLowerCase().includes(q)
    );
  }, [testimonials, activeTestimonialTab, testimonialSearch]);

  const pendingTestimonialCount = useMemo(() =>
    (testimonials ?? []).filter((t: any) => t.status === 'pending').length
  , [testimonials]);

  const { pageItems: pagedTestimonials, page: testimonialsPage, setPage: setTestimonialsPage, totalPages: testimonialsTotalPages, total: testimonialsTotal, pageSize: testimonialsPageSize } = usePagination(filteredTestimonials);

  const handleExportTestimonials = () => {
    exportToCSV(`testimonials-${format(new Date(), 'yyyy-MM-dd')}`, filteredTestimonials.map((t: any) => ({
      name: t.name,
      role: t.role || '',
      company: t.company || '',
      rating: t.rating,
      source: t.source,
      status: t.status,
    })));
  };

  const pendingCount = useMemo(() =>
    reviews?.filter(r => r.status === 'pending').length || 0
  , [reviews]);

  if (rbacLoading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading...</div>;
  }

  if (!can('testimonials', 'view')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
        <Lock className="h-12 w-12 text-muted-foreground opacity-20" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground">You don't have permission to view reviews.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reviews & Testimonials</h1>
          <p className="text-muted-foreground">Manage customer reviews and professional testimonials.</p>
        </div>
        
        <div className="flex gap-2">
          {can('testimonials', 'create') && (
            <Button asChild>
              <Link to="/admin/testimonials/new">
                <Plus className="mr-2 h-4 w-4" /> Add Testimonial
              </Link>
            </Button>
          )}
        </div>

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-md border animate-in fade-in slide-in-from-top-2 duration-200">
            <span className="text-sm font-medium mr-2">
              {selectedIds.length} selected
            </span>
            {can('testimonials', 'edit') && (
              <>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="text-green-600 border-green-200 hover:bg-green-50"
                  onClick={() => bulkStatusMutation.mutate({ ids: selectedIds, status: 'approved' })}
                  disabled={bulkStatusMutation.isPending}
                >
                  Approve
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="text-amber-600 border-amber-200 hover:bg-amber-50"
                  onClick={() => bulkStatusMutation.mutate({ ids: selectedIds, status: 'pending' })}
                  disabled={bulkStatusMutation.isPending}
                >
                  Mark Pending
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => bulkStatusMutation.mutate({ ids: selectedIds, status: 'rejected' })}
                  disabled={bulkStatusMutation.isPending}
                >
                  Reject
                </Button>
              </>
            )}
            {can('testimonials', 'delete') && (
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => {
                  if (confirm(`Are you sure you want to delete ${selectedIds.length} reviews?`)) {
                    bulkDeleteMutation.mutate(selectedIds);
                  }
                }}
                disabled={bulkDeleteMutation.isPending}
              >
                <Trash2 className="h-4 w-4 mr-1" /> Delete
              </Button>
            )}
          </div>
        )}
      </div>

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="all" className="flex items-center gap-2">
              All Reviews
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 min-w-[20px]">{reviews?.length || 0}</Badge>
            </TabsTrigger>
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5" />
              Pending
              {pendingCount > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 px-1.5 min-w-[20px] animate-pulse">
                  {pendingCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search reviews..."
                className="pl-8 h-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" size="sm" className="gap-2" onClick={handleExportReviews} disabled={filteredReviews.length === 0}>
              <Download className="h-4 w-4" /> Export CSV
            </Button>
            <div className="flex items-center text-sm text-muted-foreground bg-muted/30 px-3 py-1 rounded-full border border-border/50">
              <Filter className="h-3.5 w-3.5 mr-2" />
              Showing {filteredReviews.length} of {reviews?.length || 0} reviews
            </div>
          </div>
        </div>

        <TabsContent value={activeTab} className="mt-0 border rounded-lg bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <Checkbox 
                    checked={filteredReviews.length > 0 && selectedIds.length === filteredReviews.length}
                    onCheckedChange={() => {
                      if (selectedIds.length === filteredReviews.length) {
                        setSelectedIds([]);
                      } else {
                        setSelectedIds(filteredReviews.map(r => r.id));
                      }
                    }}
                  />
                </TableHead>
                <TableHead>Reviewer</TableHead>
                <TableHead>Gig</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead className="max-w-md">Comment & Moderation</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReviews.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    No {activeTab !== 'all' ? activeTab : ''} reviews found.
                  </TableCell>
                </TableRow>
              ) : (
                pagedReviews.map((review) => (
                  <TableRow key={review.id} className={cn("group", selectedIds.includes(review.id) ? 'bg-muted/50' : '')}>
                    <TableCell>
                      <Checkbox 
                        checked={selectedIds.includes(review.id)}
                        onCheckedChange={() => toggleSelect(review.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium flex items-center gap-1.5">
                          {review.reviewer_name}
                          {review.is_verified_purchase && (
                            <Shield className="h-3 w-3 text-blue-500" />
                          )}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <User className="h-3 w-3" /> {review.user_id ? 'Registered User' : 'Guest'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{(review.gigs as any)?.title}</span>
                        <a 
                          href={`/gigs/${(review.gigs as any)?.slug}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-primary flex items-center gap-1 hover:underline"
                        >
                          View Gig <ExternalLink className="h-2 w-2" />
                        </a>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-0.5 text-amber-500">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            className={cn("h-3 w-3", i < review.rating ? "fill-current" : "text-muted/30")} 
                          />
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <div className="space-y-2">
                        <p className="text-sm line-clamp-2 italic text-muted-foreground">
                          "{review.comment}"
                        </p>
                        {review.moderator_notes && (
                          <div className="text-xs bg-muted p-2 rounded border-l-2 border-primary/50">
                            <span className="font-semibold text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Moderator Note:</span>
                            {review.moderator_notes}
                          </div>
                        )}
                        {editingNoteId === review.id ? (
                          <div className="flex flex-col gap-2 mt-2 p-2 border rounded-md bg-background shadow-sm animate-in fade-in zoom-in-95 duration-200">
                            <textarea
                              className="text-xs w-full p-2 border rounded bg-muted/30 focus:outline-none focus:ring-1 focus:ring-primary min-h-[60px]"
                              placeholder="Add a moderator note..."
                              value={moderatorNote}
                              onChange={(e) => setModeratorNote(e.target.value)}
                              autoFocus
                            />
                            <div className="flex justify-end gap-2">
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-7 text-[10px]"
                                onClick={() => {
                                  setEditingNoteId(null);
                                  setModeratorNote('');
                                }}
                              >
                                Cancel
                              </Button>
                              <Button 
                                size="sm" 
                                className="h-7 text-[10px]"
                                onClick={() => updateStatusMutation.mutate({ 
                                  id: review.id, 
                                  status: review.status, 
                                  note: moderatorNote,
                                  review
                                })}
                                disabled={updateStatusMutation.isPending}
                              >
                                Save Note
                              </Button>
                            </div>
                          </div>
                        ) : (
                          can('testimonials', 'edit') && (
                            <button 
                              onClick={() => {
                                setEditingNoteId(review.id);
                                setModeratorNote(review.moderator_notes || '');
                              }}
                              className="text-[10px] text-primary hover:underline flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MessageSquare className="h-3 w-3" /> {review.moderator_notes ? 'Edit Note' : 'Add Note'}
                            </button>
                          )
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        className={cn(
                          review.status === 'approved' ? 'bg-green-500/10 text-green-600 border-green-500/20' : 
                          review.status === 'rejected' ? 'bg-red-500/10 text-red-600 border-red-500/20' : 
                          'bg-amber-500/10 text-amber-600 border-amber-500/20'
                        )}
                        variant="outline"
                      >
                        {review.status.charAt(0).toUpperCase() + review.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {review.created_at ? format(new Date(review.created_at), 'MMM d, yyyy') : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      {(can('testimonials', 'edit') || can('testimonials', 'delete')) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {can('testimonials', 'edit') && (
                              <>
                                <DropdownMenuItem 
                                  className="text-green-600"
                                  onClick={() => updateStatusMutation.mutate({ id: review.id, status: 'approved', review })}
                                  disabled={review.status === 'approved'}
                                >
                                  <CheckCircle className="mr-2 h-4 w-4" /> Approve
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-amber-600"
                                  onClick={() => updateStatusMutation.mutate({ id: review.id, status: 'pending', review })}
                                  disabled={review.status === 'pending'}
                                >
                                  <MessageSquare className="mr-2 h-4 w-4" /> Mark Pending
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-red-600"
                                  onClick={() => updateStatusMutation.mutate({ id: review.id, status: 'rejected', review })}
                                  disabled={review.status === 'rejected'}
                                >
                                  <XCircle className="mr-2 h-4 w-4" /> Reject
                                </DropdownMenuItem>
                              </>
                            )}
                            {can('testimonials', 'delete') && (
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => {
                                  if (confirm('Are you sure you want to delete this review?')) {
                                    deleteMutation.mutate(review.id);
                                  }
                                }}
                              >
                                Delete Review
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <div className="px-4">
            <ListPagination page={reviewsPage} totalPages={reviewsTotalPages} total={reviewsTotal} pageSize={reviewsPageSize} onPageChange={setReviewsPage} />
          </div>
        </TabsContent>
      </Tabs>

      <div className="mt-12 space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Testimonials</h2>
          <p className="text-muted-foreground">Manually added testimonials and testimonials clients submitted after a request.</p>
        </div>

        <Tabs value={activeTestimonialTab} onValueChange={setActiveTestimonialTab} className="w-full">
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="all" className="flex items-center gap-2">
                All
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 min-w-[20px]">{testimonials?.length || 0}</Badge>
              </TabsTrigger>
              <TabsTrigger value="pending" className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5" />
                Pending
                {pendingTestimonialCount > 0 && (
                  <Badge variant="destructive" className="ml-1 h-5 px-1.5 min-w-[20px] animate-pulse">
                    {pendingTestimonialCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-3">
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search testimonials..."
                  className="pl-8 h-9"
                  value={testimonialSearch}
                  onChange={(e) => setTestimonialSearch(e.target.value)}
                />
              </div>
              <Button variant="outline" size="sm" className="gap-2" onClick={handleExportTestimonials} disabled={filteredTestimonials.length === 0}>
                <Download className="h-4 w-4" /> Export CSV
              </Button>
            </div>
          </div>

          <TabsContent value={activeTestimonialTab} className="mt-0 border rounded-lg bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Role/Company</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead className="max-w-md">Content</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTestimonials.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    {testimonials?.length === 0 ? 'No testimonials found.' : 'No testimonials match your search.'}
                  </TableCell>
                </TableRow>
              ) : (
                pagedTestimonials.map((t: any) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {t.role && <span>{t.role}</span>}
                        {t.role && t.company && <span> at </span>}
                        {t.company && <span>{t.company}</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-0.5 text-amber-500">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={cn("h-3 w-3", i < t.rating ? "fill-current" : "text-muted/30")}
                          />
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <p className="text-sm line-clamp-2 text-muted-foreground italic">
                        "{t.content}"
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {t.source === 'client_request' ? 'Client Submitted' : 'Admin Added'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          t.status === 'approved' ? 'bg-green-500/10 text-green-600 border-green-500/20' :
                          t.status === 'rejected' ? 'bg-red-500/10 text-red-600 border-red-500/20' :
                          'bg-amber-500/10 text-amber-600 border-amber-500/20'
                        )}
                        variant="outline"
                      >
                        {t.status.charAt(0).toUpperCase() + t.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {can('testimonials', 'edit') && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                className="text-green-600"
                                onClick={() => updateTestimonialStatusMutation.mutate({ id: t.id, status: 'approved', testimonial: t })}
                                disabled={t.status === 'approved'}
                              >
                                <CheckCircle className="mr-2 h-4 w-4" /> Approve
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-amber-600"
                                onClick={() => updateTestimonialStatusMutation.mutate({ id: t.id, status: 'pending', testimonial: t })}
                                disabled={t.status === 'pending'}
                              >
                                <Clock className="mr-2 h-4 w-4" /> Mark Pending
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => updateTestimonialStatusMutation.mutate({ id: t.id, status: 'rejected', testimonial: t })}
                                disabled={t.status === 'rejected'}
                              >
                                <XCircle className="mr-2 h-4 w-4" /> Reject
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                        {can('testimonials', 'edit') && (
                          <Button variant="ghost" size="icon" asChild>
                            <Link
                              to="/admin/testimonials/edit/$testimonialId"
                              params={{ testimonialId: t.id }}
                            >
                              <Edit className="h-4 w-4" />
                            </Link>
                          </Button>
                        )}
                        {can('testimonials', 'delete') && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this testimonial?')) {
                                deleteTestimonialMutation.mutate(t.id);
                              }
                            }}
                            disabled={deleteTestimonialMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <div className="px-4">
            <ListPagination page={testimonialsPage} totalPages={testimonialsTotalPages} total={testimonialsTotal} pageSize={testimonialsPageSize} onPageChange={setTestimonialsPage} />
          </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

