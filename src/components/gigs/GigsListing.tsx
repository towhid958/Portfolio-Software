import { Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ArrowRight,
  Search,
  Zap,
  Star,
  CheckCircle2,
  X,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { usePublicProfile, getInitials } from '@/hooks/usePublicProfile';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination";
import type { GigSearch } from '@/lib/gigSearch';

const ITEMS_PER_PAGE = 6;

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
      data.forEach(gig => {
        if (Array.isArray(gig.tags)) {
          gig.tags.forEach((tag: any) => tagsSet.add(String(tag)));
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
          { count: 'exact' }
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

      const { data: gigsData, error } = await query
        .order('created_at', { ascending: false });

      if (error) throw error;

      let filteredGigs = gigsData as any[];

      // Price range filtering (happens in memory because it depends on nested gig_packages)
      if (search.minPrice !== undefined || search.maxPrice !== undefined) {
        filteredGigs = filteredGigs.filter(gig => {
          const prices = gig.gig_packages?.map((p: any) => p.price) || [];
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
        totalPages: Math.ceil(totalCount / ITEMS_PER_PAGE)
      };
    },
  });

  const handlePriceChange = (value: number[]) => {
    onSearchChange((prev) => ({
      ...prev,
      minPrice: value[0] === 0 ? undefined : value[0],
      maxPrice: value[1] === 2000 ? undefined : value[1],
      page: 1
    }));
  };

  const toggleTag = (tag: string) => {
    const currentTags = search.tags || [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter(t => t !== tag)
      : [...currentTags, tag];

    onSearchChange((prev) => ({
      ...prev,
      tags: newTags.length > 0 ? newTags : undefined,
      page: 1
    }));
  };

  const clearFilters = () => {
    setLocalSearch('');
    onSearchChange(() => ({ page: 1 }));
  };

  const page = search.page ?? 1;
  const hasFilters = categorySlug || search.q || search.minPrice || search.maxPrice || (search.tags && search.tags.length > 0);

  return (
    <div className="min-h-screen bg-background pt-24 pb-20">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Service Marketplace</h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Professional, packaged services designed to scale your business with predictable results.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search gigs..."
                className="pl-10 h-11 rounded-xl"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              className={cn("h-11 rounded-xl gap-2", showFilters && "bg-muted")}
              onClick={() => setShowFilters(!showFilters)}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {hasFilters && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 bg-primary text-primary-foreground">
                  Active
                </Badge>
              )}
            </Button>
          </div>
        </div>

        {/* Advanced Filters */}
        <div className={cn(
          "grid gap-8 overflow-hidden transition-all duration-300 ease-in-out",
          showFilters ? "max-h-[1000px] mb-12 border rounded-2xl p-6 bg-muted/20" : "max-h-0"
        )}>
          <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-8">
            {/* Category Filter */}
            <div className="space-y-4">
              <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Categories</h4>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={!categorySlug ? "default" : "outline"}
                  size="sm"
                  className="rounded-full text-xs"
                  asChild
                >
                  <Link to="/gigs" search={{ ...search, page: 1 }}>
                    All
                  </Link>
                </Button>
                {categories?.map((cat) => (
                  <Button
                    key={cat.id}
                    variant={categorySlug === cat.slug ? "default" : "outline"}
                    size="sm"
                    className="rounded-full text-xs"
                    asChild
                  >
                    <Link to="/gigs/category/$slug" params={{ slug: cat.slug }} search={{ ...search, page: 1 }}>
                      {cat.name}
                    </Link>
                  </Button>
                ))}
              </div>
            </div>

            {/* Price Filter */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Price Range</h4>
                <span className="text-xs font-medium">
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

            {/* Tags Filter */}
            <div className="space-y-4 md:col-span-2">
              <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Service Tags</h4>
              <div className="flex flex-wrap gap-x-6 gap-y-3">
                {allTags?.map((tag) => (
                  <div key={tag} className="flex items-center space-x-2">
                    <Checkbox
                      id={`tag-${tag}`}
                      checked={search.tags?.includes(tag) || false}
                      onCheckedChange={() => toggleTag(tag)}
                    />
                    <label
                      htmlFor={`tag-${tag}`}
                      className="text-sm font-medium leading-none cursor-pointer select-none"
                    >
                      {tag}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t gap-4">
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                <X className="h-4 w-4 mr-2" /> Clear All
              </Button>
            )}
            <Button variant="default" size="sm" onClick={() => setShowFilters(false)}>
              Apply Filters
            </Button>
          </div>
        </div>

        {/* Gallery */}
        {isLoading ? (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[400px] rounded-xl" />
            ))}
          </div>
        ) : data?.gigs?.length === 0 ? (
          <div className="text-center py-20 border rounded-xl bg-muted/30">
            <Search className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-medium">No gigs found</h3>
            <p className="text-muted-foreground mt-2">Try adjusting your filters or clearing your search.</p>
            {hasFilters && (
              <Button variant="outline" className="mt-6" onClick={clearFilters}>
                Reset all filters
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {data?.gigs?.map((gig: any) => {
                const minPrice = gig.gig_packages?.length > 0
                  ? Math.min(...gig.gig_packages.map((p: any) => p.price))
                  : null;

                return (
                  <Card key={gig.id} className="group overflow-hidden border-none shadow-md hover:shadow-xl transition-all duration-300 flex flex-col bg-card">
                    <Link to="/gigs/$slug" params={{ slug: gig.slug }}>
                      <div className="relative aspect-video overflow-hidden">
                        <img
                          src={gig.thumbnail || 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=60'}
                          alt={gig.title}
                          className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
                        />
                        {gig.is_featured && (
                          <div className="absolute top-4 left-4">
                            <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-none gap-1">
                              <Star className="h-3 w-3 fill-current" /> Featured
                            </Badge>
                          </div>
                        )}
                      </div>
                    </Link>
                    <CardContent className="p-6 flex flex-col flex-grow space-y-4">
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="bg-primary/10 text-primary border-none text-xs">
                          {gig.gig_categories?.name}
                        </Badge>
                        {minPrice && (
                          <div className="text-sm font-medium">
                            Starts at <span className="text-lg font-bold text-primary">${minPrice}</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-xl font-bold group-hover:text-primary transition-colors">
                          <Link to="/gigs/$slug" params={{ slug: gig.slug }}>
                            {gig.title}
                          </Link>
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {gig.short_description}
                        </p>
                      </div>

                      {gig.tags && Array.isArray(gig.tags) && (
                        <div className="flex flex-wrap gap-1.5 pt-2">
                          {(gig.tags as string[]).slice(0, 3).map(tag => (
                            <span key={tag} className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground px-2 py-0.5 rounded bg-muted">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="pt-4 mt-auto border-t flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold overflow-hidden">
                            {profile?.avatar_url ? (
                              <img src={profile.avatar_url} alt={profile.full_name || ''} className="h-full w-full object-cover" />
                            ) : (
                              getInitials(profile?.full_name)
                            )}
                          </div>
                          <span className="text-xs font-bold">{profile?.full_name || 'Service Provider'}</span>
                        </div>
                        <Button variant="ghost" size="sm" className="gap-2 group/btn" asChild>
                          <Link to="/gigs/$slug" params={{ slug: gig.slug }}>
                            View Details <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Pagination */}
            {data && data.totalPages > 1 && (
              <div className="mt-16">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => onSearchChange((prev) => ({ ...prev, page: Math.max(1, page - 1) }))}
                        className="gap-1"
                      >
                        <ChevronLeft className="h-4 w-4" /> Previous
                      </Button>
                    </PaginationItem>

                    {Array.from({ length: data.totalPages }, (_, i) => i + 1).map((p) => (
                      <PaginationItem key={p}>
                        <Button
                          variant={page === p ? "default" : "ghost"}
                          size="sm"
                          className="w-9 h-9 p-0"
                          onClick={() => onSearchChange((prev) => ({ ...prev, page: p }))}
                          aria-current={page === p ? "page" : undefined}
                        >
                          {p}
                        </Button>
                      </PaginationItem>
                    ))}

                    <PaginationItem>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={page >= data.totalPages}
                        onClick={() => onSearchChange((prev) => ({ ...prev, page: Math.min(data.totalPages, page + 1) }))}
                        className="gap-1"
                      >
                        Next <ChevronRight className="h-4 w-4" />
                      </Button>
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}

        {/* Benefits Section */}
        <div className="mt-32 grid gap-12 md:grid-cols-3 pt-16 border-t">
          <div className="space-y-4 text-center md:text-left">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mx-auto md:mx-0">
              <Zap className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold">Fast Delivery</h3>
            <p className="text-muted-foreground">Most services are delivered within 7-14 days with regular progress updates.</p>
          </div>
          <div className="space-y-4 text-center md:text-left">
            <div className="h-12 w-12 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-500 mx-auto md:mx-0">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold">Fixed Pricing</h3>
            <p className="text-muted-foreground">No hidden costs or hourly surprises. You know exactly what you get for the price.</p>
          </div>
          <div className="space-y-4 text-center md:text-left">
            <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 mx-auto md:mx-0">
              <Star className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold">Premium Quality</h3>
            <p className="text-muted-foreground">Every gig is handled with high attention to detail and professional standards.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
