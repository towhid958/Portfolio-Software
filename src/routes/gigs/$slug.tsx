import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { 
  ArrowLeft, 
  ArrowRight,
  Check, 
  Clock, 
  RefreshCcw, 
  HelpCircle,
  Zap,
  Target,
  Rocket,
  Star,
  Loader2,
  ShieldCheck,
  MessageSquare,
  Upload,
  Image as ImageIcon,
  X,
  FileText,
  SortDesc,
  Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useMemo, useEffect } from 'react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { createCheckoutSession } from '@/lib/checkout.functions';
import { toast } from 'sonner';
import { format } from 'date-fns';
import DOMPurify from 'isomorphic-dompurify';
import { usePublicProfile, getInitials } from '@/hooks/usePublicProfile';

export const Route = createFileRoute('/gigs/$slug')({
  component: GigDetail,
});

function GigDetail() {
  const { slug } = Route.useParams();
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>('newest');
  const [filterVerified, setFilterVerified] = useState<boolean>(false);
  const queryClient = useQueryClient();
  const { data: profile } = usePublicProfile();

  const { data: gig, isLoading } = useQuery({
    queryKey: ['gig', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gigs')
        .select('*, gig_categories(name, slug), gig_packages(*)')
        .eq('slug', slug)
        .single();
      
      if (error) throw error;
      return data as any;
    },
  });

  const { data: reviews, isLoading: reviewsLoading } = useQuery({
    queryKey: ['gig-reviews', gig?.id, sortBy, filterVerified],
    enabled: !!gig?.id,
    queryFn: async () => {
      let query = supabase
        .from('gig_reviews')
        .select('*')
        .eq('gig_id', gig.id)
        .eq('status', 'approved');
      
      if (filterVerified) {
        query = query.eq('is_verified_purchase', true);
      }

      if (sortBy === 'newest') {
        query = query.order('created_at', { ascending: false });
      } else if (sortBy === 'highest_rated') {
        query = query.order('rating', { ascending: false }).order('created_at', { ascending: false });
      } else if (sortBy === 'lowest_rated') {
        query = query.order('rating', { ascending: true }).order('created_at', { ascending: false });
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    },
  });

  const averageRating = useMemo(() => {
    if (!reviews || reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, rev) => acc + rev.rating, 0);
    return Math.round((sum / reviews.length) * 10) / 10;
  }, [reviews]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pt-24 pb-20">
        <div className="container mx-auto px-4">
          <Skeleton className="h-8 w-32 mb-8" />
          <div className="grid lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2 space-y-8">
              <Skeleton className="aspect-video w-full rounded-2xl" />
              <Skeleton className="h-64 w-full" />
            </div>
            <Skeleton className="h-[600px] w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!gig) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">Gig not found</h2>
          <Button asChild>
            <Link to="/gigs" search={{ page: 1 }}>Back to Gigs</Link>
          </Button>
        </div>
      </div>
    );
  }

  const packages = gig.gig_packages || [];
  const sortedPackages = [...packages].sort((a, b) => a.price - b.price);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="pt-32 pb-12 bg-muted/30 border-b">
        <div className="container mx-auto px-4">
          <Button variant="ghost" asChild className="mb-8 -ml-4">
            <Link to="/gigs" search={{ page: 1 }} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Back to Gigs
            </Link>
          </Button>
          
          <div className="grid lg:grid-cols-3 gap-12 items-start">
            <div className="lg:col-span-2 space-y-6">
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-primary/10 text-primary border-none">
                  {gig.gig_categories?.name}
                </Badge>
                {gig.is_featured && (
                  <Badge className="bg-amber-500 text-white border-none">
                    Featured Gig
                  </Badge>
                )}
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">{gig.title}</h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                {gig.short_description}
              </p>
              
              <div className="flex items-center gap-6 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold overflow-hidden">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt={profile.full_name || ''} className="h-full w-full object-cover" />
                    ) : (
                      getInitials(profile?.full_name)
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-bold">{profile?.full_name || 'Service Provider'}</div>
                    <div className="text-xs text-muted-foreground">{profile?.professional_title || 'Freelancer'}</div>
                  </div>
                </div>
                {reviews && reviews.length > 0 ? (
                  <div className="flex items-center gap-1 text-amber-500">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            "h-4 w-4",
                            i < Math.round(averageRating) ? "fill-current" : "text-muted"
                          )}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-bold text-foreground ml-1">
                      {averageRating.toFixed(1)} ({reviews.length} reviews)
                    </span>
                  </div>
                ) : (
                  <span className="text-sm font-medium text-muted-foreground">No reviews yet</span>
                )}
              </div>
            </div>

            {/* Price Card for Desktop */}
            <div className="hidden lg:block sticky top-24">
              <GigPricingCard packages={sortedPackages} />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 mt-12">
        <div className="grid lg:grid-cols-3 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-16">
            {/* Gallery */}
            <section className="rounded-2xl overflow-hidden border bg-card shadow-sm">
              <img 
                src={gig.thumbnail || 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&auto=format&fit=crop&q=80'} 
                alt={gig.title}
                className="w-full aspect-video object-cover"
              />
            </section>

            {/* Description */}
            <section className="space-y-6">
              <h2 className="text-3xl font-bold">About This Gig</h2>
              <div
                className="text-lg text-muted-foreground leading-relaxed prose prose-stone dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(gig.full_description || '') }}
              />
            </section>

            {/* Problem & Solution */}
            <div className="grid md:grid-cols-2 gap-8">
              <Card className="border-orange-500/20 bg-orange-500/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-600">
                    <HelpCircle className="h-5 w-5" /> The Problem
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground">
                  {gig.problem_statement}
                </CardContent>
              </Card>
              <Card className="border-green-500/20 bg-green-500/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-600">
                    <Zap className="h-5 w-5" /> The Solution
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground">
                  {gig.solution}
                </CardContent>
              </Card>
            </div>

            {/* Deliverables */}
            {gig.deliverables && Array.isArray(gig.deliverables) && gig.deliverables.length > 0 && (
              <section className="space-y-6">
                <h2 className="text-3xl font-bold">What You'll Get</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {(gig.deliverables as string[]).map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-4 rounded-xl border bg-card">
                      <Check className="h-5 w-5 text-green-500 mt-0.5" />
                      <span className="font-medium">{item}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Requirements */}
            {gig.requirements && (
              <section className="space-y-4 p-8 rounded-2xl bg-muted/50 border border-dashed">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Target className="h-5 w-5" /> Requirements
                </h3>
                <p className="text-muted-foreground">
                  {gig.requirements}
                </p>
              </section>
            )}
            
            {/* Reviews Section */}
            <section id="reviews" className="space-y-8 pt-8 border-t">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold">Reviews</h2>
                <div className="flex items-center gap-2">
                  {reviews && reviews.length > 0 ? (
                    <>
                      <div className="flex items-center text-amber-500">
                        <Star className="h-5 w-5 fill-current" />
                        <span className="text-xl font-bold text-foreground ml-1">{averageRating.toFixed(1)}</span>
                      </div>
                      <span className="text-muted-foreground">({reviews.length} reviews)</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">No reviews yet</span>
                  )}
                </div>
              </div>

              <ReviewForm gigId={gig.id} gigTitle={gig.title} />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-muted/20 border border-dashed">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <SortDesc className="h-4 w-4 text-muted-foreground" />
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-[160px] bg-background">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newest">Newest First</SelectItem>
                        <SelectItem value="highest_rated">Highest Rated</SelectItem>
                        <SelectItem value="lowest_rated">Lowest Rated</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="verified-only" 
                      checked={filterVerified} 
                      onCheckedChange={(checked) => setFilterVerified(checked === true)}
                    />
                    <Label 
                      htmlFor="verified-only" 
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-1.5"
                    >
                      <ShieldCheck className="h-4 w-4 text-green-600" />
                      Verified purchases only
                    </Label>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {reviewsLoading ? (
                  [1, 2].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)
                ) : reviews && reviews.length > 0 ? (
                  reviews.map((review) => (
                    <Card key={review.id} className="bg-card/50 border-none shadow-none bg-muted/20">
                      <CardContent className="pt-6 space-y-4">
                        <div className="flex justify-between items-start">
                          <div className="flex gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                              {review.reviewer_name?.charAt(0) || 'U'}
                            </div>
                            <div>
                              <div className="font-bold flex items-center gap-2">
                                {review.reviewer_name}
                                {review.is_verified_purchase && (
                                  <Badge variant="outline" className="h-5 text-[10px] bg-green-500/5 text-green-600 border-green-500/20 gap-1 px-1.5">
                                    <ShieldCheck className="h-3 w-3" /> Verified Purchase
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-0.5 text-amber-500 mt-0.5">
                                {[...Array(5)].map((_, i) => (
                                  <Star key={i} className={cn("h-3 w-3", i < review.rating ? "fill-current" : "text-muted/30")} />
                                ))}
                              </div>
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {review.created_at && format(new Date(review.created_at), 'MMM d, yyyy')}
                          </span>
                        </div>
                        <p className="text-muted-foreground leading-relaxed">
                          {review.comment}
                        </p>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-12 bg-muted/20 rounded-2xl border border-dashed">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                    <h3 className="text-lg font-medium">No reviews yet</h3>
                    <p className="text-muted-foreground">Be the first to share your experience.</p>
                  </div>
                )}
              </div>
            </section>
            
            {/* Mobile Pricing - Visible only on mobile */}
            <div className="lg:hidden space-y-8">
              <h2 className="text-3xl font-bold">Select a Package</h2>
              <GigPricingCard packages={sortedPackages} />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            <div className="sticky top-24 space-y-8">
              {/* Seller Info */}
              <Card>
                <CardHeader>
                  <CardTitle>About The Seller</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-4">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold overflow-hidden">
                      {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt={profile.full_name || ''} className="h-full w-full object-cover" />
                      ) : (
                        getInitials(profile?.full_name)
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="font-bold">{profile?.full_name || 'Service Provider'}</div>
                      <div className="text-sm text-muted-foreground">{profile?.professional_title || 'Freelancer'}</div>
                      {reviews && reviews.length > 0 ? (
                        <div className="flex items-center gap-1 text-amber-500 text-xs">
                          <Star className="h-3 w-3 fill-current" /> {averageRating.toFixed(1)} ({reviews.length} Reviews)
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">No reviews yet</div>
                      )}
                    </div>
                  </div>
                  {profile?.bio && (
                    <p className="text-sm text-muted-foreground">
                      {profile.bio}
                    </p>
                  )}
                  <GigInquiryForm gigTitle={gig.title} />
                </CardContent>
              </Card>

              {/* Tags */}
              {gig.tags && Array.isArray(gig.tags) && (
                <div className="flex flex-wrap gap-2">
                  {(gig.tags as string[]).map((tag) => (
                    <Badge key={tag} variant="secondary" className="hover:bg-primary/10 transition-colors cursor-default">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GigPricingCard({ packages }: { packages: any[] }) {
  const [isCheckoutLoading, setIsCheckoutLoading] = useState<string | null>(null);

  if (packages.length === 0) return null;

  const handleCheckout = async (packageId: string, method: 'stripe' | 'bkash' | 'bank_transfer' = 'stripe') => {
    setIsCheckoutLoading(packageId);
    try {
      if (method === 'stripe') {
        const result = await createCheckoutSession({ data: { packageId } });
        if (result.url) {
          window.location.href = result.url;
        } else {
          throw new Error("Failed to create checkout session");
        }
      } else {
        // Manual payment flow
        window.location.href = `/checkout/manual?packageId=${packageId}&method=${method}`;
      }
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast.error(error.message || "Failed to initiate checkout. Please check Stripe configuration.");
    } finally {
      setIsCheckoutLoading(null);
    }
  };

  return (
    <Tabs defaultValue={packages[0]?.name} className="w-full">
      <TabsList className="grid w-full grid-cols-3 h-12">
        {packages.map((pkg) => (
          <TabsTrigger key={pkg.id} value={pkg.name} className="text-xs md:text-sm font-bold">
            {pkg.name}
          </TabsTrigger>
        ))}
      </TabsList>
      {packages.map((pkg) => (
        <TabsContent key={pkg.id} value={pkg.name}>
          <Card className="border-t-0 rounded-t-none shadow-lg">
            <CardHeader className="space-y-1">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl">${pkg.price}</CardTitle>
              </div>
              <CardDescription className="text-base font-medium text-foreground">
                {pkg.name} Package
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-wrap gap-4 text-sm font-medium">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-muted-foreground" /> {pkg.delivery_time} Delivery
                </div>
                <div className="flex items-center gap-1.5">
                  <RefreshCcw className="h-4 w-4 text-muted-foreground" /> {pkg.revisions} Revisions
                </div>
              </div>
              <ul className="space-y-3">
                {(pkg.features as string[] || []).map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-sm">
                    <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter className="flex-col gap-3">
              <Button 
                className="w-full h-12 text-base font-bold group"
                onClick={() => handleCheckout(pkg.id, 'stripe')}
                disabled={isCheckoutLoading !== null}
              >
                {isCheckoutLoading === pkg.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Pay with Card (Stripe)
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </Button>
              <div className="grid grid-cols-2 gap-2 w-full">
                <Button 
                  variant="outline"
                  className="w-full text-xs font-bold"
                  onClick={() => handleCheckout(pkg.id, 'bkash')}
                  disabled={isCheckoutLoading !== null}
                >
                  Pay with bKash
                </Button>
                <Button 
                  variant="outline"
                  className="w-full text-xs font-bold"
                  onClick={() => handleCheckout(pkg.id, 'bank_transfer')}
                  disabled={isCheckoutLoading !== null}
                >
                  Bank Transfer
                </Button>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
      ))}
    </Tabs>
  );
}

function ReviewForm({ gigId, gigTitle }: { gigId: string; gigTitle: string }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [name, setName] = useState('');
  const [attachments, setAttachments] = useState<{ url: string; type: string; name: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    }
  });

  const { data: eligibility, isLoading: checkingEligibility } = useQuery({
    queryKey: ['review-eligibility', gigId, user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      // Check for completed orders for this gig
      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, gig_packages(gig_id)')
        .eq('user_id', user!.id)
        .eq('status', 'completed');
      
      if (error) throw error;
      
      const gigOrders = orders?.filter(o => (o.gig_packages as any)?.gig_id === gigId) || [];
      const hasOrder = gigOrders.length > 0;
      
      // Check if they've already reviewed these specific orders
      const orderIds = gigOrders.map(o => o.id);
      const { data: existingReviews } = await supabase
        .from('gig_reviews')
        .select('order_id')
        .in('order_id', orderIds);

      const reviewedOrderIds = new Set(existingReviews?.map(r => r.order_id) || []);
      const unreviewedOrder = gigOrders.find(o => !reviewedOrderIds.has(o.id));

      return {
        canReview: !!unreviewedOrder,
        hasOrder,
        orderId: unreviewedOrder?.id || null,
        alreadyReviewed: hasOrder && !unreviewedOrder
      };
    }
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `reviews/${gigId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('media')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('media')
          .getPublicUrl(filePath);

        setAttachments(prev => [...prev, { 
          url: publicUrl, 
          type: file.type.startsWith('image/') ? 'image' : 'file',
          name: file.name
        }]);
      }
      toast.success('Files uploaded successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload files');
    } finally {
      setIsUploading(false);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      // 1. Client-side Rate limiting check
      if (user?.id) {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { count, error: countError } = await supabase
          .from('gig_reviews')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gt('created_at', twentyFourHoursAgo);

        if (countError) throw countError;
        if (count !== null && count >= 5) {
          throw new Error('You have reached the daily limit for reviews. Please try again tomorrow.');
        }
      }

      const reviewerName = name || user?.user_metadata?.['full_name'] || 'Anonymous';

      // 2. Submit the review
      const { data: reviewData, error } = await supabase.from('gig_reviews').insert({
        gig_id: gigId,
        user_id: user?.id || null,
        order_id: eligibility?.orderId || null,
        rating,
        reviewer_name: reviewerName,
        status: 'pending',
        is_verified_purchase: eligibility?.hasOrder || false,
        reviewer_avatar: user?.user_metadata?.['avatar_url'] || null,
        comment: attachments.length > 0 
          ? `${comment}\n\n[Attachments: ${attachments.map(a => a.url).join(', ')}]`
          : comment
      }).select().single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('A review has already been submitted for this order.');
        }
        throw error;
      }

      // 3. Notify admins
      await (supabase as any).from('admin_notifications').insert({
        title: 'New Review Submitted',
        message: `${reviewerName} submitted a ${rating}-star review for "${gigTitle || 'a gig'}".`,
        type: 'review_new',
        link: '/admin/testimonials',
      });
    },
    onSuccess: () => {
      toast.success('Review submitted! It will appear after moderation.');
      setComment('');
      setName('');
      setRating(5);
      setAttachments([]);
      queryClient.invalidateQueries({ queryKey: ['gig-reviews', gigId] });
      queryClient.invalidateQueries({ queryKey: ['review-eligibility', gigId, user?.id] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to submit review');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment) {
      toast.error('Please add a comment');
      return;
    }
    submitMutation.mutate();
  };

  if (!user) {
    return (
      <Card className="bg-muted/30 border-none shadow-none text-center p-8">
        <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
        <CardTitle className="text-lg mb-2">Want to leave a review?</CardTitle>
        <CardDescription className="mb-6">
          You must be logged in to share your experience.
        </CardDescription>
        <Button variant="outline" asChild>
          <Link to="/">Return to Home</Link>
        </Button>
      </Card>
    );
  }

  if (checkingEligibility) {
    return <Skeleton className="h-64 w-full rounded-xl" />;
  }

  if (!eligibility?.canReview) {
    return (
      <Card className="bg-muted/30 border-none shadow-none p-6">
        <div className="flex items-center gap-3 text-muted-foreground italic text-sm">
          <HelpCircle className="h-5 w-5" />
          {eligibility?.alreadyReviewed 
            ? "You have already reviewed this gig. Thank you for your feedback!" 
            : "Only customers who have purchased and completed this gig can leave a review."}
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-muted/30 border-none shadow-none">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Write a Review</CardTitle>
            <CardDescription>Share your experience with the community</CardDescription>
          </div>
          {eligibility?.hasOrder && (
            <Badge variant="outline" className="bg-green-500/5 text-green-600 border-green-500/20 gap-1">
              <ShieldCheck className="h-3 w-3" /> Verified Customer
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <label id="review-rating-label" className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Overall Rating</label>
            <div className="flex gap-2" role="group" aria-labelledby="review-rating-label">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setRating(s)}
                  aria-label={`Rate ${s} out of 5 stars`}
                  aria-pressed={s <= rating}
                  className={cn(
                    "p-1.5 rounded-lg transition-all transform hover:scale-110",
                    s <= rating ? "text-amber-500 bg-amber-500/10" : "text-muted hover:text-amber-500/50 bg-muted/50"
                  )}
                >
                  <Star className={cn("h-7 w-7", s <= rating && "fill-current")} />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label htmlFor="review-name" className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Your Name</label>
            <Input
              id="review-name"
              placeholder="How should we display your name?"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-background border-muted"
            />
          </div>

          <div className="space-y-3">
            <label htmlFor="review-comment" className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Detailed Review</label>
            <Textarea
              id="review-comment"
              placeholder="What was it like working on this project? What results did you see?"
              className="min-h-[120px] bg-background border-muted resize-none focus:ring-primary"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Attachments (Optional)</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {attachments.map((file, idx) => (
                <div key={idx} className="relative group aspect-square rounded-xl border bg-background overflow-hidden">
                  {file.type === 'image' ? (
                    <img src={file.url} alt="Review attachment" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center">
                      <FileText className="h-8 w-8 text-primary mb-1" />
                      <span className="text-[10px] truncate w-full px-2">{file.name}</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeAttachment(idx)}
                    aria-label={`Remove ${file.name}`}
                    className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <label className={cn(
                "flex flex-col items-center justify-center aspect-square rounded-xl border-2 border-dashed border-muted hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition-all",
                isUploading && "opacity-50 cursor-wait"
              )}>
                <input 
                  type="file" 
                  className="hidden" 
                  multiple 
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />
                {isUploading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                ) : (
                  <>
                    <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Upload</span>
                  </>
                )}
              </label>
            </div>
            <p className="text-[10px] text-muted-foreground">Images, PDF or Word docs (Max 5MB)</p>
          </div>

          <Button type="submit" disabled={submitMutation.isPending || isUploading} className="w-full h-12 font-bold text-base">
            {submitMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Rocket className="h-4 w-4 mr-2" />}
            Submit Verified Review
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function GigInquiryForm({ gigTitle }: { gigTitle: string }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('contact_messages').insert({
        name: name,
        email,
        message,
        subject: `Gig Inquiry: ${gigTitle}`,
        status: 'unread'
      });

      if (error) throw error;

      toast.success('Inquiry sent successfully! I will get back to you soon.');
      setName('');
      setEmail('');
      setMessage('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send inquiry');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="inquiry-name" className="sr-only">Your Name</Label>
        <Input
          id="inquiry-name"
          placeholder="Your Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="inquiry-email" className="sr-only">Email Address</Label>
        <Input
          id="inquiry-email"
          type="email"
          placeholder="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="inquiry-message" className="sr-only">Your Message</Label>
        <Textarea
          id="inquiry-message"
          placeholder="How can I help you with this gig?"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          className="min-h-[100px]"
        />
      </div>
      <Button type="submit" className="w-full font-bold" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <MessageSquare className="h-4 w-4 mr-2" />}
        Send Inquiry
      </Button>
    </form>
  );
}

