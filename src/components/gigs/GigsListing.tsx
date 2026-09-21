import { Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, CheckCircle2, Search, SlidersHorizontal, Star, X, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';

import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { getInitials, usePublicProfile } from '@/hooks/usePublicProfile';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Reveal } from '@/components/motion/Reveal';
import { PageHero } from '@/components/shared/PageHero';
import { CtaBanner, DefaultCtaActions } from '@/components/shared/CtaBanner';
import { CardSkeleton, EmptyState, RoyalPagination } from '@/components/shared/ListingChrome';
import { filterPillClass } from '@/components/shared/listingStyles';
import type { GigSearch } from '@/lib/gigSearch';

const ITEMS_PER_PAGE = 6;

const BENEFITS = [
  {
    icon: Zap,
    title: 'Fast Delivery',
    desc: 'Most services are delivered within 7-14 days with regular progress updates.',
    accent: 'bg-royal-deep/5 border-royal-deep/10 text-royal-deep',
  },
  {
    icon: CheckCircle2,
    title: 'Fixed Pricing',
    desc: 'No hidden costs or hourly surprises. You know exactly what you get for the price.',
    accent: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  },
  {
    icon: Star,
    title: 'Premium Quality',
    desc: 'Every gig is handled with high attention to detail and professional standards.',
    accent: 'bg-amber-50 border-amber-200 text-royal-gold-deep',
  },
];

interface GigsListingProps {
  categorySlug?: string;
  search: GigSearch;
  onSearchChange: (updater: (prev: GigSearch) => GigSearch) => void;
}

