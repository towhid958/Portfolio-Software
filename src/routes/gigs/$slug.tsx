import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
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
  Filter,
} from 'lucide-react';
import { cn, getErrorMessage } from '@/lib/utils';
import { useState, useMemo, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { createCheckoutSession } from '@/lib/checkout.functions';
import { toast } from 'sonner';
import { format } from 'date-fns';
import DOMPurify from 'isomorphic-dompurify';
import { usePublicProfile, getInitials } from '@/hooks/usePublicProfile';
import { Reveal } from '@/components/motion/Reveal';
import { CardSkeleton, EmptyState } from '@/components/shared/ListingChrome';
import { CtaBanner, DefaultCtaActions } from '@/components/shared/CtaBanner';
import { proseRoyal } from '@/components/shared/prose';
import type { Database } from '@/integrations/supabase/types';

export const Route = createFileRoute('/gigs/$slug')({
  component: GigDetail,
});

type GigPackageRow = Database['public']['Tables']['gig_packages']['Row'];

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
      return data;
    },
  });

  const { data: reviews, isLoading: reviewsLoading } = useQuery({
    queryKey: ['gig-reviews', gig?.id, sortBy, filterVerified],
    enabled: !!gig?.id,
    queryFn: async () => {
      // Guarded by `enabled: !!gig?.id` above; the queryFn signature can't
      // express that, so re-state it rather than assert.
      if (!gig?.id) return [];
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
        query = query
          .order('rating', { ascending: false })
          .order('created_at', { ascending: false });
      } else if (sortBy === 'lowest_rated') {
        query = query
          .order('rating', { ascending: true })
          .order('created_at', { ascending: false });
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
      <div className="min-h-screen bg-royal-canvas pb-20 pt-24 font-sans-body">
        <div className="mx-auto max-w-[1280px] px-6 lg:px-12">
          <CardSkeleton className="mb-8 h-10 w-40" />
          <div className="grid gap-10 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <CardSkeleton className="aspect-video w-full" />
              <CardSkeleton className="h-64" />
            </div>
            <CardSkeleton className="h-[600px]" />
          </div>
        </div>
      </div>
    );
  }

  if (!gig) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-royal-canvas px-6 font-sans-body">
        <div className="w-full max-w-md">
          <EmptyState
            title="Gig not found"
            description="This package may have been unpublished or moved."
            icon={<Zap className="h-6 w-6" />}
          />
          <div className="mt-6 text-center">
            <Link
              to="/gigs"
              search={{ page: 1 }}
              className="inline-flex items-center gap-2 rounded-xl border border-royal-gold/35 bg-royal-deep px-6 py-3 text-xs font-bold uppercase tracking-wider text-royal-gold-light shadow-md transition-all duration-300 hover:-translate-y-0.5"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Gigs
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const packages = gig.gig_packages || [];
  const sortedPackages = [...packages].sort((a, b) => a.price - b.price);

  return (
    <div className="flex w-full flex-col bg-royal-canvas font-sans-body text-royal-ink">
      {/* Header */}
      <div className="relative w-full overflow-hidden border-b border-royal-deep/10 bg-gradient-to-b from-[#F2F4F8] via-royal-canvas to-royal-canvas pb-12 pt-16">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 left-1/2 h-[420px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-royal-deep/12 via-royal-sapphire/10 to-royal-gold/15 blur-[120px]" />
        </div>
        <div className="relative mx-auto max-w-[1280px] px-6 lg:px-12">
          <Link
            to="/gigs"
            search={{ page: 1 }}
            className="mb-8 inline-flex items-center gap-2 font-mono-code text-[11px] font-bold uppercase tracking-wider text-slate-500 transition-colors hover:text-royal-deep"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Gigs
          </Link>

          <div className="grid items-start gap-10 lg:grid-cols-3 lg:gap-12">
            <Reveal className="space-y-5 lg:col-span-2">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-royal-deep/15 bg-white px-4 py-1.5 font-mono-code text-[11px] font-bold uppercase tracking-wider text-royal-deep shadow-sm">
                  {gig.gig_categories?.name}
                </span>
                {gig.is_featured && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-royal-gold/40 bg-royal-deep px-4 py-1.5 font-mono-code text-[11px] font-bold uppercase tracking-wider text-royal-gold-light">
                    <Star className="h-3 w-3 fill-current" /> Featured
                  </span>
                )}
              </div>
              <h1 className="font-sans-body text-4xl font-extrabold leading-[1.12] tracking-[-0.03em] text-royal-ink md:text-5xl">
                {gig.title}
              </h1>
              <p className="text-lg leading-relaxed text-slate-600">{gig.short_description}</p>

              <div className="flex flex-wrap items-center gap-6 border-t border-royal-deep/10 pt-5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-royal-deep/10 bg-royal-deep/5 font-mono-code text-xs font-bold text-royal-deep">
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={profile.full_name || ''}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      getInitials(profile?.full_name)
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-royal-ink">
                      {profile?.full_name || 'Service Provider'}
                    </div>
                    <div className="font-mono-code text-[11px] text-slate-500">
                      {profile?.professional_title || 'Freelancer'}
                    </div>
                  </div>
                </div>
                {reviews && reviews.length > 0 ? (
                  <div className="flex items-center gap-1 text-royal-gold">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            'h-4 w-4',
                            i < Math.round(averageRating) ? 'fill-current' : 'text-royal-deep/15',
                          )}
                        />
                      ))}
                    </div>
                    <span className="ml-1 text-sm font-bold text-royal-ink">
                      {averageRating.toFixed(1)} ({reviews.length} reviews)
                    </span>
                  </div>
                ) : (
                  <span className="font-mono-code text-[11px] uppercase tracking-wider text-slate-500">
                    No reviews yet
                  </span>
                )}
              </div>
            </Reveal>

            {/* Price Card for Desktop */}
            <div className="sticky top-24 hidden lg:block">
              <GigPricingCard packages={sortedPackages} />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-12 w-full max-w-[1280px] px-6 lg:px-12">
        <div className="grid gap-12 lg:grid-cols-3">
          {/* Main Content */}
          <div className="space-y-14 lg:col-span-2">
            {/* Gallery */}
            <Reveal
              variant="scale"
              className="overflow-hidden rounded-3xl border border-royal-deep/15 bg-royal-deep shadow-[0_16px_40px_rgba(12,27,51,0.12)]"
            >
              <div className="aspect-video">
                {gig.thumbnail ? (
                  <img src={gig.thumbnail} alt={gig.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Zap className="h-16 w-16 text-white/15" />
                  </div>
                )}
              </div>
            </Reveal>

            {/* Description */}
            <Reveal className="space-y-5">
              <h2 className="font-sans-body text-2xl font-extrabold tracking-tight text-royal-ink">
                About This Gig
              </h2>
              <div
                className={proseRoyal}
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(gig.full_description || '') }}
              />
            </Reveal>

            {/* Problem & Solution */}
            <div className="grid gap-6 md:grid-cols-2">
              <Reveal className="rounded-3xl border border-amber-200 bg-amber-50/60 p-7 shadow-sm">
                <h3 className="flex items-center gap-2 font-sans-body text-lg font-bold text-royal-gold-deep">
                  <HelpCircle className="h-5 w-5" /> The Problem
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  {gig.problem_statement}
                </p>
              </Reveal>
              <Reveal
                delay={90}
                className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-7 shadow-sm"
              >
                <h3 className="flex items-center gap-2 font-sans-body text-lg font-bold text-emerald-700">
                  <Zap className="h-5 w-5" /> The Solution
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{gig.solution}</p>
              </Reveal>
            </div>

            {/* Deliverables */}
            {gig.deliverables && Array.isArray(gig.deliverables) && gig.deliverables.length > 0 && (
              <Reveal className="space-y-5">
                <h2 className="font-sans-body text-2xl font-extrabold tracking-tight text-royal-ink">
                  What You'll Get
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {(gig.deliverables as string[]).map((item) => (
                    <div
                      key={item}
                      className="flex items-start gap-3 rounded-2xl border border-royal-deep/12 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-royal-gold hover:shadow-md"
                    >
                      <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                      <span className="text-sm font-medium text-slate-700">{item}</span>
                    </div>
                  ))}
                </div>
              </Reveal>
            )}

            {/* Requirements */}
            {gig.requirements && (
              <Reveal className="space-y-3 rounded-3xl border border-dashed border-royal-deep/25 bg-royal-canvas-alt p-7">
                <h3 className="flex items-center gap-2 font-sans-body text-lg font-bold text-royal-ink">
                  <Target className="h-5 w-5 text-royal-sapphire" /> Requirements
                </h3>
                <p className="text-sm leading-relaxed text-slate-600">{gig.requirements}</p>
              </Reveal>
            )}

            {/* Reviews Section */}
            <section
              id="reviews"
              className="scroll-mt-24 space-y-8 border-t border-royal-deep/10 pt-10"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-sans-body text-2xl font-extrabold tracking-tight text-royal-ink">
                  Reviews
                </h2>
                <div className="flex items-center gap-2">
                  {reviews && reviews.length > 0 ? (
                    <>
                      <div className="flex items-center text-royal-gold">
                        <Star className="h-5 w-5 fill-current" />
                        <span className="ml-1 font-sans-body text-xl font-extrabold text-royal-ink">
                          {averageRating.toFixed(1)}
                        </span>
                      </div>
                      <span className="font-mono-code text-[11px] uppercase tracking-wider text-slate-500">
                        ({reviews.length} reviews)
                      </span>
                    </>
                  ) : (
                    <span className="text-slate-600">No reviews yet</span>
                  )}
                </div>
              </div>

              <ReviewForm gigId={gig.id} gigTitle={gig.title} />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-royal-canvas-alt border border-dashed">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <SortDesc className="h-4 w-4 text-slate-600" />
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-[160px] bg-white">
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
                  [1, 2].map((i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)
                ) : reviews && reviews.length > 0 ? (
                  reviews.map((review) => (
                    <Card
                      key={review.id}
                      className="bg-card/50 border-none shadow-none bg-royal-canvas-alt"
                    >
                      <CardContent className="pt-6 space-y-4">
                        <div className="flex justify-between items-start">
                          <div className="flex gap-3">
                            <div className="h-10 w-10 rounded-full bg-royal-deep/5 flex items-center justify-center text-royal-sapphire font-bold">
                              {review.reviewer_name?.charAt(0) || 'U'}
                            </div>
                            <div>
                              <div className="font-bold flex items-center gap-2">
                                {review.reviewer_name}
                                {review.is_verified_purchase && (
                                  <Badge
                                    variant="outline"
                                    className="h-5 text-[10px] bg-green-500/5 text-green-600 border-green-500/20 gap-1 px-1.5"
                                  >
                                    <ShieldCheck className="h-3 w-3" /> Verified Purchase
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-0.5 text-royal-gold mt-0.5">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={cn(
                                      'h-3 w-3',
                                      i < review.rating ? 'fill-current' : 'text-muted/30',
                                    )}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                          <span className="text-xs text-slate-600">
                            {review.created_at &&
                              format(new Date(review.created_at), 'MMM d, yyyy')}
                          </span>
                        </div>
                        <p className="text-slate-600 leading-relaxed">{review.comment}</p>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="rounded-3xl border border-dashed border-royal-deep/25 bg-royal-canvas-alt py-12 text-center">
                    <MessageSquare className="mx-auto mb-4 h-10 w-10 text-royal-deep/20" />
                    <h3 className="font-sans-body text-lg font-bold text-royal-ink">
                      No reviews yet
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      Be the first to share your experience.
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* Mobile Pricing - Visible only on mobile */}
            <div className="space-y-6 lg:hidden">
              <h2 className="font-sans-body text-2xl font-extrabold tracking-tight text-royal-ink">
                Select a Package
              </h2>
              <GigPricingCard packages={sortedPackages} />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            <div className="sticky top-24 space-y-8">
              {/* Seller Info */}
              <Reveal
                variant="right"
                className="space-y-4 rounded-3xl border border-royal-deep/12 bg-white p-7 shadow-sm"
              >
                <h2 className="font-sans-body text-lg font-bold text-royal-ink">
                  About The Seller
                </h2>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-royal-deep/10 bg-royal-deep/5 font-mono-code text-lg font-bold text-royal-deep">
                      {profile?.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt={profile.full_name || ''}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        getInitials(profile?.full_name)
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="font-bold text-royal-ink">
                        {profile?.full_name || 'Service Provider'}
                      </div>
                      <div className="font-mono-code text-[11px] text-slate-500">
                        {profile?.professional_title || 'Freelancer'}
                      </div>
                      {reviews && reviews.length > 0 ? (
                        <div className="flex items-center gap-1 text-xs text-royal-gold">
                          <Star className="h-3 w-3 fill-current" />{' '}
                          <span className="text-royal-ink">
                            {averageRating.toFixed(1)} ({reviews.length} Reviews)
                          </span>
                        </div>
                      ) : (
                        <div className="font-mono-code text-[11px] text-slate-500">
                          No reviews yet
                        </div>
                      )}
                    </div>
                  </div>
                  {profile?.bio && (
                    <p className="text-sm leading-relaxed text-slate-600">{profile.bio}</p>
                  )}
                  <GigInquiryForm gigTitle={gig.title} />
                </div>
              </Reveal>

              {/* Tags */}
              {gig.tags && Array.isArray(gig.tags) && (
                <div className="flex flex-wrap gap-2">
                  {(gig.tags as string[]).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-royal-deep/12 bg-white px-3 py-1 font-mono-code text-[11px] font-bold uppercase tracking-wider text-slate-600 shadow-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-16">
        <CtaBanner
          eyebrow="Not Quite Right?"
          title="Need this tailored to your case?"
          description="Packages cover the common shape of a problem. If yours is different, describe it and I'll scope it properly."
          actions={<DefaultCtaActions />}
        />
      </div>
    </div>
  );
}

function GigPricingCard({ packages }: { packages: GigPackageRow[] }) {
  const [isCheckoutLoading, setIsCheckoutLoading] = useState<string | null>(null);

  if (packages.length === 0) return null;

  const handleCheckout = async (
    packageId: string,
    method: 'stripe' | 'bkash' | 'bank_transfer' = 'stripe',
  ) => {
    setIsCheckoutLoading(packageId);
    try {
      if (method === 'stripe') {
        const result = await createCheckoutSession({ data: { packageId } });
        if (result.url) {
          window.location.href = result.url;
        } else {
          throw new Error('Failed to create checkout session');
        }
      } else {
        // Manual payment flow
        window.location.href = `/checkout/manual?packageId=${packageId}&method=${method}`;
      }
    } catch (error: unknown) {
      console.error('Checkout error:', error);
      toast.error(
        getErrorMessage(error, 'Failed to initiate checkout. Please check Stripe configuration.'),
      );
    } finally {
      setIsCheckoutLoading(null);
    }
  };

  return (
    <Tabs {...(packages[0] ? { defaultValue: packages[0].name } : {})} className="w-full">
      <TabsList className="grid h-12 w-full grid-cols-3 rounded-b-none rounded-t-3xl border border-b-0 border-royal-deep/12 bg-royal-canvas-alt p-1">
        {packages.map((pkg) => (
          <TabsTrigger
            key={pkg.id}
            value={pkg.name}
            className="rounded-xl font-mono-code text-[11px] font-bold uppercase tracking-wider data-[state=active]:bg-royal-deep data-[state=active]:text-royal-gold-light md:text-xs"
          >
            {pkg.name}
          </TabsTrigger>
        ))}
      </TabsList>
      {packages.map((pkg) => (
        <TabsContent key={pkg.id} value={pkg.name} className="mt-0">
          <div className="rounded-b-3xl border border-t-0 border-royal-deep/12 bg-white p-7 shadow-[0_16px_40px_rgba(12,27,51,0.10)]">
            <div className="space-y-1">
              <div className="font-sans-body text-3xl font-extrabold text-royal-deep">
                ${pkg.price}
              </div>
              <div className="font-mono-code text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {pkg.name} Package
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-4 border-y border-slate-100 py-4 text-sm font-medium text-slate-700">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-royal-sapphire" /> {pkg.delivery_time} Delivery
              </span>
              <span className="inline-flex items-center gap-1.5">
                <RefreshCcw className="h-4 w-4 text-royal-sapphire" /> {pkg.revisions} Revisions
              </span>
            </div>

            <ul className="mt-5 space-y-2.5">
              {((pkg.features as string[]) || []).map((feature) => (
                <li key={feature} className="flex items-start gap-2.5 text-sm text-slate-600">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <div className="mt-7 flex flex-col gap-3">
              <button
                type="button"
                className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-royal-gold/35 bg-royal-deep text-sm font-bold uppercase tracking-wider text-royal-gold-light shadow-lg shadow-royal-deep/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                onClick={() => handleCheckout(pkg.id, 'stripe')}
                disabled={isCheckoutLoading !== null}
              >
                {isCheckoutLoading === pkg.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Pay with Card
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </>
                )}
              </button>
              <div className="grid w-full grid-cols-2 gap-2">
                <button
                  type="button"
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-royal-deep/20 bg-white text-[11px] font-bold uppercase tracking-wider text-royal-ink shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-royal-canvas-alt disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => handleCheckout(pkg.id, 'bkash')}
                  disabled={isCheckoutLoading !== null}
                >
                  Pay with bKash
                </button>
                <button
                  type="button"
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-royal-deep/20 bg-white text-[11px] font-bold uppercase tracking-wider text-royal-ink shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-royal-canvas-alt disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => handleCheckout(pkg.id, 'bank_transfer')}
                  disabled={isCheckoutLoading !== null}
                >
                  Bank Transfer
                </button>
              </div>
            </div>
          </div>
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      return user;
    },
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

      const gigOrders = orders?.filter((o) => o.gig_packages?.gig_id === gigId) || [];
      const hasOrder = gigOrders.length > 0;

      // Check if they've already reviewed these specific orders
      const orderIds = gigOrders.map((o) => o.id);
      const { data: existingReviews } = await supabase
        .from('gig_reviews')
        .select('order_id')
        .in('order_id', orderIds);

      const reviewedOrderIds = new Set(existingReviews?.map((r) => r.order_id) || []);
      const unreviewedOrder = gigOrders.find((o) => !reviewedOrderIds.has(o.id));

      return {
        canReview: !!unreviewedOrder,
        hasOrder,
        orderId: unreviewedOrder?.id || null,
        alreadyReviewed: hasOrder && !unreviewedOrder,
      };
    },
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

        const { error: uploadError } = await supabase.storage.from('media').upload(filePath, file);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from('media').getPublicUrl(filePath);

        setAttachments((prev) => [
          ...prev,
          {
            url: publicUrl,
            type: file.type.startsWith('image/') ? 'image' : 'file',
            name: file.name,
          },
        ]);
      }
      toast.success('Files uploaded successfully');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to upload files'));
    } finally {
      setIsUploading(false);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
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
          throw new Error(
            'You have reached the daily limit for reviews. Please try again tomorrow.',
          );
        }
      }

      const reviewerName = name || user?.user_metadata?.['full_name'] || 'Anonymous';

      // 2. Submit the review
      const { data: reviewData, error } = await supabase
        .from('gig_reviews')
        .insert({
          gig_id: gigId,
          user_id: user?.id || null,
          order_id: eligibility?.orderId || null,
          rating,
          reviewer_name: reviewerName,
          status: 'pending',
          is_verified_purchase: eligibility?.hasOrder || false,
          reviewer_avatar: user?.user_metadata?.['avatar_url'] || null,
          comment:
            attachments.length > 0
              ? `${comment}\n\n[Attachments: ${attachments.map((a) => a.url).join(', ')}]`
              : comment,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('A review has already been submitted for this order.');
        }
        throw error;
      }

      // 3. Notify admins
      await supabase.from('admin_notifications').insert({
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
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error) || 'Failed to submit review');
    },
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
      <Card className="bg-royal-canvas-alt border-none shadow-none text-center p-8">
        <MessageSquare className="h-12 w-12 text-slate-600 mx-auto mb-4 opacity-20" />
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
      <Card className="bg-royal-canvas-alt border-none shadow-none p-6">
        <div className="flex items-center gap-3 text-slate-600 italic text-sm">
          <HelpCircle className="h-5 w-5" />
          {eligibility?.alreadyReviewed
            ? 'You have already reviewed this gig. Thank you for your feedback!'
            : 'Only customers who have purchased and completed this gig can leave a review.'}
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-royal-canvas-alt border-none shadow-none">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Write a Review</CardTitle>
            <CardDescription>Share your experience with the community</CardDescription>
          </div>
          {eligibility?.hasOrder && (
            <Badge
              variant="outline"
              className="bg-green-500/5 text-green-600 border-green-500/20 gap-1"
            >
              <ShieldCheck className="h-3 w-3" /> Verified Customer
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <label
              id="review-rating-label"
              className="text-sm font-bold uppercase tracking-wider text-slate-600"
            >
              Overall Rating
            </label>
            <div className="flex gap-2" role="group" aria-labelledby="review-rating-label">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setRating(s)}
                  aria-label={`Rate ${s} out of 5 stars`}
                  aria-pressed={s <= rating}
                  className={cn(
                    'p-1.5 rounded-lg transition-all transform hover:scale-110',
                    s <= rating
                      ? 'text-royal-gold bg-amber-500/10'
                      : 'text-muted hover:text-royal-gold/50 bg-royal-canvas-alt',
                  )}
                >
                  <Star className={cn('h-7 w-7', s <= rating && 'fill-current')} />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label
              htmlFor="review-name"
              className="text-sm font-bold uppercase tracking-wider text-slate-600"
            >
              Your Name
            </label>
            <Input
              id="review-name"
              placeholder="How should we display your name?"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border-royal-deep/15 bg-white"
            />
          </div>

          <div className="space-y-3">
            <label
              htmlFor="review-comment"
              className="text-sm font-bold uppercase tracking-wider text-slate-600"
            >
              Detailed Review
            </label>
            <Textarea
              id="review-comment"
              placeholder="What was it like working on this project? What results did you see?"
              className="min-h-[120px] border-royal-deep/15 bg-white resize-none focus:ring-royal-sapphire"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-bold uppercase tracking-wider text-slate-600">
              Attachments (Optional)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {attachments.map((file, idx) => (
                <div
                  key={idx}
                  className="relative group aspect-square rounded-xl border bg-white overflow-hidden"
                >
                  {file.type === 'image' ? (
                    <img
                      src={file.url}
                      alt="Review attachment"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center">
                      <FileText className="h-8 w-8 text-royal-sapphire mb-1" />
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
              <label
                className={cn(
                  'flex flex-col items-center justify-center aspect-square rounded-xl border-2 border-dashed border-muted hover:border-primary/50 hover:bg-royal-deep/5 cursor-pointer transition-all',
                  isUploading && 'opacity-50 cursor-wait',
                )}
              >
                <input
                  type="file"
                  className="hidden"
                  multiple
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />
                {isUploading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-royal-sapphire" />
                ) : (
                  <>
                    <Upload className="h-6 w-6 text-slate-600 mb-1" />
                    <span className="text-[10px] font-bold text-slate-600 uppercase">Upload</span>
                  </>
                )}
              </label>
            </div>
            <p className="text-[10px] text-slate-600">Images, PDF or Word docs (Max 5MB)</p>
          </div>

          <Button
            type="submit"
            disabled={submitMutation.isPending || isUploading}
            className="w-full h-12 font-bold text-base"
          >
            {submitMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Rocket className="h-4 w-4 mr-2" />
            )}
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
        status: 'unread',
      });

      if (error) throw error;

      toast.success('Inquiry sent successfully! I will get back to you soon.');
      setName('');
      setEmail('');
      setMessage('');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to send inquiry'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="inquiry-name" className="sr-only">
          Your Name
        </Label>
        <Input
          id="inquiry-name"
          placeholder="Your Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="inquiry-email" className="sr-only">
          Email Address
        </Label>
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
        <Label htmlFor="inquiry-message" className="sr-only">
          Your Message
        </Label>
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
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <MessageSquare className="h-4 w-4 mr-2" />
        )}
        Send Inquiry
      </Button>
    </form>
  );
}