export function GigsListing({ categorySlug, search, onSearchChange }: GigsListingProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [localSearch, setLocalSearch] = useState(search.q || '');
  const { data: profile } = usePublicProfile();

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== search.q) {
        onSearchChange((prev) => ({ ...prev, q: localSearch || undefined, page: 1 }));
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [localSearch, search.q, onSearchChange]);

  const { data: categories } = useQuery({
    queryKey: ['gig-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gig_categories')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Fetch all unique tags from gigs for the filter
  const { data: allTags } = useQuery({
    queryKey: ['gig-tags'],
    queryFn: async () => {
      const { data, error } = await supabase.from('gigs').select('tags');
      if (error) throw error;
      const tagsSet = new Set<string>();
      data.forEach((gig) => {
        if (Array.isArray(gig.tags)) {
          gig.tags.forEach((tag) => tagsSet.add(String(tag)));
        }
      });
      return Array.from(tagsSet).sort();
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['gigs', categorySlug, search],
    queryFn: async () => {
      let query = supabase
        .from('gigs')
        .select(
          categorySlug
            ? '*, gig_categories!inner(name, slug), gig_packages(price)'
            : '*, gig_categories(name, slug), gig_packages(price)',
          { count: 'exact' },
        )
        .eq('status', 'published');

      if (categorySlug) {
        query = query.eq('gig_categories.slug', categorySlug);
      }

      if (search.q) {
        query = query.ilike('title', `%${search.q}%`);
      }

      // Match a gig with ANY of the selected tags, not all of them - .contains()
      // required every selected tag to be present simultaneously, so picking
      // two unrelated tags silently returned zero results even when gigs
      // matching either tag individually existed.
      if (search.tags && search.tags.length > 0) {
        query = query.overlaps('tags', search.tags);
      }

      const { data: gigsData, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      let filteredGigs = gigsData;

      // Price range filtering (happens in memory because it depends on nested gig_packages)
      if (search.minPrice !== undefined || search.maxPrice !== undefined) {
        filteredGigs = filteredGigs.filter((gig) => {
          const prices = gig.gig_packages?.map((p) => p.price) ?? [];
          if (prices.length === 0) return false;
          const minGigPrice = Math.min(...prices);

          const meetsMin = search.minPrice === undefined || minGigPrice >= search.minPrice;
          const meetsMax = search.maxPrice === undefined || minGigPrice <= search.maxPrice;

          return meetsMin && meetsMax;
        });
      }

      // Pagination in memory after price filter
      const totalCount = filteredGigs.length;
      const page = search.page ?? 1;
      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE;
      const paginatedGigs = filteredGigs.slice(from, to);

      return {
        gigs: paginatedGigs,
        totalCount,
        totalPages: Math.ceil(totalCount / ITEMS_PER_PAGE),
      };
    },
  });

  const handlePriceChange = (value: number[]) => {
    onSearchChange((prev) => ({
      ...prev,
      minPrice: value[0] === 0 ? undefined : value[0],
      maxPrice: value[1] === 2000 ? undefined : value[1],
      page: 1,
    }));
  };

  const toggleTag = (tag: string) => {
    const currentTags = search.tags || [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter((t) => t !== tag)
      : [...currentTags, tag];

    onSearchChange((prev) => ({
      ...prev,
      tags: newTags.length > 0 ? newTags : undefined,
      page: 1,
    }));
  };

  const clearFilters = () => {
    setLocalSearch('');
    onSearchChange(() => ({ page: 1 }));
  };

  const page = search.page ?? 1;
  const hasFilters =
    categorySlug ||
    search.q ||
    search.minPrice ||
    search.maxPrice ||
    (search.tags && search.tags.length > 0);

  return (
    <div className="flex w-full flex-col bg-royal-canvas font-sans-body text-royal-ink">
      <PageHero
        eyebrow="Packaged Services"
        title="Service Marketplace"
        description="Professional, packaged services designed to scale your business with predictable results - fixed scope, fixed price, no hourly surprises."
      >
        {/* Search + filter toggle sit inside the hero so the page leads with
            the thing visitors actually came to do. */}
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 sm:flex-row">
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search gigs..."
              aria-label="Search gigs"
              className="h-12 rounded-xl border-royal-deep/15 bg-white pl-11 text-sm shadow-sm focus-visible:ring-royal-sapphire"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            aria-expanded={showFilters}
            className={cn(
              'inline-flex h-12 shrink-0 items-center gap-2 rounded-xl border px-5 text-xs font-bold uppercase tracking-wider shadow-sm transition-all duration-300 hover:-translate-y-0.5',
              showFilters
                ? 'border-royal-gold/35 bg-royal-deep text-royal-gold-light'
                : 'border-royal-deep/15 bg-white text-royal-deep hover:border-royal-deep/30',
            )}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {hasFilters && (
              <span className="ml-1 rounded-full bg-royal-gold px-2 py-0.5 font-mono-code text-[10px] text-royal-deep">
                On
              </span>
            )}
          </button>
        </div>
      </PageHero>

      <section className="w-full bg-royal-canvas-alt py-20">
        <div className="mx-auto max-w-[1280px] px-6 lg:px-12">
          {/* Advanced filters */}
          <div
            className={cn(
              'grid overflow-hidden transition-all duration-300 ease-in-out',
              showFilters
                ? 'mb-12 max-h-[1000px] rounded-3xl border border-royal-deep/12 bg-white p-7 shadow-sm'
                : 'max-h-0',
            )}
          >
            <div className="grid gap-8 md:grid-cols-3 lg:grid-cols-4">
              <div className="space-y-4">
                <h2 className="font-mono-code text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Categories
                </h2>
                <div className="flex flex-wrap gap-2">
                  <Link
                    to="/gigs"
                    search={{ ...search, page: 1 }}
                    className={filterPillClass(!categorySlug)}
                  >
                    All
                  </Link>
                  {categories?.map((cat) => (
                    <Link
                      key={cat.id}
                      to="/gigs/category/$slug"
                      params={{ slug: cat.slug }}
                      search={{ ...search, page: 1 }}
                      className={filterPillClass(categorySlug === cat.slug)}
                    >
                      {cat.name}
                    </Link>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-mono-code text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Price Range
                  </h2>
                  <span className="font-mono-code text-xs font-bold text-royal-deep">
                    ${search.minPrice || 0} - ${search.maxPrice || 2000}+
                  </span>
                </div>
                <div className="px-2 pt-2">
                  <Slider
                    defaultValue={[search.minPrice || 0, search.maxPrice || 2000]}
                    max={2000}
                    step={50}
                    onValueCommit={handlePriceChange}
                    className="cursor-pointer"
                  />
                </div>
              </div>

              <div className="space-y-4 md:col-span-2">
                <h2 className="font-mono-code text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Service Tags
                </h2>
                <div className="flex flex-wrap gap-x-6 gap-y-3">
                  {allTags?.map((tag) => (
                    <div key={tag} className="flex items-center gap-2">
                      <Checkbox
                        id={`tag-${tag}`}
                        checked={search.tags?.includes(tag) || false}
                        onCheckedChange={() => toggleTag(tag)}
                      />
                      <label
                        htmlFor={`tag-${tag}`}
                        className="cursor-pointer select-none text-sm font-medium text-slate-600"
                      >
                        {tag}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-5">
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-500 transition-colors hover:text-destructive"
                >
                  <X className="h-4 w-4" /> Clear All
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowFilters(false)}
                className="inline-flex items-center rounded-xl border border-royal-gold/35 bg-royal-deep px-5 py-2 text-xs font-bold uppercase tracking-wider text-royal-gold-light shadow-md transition-all duration-300 hover:-translate-y-0.5"
              >
                Apply Filters
              </button>
            </div>
          </div>

          {/* Gallery */}
          {isLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <CardSkeleton key={i} className="h-[420px]" />
              ))}
            </div>
          ) : data?.gigs?.length === 0 ? (
            <EmptyState
              title="No gigs found"
              description="Try adjusting your filters or clearing your search."
            />
          ) : (
            <>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {data?.gigs?.map((gig, idx) => {
                  const prices = gig.gig_packages?.map((p) => p.price) ?? [];
                  const minPrice = prices.length > 0 ? Math.min(...prices) : null;
                  const tags = Array.isArray(gig.tags) ? (gig.tags as string[]) : [];

                  return (
                    <Reveal
                      key={gig.id}
                      delay={(idx % 3) * 90}
                      className="group flex flex-col overflow-hidden rounded-3xl border border-royal-deep/12 bg-white shadow-sm transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1.5 hover:border-royal-gold hover:shadow-[0_16px_36px_rgba(12,27,51,0.08)]"
                    >
                      <Link to="/gigs/$slug" params={{ slug: gig.slug }} className="block">
                        <div className="relative aspect-video overflow-hidden bg-royal-deep">
                          {gig.thumbnail ? (
                            <img
                              src={gig.thumbnail}
                              alt={gig.title}
                              className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <Zap className="h-12 w-12 text-white/15" />
                            </div>
                          )}
                          {gig.is_featured && (
                            <span className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-full border border-royal-gold/40 bg-royal-deep/90 px-3 py-1 font-mono-code text-[10px] font-bold uppercase tracking-wider text-royal-gold-light backdrop-blur-md">
                              <Star className="h-3 w-3 fill-current" /> Featured
                            </span>
                          )}
                        </div>
                      </Link>

                      <div className="flex flex-1 flex-col p-6">
                        <div className="flex items-center justify-between gap-3">
                          <span className="rounded-full border border-royal-deep/15 bg-royal-deep/5 px-3 py-1 font-mono-code text-[10px] font-bold uppercase tracking-wider text-royal-deep">
                            {gig.gig_categories?.name}
                          </span>
                          {minPrice !== null && (
                            <span className="font-mono-code text-[11px] text-slate-400">
                              from{' '}
                              <span className="font-sans-body text-base font-extrabold text-royal-deep">
                                ${minPrice}
                              </span>
                            </span>
                          )}
                        </div>

                        <h3 className="mt-3 font-sans-body text-lg font-bold text-royal-ink transition-colors duration-300 group-hover:text-royal-sapphire">
                          <Link to="/gigs/$slug" params={{ slug: gig.slug }}>
                            {gig.title}
                          </Link>
                        </h3>
                        <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-slate-600">
                          {gig.short_description}
                        </p>

                        {tags.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="rounded-md bg-royal-canvas-alt px-2 py-0.5 font-mono-code text-[10px] font-bold uppercase tracking-wider text-slate-500"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-5">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-royal-deep/10 bg-royal-deep/5 font-mono-code text-[10px] font-bold text-royal-deep">
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
                            <span className="text-xs font-bold text-royal-ink">
                              {profile?.full_name || 'Service Provider'}
                            </span>
                          </div>
                          <Link
                            to="/gigs/$slug"
                            params={{ slug: gig.slug }}
                            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-royal-deep transition-all duration-300 hover:text-royal-gold-deep group-hover:translate-x-1"
                          >
                            View
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </div>
                      </div>
                    </Reveal>
                  );
                })}
              </div>

              <RoyalPagination
                page={page}
                totalPages={data?.totalPages ?? 1}
                onChange={(next) => onSearchChange((prev) => ({ ...prev, page: next }))}
              />
            </>
          )}
        </div>
      </section>

      {/* Why buy a package */}
      <section className="w-full border-y border-royal-deep/10 bg-royal-canvas py-24">
        <div className="mx-auto max-w-[1280px] px-6 lg:px-12">
          <div className="grid gap-6 md:grid-cols-3">
            {BENEFITS.map((benefit, idx) => {
              const Icon = benefit.icon;
              return (
                <Reveal
                  key={benefit.title}
                  delay={idx * 90}
                  className="group rounded-3xl border border-royal-deep/12 bg-white p-7 shadow-sm transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1.5 hover:border-royal-gold hover:shadow-[0_16px_36px_rgba(12,27,51,0.08)]"
                >
                  <div
                    className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border shadow-sm transition-transform duration-300 group-hover:scale-110 ${benefit.accent}`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-sans-body text-lg font-bold text-royal-ink">
                    {benefit.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{benefit.desc}</p>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      <CtaBanner
        eyebrow="Something Custom"
        title="Need something not listed here?"
        description="Packages cover the common cases. If your project doesn't fit one, describe it and I'll scope it properly."
        actions={<DefaultCtaActions />}
      />
    </div>
  );
}
